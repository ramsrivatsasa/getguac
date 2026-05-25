// GuacScore — 0-100 spending-quality score, native Flutter version.
// Mirrors the web's calculateGuacoScore logic: weighted by spend, rating 1-5
// → value -50..+50, plus a "bank bite" penalty for interest + fees.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/receipt_provider.dart';

const _kBrand = Color(0xFF15803d);

class GuacScoreScreen extends StatefulWidget {
  const GuacScoreScreen({super.key});
  @override
  State<GuacScoreScreen> createState() => _GuacScoreScreenState();
}

class _GuacScoreScreenState extends State<GuacScoreScreen> {
  double _bankBite = 0;
  bool _loadingBite = true;

  @override
  void initState() {
    super.initState();
    _loadBankBite();
    context.read<ReceiptProvider>().loadReceipts();
  }

  Future<void> _loadBankBite() async {
    try {
      final sb = Supabase.instance.client;
      final fees = await sb.from('bank_fees').select('amount, kind');
      double bite = 0;
      for (final f in fees) {
        final k = f['kind'];
        if (k == 'interest' || k == 'fee' || k == 'penalty') {
          bite += (double.tryParse(f['amount'].toString()) ?? 0).abs();
        }
      }
      if (mounted) setState(() { _bankBite = bite; _loadingBite = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingBite = false);
    }
  }

  _ScoreResult _calc(List receipts) {
    final rated = receipts.where((r) => r.rating != null && r.totalAmount > 0).toList();
    if (rated.isEmpty) return _ScoreResult(score: null, grade: _gradeFor(null), ratedCount: 0, weightedSpend: 0, bankPenalty: 0);

    double weightedSum = 0, weightTotal = 0;
    for (final r in rated) {
      final w = r.totalAmount.abs();
      final v = (r.rating! - 3) * 25;
      weightedSum += v * w;
      weightTotal += w;
    }
    final raw = weightTotal == 0 ? 50.0 : (weightedSum / weightTotal) + 50;

    // Bank-bite penalty (capped at -25)
    int penalty = 0;
    if (_bankBite > 0 && weightTotal > 0) {
      final ratio = _bankBite / weightTotal;
      final ratioHit = (ratio * 100).clamp(0, 25);
      final dollarHit = _bankBite / 25;   // simplification
      penalty = (ratioHit + dollarHit).round().clamp(0, 25);
    }

    final score = (raw - penalty).clamp(0, 100).round();
    return _ScoreResult(score: score, grade: _gradeFor(score), ratedCount: rated.length, weightedSpend: weightTotal, bankPenalty: penalty);
  }

  @override
  Widget build(BuildContext context) {
    final receipts = context.watch<ReceiptProvider>().receipts;
    final r = _calc(receipts);
    final tone = r.grade.color;

    return Scaffold(
      appBar: AppBar(title: const Text('GuacScore')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (r.score == null) ...[
            _emptyState(),
          ] else ...[
            // Big score card
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [tone.withOpacity(0.15), tone.withOpacity(0.05)]),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: tone.withOpacity(0.3), width: 2),
              ),
              child: Row(children: [
                Stack(alignment: Alignment.center, children: [
                  SizedBox(
                    width: 140, height: 140,
                    child: CircularProgressIndicator(
                      value: r.score! / 100,
                      strokeWidth: 12,
                      backgroundColor: Colors.white,
                      valueColor: AlwaysStoppedAnimation(tone),
                    ),
                  ),
                  Column(mainAxisSize: MainAxisSize.min, children: [
                    Text('${r.score}', style: TextStyle(fontSize: 44, fontWeight: FontWeight.w900, color: tone)),
                    const Text('/ 100', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
                  ]),
                ]),
                const SizedBox(width: 16),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(r.grade.emoji + '  ' + r.grade.label, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: tone)),
                  const SizedBox(height: 6),
                  Text(r.grade.desc, style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.3)),
                  const SizedBox(height: 8),
                  Text('From ${r.ratedCount} rated purchase${r.ratedCount == 1 ? '' : 's'}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                  if (r.bankPenalty > 0) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFFfee2e2), borderRadius: BorderRadius.circular(99)),
                      child: Text('🦷 Bank Bite −${r.bankPenalty}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF991b1b))),
                    ),
                  ],
                ])),
              ]),
            ),
            const SizedBox(height: 16),
            if (!_loadingBite && _bankBite > 0)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFfff7ed),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFfed7aa)),
                ),
                child: Row(children: [
                  const Text('🦷', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('\$${_bankBite.toStringAsFixed(2)} lost to interest + fees', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF7c2d12), fontSize: 13)),
                    const Text('Pull this down — every dollar saved adds to your score.', style: TextStyle(fontSize: 11, color: Color(0xFF92400e))),
                  ])),
                ]),
              ),
            const SizedBox(height: 24),
            const Text('How the score works', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(height: 8),
            const Text(
              'Each rated purchase contributes a value (1★ = -50, 5★ = +50), weighted by amount spent. '
              'Then we subtract a "Bank Bite" penalty for interest + fees paid. '
              'Score caps between 0 and 100. Rate more receipts to improve accuracy.',
              style: TextStyle(fontSize: 12, color: Colors.black87, height: 1.5),
            ),
          ],
        ]),
      ),
    );
  }

  Widget _emptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: const Color(0xFFf0fdf4),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(children: [
        const Text('🥑', style: TextStyle(fontSize: 80)),
        const SizedBox(height: 16),
        const Text('Rate to unlock your score', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text('Open any receipt, give it 1–5 stars based on how worth-it the purchase felt.', textAlign: TextAlign.center, style: TextStyle(color: Colors.black87)),
      ]),
    );
  }
}

class _ScoreResult {
  final int? score;
  final _Grade grade;
  final int ratedCount;
  final double weightedSpend;
  final int bankPenalty;
  _ScoreResult({this.score, required this.grade, required this.ratedCount, required this.weightedSpend, required this.bankPenalty});
}

class _Grade {
  final String label;
  final String emoji;
  final String desc;
  final Color color;
  _Grade(this.label, this.emoji, this.desc, this.color);
}

_Grade _gradeFor(int? score) {
  if (score == null) return _Grade('Unrated', '🥑', 'Rate some receipts to unlock your score.', _kBrand);
  if (score >= 90) return _Grade('Smash Master',  '🥑', 'Every dollar earns its smash.',         const Color(0xFF15803d));
  if (score >= 75) return _Grade('Solid Smasher', '✨', 'Mostly essentials. Keep it up.',         const Color(0xFF65a30d));
  if (score >= 60) return _Grade('Steady Guac',   '🙂', 'Doing fine. Some room to tighten.',     const Color(0xFFca8a04));
  if (score >= 40) return _Grade('Splurgy',       '🍿', 'Treat-yourself mode. Watch the drift.', const Color(0xFFea580c));
  return                _Grade('Mushy',         '🙈', 'Lots of regret. Reset incoming.',       const Color(0xFFdc2626));
}
