import 'package:flutter/material.dart';
import '../services/guac_money_service.dart';
import '../theme/gg_design.dart';

/// Fetch-style "+N GuacMoney" flash. Pops a celebratory pill in the centre of
/// the screen that scales in, holds, then floats up + fades — shown right
/// after a receipt is captured so the earn feels rewarding.
void showGuacMoneyEarned(BuildContext context, {int points = kGmPerReceipt}) {
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return;
  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (_) => _GuacMoneyEarnedFlash(points: points, onDone: () {
      if (entry.mounted) entry.remove();
    }),
  );
  overlay.insert(entry);
}

class _GuacMoneyEarnedFlash extends StatefulWidget {
  final int points;
  final VoidCallback onDone;
  const _GuacMoneyEarnedFlash({required this.points, required this.onDone});
  @override
  State<_GuacMoneyEarnedFlash> createState() => _GuacMoneyEarnedFlashState();
}

class _GuacMoneyEarnedFlashState extends State<_GuacMoneyEarnedFlash> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1900))
      ..addStatusListener((s) { if (s == AnimationStatus.completed) widget.onDone(); })
      ..forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: IgnorePointer(
        child: AnimatedBuilder(
          animation: _c,
          builder: (_, __) {
            final t = _c.value;
            final scale = t < 0.25 ? Curves.easeOutBack.transform(t / 0.25) : 1.0;
            final fade = t < 0.72 ? 1.0 : (1 - (t - 0.72) / 0.28);
            final lift = t < 0.72 ? 0.0 : -((t - 0.72) / 0.28) * 36;
            return Center(
              child: Opacity(
                opacity: fade.clamp(0.0, 1.0),
                child: Transform.translate(
                  offset: Offset(0, lift),
                  child: Transform.scale(scale: scale, child: _card()),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _card() => Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFFfbbf24), Color(0xFFf59e0b)],
          ),
          borderRadius: BorderRadius.circular(22),
          boxShadow: [BoxShadow(color: const Color(0xFFf59e0b).withValues(alpha: 0.5), blurRadius: 22, offset: const Offset(0, 8))],
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Text('🥑', style: TextStyle(fontSize: 30)),
          const SizedBox(width: 10),
          Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('+${formatGm(widget.points)} GuacMoney',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: Colors.white, fontVariations: ggWght(FontWeight.w900))),
            Text('added to your balance', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white, fontVariations: ggWght(FontWeight.w600))),
          ]),
        ]),
      );
}
