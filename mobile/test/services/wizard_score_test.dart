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

void main() {
  final fixturesPath = '${Directory.current.path}/../test-fixtures/score-engines.json';
  final raw = File(fixturesPath).readAsStringSync();
  final fixtures = jsonDecode(raw) as Map<String, dynamic>;
  final wizardCases = (fixtures['wizardScore'] as List).cast<Map<String, dynamic>>();

  group('computeWizardScore — cross-platform fixtures', () {
    for (final c in wizardCases) {
      test(c['name'] as String, () {
        final input = c['input'] as Map<String, dynamic>;
        final expected = c['expected'] as Map<String, dynamic>;

        final summary = WizardSummary(
          totalInterest:  _n(input['summary']['totalInterest']),
          totalFees:      _n(input['summary']['totalFees']),
          totalPayments:  _n(input['summary']['totalPayments']),
          totalPurchases: _n(input['summary']['totalPurchases']),
          totalRefunds:   _n(input['summary']['totalRefunds']),
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
}

double _n(dynamic v) => (v as num).toDouble();
