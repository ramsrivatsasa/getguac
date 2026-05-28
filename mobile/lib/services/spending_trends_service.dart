// Period-over-period trend math — Dart mirror of
// web/src/lib/spending-trends.js.
//
// Given the receipts already in memory + the dashboard's current
// (period, count), returns:
//   - total spend in the CURRENT window
//   - average spend per window across the prior N windows
//   - signed delta + percentage change
// Plus per-category breakdown for future per-category trend badges.
//
// Used by the dashboard's Total Spent tile (mobile parity with web).
// Mirrors the same exclusion rules as the rest of the spending stack:
// payments out, returns out, $0 rows out.

import '../models/receipt_model.dart';
import '../payment_rows.dart';

const int _kLookbackMultiplier = 3;

class CategoryTrend {
  final double current;
  final double priorAvg;
  final double? deltaPct;
  const CategoryTrend({required this.current, required this.priorAvg, required this.deltaPct});
}

class SpendingTrend {
  final double current;
  final double priorAvg;
  final double deltaAbs;
  final double? deltaPct;
  final Map<String, CategoryTrend> byCategory;
  const SpendingTrend({
    required this.current, required this.priorAvg,
    required this.deltaAbs, required this.deltaPct,
    required this.byCategory,
  });
}

/// Window length in days for a (period, count) selection. Matches the
/// chip-bucket math used by `_periodToReceiptsChip` so the trend lib
/// can be called with the same period/count the dashboard already
/// tracks in state.
int _windowDays(String period, int count) {
  final n = count < 1 ? 1 : count;
  switch (period) {
    case 'daily':   return n;
    case 'weekly':  return n * 7;
    case 'monthly': return n * 30;
    case 'yearly':  return n * 365;
    default:        return 30;
  }
}

String _cutoffStr(int daysAgo, DateTime from) {
  final d = from.subtract(Duration(days: daysAgo));
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final dd = d.day.toString().padLeft(2, '0');
  return '$y-$m-$dd';
}

SpendingTrend computeSpendingTrend(
  List<Receipt> receipts,
  String period,
  int count, {
  int lookbackMultiplier = _kLookbackMultiplier,
}) {
  final lb = lookbackMultiplier < 1 ? 1 : lookbackMultiplier;
  final winDays = _windowDays(period, count);
  final now = DateTime.now();
  final currentStart = _cutoffStr(winDays, now);
  final priorStart   = _cutoffStr(winDays * (lb + 1), now);

  double current = 0;
  double priorTotal = 0;
  final curCat   = <String, double>{};
  final priorCat = <String, double>{};

  for (final r in receipts) {
    if (r.isReturn) continue;
    if (isPaymentReceipt(r)) continue;
    if (r.totalAmount <= 0) continue;
    final d = r.date;
    if (d.length < 10) continue;
    final cat = (r.category ?? 'misc');

    if (d.compareTo(currentStart) >= 0) {
      current += r.totalAmount;
      curCat[cat] = (curCat[cat] ?? 0) + r.totalAmount;
    } else if (d.compareTo(priorStart) >= 0) {
      priorTotal += r.totalAmount;
      priorCat[cat] = (priorCat[cat] ?? 0) + r.totalAmount;
    }
  }

  final priorAvg = priorTotal / lb;
  final deltaAbs = current - priorAvg;
  final double? deltaPct = priorAvg > 0
      ? (deltaAbs / priorAvg) * 100
      : (current > 0 ? null : 0);

  final byCategory = <String, CategoryTrend>{};
  final allCats = {...curCat.keys, ...priorCat.keys};
  for (final slug in allCats) {
    final cur  = curCat[slug] ?? 0;
    final prAv = (priorCat[slug] ?? 0) / lb;
    final d    = cur - prAv;
    final pct  = prAv > 0 ? (d / prAv) * 100 : (cur > 0 ? null : 0.0);
    byCategory[slug] = CategoryTrend(current: cur, priorAvg: prAv, deltaPct: pct);
  }

  return SpendingTrend(
    current: current,
    priorAvg: priorAvg,
    deltaAbs: deltaAbs,
    deltaPct: deltaPct,
    byCategory: byCategory,
  );
}

class TrendFormat {
  final String label;     // "+18%", "-12%", "0%", "—"
  final String tone;      // "up" | "down" | "flat"
  const TrendFormat({required this.label, required this.tone});
}

/// Format a trend percentage for display. Tone semantics for spending:
/// up = current > prior (concerning); down = current < prior (good).
/// Pass inverseTone=true for surfaces where "more" is the good signal
/// (savings, refunds).
TrendFormat formatTrend(double? deltaPct, {bool inverseTone = false}) {
  if (deltaPct == null || deltaPct.isNaN || deltaPct.isInfinite) {
    return const TrendFormat(label: '—', tone: 'flat');
  }
  final rounded = deltaPct.round();
  if (rounded == 0) return const TrendFormat(label: '0%', tone: 'flat');
  final isUp = rounded > 0;
  final tone = isUp
      ? (inverseTone ? 'down' : 'up')
      : (inverseTone ? 'up'   : 'down');
  final sign = isUp ? '+' : '';
  return TrendFormat(label: '$sign$rounded%', tone: tone);
}
