// GuacWizard health score — TWO paths, ONE source of truth.
//
// 1. Remote path (preferred): `WizardScoreApi.compute({days})` hits
//    GET /api/guacwizard on the server, which runs the canonical
//    `computeWizardScore` in web/src/lib/wizardScore.js. Same engine
//    web uses → guaranteed identical scores.
//
// 2. Local Dart port (fallback): `computeWizardScore(...)` runs the
//    same math locally so an offline / API-down build still scores.
//    Validated against the JS via test-fixtures/score-engines.json +
//    test-fixtures/guacwizard-scenarios.json (cross-platform).
//
// Input: aggregated bank totals over the active time-frame window.
//   summary = { totalInterest, totalFees, totalPayments,
//               totalPurchases, totalRefunds, netDebtChange }
//   accounts = [{ latestApr }, ...]
//
// Output: WizardScoreResult { score (0-100, null if no summary),
//                             reasons (list of label+why pairs) }

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'analysis_engine.dart' show BankData;

class WizardSummary {
  final double totalInterest;
  final double totalFees;
  final double totalPayments;
  final double totalPurchases;
  final double totalRefunds;
  double get netDebtChange => totalPurchases - totalRefunds - totalPayments;

  const WizardSummary({
    this.totalInterest = 0,
    this.totalFees = 0,
    this.totalPayments = 0,
    this.totalPurchases = 0,
    this.totalRefunds = 0,
  });
}

class WizardAccount {
  final double? latestApr;
  const WizardAccount({this.latestApr});
}

class WizardReason {
  final String label;
  final String why;
  const WizardReason(this.label, this.why);
}

class WizardScoreResult {
  final int? score;
  final List<WizardReason> reasons;
  const WizardScoreResult({this.score, this.reasons = const []});
}

