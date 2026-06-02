// 20-scenario Stash aggregator harness — Dart side.
// Reads the SAME test-fixtures/stash-scenarios.json the Node runner
// consumes; runs each scenario through the Dart engine; asserts the
// aggregated output matches the JS implementation's behavior.

import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:getguac/services/stash_engine.dart';

void main() {
  final path = _findFixture('stash-scenarios.json');
  final data = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
  final scenarios = (data['scenarios'] as List).cast<Map<String, dynamic>>();

  group('Stash aggregator — 20-scenario cross-platform parity', () {
    for (final scenario in scenarios) {
      final id = scenario['id'] as String;
      final title = scenario['title'] as String;

      test('$id — $title', () {
        final rows = ((scenario['rows'] as List?) ?? const [])
            .map((r) => Map<String, dynamic>.from(r as Map))
            .toList();
        final aggregated = aggregateStashItems(rows);

        // Count assertion
        expect(aggregated.length, scenario['expect_count'] as int,
          reason: 'aggregated count mismatch for $id');

        // Per-item assertions
        final expectList = scenario['expect'] as List?;
        if (expectList != null) {
          for (final raw in expectList) {
            final exp = raw as Map<String, dynamic>;
            final key = exp['key'] as String;
            final actual = aggregated.firstWhere(
              (it) => it.key == key,
              orElse: () => throw StateError('Missing key=$key in aggregated output'),
            );
            for (final entry in exp.entries) {
              switch (entry.key) {
                case 'key':
                  break;
                case 'qty':
                  expect(actual.qty, entry.value, reason: '$key.qty');
                  break;
                case 'totalSpent':
                  expect((actual.totalSpent - (entry.value as num).toDouble()).abs() < 0.001,
                    isTrue, reason: '$key.totalSpent got ${actual.totalSpent}');
                  break;
                case 'timesBought':
                  expect(actual.timesBought, entry.value, reason: '$key.timesBought');
                  break;
                case 'lastDate':
                  expect(actual.lastDate, entry.value, reason: '$key.lastDate');
                  break;
                case 'lastReceiptId':
                  expect(actual.lastReceiptId, entry.value, reason: '$key.lastReceiptId');
                  break;
                case 'lastStore':
                  expect(actual.lastStore, entry.value, reason: '$key.lastStore');
                  break;
                case 'category':
                  expect(actual.category, entry.value, reason: '$key.category');
                  break;
                case 'ratingMax':
                  expect(actual.ratingMax, entry.value, reason: '$key.ratingMax');
                  break;
                case 'ratingCount':
                  expect(actual.ratingCount, entry.value, reason: '$key.ratingCount');
                  break;
                case 'ratingAvg':
                  final ev = (entry.value as num).toDouble();
                  expect(actual.ratingAvg != null && (actual.ratingAvg! - ev).abs() < 0.001,
                    isTrue, reason: '$key.ratingAvg got ${actual.ratingAvg}');
                  break;
                case 'storeCount':
                  expect(actual.storeCount, entry.value, reason: '$key.storeCount');
                  break;
              }
            }
          }
        }

        // Sort assertion
        final expectSort = scenario['expect_sort'] as String?;
        if (expectSort != null) {
          final mapped = {
            'recent': StashSort.recent,
            'alpha':  StashSort.alpha,
            'spent':  StashSort.spent,
            'qty':    StashSort.qty,
          }[expectSort]!;
          final order = sortStash(aggregated, mapped).map((it) => it.key).toList();
          expect(order, (scenario['expect_order'] as List).cast<String>(),
            reason: 'sort order mismatch for $id');
        }

        // Filter by category
        final fc = scenario['filter_category'] as String?;
        if (fc != null) {
          final filtered = filterStash(aggregated, category: fc);
          expect(filtered.length, scenario['expect_filtered_count'] as int,
            reason: 'filter category mismatch for $id');
        }

        // Filter by query
        final fq = scenario['filter_query'] as String?;
        if (fq != null) {
          final filtered = filterStash(aggregated, query: fq);
          expect(filtered.length, scenario['expect_filtered_count'] as int,
            reason: 'filter query mismatch for $id');
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
  throw StateError('Could not find test-fixtures/$name');
}
