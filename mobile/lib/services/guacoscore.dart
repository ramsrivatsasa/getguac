// GuacScore engine — Dart port of web/src/lib/guacoscore.js. Pure
// function so the same fixture file in test-fixtures/guacoscore.json
// runs through both engines and asserts identical output.

class GuacoScoreInputReceipt {
  final int? rating;
  final double totalAmount;
  const GuacoScoreInputReceipt({this.rating, required this.totalAmount});
}

class GuacoBankBite {
  final double interest;
  final double fees;
  const GuacoBankBite({this.interest = 0, this.fees = 0});
  double get total => interest + fees;
}

class GuacoScoreResult {
  final int? score;
  final int ratedCount;
  final double weightedSpend;
  final int bankPenalty;
  const GuacoScoreResult({
    this.score, required this.ratedCount,
    required this.weightedSpend, required this.bankPenalty,
  });
}

GuacoScoreResult calculateGuacoScore(
  List<GuacoScoreInputReceipt> receipts, {
  GuacoBankBite? bankBite,
}) {
  final rated = receipts.where((r) => r.rating != null && r.totalAmount > 0).toList();
  if (rated.isEmpty) {
    return const GuacoScoreResult(score: null, ratedCount: 0, weightedSpend: 0, bankPenalty: 0);
  }
  double weightedSum = 0;
  double weightTotal = 0;
  for (final r in rated) {
    final w = r.totalAmount.abs();
    final v = (r.rating! - 3) * 25;
    weightedSum += v * w;
    weightTotal += w;
  }
  final raw = weightTotal == 0 ? 50.0 : (weightedSum / weightTotal) + 50;

  int bankPenalty = 0;
  final bite = bankBite ?? const GuacoBankBite();
  final interest = bite.interest < 0 ? 0.0 : bite.interest;
  final fees     = bite.fees     < 0 ? 0.0 : bite.fees;
  if ((interest + fees) > 0) {
    final ratio = weightTotal > 0 ? (interest + fees) / weightTotal : 1.0;
    final ratioHit = (ratio * 100).clamp(0.0, 25.0);
    final dollarHit = (interest / 25) + (fees / 50);
    bankPenalty = (ratioHit + dollarHit).round().clamp(0, 25);
  }

  final score = (raw - bankPenalty).clamp(0, 100).round();
  return GuacoScoreResult(
    score: score,
    ratedCount: rated.length,
    weightedSpend: weightTotal,
    bankPenalty: bankPenalty,
  );
}
