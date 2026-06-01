// Cross-platform fixture test. Reads test-fixtures/score-engines.json
// (shared with the web JS suite) and asserts the Dart engine produces
// the same score the JS engine produces. If you change either engine,
// run BOTH `mobile/flutter test` AND `web/npm test` — if either side
// diverges, the engines have drifted and the dashboard tile + the
// /guacanomics + /guacwizard pages will disagree.
//
// Run:  cd mobile && flutter test test/services/wizard_score_test.dart

import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:getguac/services/wizard_score.dart';
import 'package:getguac/services/analysis_engine.dart';

void main() {
  final fixturesPath = '${Directory.current.path}/../test-fixtures/score-engines.json';
  final raw = File(fixturesPath).readAsStringSync();
  final fixtures = jsonDecode(raw) as Map<String, dynamic>;
  final wizardCases = (fixtures['wizardScore'] as List).cast<Map<String, dynamic>>();
  final aggCases = (fixtures['aggregateBankForWizard'] as List? ?? []).cast<Map<String, dynamic>>();

  group('computeWizardScore — cross-platform fixtures', () {
    for (final c in wizardCases) {
      test(c['name'] as String, () {
        final input = c['input'] as Map<String, dynamic>;
        final expected = c['expected'] as Map<String, dynamic>;
        // Field name can be totalPurch OR totalPurchases (web/Dart drift).
        // Accept either so the same fixture works on both engines.
        final s = input['summary'] as Map<String, dynamic>;
        final purchasesField = s['totalPurchases'] ?? s['totalPurch'] ?? 0;
        final summary = WizardSummary(
          totalInterest:  _n(s['totalInterest']),
          totalFees:      _n(s['totalFees']),
          totalPayments:  _n(s['totalPayments']),
          totalPurchases: _n(purchasesField),
          totalRefunds:   _n(s['totalRefunds']),
        );
        final accounts = (input['accounts'] as List).map((a) {
          final apr = (a as Map<String, dynamic>)['latestApr'];
          return WizardAccount(latestApr: apr == null ? null : _n(apr));
        }).toList();

        final result = computeWizardScore(summary: summary, accounts: accounts);
        expect(result.score, equals(expected['score']),
          reason: 'Case "${c['name']}" — Dart score should match expected (web parity).');
      });
    }
  });

  group('aggregateBankForWizard — pipeline fixtures', () {
    for (final c in aggCases) {
      test(c['name'] as String, () {
        final input = c['input'] as Map<String, dynamic>;
        final expected = c['expected'] as Map<String, dynamic>;
        final bank = BankData(
          statements:   List<Map<String, dynamic>>.from(input['statements'] as List),
          fees:         List<Map<String, dynamic>>.from(input['fees'] as List),
          transactions: List<Map<String, dynamic>>.from(input['transactions'] as List),
        );
        final agg = aggregateBankForWizard(
          bank: bank,
          startStr: input['startStr'] as String?,
          endStr:   input['endStr']   as String?,
        );
        final want = expected['summaryTotals'] as Map<String, dynamic>;
        expect(agg.summary.totalInterest,  equals(_n(want['interest'])),
          reason: '${c['name']}: interest');
        expect(agg.summary.totalFees,      equals(_n(want['fees'])),
          reason: '${c['name']}: fees');
        expect(agg.summary.totalPayments,  equals(_n(want['payments'])),
          reason: '${c['name']}: payments');
        expect(agg.summary.totalPurchases, equals(_n(want['purchases'])),
          reason: '${c['name']}: purchases');
        expect(agg.accounts.length, equals(expected['accountsLength']),
          reason: '${c['name']}: accounts.length');
      });
    }
  });
}

double _n(dynamic v) => v == null ? 0 : (v as num).toDouble();