WizardScoreResult computeWizardScore({
  required WizardSummary summary,
  required List<WizardAccount> accounts,
}) {
  int score = 100;
  final reasons = <WizardReason>[];

  if (summary.totalInterest > 0) {
    final penalty = (summary.totalInterest / 10).round().clamp(0, 35);
    score -= penalty;
    reasons.add(WizardReason('-$penalty', '\$${summary.totalInterest.toStringAsFixed(2)} in interest paid'));
  }
  if (summary.totalFees > 0) {
    final penalty = (summary.totalFees / 5).round().clamp(0, 20);
    score -= penalty;
    reasons.add(WizardReason('-$penalty', '\$${summary.totalFees.toStringAsFixed(2)} in fees paid'));
  }
  final netDebt = summary.netDebtChange;
  if (summary.totalPurchases > 0 && netDebt > 100) {
    final penalty = (netDebt / 50).round().clamp(0, 20);
    score -= penalty;
    reasons.add(WizardReason('-$penalty', 'Debt grew by \$${netDebt.toStringAsFixed(2)}'));
  } else if (netDebt < -100) {
    final bonus = (netDebt.abs() / 100).round().clamp(0, 10);
    score += bonus;
    reasons.add(WizardReason('+$bonus', 'Debt down \$${netDebt.abs().toStringAsFixed(2)}'));
  }

  final highApr = accounts.where((a) => a.latestApr != null && a.latestApr! >= 25).length;
  if (highApr > 0) {
    score -= highApr * 5;
    reasons.add(WizardReason('-${highApr * 5}', '$highApr card(s) above 25% APR'));
  }

  // Cold-start baseline — no statements uploaded yet.
  if (accounts.isEmpty) {
    score = 50;
    reasons.add(const WizardReason('baseline', 'No statements uploaded yet'));
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return WizardScoreResult(score: score, reasons: reasons);
}

// Aggregate raw bank rows (already filtered to the active window
// via the analysis engine's date helpers) into the summary +
// accounts shape computeWizardScore expects.
//
// Mirrors the JS bankAccountTotals categorisation:
//   - interest: kind='interest' fees + is_interest transactions
//   - fees:     kind in (fee, penalty) + is_fee transactions
//   - payments: is_payment transactions
//   - purchases: positive txns that aren't payment/fee/interest/refund
//   - refunds: is_refund or negative non-payment/fee/interest txns
WizardSummaryAndAccounts aggregateBankForWizard({
  required BankData bank,
  required String? startStr,
  required String? endStr,
}) {
  // Group statements by account-last4 (or issuer fallback). Walk
  // statements once to populate accounts; walk fees/txns to sum.
  final accountsMap = <String, _AccountBucket>{};
  for (final s in bank.statements) {
    final last4 = s['account_last4']?.toString();
    final issuer = (s['issuer'] ?? 'unknown').toString().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '');
    final key = (last4 != null && last4.isNotEmpty) ? 'acct:$last4' : 'issuer:$issuer';
    final b = accountsMap.putIfAbsent(key, () => _AccountBucket());

    final stmtDate = (s['period_end'] ?? s['uploaded_at']?.toString().substring(0, 10) ?? '').toString();
    final inRange = _inRange(stmtDate, startStr, endStr);
    if (inRange || stmtDate.isEmpty) {
      final totals = s['totals'] as Map<String, dynamic>? ?? const {};
      b.totalInterest  += _num(totals['interest']);
      b.totalFees      += _num(totals['fees']);
      b.totalPayments  += _num(totals['payments']);
      b.totalPurchases += _num(totals['purchases']);
      b.totalRefunds   += _num(totals['refunds']);
    }
    final pe = (s['period_end'] ?? '').toString();
    if (b.latestPeriodEnd == null || (pe.isNotEmpty && pe.compareTo(b.latestPeriodEnd!) > 0)) {
      b.latestPeriodEnd = pe.isNotEmpty ? pe : b.latestPeriodEnd;
      final apr = s['purchase_apr'];
      if (apr != null) b.latestApr = double.tryParse(apr.toString());
    }
  }

  // Cross-check via raw fees / transactions row scan (prefer the
  // larger of AI total vs row sum so missing fields don't underreport).
  for (final b in accountsMap.values) {
    final feeRows = bank.fees.where((f) => _inRange((f['date'] ?? '').toString(), startStr, endStr)).toList();
    final txnRows = bank.transactions.where((t) => _inRange((t['date'] ?? '').toString(), startStr, endStr)).toList();
    final cInterest = _sumAbsWhere(feeRows, (f) => f['kind'] == 'interest')
                    + _sumAbsWhere(txnRows, (t) => t['is_interest'] == true);
    final cFees     = _sumAbsWhere(feeRows, (f) => f['kind'] == 'fee' || f['kind'] == 'penalty')
                    + _sumAbsWhere(txnRows, (t) => t['is_fee'] == true);
    final cPayments = _sumAbsWhere(txnRows, (t) => t['is_payment'] == true);
    final cPurchases = _sumPosWhere(txnRows, (t) {
      final amt = _num(t['amount']);
      return t['is_payment'] != true && t['is_fee'] != true
          && t['is_interest'] != true && t['is_refund'] != true
          && amt > 0;
    });
    final cRefunds = _sumAbsWhere(txnRows, (t) {
      final amt = _num(t['amount']);
      return t['is_refund'] == true
          || (amt < 0 && t['is_payment'] != true && t['is_fee'] != true && t['is_interest'] != true);
    });
    if (cInterest  > b.totalInterest)  b.totalInterest  = cInterest;
    if (cFees      > b.totalFees)      b.totalFees      = cFees;
    if (cPayments  > b.totalPayments)  b.totalPayments  = cPayments;
    if (cPurchases > b.totalPurchases) b.totalPurchases = cPurchases;
    if (cRefunds   > b.totalRefunds)   b.totalRefunds   = cRefunds;
  }

  double sumInterest = 0, sumFees = 0, sumPayments = 0, sumPurch = 0, sumRefunds = 0;
  final accounts = <WizardAccount>[];
  for (final b in accountsMap.values) {
    sumInterest += b.totalInterest;
    sumFees     += b.totalFees;
    sumPayments += b.totalPayments;
    sumPurch    += b.totalPurchases;
    sumRefunds  += b.totalRefunds;
    accounts.add(WizardAccount(latestApr: b.latestApr));
  }

  // Fallback for users who have bank_fees / bank_transactions but
  // no bank_statements yet (e.g. fees imported directly without an
  // attached statement). Without this, accounts stays empty and
  // computeWizardScore falls into the "no statements uploaded yet"
  // baseline (50) — making the dashboard tile show 50 even when
  // the detail screen clearly shows fee data.
  //
  // Scan fees + transactions in the active window, sum them as a
  // synthetic single account so the score is computed from the
  // data the user actually has.
  if (accounts.isEmpty) {
    final feeRows = bank.fees.where((f) => _inRange((f['date'] ?? '').toString(), startStr, endStr)).toList();
    final txnRows = bank.transactions.where((t) => _inRange((t['date'] ?? '').toString(), startStr, endStr)).toList();
    if (feeRows.isNotEmpty || txnRows.isNotEmpty) {
      sumInterest = _sumAbsWhere(feeRows, (f) => f['kind'] == 'interest')
                  + _sumAbsWhere(txnRows, (t) => t['is_interest'] == true);
      sumFees     = _sumAbsWhere(feeRows, (f) => f['kind'] == 'fee' || f['kind'] == 'penalty')
                  + _sumAbsWhere(txnRows, (t) => t['is_fee'] == true);
      sumPayments = _sumAbsWhere(txnRows, (t) => t['is_payment'] == true);
      sumPurch    = _sumPosWhere(txnRows, (t) {
        final amt = _num(t['amount']);
        return t['is_payment'] != true && t['is_fee'] != true
            && t['is_interest'] != true && t['is_refund'] != true
            && amt > 0;
      });
      sumRefunds  = _sumAbsWhere(txnRows, (t) {
        final amt = _num(t['amount']);
        return t['is_refund'] == true
            || (amt < 0 && t['is_payment'] != true && t['is_fee'] != true && t['is_interest'] != true);
      });
      // Synthetic account — no APR known, so high-APR penalty
      // can't fire. Just lets accounts.length > 0 so the baseline
      // path doesn't trip.
      accounts.add(const WizardAccount());
    }
  }

  return WizardSummaryAndAccounts(
    summary: WizardSummary(
      totalInterest: sumInterest,
      totalFees: sumFees,
      totalPayments: sumPayments,
      totalPurchases: sumPurch,
      totalRefunds: sumRefunds,
    ),
    accounts: accounts,
  );
}

