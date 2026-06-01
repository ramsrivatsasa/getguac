// Centralized dashboard analysis — Dart port of
// web/src/lib/analysisEngine.js. Single source of truth for the
// mobile dashboard's eight financial metrics, current vs. prior
// period delta included, so the iOS/Android app and the web app
// show the same numbers for the same window.
//
// Two entry points:
//   - computeDashboardAnalysis(...) — pure function over already-
//     loaded data. Use this if the caller already has receipts +
//     bank rows in memory.
//   - fetchDashboardAnalysis(...)   — convenience wrapper that
//     pulls statements / fees / transactions from Supabase (RLS-
//     scoped) and runs the engine.

import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/receipt_model.dart';
import '../payment_rows.dart';

class MetricValue {
  final double current;
  final double prior;
  final double? deltaPct;
  final String? deltaArrow;
  final String deltaLabel;
  const MetricValue({
    required this.current,
    required this.prior,
    this.deltaPct,
    this.deltaArrow,
    required this.deltaLabel,
  });
}

class DashboardAnalysis {
  final String period;
  final int periodCount;
  final String rangeStart;
  final String priorRangeStart;
  final Map<String, MetricValue> metrics;
  const DashboardAnalysis({
    required this.period,
    required this.periodCount,
    required this.rangeStart,
    required this.priorRangeStart,
    required this.metrics,
  });
}

class BankData {
  final List<Map<String, dynamic>> statements;
  final List<Map<String, dynamic>> fees;
  final List<Map<String, dynamic>> transactions;
  const BankData({
    required this.statements,
    required this.fees,
    required this.transactions,
  });
  static const empty = BankData(statements: [], fees: [], transactions: []);
}

// ── Period helpers ─────────────────────────────────────────────────
DateTime periodStartDate(String period, int count) {
  final now = DateTime.now();
  final n = count < 1 ? 1 : count;
  switch (period) {
    case 'daily':   return DateTime(now.year, now.month, now.day - n);
    case 'weekly':  return DateTime(now.year, now.month, now.day - (n * 7));
    case 'monthly': return DateTime(now.year, now.month - n, now.day);
    case 'yearly':  return DateTime(now.year - n, now.month, now.day);
    default:        return now;
  }
}

String toIsoDate(DateTime d) {
  final m  = d.month.toString().padLeft(2, '0');
  final dd = d.day.toString().padLeft(2, '0');
  return '${d.year}-$m-$dd';
}

String periodStartIso(String period, int count) =>
    toIsoDate(periodStartDate(period, count));

// ── Delta calculation — mirrors web's buildDelta ─────────────────────
MetricValue _metric(double current, double prior) {
  if (prior == 0) {
    return MetricValue(current: current, prior: prior, deltaLabel: '—');
  }
  final pct = ((current - prior) / prior) * 100;
  final arrow = pct > 1 ? '↑' : pct < -1 ? '↓' : '→';
  final label = arrow == '→' ? '—' : '$arrow ${pct.abs().toStringAsFixed(0)}%';
  return MetricValue(
    current: current, prior: prior,
    deltaPct: pct, deltaArrow: arrow, deltaLabel: label,
  );
}

// ── Range-filter helpers ────────────────────────────────────────────
List<Map<String, dynamic>> _filterByDateStr(
  List<Map<String, dynamic>> rows,
  String dateField,
  String? startStr,
  String? endStr,
) {
  return rows.where((r) {
    final d = (r[dateField] ?? '').toString();
    if (d.length < 10) return false;
    if (startStr != null && d.compareTo(startStr) < 0) return false;
    if (endStr   != null && d.compareTo(endStr)   >= 0) return false;
    return true;
  }).toList();
}

List<Receipt> _filterReceiptsByDateStr(
  List<Receipt> rows,
  String? startStr,
  String? endStr,
) {
  return rows.where((r) {
    final d = r.date;
    if (d.length < 10) return false;
    if (startStr != null && d.compareTo(startStr) < 0) return false;
    if (endStr   != null && d.compareTo(endStr)   >= 0) return false;
    return true;
  }).toList();
}

// ── Receipt-side totals over a window ────────────────────────────────
class _ReceiptTotals {
  final int transactions;
  final double totalSpent;
  final double taxPaid;
  final double bankFees;
  const _ReceiptTotals({
    required this.transactions,
    required this.totalSpent,
    required this.taxPaid,
    required this.bankFees,
  });
}

_ReceiptTotals _receiptWindowTotals(List<Receipt> receipts, String? startStr, String? endStr) {
  final rows = _filterReceiptsByDateStr(receipts, startStr, endStr);
  double totalSpent = 0, taxPaid = 0, bankFees = 0;
  for (final r in rows) {
    totalSpent += r.totalAmount;
    taxPaid   += r.taxPaid;
    if (r.category == 'bank-fees') bankFees += r.totalAmount;
  }
  return _ReceiptTotals(
    transactions: rows.length,
    totalSpent: totalSpent,
    taxPaid: taxPaid,
    bankFees: bankFees,
  );
}

