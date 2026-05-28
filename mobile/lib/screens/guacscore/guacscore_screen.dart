// GuacScore — 0-100 spending-quality score, native Flutter version.
// Mirrors the web's calculateGuacoScore logic: weighted by spend, rating 1-5
// → value -50..+50, plus a "bank bite" penalty for interest + fees.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/receipt_provider.dart';
import '../../widgets/guac_mascot.dart';

const _kBrand = Color(0xFF15803d);

class GuacScoreScreen extends StatefulWidget {
  const GuacScoreScreen({super.key});
  @override
  State<GuacScoreScreen> createState() => _GuacScoreScreenState();
}

class _GuacScoreScreenState extends State<GuacScoreScreen> {
  // Split bank bite into interest + fees so the penalty formula can weight
  // interest 2× harder than fees (matches web/src/lib/guacoscore.js).
  // Previously mobile collapsed both into a single _bankBite scalar and
  // used `_bankBite / 25` for every dollar — silently producing a different
  // score on mobile than web for the same data.
  double _biteInterest = 0;
  double _biteFees = 0;
  bool _loadingBite = true;
  String? _biteLoadError;

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
      double interest = 0;
      double feeTotal = 0;
      for (final f in fees) {
        final k = f['kind'] as String?;
        final amt = (double.tryParse(f['amount']?.toString() ?? '0') ?? 0).abs();
        if (k == 'interest') {
          interest += amt;
        } else if (k == 'fee' || k == 'penalty') {
          feeTotal += amt;
        }
      }
      if (mounted) {
        setState(() {
          _biteInterest = interest;
          _biteFees = feeTotal;
          _loadingBite = false;
          _biteLoadError = null;
        });
      }
    } catch (e) {
      // Previously: `catch (_) {}` silently swallowed RLS + network errors,
      // making mobile show $0 bite penalty even when the query had failed.
      // Surfacing the message so the user knows the score is incomplete.
      if (mounted) {
        setState(() {
          _loadingBite = false;
          _biteLoadError = e.toString();
        });
      }
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

    // Bank-bite penalty — mirrors web/src/lib/guacoscore.js#calculateGuacoScore.
    //   ratioHit  = (interest + fees) / weightTotal * 100, capped at 25
    //   dollarHit = interest/25 + fees/50  (interest stings 2× harder per $)
    //   penalty   = min(25, round(ratioHit + dollarHit))
    int penalty = 0;
    final bite = _biteInterest + _biteFees;
    if (bite > 0 && weightTotal > 0) {
      final ratio = bite / weightTotal;
      final ratioHit = (ratio * 100).clamp(0.0, 25.0);
      final dollarHit = (_biteInterest / 25) + (_biteFees / 50);
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
                gradient: LinearGradient(colors: [tone.withValues(alpha: 0.15), tone.withValues(alpha: 0.05)]),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: tone.withValues(alpha: 0.3), width: 2),
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
            if (!_loadingBite && (_biteInterest + _biteFees) > 0)
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
                    Text('\$${(_biteInterest + _biteFees).toStringAsFixed(2)} lost to interest + fees',
                      style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF7c2d12), fontSize: 13)),
                    Text(
                      _biteInterest > 0 && _biteFees > 0
                        ? '\$${_biteInterest.toStringAsFixed(2)} interest · \$${_biteFees.toStringAsFixed(2)} fees'
                        : 'Pull this down — every dollar saved adds to your score.',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF92400e)),
                    ),
                  ])),
                ]),
              ),
            if (!_loadingBite && _biteLoadError != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFfef2f2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFfecaca)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.warning_amber_outlined, color: Color(0xFFb91c1c), size: 16),
                    const SizedBox(width: 8),
                    const Expanded(child: Text(
                      'Bank-bite couldn\'t load — score may be missing the interest/fee penalty.',
                      style: TextStyle(fontSize: 11, color: Color(0xFFb91c1c)),
                    )),
                    TextButton(
                      onPressed: () { setState(() => _loadingBite = true); _loadBankBite(); },
                      style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                      child: const Text('Retry', style: TextStyle(color: Color(0xFFb91c1c), fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ]),
                ),
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
      child: Column(children: const [
        GuacMascot(mood: MascotMood.relaxing, size: 120),
        SizedBox(height: 16),
        Text('Rate to unlock your score', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        SizedBox(height: 8),
        Text('Open any receipt, give it 1–5 stars based on how worth-it the purchase felt.', textAlign: TextAlign.center, style: TextStyle(color: Colors.black87)),
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
