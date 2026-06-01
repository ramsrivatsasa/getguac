import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:getguac/services/guacoscore.dart';

void main() {
  final fixturesPath = '${Directory.current.path}/../test-fixtures/guacoscore.json';
  final raw = File(fixturesPath).readAsStringSync();
  final fixtures = jsonDecode(raw) as Map<String, dynamic>;
  final cases = (fixtures['cases'] as List).cast<Map<String, dynamic>>();

  group('calculateGuacoScore — cross-platform fixtures', () {
    for (final c in cases) {
      test(c['name'] as String, () {
        final input = c['input'] as Map<String, dynamic>;
        final expected = c['expected'] as Map<String, dynamic>;

        final receipts = (input['receipts'] as List).map((r) {
          final m = r as Map<String, dynamic>;
          return GuacoScoreInputReceipt(
            rating: m['rating'] as int?,
            totalAmount: (m['totalAmount'] as num).toDouble(),
          );
        }).toList();

        GuacoBankBite? bite;
        if (input['bankBite'] != null) {
          final b = input['bankBite'] as Map<String, dynamic>;
          bite = GuacoBankBite(
            interest: (b['interest'] as num).toDouble(),
            fees:     (b['fees']     as num).toDouble(),
          );
        }

        final result = calculateGuacoScore(receipts, bankBite: bite);
        expect(result.score, equals(expected['score']),
          reason: '${c['name']}: score');
        expect(result.ratedCount, equals(expected['ratedCount']),
          reason: '${c['name']}: ratedCount');
        expect(result.bankPenalty, equals(expected['bankPenalty']),
          reason: '${c['name']}: bankPenalty');
      });
    }
  });
}