// ── Bank-side totals over a window — mirrors the categorisation in
//    web/src/lib/financeInsights.bankAccountTotals so the numbers
//    match what /api/analysis returns.
class _BankTotals {
  final double interest;
  final double fees;
  final double payments;
  final double purchases;
  const _BankTotals({
    required this.interest,
    required this.fees,
    required this.payments,
    required this.purchases,
  });
}

double _sumAbs(List<Map<String, dynamic>> rows, [bool Function(Map<String, dynamic>)? where]) {
  double s = 0;
  for (final r in rows) {
    if (where != null && !where(r)) continue;
    final v = double.tryParse((r['amount'] ?? 0).toString()) ?? 0;
    s += v.abs();
  }
  return s;
}

double _sumPos(List<Map<String, dynamic>> rows, [bool Function(Map<String, dynamic>)? where]) {
  double s = 0;
  for (final r in rows) {
    if (where != null && !where(r)) continue;
    final v = double.tryParse((r['amount'] ?? 0).toString()) ?? 0;
    s += v;
  }
  return s;
}

_BankTotals _bankWindowTotals(BankData bank, String? startStr, String? endStr) {
  final feeRows = _filterByDateStr(bank.fees, 'date', startStr, endStr);
  final txnRows = _filterByDateStr(bank.transactions, 'date', startStr, endStr);

  bool flag(Map<String, dynamic> m, String key) => m[key] == true;

  final interest = _sumAbs(feeRows, (f) => f['kind'] == 'interest')
                 + _sumAbs(txnRows, (t) => flag(t, 'is_interest'));
  final fees     = _sumAbs(feeRows, (f) => f['kind'] == 'fee' || f['kind'] == 'penalty')
                 + _sumAbs(txnRows, (t) => flag(t, 'is_fee'));
  final payments = _sumAbs(txnRows, (t) => flag(t, 'is_payment'));
  final purchases = _sumPos(txnRows, (t) {
    final amt = double.tryParse((t['amount'] ?? 0).toString()) ?? 0;
    return !flag(t, 'is_payment') && !flag(t, 'is_fee')
        && !flag(t, 'is_interest') && !flag(t, 'is_refund')
        && amt > 0;
  });
  return _BankTotals(interest: interest, fees: fees, payments: payments, purchases: purchases);
}

// ── Public API ──────────────────────────────────────────────────────
DashboardAnalysis computeDashboardAnalysis({
  required List<Receipt> receipts,
  required BankData bank,
  required String period,
  required int periodCount,
}) {
  // Same pre-filter the web engine applies — strip card-payment /
  // transfer rows so they don't get double-counted.
  final spendingReceipts = receipts.where((r) => !isPaymentReceipt(r)).toList();

  final currentStart = periodStartIso(period, periodCount);
  final priorStart   = periodStartIso(period, periodCount * 2);

  final curr = _receiptWindowTotals(spendingReceipts, currentStart, null);
  final prev = _receiptWindowTotals(spendingReceipts, priorStart, currentStart);
  final currBank = _bankWindowTotals(bank, currentStart, null);
  final prevBank = _bankWindowTotals(bank, priorStart, currentStart);

  return DashboardAnalysis(
    period: period,
    periodCount: periodCount,
    rangeStart: currentStart,
    priorRangeStart: priorStart,
    metrics: {
      'transactions': _metric(curr.transactions.toDouble(), prev.transactions.toDouble()),
      'totalSpent':   _metric(curr.totalSpent,              prev.totalSpent),
      'taxPaid':      _metric(curr.taxPaid,                 prev.taxPaid),
      'bankFees':     _metric(curr.bankFees,                prev.bankFees),
      'purchases':    _metric(currBank.purchases,           prevBank.purchases),
      'payments':     _metric(currBank.payments,            prevBank.payments),
      'interestPaid': _metric(currBank.interest,            prevBank.interest),
      'feesPaid':     _metric(currBank.fees,                prevBank.fees),
    },
  );
}

/// Fetch bank rows from Supabase (RLS-scoped to the current user).
/// Returns BankData.empty on any failure so callers don't have to
/// branch — the analysis engine handles empty arrays cleanly.
Future<BankData> fetchBankData() async {
  final sb = Supabase.instance.client;
  final user = sb.auth.currentUser;
  if (user == null) return BankData.empty;
  try {
    final results = await Future.wait([
      sb.from('bank_statements').select('*').order('period_end', ascending: false, nullsFirst: false).order('id'),
      sb.from('bank_fees').select('*').order('date', ascending: false, nullsFirst: false).order('id'),
      sb.from('bank_transactions').select('*').order('date', ascending: false, nullsFirst: false).order('id'),
    ]);
    return BankData(
      statements:   List<Map<String, dynamic>>.from(results[0] as List),
      fees:         List<Map<String, dynamic>>.from(results[1] as List),
      transactions: List<Map<String, dynamic>>.from(results[2] as List),
    );
  } catch (_) {
    return BankData.empty;
  }
}
