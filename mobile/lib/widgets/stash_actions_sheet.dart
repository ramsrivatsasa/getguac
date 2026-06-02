// Per-item action sheet for the Stash list. Opens from the ⋮ menu on
// a FetchCard and exposes: on-hand stepper, "best prices" web hunt,
// share to OS, and "add to Smashlist". Mirrors the inline action
// cluster on web's ProductCard but adapted for the mobile bottom-
// sheet pattern (small screens, large fingers).

import 'package:flutter/material.dart';
import '../services/stash_service.dart';

class StashActionsSheet extends StatefulWidget {
  final String itemName;
  final String? sku;
  final String? category;
  final int currentOnHand;
  final VoidCallback onShare;
  final VoidCallback? onAddToSmashlist;

  const StashActionsSheet({
    super.key,
    required this.itemName,
    this.sku,
    this.category,
    this.currentOnHand = 0,
    required this.onShare,
    this.onAddToSmashlist,
  });

  @override
  State<StashActionsSheet> createState() => _StashActionsSheetState();
}

class _StashActionsSheetState extends State<StashActionsSheet> {
  late int _onHand = widget.currentOnHand;
  bool _huntingPrices = false;
  List<Map<String, dynamic>>? _prices;
  String? _priceError;

  Future<void> _setOnHand(int next) async {
    final clamped = next.clamp(0, 9999);
    setState(() => _onHand = clamped);
    await StashService.setOnHand(widget.itemName, clamped);
  }

  Future<void> _huntPrices() async {
    setState(() { _huntingPrices = true; _priceError = null; });
    try {
      final results = await StashService.fetchBestPrices(
        itemName: widget.itemName,
        sku: widget.sku,
        category: widget.category,
      );
      if (!mounted) return;
      setState(() { _prices = results; _huntingPrices = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _priceError = e.toString(); _huntingPrices = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(child: Container(
            width: 40, height: 4,
            decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(2)),
          )),
          const SizedBox(height: 14),
          Text(widget.itemName,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            maxLines: 2, overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 14),

          // On-hand stepper
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFf0fdf4),
              border: Border.all(color: const Color(0xFFbbf7d0)),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(children: [
              const Text('📦  On hand', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
              const Spacer(),
              _StepperButton(icon: Icons.remove, onTap: _onHand == 0 ? null : () => _setOnHand(_onHand - 1)),
              SizedBox(width: 32, child: Text('$_onHand',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w900,
                  color: _onHand == 0 ? const Color(0xFFb91c1c)
                    : _onHand <= 1 ? const Color(0xFFb45309)
                    : const Color(0xFF065f46),
                ),
              )),
              _StepperButton(icon: Icons.add, onTap: () => _setOnHand(_onHand + 1)),
            ]),
          ),
          const SizedBox(height: 10),

          // Best prices hunt
          InkWell(
            onTap: _huntingPrices ? null : _huntPrices,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFfef9c3),
                border: Border.all(color: const Color(0xFFfde68a)),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(children: [
                Text(_huntingPrices ? '⏳' : '💎', style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 10),
                Text(
                  _huntingPrices
                    ? 'Scanning the web…'
                    : _prices == null ? 'Hunt web prices' : 'Refresh web prices',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF78350f)),
                ),
                const Spacer(),
                if (_prices != null) Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFfacc15), borderRadius: BorderRadius.circular(8)),
                  child: Text('${_prices!.length}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                ),
              ]),
            ),
          ),
          if (_priceError != null) ...[
            const SizedBox(height: 6),
            Text(_priceError!, style: const TextStyle(fontSize: 11, color: Color(0xFFb91c1c))),
          ],
          if (_prices != null && _prices!.isNotEmpty) ...[
            const SizedBox(height: 8),
            ..._prices!.take(4).map((p) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [
                const Text('•', style: TextStyle(color: Colors.black45)),
                const SizedBox(width: 8),
                Expanded(child: Text(
                  '${p['store'] ?? 'Store'} — \$${(p['price'] as num?)?.toStringAsFixed(2) ?? '—'}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                )),
              ]),
            )),
          ],
          const SizedBox(height: 14),

          Row(children: [
            Expanded(child: OutlinedButton.icon(
              onPressed: () { Navigator.of(context).pop(); widget.onShare(); },
              icon: const Icon(Icons.share_outlined, size: 16),
              label: const Text('Share'),
            )),
            const SizedBox(width: 10),
            Expanded(child: FilledButton.icon(
              onPressed: widget.onAddToSmashlist == null ? null : () {
                Navigator.of(context).pop();
                widget.onAddToSmashlist!();
              },
              icon: const Icon(Icons.shopping_cart, size: 16),
              label: const Text('Smashlist'),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFca8a04)),
            )),
          ]),
        ]),
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  const _StepperButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 32, height: 32,
        decoration: BoxDecoration(
          color: onTap == null ? const Color(0xFFe5e7eb) : const Color(0xFFdcfce7),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(icon, size: 18, color: onTap == null ? Colors.black26 : const Color(0xFF065f46)),
      ),
    );
  }
}
