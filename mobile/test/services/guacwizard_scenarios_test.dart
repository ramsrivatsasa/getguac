// 20-scenario GuacWizard harness — Dart side.
//
// Reads test-fixtures/guacwizard-scenarios.json (the SAME file the
// Node runner consumes), runs each scenario through the central
// Dart engine, asserts the engine produces the exact score the JS
// implementation produces, and verifies expected reason bands fire.
//
// Pair with web/scripts/test-guacwizard-scenarios.mjs — both pass
// → web + Android + iOS agree on every scenario.

import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:getguac/services/wizard_score.dart';

void main() {
  final fixturePath = _findFixture('guacwizard-scenarios.json');
  final data = jsonDecode(File(fixturePath).readAsStringSync()) as Map<String, dynamic>;
  final scenarios = (data['scenarios'] as List).cast<Map<String, dynamic>>();

  group('GuacWizard — 20-scenario cross-platform parity', () {
    for (final scenario in scenarios) {
      final id = scenario['id'] as String;
      final title = scenario['title'] as String;
      final expected = scenario['expected_score'] as int;

      test('$id — $title', () {
        final summaryRaw = scenario['summary'] as Map<String, dynamic>;
        // Dart's WizardSummary doesn't accept `totalPurch` directly
        // (the web spelling), but the field-name compat is checked
        // at the engine level — the engine handles either spelling
        // through a `totalPurch ?? totalPurchases` fallback. The
        // Dart engine takes a strongly-typed `WizardSummary`, so
        // we normalize input here.
        final totalPurchases = (summaryRaw['totalPurchases'] ?? summaryRaw['totalPurch'] ?? 0) as num;
        final summary = WizardSummary(
          totalInterest:  (summaryRaw['totalInterest']  ?? 0).toDouble(),
          totalFees:      (summaryRaw['totalFees']      ?? 0).toDouble(),
          totalPayments:  (summaryRaw['totalPayments']  ?? 0).toDouble(),
          totalPurchases: totalPurchases.toDouble(),
          totalRefunds:   (summaryRaw['totalRefunds']   ?? 0).toDouble(),
        );
        final accounts = (scenario['accounts'] as List).map((a) {
          final m = a as Map<String, dynamic>;
          final apr = m['latestApr'];
          return WizardAccount(
            latestApr: apr == null ? null : (apr as num).toDouble(),
          );
        }).toList();

        final result = computeWizardScore(summary: summary, accounts: accounts);

        // Primary: score matches expected exactly.
        expect(result.score, expected,
          reason: 'engine drifted from expected score for $id');

        // Reason-band assertions per scenario id — same checks the
        // Node runner makes. If a reason that should fire doesn't
        // (or vice versa), the engine has diverged.
        bool hasReason(String needle) =>
            result.reasons.any((r) => r.why.contains(needle));

        switch (id) {
          case 'perfect_no_data':
            expect(hasReason('No bank data') || hasReason('No statements'),
              isTrue, reason: 'cold-start baseline reason should fire');
            break;
          case 'moderate_interest_only':
          case 'heavy_interest_capped_at_35':
            expect(hasReason('interest paid'), isTrue);
            break;
          case 'moderate_fees_only':
          case 'heavy_fees_capped_at_20':
          case 'fees_only_no_statements_synthetic':
            expect(hasReason('fees paid'), isTrue);
            break;
          case 'debt_growth_penalty':
          case 'debt_growth_capped_at_20':
            expect(hasReason('Debt grew'), isTrue);
            break;
          case 'debt_shrunk_small_bonus':
          case 'debt_shrunk_bonus_capped_at_10':
            expect(hasReason('Debt down'), isTrue);
            break;
          case 'high_apr_single_card':
            expect(hasReason('1 card(s) above 25% APR'), isTrue);
            break;
          case 'high_apr_three_cards':
            expect(hasReason('3 card(s) above 25% APR'), isTrue);
            break;
          case 'worst_case_floor_at_zero':
            expect(result.score, greaterThanOrEqualTo(0),
              reason: 'score must never go negative');
            break;
          case 'best_case_ceiling_at_100':
            expect(result.score, 100,
              reason: 'score must cap at 100');
            break;
        }
      });
    }
  });
}

String _findFixture(String name) {
  var dir = Directory.current.absolute;
  for (var i = 0; i < 6; i++) {
    final candidate = File('${dir.path}/test-fixtures/$name');
    if (candidate.existsSync()) return candidate.path;
    final parent = dir.parent;
    if (parent.path == dir.path) break;
    dir = parent;
  }
  throw StateError('Could not find test-fixtures/$name walking up from ${Directory.current.path}');
}
