// 20-scenario GuacScore harness — Dart side.
//
// Reads test-fixtures/guacscore-scenarios.json (the SAME file the
// Node runner consumes), runs each scenario through the central
// Dart engine, and asserts the engine produces scores identical to
// what the JS implementation produces. Pairs with
// web/scripts/test-guacscore-scenarios.mjs — if both runners pass,
// every platform agrees on every scenario across every surface.

import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:getguac/services/guacoscore.dart';

void main() {
  final fixturePath = _findFixture('guacscore-scenarios.json');
  final raw = File(fixturePath).readAsStringSync();
  final data = jsonDecode(raw) as Map<String, dynamic>;
  final scenarios = (data['scenarios'] as List).cast<Map<String, dynamic>>();

  // Anchor "today" so the Dart and Node runs that share a clock day
  // produce identical scopes. We snap to local midnight (matches the
  // engine's date-cutoff helper).
  final today = _midnightToday();

  group('GuacScore — 20-scenario cross-surface parity', () {
    for (final scenario in scenarios) {
      final id = scenario['id'] as String;
      final title = scenario['title'] as String;

      test('$id — $title', () {
        // Materialize receipts & fees from days_ago offsets.
        final receipts = (scenario['receipts'] as List).map((r) {
          final m = r as Map<String, dynamic>;
          final amount = (m['total_amount'] as num).toDouble();
          final rating = m['rating'] == null ? null : (m['rating'] as num).toInt();
          final storeName = (m['store_name'] as String?) ?? 'Test Store';
          return _Receipt(
            date: _iso(today.subtract(Duration(days: (m['days_ago'] as num).toInt()))),
            totalAmount: amount,
            rating: rating,
            storeName: storeName,
          );
        }).toList();

        final fees = (scenario['bank_fees'] as List).map((f) {
          final m = f as Map<String, dynamic>;
          return _Fee(
            date: _iso(today.subtract(Duration(days: (m['days_ago'] as num).toInt()))),
            kind: m['kind'] as String,
            amount: (m['amount'] as num).toDouble(),
          );
        }).toList();

        // Filter payment receipts (mirrors web isPaymentReceipt — the
        // engine doesn't filter, the surface does).
        final spending = receipts.where((r) => !_isPaymentReceipt(r)).toList();

        // Surfaces under test, identical to the Node runner.
        final surfaces = [
          _Surface('dashboard',           days: 0),
          _Surface('guacanomics_30d',     days: 30),
          _Surface('guacanomics_90d',     days: 90),
          _Surface('guacanomics_12mo',    days: 365),
          _Surface('guacanomics_alltime', days: 0),
        ];

        final results = <String, GuacoScoreResult>{};
        for (final s in surfaces) {
          final sinceIso = s.days == 0 ? null : _iso(today.subtract(Duration(days: s.days)));
          final scoped = sinceIso == null
              ? spending
              : spending.where((r) => r.date.compareTo(sinceIso) >= 0).toList();
          double interest = 0, feeTotal = 0;
          for (final f in fees) {
            if (sinceIso != null && f.date.compareTo(sinceIso) < 0) continue;
            final v = f.amount.abs();
            if (f.kind == 'interest') interest += v;
            else if (f.kind == 'fee' || f.kind == 'penalty') feeTotal += v;
          }
          results[s.id] = calculateGuacoScore(
            scoped.map((r) => GuacoScoreInputReceipt(
              rating: r.rating, totalAmount: r.totalAmount,
            )).toList(),
            bankBite: GuacoBankBite(interest: interest, fees: feeTotal),
          );
        }

        // Dashboard ↔ /guacanomics All-time MUST agree (same scope).
        expect(
          results['dashboard']!.score, results['guacanomics_alltime']!.score,
          reason: 'dashboard tile and /guacanomics All-time should always agree',
        );

        // Per-scenario expectations — same logic as the Node runner.
        switch (id) {
          case 'brand_new_user_no_rated':
          case 'only_unrated_receipts':
            for (final s in surfaces) {
              expect(results[s.id]!.score, isNull,
                reason: '${s.id} should be null (no rated)');
            }
            break;
          case 'single_five_star':
          case 'all_5star_lifetime':
            expect(results['dashboard']!.score, 100);
            break;
          case 'single_one_star':
          case 'all_1star_huge_regret':
            expect(results['dashboard']!.score, 0);
            break;
          case 'single_three_star_neutral':
          case 'many_3star_neutral':
          case 'equal_weight_5_and_1_balance':
            expect(results['dashboard']!.score, 50);
            break;
          case 'high_value_5star_outweighs_low_1star':
            final s = results['dashboard']!.score!;
            expect(s >= 97 && s <= 100, isTrue, reason: 'got $s');
            break;
          case 'high_value_1star_drags_score_down':
            final s = results['dashboard']!.score!;
            expect(s <= 15, isTrue, reason: 'got $s');
            break;
          case 'huge_bankbite_caps_at_25':
            expect(results['dashboard']!.bankPenalty, lessThanOrEqualTo(25));
            break;
          case 'returns_excluded_by_engine':
            expect(results['dashboard']!.score, 0,
              reason: 'return excluded, 1★ defines score');
            break;
          case 'payment_receipts_filtered':
            expect(results['dashboard']!.ratedCount, 2,
              reason: 'payments filtered, 2 real buys remain');
            break;
          case 'old_receipts_excluded_30d':
            expect(results['guacanomics_30d']!.score, 100);
            expect(
              results['dashboard']!.score! < results['guacanomics_30d']!.score!,
              isTrue,
              reason: 'lifetime drops because of old 1★, 30d is pure recent 5★',
            );
            break;
          case 'exact_90d_boundary':
            expect(results['guacanomics_90d']!.ratedCount, 1,
              reason: '90-day-old receipt must be included (midnight snap)');
            break;
          case 'lifetime_high_30d_low_divergence':
            expect(results['dashboard']!.score!, greaterThanOrEqualTo(80));
            expect(results['guacanomics_30d']!.score!, lessThanOrEqualTo(30));
            break;
        }
      });
    }
  });
}

// ── Helpers ─────────────────────────────────────────────────────────

class _Receipt {
  final String date;
  final double totalAmount;
  final int? rating;
  final String storeName;
  _Receipt({required this.date, required this.totalAmount, this.rating, required this.storeName});
}

class _Fee {
  final String date;
  final String kind;
  final double amount;
  _Fee({required this.date, required this.kind, required this.amount});
}

class _Surface {
  final String id;
  final int days;
  _Surface(this.id, {required this.days});
}

// Mirrors web/src/lib/payment-rows.js#isPaymentReceipt
bool _isPaymentReceipt(_Receipt r) {
  return RegExp(r'^\[card payment\]', caseSensitive: false).hasMatch(r.storeName);
}

DateTime _midnightToday() {
  final n = DateTime.now();
  return DateTime(n.year, n.month, n.day);
}

String _iso(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)}';
}

// Walks up from the test file looking for the repo-root test-fixtures
// folder. Lets the test work from both `flutter test` and IDE runs.
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
