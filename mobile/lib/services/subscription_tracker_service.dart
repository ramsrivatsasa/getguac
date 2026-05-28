// Subscription detector — Dart mirror of
// web/src/lib/subscription-tracker.js.
//
// Looks at the user's receipts and identifies merchants with a
// recurring charge pattern — monthly / quarterly / semi-annual / annual.
// Pure function; caller hands in receipts already in memory.
//
// Used by the dashboard's Subscriptions card on mobile. Web surfaces
// the same data on the /reports page; both share these tunables so a
// merchant flagged as a subscription on web is flagged on mobile too.

import '../models/receipt_model.dart';
import '../payment_rows.dart';
import '../store_name_normalize.dart';

class _IntervalKind {
  final String name;
  final int daysMin;
  final int daysMax;
  final double perYear;
  final String label;
  const _IntervalKind({required this.name, required this.daysMin, required this.daysMax, required this.perYear, required this.label});
}

const List<_IntervalKind> _kIntervals = [
  _IntervalKind(name: 'monthly',    daysMin: 25,  daysMax: 40,  perYear: 12, label: 'monthly'),
  _IntervalKind(name: 'quarterly',  daysMin: 80,  daysMax: 105, perYear: 4,  label: 'quarterly'),
  _IntervalKind(name: 'semiannual', daysMin: 170, daysMax: 200, perYear: 2,  label: 'every 6 months'),
  _IntervalKind(name: 'annual',     daysMin: 340, daysMax: 395, perYear: 1,  label: 'annual'),
];

const int _kMinOccurrences = 3;
const double _kMaxAmountVariance = 0.25;

class Subscription {
  final String merchant;
  final String storeKey;
  final String? category;
  final String interval;       // 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  final String intervalLabel;
  final int occurrences;
  final double avgAmount;
  final double lastAmount;
  final String lastDate;       // YYYY-MM-DD
  final double monthlyCost;
  final bool priceChanged;
  final double? priceChangePct;

  const Subscription({
    required this.merchant,
    required this.storeKey,
    required this.category,
    required this.interval,
    required this.intervalLabel,
    required this.occurrences,
    required this.avgAmount,
    required this.lastAmount,
    required this.lastDate,
    required this.monthlyCost,
    required this.priceChanged,
    required this.priceChangePct,
  });
}

class _MerchantBucket {
  final String key;
  String rawName;
  String? category;
  final List<_Row> rows = [];
  _MerchantBucket({required this.key, required this.rawName, required this.category});
}

class _Row {
  final String date;
  final double amount;
  const _Row(this.date, this.amount);
}

List<Subscription> detectSubscriptions(List<Receipt> receipts) {
  if (receipts.isEmpty) return const [];
  final byMerchant = <String, _MerchantBucket>{};

  for (final r in receipts) {
    if (r.isReturn) continue;
    if (isPaymentReceipt(r)) continue;
    if (r.totalAmount <= 0) continue;
    final d = r.date;
    if (d.length < 10) continue;
    final key = storeGroupKey(r.storeName);
    if (key.isEmpty) continue;
    var e = byMerchant[key];
    if (e == null) {
      e = _MerchantBucket(key: key, rawName: r.storeName, category: r.category);
      byMerchant[key] = e;
    }
    e.rows.add(_Row(d, r.totalAmount));
  }

  final out = <Subscription>[];
  for (final e in byMerchant.values) {
    if (e.rows.length < _kMinOccurrences) continue;
    e.rows.sort((a, b) => a.date.compareTo(b.date));

    final intervals = <int>[];
    for (var i = 1; i < e.rows.length; i++) {
      final t0 = DateTime.parse(e.rows[i - 1].date);
      final t1 = DateTime.parse(e.rows[i].date);
      final d = t1.difference(t0).inDays;
      if (d > 0) intervals.add(d);
    }
    if (intervals.length < _kMinOccurrences - 1) continue;

    _IntervalKind? bestKind;
    int bestFit = 0;
    for (final kind in _kIntervals) {
      final fit = intervals.where((d) => d >= kind.daysMin && d <= kind.daysMax).length;
      if (fit > bestFit) { bestFit = fit; bestKind = kind; }
    }
    if (bestKind == null || bestFit < (intervals.length / 2).ceil()) continue;

    // Amount-variance gate — drop merchants where prices wander too
    // much to plausibly be the same subscription.
    final amounts = e.rows.map((r) => r.amount).toList();
    final avg = amounts.reduce((s, x) => s + x) / amounts.length;
    final variance = amounts
        .map((x) => (x - avg).abs() / avg)
        .reduce((s, x) => s + x) / amounts.length;
    if (variance > _kMaxAmountVariance) continue;

    final last = e.rows.last;
    final priorRows = e.rows.sublist(0, e.rows.length - 1);
    final priorAvg = priorRows.fold<double>(0, (s, r) => s + r.amount) / priorRows.length;
    final double? priceChangePct = priorAvg > 0 ? ((last.amount - priorAvg) / priorAvg) * 100 : null;
    final priceChanged = priceChangePct != null && priceChangePct.abs() >= 5;

    out.add(Subscription(
      merchant: canonicalStoreName(e.rawName),
      storeKey: e.key,
      category: e.category,
      interval: bestKind.name,
      intervalLabel: bestKind.label,
      occurrences: e.rows.length,
      avgAmount: avg,
      lastAmount: last.amount,
      lastDate: last.date,
      monthlyCost: avg * (bestKind.perYear / 12),
      priceChanged: priceChanged,
      priceChangePct: priceChangePct,
    ));
  }

  // Highest monthly equivalent first.
  out.sort((a, b) => b.monthlyCost.compareTo(a.monthlyCost));
  return out;
}

class SubscriptionsSummary {
  final int count;
  final double monthlyTotal;
  final double annualTotal;
  final int priceIncreaseCount;
  const SubscriptionsSummary({
    required this.count, required this.monthlyTotal,
    required this.annualTotal, required this.priceIncreaseCount,
  });
}

SubscriptionsSummary summarizeSubscriptions(List<Subscription> subs) {
  double m = 0, a = 0;
  int up = 0;
  for (final s in subs) {
    m += s.monthlyCost;
    a += s.monthlyCost * 12;
    if (s.priceChanged && (s.priceChangePct ?? 0) > 0) up += 1;
  }
  return SubscriptionsSummary(
    count: subs.length,
    monthlyTotal: m,
    annualTotal: a,
    priceIncreaseCount: up,
  );
}
