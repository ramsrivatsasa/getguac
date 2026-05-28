// AnomaliesCard — lightweight dashboard widget for spending alerts.
//
// Shows the top-1 anomaly inline; if more exist, a small "+N more" chip
// expands them in-place. Tapping any anomaly routes to /receipts pre-
// filtered to the relevant store. Dismissible per-anomaly (in-memory
// only — they re-appear next dashboard mount if still tripping).
//
// Designed to stay quiet: returns SizedBox.shrink() when there are no
// anomalies, so the dashboard isn't permanently cluttered.

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
  final _dismissed = <String>{};

  @override
  Widget build(BuildContext context) {
    final all = detectAnomalies(widget.receipts);
    final visible = all.where((a) => !_dismissed.contains(a.title)).toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    final top = visible.first;
    final more = visible.length - 1;

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: top.severity == AnomalySeverity.flag
                ? const Color(0xFFfecaca)
                : const Color(0xFFfde68a),
          ),
        ),
        child: Column(children: [
          _AnomalyRow(
            anomaly: top,
            onTap: () => _open(context, top),
            onDismiss: () => setState(() => _dismissed.add(top.title)),
          ),
          if (more > 0 && !_expanded)
            InkWell(
              onTap: () => setState(() => _expanded = true),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  '+$more more',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF6b7280), fontWeight: FontWeight.w700),
                ),
              ),
            ),
          if (_expanded)
            ...visible.skip(1).map((a) => Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFf3f4f6))),
              ),
              child: _AnomalyRow(
                anomaly: a,
                onTap: () => _open(context, a),
                onDismiss: () => setState(() => _dismissed.add(a.title)),
              ),
            )),
        ]),
      ),
    );
  }

  void _open(BuildContext context, Anomaly a) {
    // Deep-link to receipts list filtered by this store + last month.
    final store = a.merchant ?? '';
    final params = <String, String>{};
    if (store.isNotEmpty) params['store'] = store;
    params['period'] = a.kind == AnomalyKind.missingRecurring ? '1Y' : '1M';
    final qs = params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&');
    context.go('/receipts${qs.isEmpty ? "" : "?$qs"}');
  }
}

class _AnomalyRow extends StatelessWidget {
  final Anomaly anomaly;
  final VoidCallback onTap;
  final VoidCallback onDismiss;
  const _AnomalyRow({required this.anomaly, required this.onTap, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final isFlag = anomaly.severity == AnomalySeverity.flag;
    final icon = anomaly.kind == AnomalyKind.missingRecurring
        ? Icons.notifications_off_outlined
        : Icons.trending_up;
    final tint = isFlag ? const Color(0xFFb91c1c) : const Color(0xFFb45309);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 18, color: tint),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(
              anomaly.title,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: tint, height: 1.2),
            ),
            const SizedBox(height: 2),
            Text(
              anomaly.body,
              style: const TextStyle(fontSize: 11, color: Color(0xFF374151), height: 1.3),
            ),
          ])),
          IconButton(
            icon: const Icon(Icons.close, size: 14, color: Colors.black38),
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            tooltip: 'Dismiss',
            onPressed: onDismiss,
          ),
        ]),
      ),
    );
  }
}
