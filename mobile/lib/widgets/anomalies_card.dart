// AnomaliesCard — compact single-line dashboard banner, mirroring
// the web AnomaliesPanel.
//
// Collapsed by default: shows a one-line summary like
//   ⚠ 3 spending anomalies · HOUSEHOLD category · target · hulu
// with a chevron to expand the full list and a dismiss eye-icon.
// Tap any expanded row to drill into /receipts for that merchant.
//
// Returns SizedBox.shrink() when there are no anomalies, so the
// dashboard stays clean on a calm month.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/receipt_model.dart';
import '../services/spending_anomalies_service.dart';

class AnomaliesCard extends StatefulWidget {
  final List<Receipt> receipts;
  const AnomaliesCard({super.key, required this.receipts});

  @override
  State<AnomaliesCard> createState() => _AnomaliesCardState();
}

class _AnomaliesCardState extends State<AnomaliesCard> {
  bool _expanded = false;
  bool _dismissed = false;
  final _itemDismissed = <String>{};

  static const int _topN = 3;

  @override
  Widget build(BuildContext context) {
    if (_dismissed) return const SizedBox.shrink();
    final all = detectAnomalies(widget.receipts).take(_topN).toList();
    final visible = all.where((a) => !_itemDismissed.contains(a.title)).toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    // Any 'flag' raises the tone to rose; otherwise amber. Matches the
    // web banner's `hasFlag` ternary.
    final hasFlag = visible.any((a) => a.severity == AnomalySeverity.flag);
    final tone = hasFlag ? _rose : _amber;

    // Inline preview chips — first 3 merchants/categories with a
    // multiplier suffix if present in the body text (e.g. "3.2×").
    final preview = visible.take(3).map((a) {
      final name = (a.merchant ?? a.title).trim().split(' ').take(2).join(' ');
      final mult = RegExp(r'(\d+(?:\.\d+)?)\s*[x×]', caseSensitive: false)
          .firstMatch(a.body)?.group(1);
      return mult != null ? '$name $mult×' : name;
    }).where((s) => s.isNotEmpty).join(' · ');

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Container(
        decoration: BoxDecoration(
          color: tone.bg,
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: tone.border, width: 4)),
        ),
        child: Column(children: [
          // Collapsed header — whole row clickable to expand
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 6, 8),
                child: Row(children: [
                  Container(
                    width: 24, height: 24,
                    decoration: BoxDecoration(
                      color: tone.iconBg, borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(Icons.warning_amber_rounded, size: 14, color: tone.iconColor),
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text.rich(
                    TextSpan(children: [
                      TextSpan(
                        text: '${visible.length} spending '
                            '${visible.length == 1 ? "anomaly" : "anomalies"}',
                        style: TextStyle(fontWeight: FontWeight.w800, color: tone.heading, fontSize: 13),
                      ),
                      if (preview.isNotEmpty) TextSpan(
                        text: '  ·  $preview',
                        style: TextStyle(fontWeight: FontWeight.w500, color: tone.body, fontSize: 11),
                      ),
                    ]),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  )),
                  Icon(_expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    size: 18, color: tone.body),
                  IconButton(
                    icon: const Icon(Icons.visibility_off_outlined, size: 14),
                    color: tone.body,
                    visualDensity: VisualDensity.compact,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                    tooltip: 'Dismiss',
                    onPressed: () => setState(() => _dismissed = true),
                  ),
                ]),
              ),
            ),
          ),
          if (_expanded)
            ...visible.map((a) => Container(
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: tone.border.withValues(alpha: 0.4))),
              ),
              child: _AnomalyRow(
                anomaly: a,
                tone: tone,
                onTap: () => _openReceipts(context, a),
                onDismiss: () => setState(() => _itemDismissed.add(a.title)),
              ),
            )),
        ]),
      ),
    );
  }

  void _openReceipts(BuildContext context, Anomaly a) {
    final store = a.merchant ?? '';
    final params = <String, String>{};
    if (store.isNotEmpty) params['store'] = store;
    params['period'] = a.kind == AnomalyKind.missingRecurring ? '1Y' : '1M';
    final qs = params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&');
    context.push('/receipts${qs.isEmpty ? "" : "?$qs"}');
  }
}

class _BannerTone {
  final Color bg;
  final Color border;
  final Color iconBg;
  final Color iconColor;
  final Color heading;
  final Color body;
  const _BannerTone({
    required this.bg, required this.border, required this.iconBg,
    required this.iconColor, required this.heading, required this.body,
  });
}

const _rose = _BannerTone(
  bg: Color(0xFFfff1f2), border: Color(0xFFfecdd3),
  iconBg: Color(0xFFffe4e6), iconColor: Color(0xFFb91c1c),
  heading: Color(0xFF881337), body: Color(0xFF9f1239),
);
const _amber = _BannerTone(
  bg: Color(0xFFfffbeb), border: Color(0xFFfde68a),
  iconBg: Color(0xFFfef3c7), iconColor: Color(0xFFb45309),
  heading: Color(0xFF78350f), body: Color(0xFF92400e),
);

class _AnomalyRow extends StatelessWidget {
  final Anomaly anomaly;
  final _BannerTone tone;
  final VoidCallback onTap;
  final VoidCallback onDismiss;
  const _AnomalyRow({required this.anomaly, required this.tone, required this.onTap, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final icon = anomaly.kind == AnomalyKind.missingRecurring
        ? Icons.notifications_off_outlined
        : Icons.trending_up;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 6, 8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, size: 16, color: tone.iconColor),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(anomaly.title,
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: tone.heading, height: 1.2)),
              const SizedBox(height: 2),
              Text(anomaly.body,
                style: TextStyle(fontSize: 11, color: tone.body, height: 1.3)),
            ])),
            IconButton(
              icon: const Icon(Icons.close, size: 12),
              color: tone.body,
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              tooltip: 'Dismiss',
              onPressed: onDismiss,
            ),
          ]),
        ),
      ),
    );
  }
}
