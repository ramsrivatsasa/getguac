// Spending-anomaly detector — mobile port (lightweight).
//
// Dart mirror of web/src/lib/spending-anomalies.js, intentionally trimmed
// for mobile:
//   - Skips category-spike (too noisy for a small dashboard card)
//   - Skips the full store-alias normalization table; uses lowercase+trim
//     as the grouping key (sufficient for "Costco" vs "COSTCO" but won't
//     merge "Costco" with "Costco Wholesale" — acceptable for v1)
//   - No payment-row exclusion lib; filters bank-fees + misc by category
//
// Pure function — pass it the receipts already in memory on the
// dashboard, get back a sorted list of anomalies. Used by the
// AnomaliesCard widget on /dashboard.

import '../models/receipt_model.dart';

const double _kSpikeThreshold     = 2.0;
const double _kMinAmount          = 25.0;
const int    _kPriorWindows       = 3;
const int    _kMissingGapDays     = 40;
const int    _kMinMissingHistory  = 3;
const double _kSeverityFlagMult   = 3.0;

enum AnomalyKind { merchantSpike, missingRecurring }
enum AnomalySeverity { watch, flag }

class Anomaly {
  final AnomalyKind kind;
  final AnomalySeverity severity;
  final String title;
  final String body;
  final double amount;
  final double priorAvg;
  final double? multiple;
  final String? merchant;

  const Anomaly({
    required this.kind,
    required this.severity,
    required this.title,
    required this.body,
    required this.amount,
    required this.priorAvg,
    required this.multiple,
    required this.merchant,
  });
}

String _groupKey(String? raw) {
  if (raw == null) return '';
  return raw.trim().toLowerCase();
}

String _displayName(String raw) {
  return raw.trim().toUpperCase();
}

String _dayString(DateTime d) {
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final dd = d.day.toString().padLeft(2, '0');
  return '$y-$m-$dd';
}

List<Anomaly> detectAnomalies(List<Receipt> receipts, {int windowDays = 30}) {
  if (receipts.isEmpty) return const [];
  final now = DateTime.now();
  final currentStart = _dayString(now.subtract(Duration(days: windowDays)));
  final priorStart   = _dayString(now.subtract(Duration(days: windowDays * (_kPriorWindows + 1))));

  // Aggregations: per merchant.
  final merchant       = <String, _MerchantAgg>{};
  final merchantHist   = <String, List<_HistPoint>>{};
  final merchantLastDt = <String, String>{};

  for (final r in receipts) {
    if (r.isReturn) continue;
    if (r.totalAmount <= 0) continue;
    final cat = (r.category ?? '').toLowerCase();
    if (cat == 'bank-fees' || cat == 'misc') continue;
    final d = r.date;
    if (d.length < 10) continue;

    final key = _groupKey(r.storeName);
    if (key.isEmpty) continue;

    var me = merchant[key];
    if (me == null) {
      me = _MerchantAgg(key: key, name: r.storeName);
      merchant[key] = me;
    }
    final last = merchantLastDt[key];
    if (last == null || d.compareTo(last) > 0) {
      merchantLastDt[key] = d;
      me.name = r.storeName;
    }
    (merchantHist[key] ??= <_HistPoint>[]).add(_HistPoint(d, r.totalAmount));

    if (d.compareTo(currentStart) >= 0) {
      me.current += r.totalAmount;
    } else if (d.compareTo(priorStart) >= 0) {
      me.prior += r.totalAmount;
    }
  }

  final out = <Anomaly>[];

  // 1. Merchant-spike
  for (final me in merchant.values) {
    if (me.current < _kMinAmount) continue;
    final priorAvg = me.prior / _kPriorWindows;
    if (priorAvg <= 0) continue;
    final multiple = me.current / priorAvg;
    if (multiple < _kSpikeThreshold) continue;
    final severity = multiple >= _kSeverityFlagMult ? AnomalySeverity.flag : AnomalySeverity.watch;
    final nice = _displayName(me.name);
    out.add(Anomaly(
      kind: AnomalyKind.merchantSpike,
      severity: severity,
      title: '$nice is ${multiple.toStringAsFixed(1)}× your usual',
      body: '\$${me.current.toStringAsFixed(2)} this period vs avg \$${priorAvg.toStringAsFixed(2)} prior.',
      amount: me.current,
      priorAvg: priorAvg,
      multiple: multiple,
      merchant: nice,
    ));
  }

  // 2. Missing-recurring
  for (final entry in merchantHist.entries) {
    final rows = entry.value;
    if (rows.length < _kMinMissingHistory) continue;
    rows.sort((a, b) => a.date.compareTo(b.date));
    int monthlyHits = 0, totalIntervals = 0;
    for (var i = 1; i < rows.length; i++) {
      final dayA = DateTime.parse(rows[i - 1].date);
      final dayB = DateTime.parse(rows[i].date);
      final gap = dayB.difference(dayA).inDays;
      if (gap <= 0) continue;
      totalIntervals++;
      if (gap >= 25 && gap <= 40) monthlyHits++;
    }
    if (monthlyHits < (totalIntervals / 2).ceil()) continue;

    final last = rows.last;
    final daysSince = now.difference(DateTime.parse(last.date)).inDays;
    if (daysSince < _kMissingGapDays) continue;

    final me = merchant[entry.key];
    final nice = _displayName(me?.name ?? '');
    final avgAmt = rows.fold<double>(0, (s, r) => s + r.amount) / rows.length;
    out.add(Anomaly(
      kind: AnomalyKind.missingRecurring,
      severity: AnomalySeverity.watch,
      title: 'No $nice charge in $daysSince days',
      body: 'Usually ~monthly (~\$${avgAmt.toStringAsFixed(2)}). Canceled or autopay failed?',
      amount: 0,
      priorAvg: avgAmt,
      multiple: null,
      merchant: nice,
    ));
  }

  // Sort: flag before watch, then biggest impact first.
  out.sort((a, b) {
    if (a.severity != b.severity) return a.severity == AnomalySeverity.flag ? -1 : 1;
    final aImpact = a.amount + a.priorAvg;
    final bImpact = b.amount + b.priorAvg;
    return bImpact.compareTo(aImpact);
  });

  return out;
}

class _MerchantAgg {
  final String key;
  String name;
  double current = 0;
  double prior = 0;
  _MerchantAgg({required this.key, required this.name});
}

class _HistPoint {
  final String date;
  final double amount;
  const _HistPoint(this.date, this.amount);
}
