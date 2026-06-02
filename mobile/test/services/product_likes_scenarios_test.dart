// 20-scenario harness for formatLikeCount — Dart side. Reads the
// SAME test-fixtures/product-likes-scenarios.json the Node runner
// consumes; both must produce identical output for every value.

import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:getguac/services/product_likes_service.dart';

void main() {
  final path = _findFixture('product-likes-scenarios.json');
  final data = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
  final scenarios = (data['scenarios'] as List).cast<Map<String, dynamic>>();

  group('formatLikeCount — cross-platform parity', () {
    for (final s in scenarios) {
      final id = s['id'] as String;
      final value = (s['value'] as num).toDouble();
      final expected = s['expectFormat'] as String;
      test('$id ($value → "$expected")', () {
        expect(formatLikeCount(value), expected,
          reason: 'Dart formatter drifted from JS for $id');
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