class WizardSummaryAndAccounts {
  final WizardSummary summary;
  final List<WizardAccount> accounts;
  const WizardSummaryAndAccounts({required this.summary, required this.accounts});
}

class _AccountBucket {
  double totalInterest = 0, totalFees = 0, totalPayments = 0, totalPurchases = 0, totalRefunds = 0;
  String? latestPeriodEnd;
  double? latestApr;
}

double _num(dynamic v) => double.tryParse((v ?? '0').toString()) ?? 0;
double _sumAbsWhere(List<Map<String, dynamic>> rows, bool Function(Map<String, dynamic>) f) {
  double s = 0;
  for (final r in rows) { if (f(r)) s += _num(r['amount']).abs(); }
  return s;
}
double _sumPosWhere(List<Map<String, dynamic>> rows, bool Function(Map<String, dynamic>) f) {
  double s = 0;
  for (final r in rows) { if (f(r)) s += _num(r['amount']); }
  return s;
}
bool _inRange(String d, String? startStr, String? endStr) {
  if (d.length < 10) return false;
  if (startStr != null && d.compareTo(startStr) < 0) return false;
  if (endStr   != null && d.compareTo(endStr) >= 0) return false;
  return true;
}

// ── Remote engine (canonical path) ──────────────────────────────────

class WizardScoreApi {
  /// API base — points at production by default. Tests + local dev
  /// override via the optional `apiBase` argument.
  static const String defaultApiBase = 'https://getguac.app';

  /// Compute the score for the signed-in user via the server-side
  /// canonical engine.
  ///
  /// `days` 0 → lifetime score (matches the dashboard tile in
  /// All-time mode). `days` N → trailing N-day window.
  ///
  /// Throws on auth failure or non-2xx so the caller can fall back
  /// to the local engine for offline scenarios.
  static Future<WizardScoreResult> compute({
    int days = 0,
    String apiBase = defaultApiBase,
  }) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('not signed in');
    final uri = Uri.parse('$apiBase/api/guacwizard${days > 0 ? '?days=$days' : ''}');
    final res = await http.get(uri, headers: {
      'Authorization': 'Bearer ${session.accessToken}',
    });
    if (res.statusCode >= 400) {
      throw Exception('guacwizard ${res.statusCode}: ${res.body}');
    }
    final j = jsonDecode(res.body) as Map<String, dynamic>;
    final scoreRaw = j['score'];
    final reasonsList = (j['reasons'] as List?) ?? const [];
    return WizardScoreResult(
      score: scoreRaw is num ? scoreRaw.toInt() : null,
      reasons: reasonsList.map((r) {
        final m = r as Map;
        return WizardReason(
          (m['label'] ?? '').toString(),
          (m['why'] ?? '').toString(),
        );
      }).toList(),
    );
  }

  /// Convenience: call the API; on any failure return null so the
  /// caller can transparently fall back to a local compute.
  static Future<WizardScoreResult?> computeOrNull({
    int days = 0,
    String apiBase = defaultApiBase,
  }) async {
    try { return await compute(days: days, apiBase: apiBase); }
    catch (_) { return null; }
  }
}
