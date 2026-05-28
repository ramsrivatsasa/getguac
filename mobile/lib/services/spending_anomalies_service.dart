// Spending-anomaly detector — Dart mirror of
// web/src/lib/spending-anomalies.js. Three detector classes, sorted by
// severity then dollar impact. Used by AnomaliesCard on /dashboard.
//
// Parity choices vs web (now in lockstep, was diverging in v0.2.75):
//   - Uses storeGroupKey() so "Costco" / "COSTCO WHSE" / "Costco #218"
//     all bucket together, matching the dashboard chart and the web
//     anomaly count.
//   - Uses isPaymentReceipt() to skip [card payment] rows (same as web).
//   - Includes category-spike detection. Was disabled in v0.2.75 in
//     the name of "lightweight"; the result was 4 anomalies on web
//     showing as 1 on mobile, which is worse than a slightly busier
//     card. Re-enabled with the same NOISE_CATS skip-set as web.

import '../models/receipt_model.dart';
import '../payment_rows.dart';
import '../store_name_normalize.dart';

const double _kSpikeThreshold     = 2.0;
const double _kMinAmount          = 25.0;
const int    _kPriorWindows       = 3;
const int    _kMissingGapDays     = 40;
const int    _kMinMissingHistory  = 3;
const double _kSeverityFlagMult   = 3.0;

const Set<String> _kNoiseCategories = {'misc', 'bank-fees'};

enum AnomalyKind { merchantSpike, categorySpike, missingRecurring }
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
  final String? category;

  const Anomaly({
    required this.kind,
    required this.severity,
    required this.title,
    required this.body,
    required this.amount,
    required this.priorAvg,
    required this.multiple,
    required this.merchant,
    required this.category,
  });
}

String _displayName(String raw) {
  // Prefer the canonical alias-mapped name so the bubble matches the
  // dashboard chart bar label. Web uses canonicalStoreName the same way.
  final canon = canonicalStoreName(raw);
  return canon.toUpperCase();
}

String _dayStringUtc(DateTime d) {
  final u = d.toUtc();
  final y = u.year.toString().padLeft(4, '0');
  final m = u.month.toString().padLeft(2, '0');
  final dd = u.day.toString().padLeft(2, '0');
  return '$y-$m-$dd';
}

List<Anomaly> detectAnomalies(List<Receipt> receipts, {int windowDays = 30}) {
  if (receipts.isEmpty) return const [];
  // Compare receipts (ISO YYYY-MM-DD strings, UTC-stable) against UTC
  // cutoffs. DateTime.now() is local: subtracting days then formatting
  // can shift the boundary by 24h for users east of UTC, silently moving
  // anomaly windows by a day. UTC keeps the boundaries consistent with
  // how the receipts table actually stores dates.
  final now = DateTime.now().toUtc();
  final currentStart = _dayStringUtc(now.subtract(Duration(days: windowDays)));
  final priorStart   = _dayStringUtc(now.subtract(Duration(days: windowDays * (_kPriorWindows + 1))));

  // Aggregations:
  //   merchant: per storeGroupKey → { name, category, current, prior }
  //   category: per category slug → { current, prior }
  //   merchantHist: per storeGroupKey → list of {date, amount}
  final merchant     = <String, _MerchantAgg>{};
  final category     = <String, _CategoryAgg>{};
  final merchantHist = <String, List<_HistPoint>>{};
  final merchantLast = <String, String>{};

  for (final r in receipts) {
    if (r.isReturn) continue;
    if (r.totalAmount <= 0) continue;
    if (isPaymentReceipt(r)) continue;
    final d = r.date;
    if (d.length < 10) continue;

    final skey = storeGroupKey(r.storeName);
    final cat  = (r.category ?? 'misc').toLowerCase();

    if (skey.isNotEmpty) {
      var me = merchant[skey];
      if (me == null) {
        me = _MerchantAgg(key: skey, name: r.storeName, category: cat);
        merchant[skey] = me;
      }
      final last = merchantLast[skey];
      if (last == null || d.compareTo(last) > 0) {
        merchantLast[skey] = d;
        me.name = r.storeName;
      }
      (merchantHist[skey] ??= <_HistPoint>[]).add(_HistPoint(d, r.totalAmount));

      if (d.compareTo(currentStart) >= 0) {
        me.current += r.totalAmount;
      } else if (d.compareTo(priorStart) >= 0) {
        me.prior += r.totalAmount;
      }
    }

    var ce = category[cat];
    if (ce == null) {
      ce = _CategoryAgg(slug: cat);
      category[cat] = ce;
    }
    if (d.compareTo(currentStart) >= 0) {
      ce.current += r.totalAmount;
    } else if (d.compareTo(priorStart) >= 0) {
      ce.prior += r.totalAmount;
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
      category: me.category,
    ));
  }

  // 2. Category-spike (skip misc + bank-fees: too vague / surfaced elsewhere)
  for (final ce in category.values) {
    if (_kNoiseCategories.contains(ce.slug)) continue;
    if (ce.current < _kMinAmount) continue;
    final priorAvg = ce.prior / _kPriorWindows;
    if (priorAvg <= 0) continue;
    final multiple = ce.current / priorAvg;
    if (multiple < _kSpikeThreshold) continue;
    final severity = multiple >= _kSeverityFlagMult ? AnomalySeverity.flag : AnomalySeverity.watch;
    out.add(Anomaly(
      kind: AnomalyKind.categorySpike,
      severity: severity,
      title: '${ce.slug.toUpperCase()} category is ${multiple.toStringAsFixed(1)}× your usual',
      body: '\$${ce.current.toStringAsFixed(2)} this period vs avg \$${priorAvg.toStringAsFixed(2)} prior.',
      amount: ce.current,
      priorAvg: priorAvg,
      multiple: multiple,
      merchant: null,
      category: ce.slug,
    ));
  }

  // 3. Missing-recurring — monthly-cadence merchants gone silent
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
      category: me?.category,
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
  String category;
  double current = 0;
  double prior = 0;
  _MerchantAgg({required this.key, required this.name, required this.category});
}

class _CategoryAgg {
  final String slug;
  double current = 0;
  double prior = 0;
  _CategoryAgg({required this.slug});
}

class _HistPoint {
  final String date;
  final double amount;
  const _HistPoint(this.date, this.amount);
}
