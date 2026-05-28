// SubscriptionsCard — compact dashboard card surfacing recurring
// charges detected from the receipts list. Auto-hides when nothing
// is recurring, so quiet accounts don't see a permanent placeholder.
//
// Shows the rollup line (monthly total + count) by default; tap to
// expand the per-merchant list. Each row shows merchant + interval +
// last amount, with a small "price up" tag when the latest charge
// jumped >= 5%.

import 'package:flutter/material.dart';
import '../models/receipt_model.dart';
import '../services/subscription_tracker_service.dart';

class SubscriptionsCard extends StatefulWidget {
  final List<Receipt> receipts;
  const SubscriptionsCard({super.key, required this.receipts});

  @override
  State<SubscriptionsCard> createState() => _SubscriptionsCardState();
}

class _SubscriptionsCardState extends State<SubscriptionsCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final subs = detectSubscriptions(widget.receipts);
    if (subs.isEmpty) return const SizedBox.shrink();
    final summary = summarizeSubscriptions(subs);

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFe9d5ff)),
        ),
        child: Column(children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.autorenew, size: 18, color: Color(0xFF7c3aed)),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text(
                    '\$${summary.monthlyTotal.toStringAsFixed(2)}/mo across ${summary.count} subscription${summary.count == 1 ? '' : 's'}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF4c1d95)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    summary.priceIncreaseCount > 0
                      ? '${summary.priceIncreaseCount} recently raised price · tap to review'
                      : 'Tap to see what\'s recurring',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF6b7280)),
                  ),
                ])),
                Icon(_expanded ? Icons.expand_less : Icons.expand_more, color: const Color(0xFF7c3aed)),
              ]),
            ),
          ),
          if (_expanded)
            ...subs.map((s) => Container(
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFf3e8ff)))),
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text(s.merchant, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  Text('${s.intervalLabel} · last ${s.lastDate}',
                    style: const TextStyle(fontSize: 10, color: Colors.black54)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
                  Text('\$${s.lastAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  if (s.priceChanged && (s.priceChangePct ?? 0) > 0)
                    Container(
                      margin: const EdgeInsets.only(top: 2),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFfecaca),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '+${s.priceChangePct!.round()}%',
                        style: const TextStyle(fontSize: 9, color: Color(0xFFb91c1c), fontWeight: FontWeight.w800),
                      ),
                    ),
                ]),
              ]),
            )),
        ]),
      ),
    );
  }
}
