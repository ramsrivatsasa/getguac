// GuacScore — 0-100 spending-quality score, native Flutter version.
//
// Math is NOT defined here. Delegates to the canonical engine in
// services/guacoscore.dart, which mirrors web/src/lib/guacoscore.js
// line-for-line and is validated against the same fixture suite the
// JS implementation runs. This screen only handles the UI surface +
// the bank-fee fetch.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/receipt_provider.dart';
import '../../widgets/guac_mascot.dart';
import '../../widgets/timeframe_picker.dart';
import '../../services/timeframe_store.dart';
import '../../services/guacoscore.dart' as engine;
import '../../payment_rows.dart';

const _kBrand = Color(0xFF15803d);

class GuacScoreScreen extends StatefulWidget {
  const GuacScoreScreen({super.key});
  @override
  State<GuacScoreScreen> createState() => _GuacScoreScreenState();
}

class _GuacScoreScreenState extends State<GuacScoreScreen> {
  // Split bank bite into interest + fees so the penalty formula can weight
  // interest 2× harder than fees (matches web/src/lib/guacoscore.js).
  double _biteInterest = 0;
  double _biteFees = 0;
  bool _loadingBite = true;
  String? _biteLoadError;

  // Time-frame inherited from the shared store so the user's
  // dashboard selection carries over.
  TimeframePeriod _period = TimeframePeriod.monthly;
  int _periodCount = 3;

  @override
  void initState() {
    super.initState();
    _loadBankBite();
    context.read<ReceiptProvider>().loadReceipts(period: ReceiptPeriod.all);
    TimeframeStore.load().then((tf) {
      if (!mounted) return;
      setState(() {
        _period = timeframePeriodFromString(tf.period);
        _periodCount = tf.count;
      });
    });
    TimeframeStore.notifier.addListener(_onTimeframeChanged);
  }

  void _onTimeframeChanged() {
    if (!mounted) return;
    final tf = TimeframeStore.notifier.value;
    final p = timeframePeriodFromString(tf.period);
    if (p == _period && tf.count == _periodCount) return;
    setState(() { _period = p; _periodCount = tf.count; });
  }

  @override
  void dispose() {
    TimeframeStore.notifier.removeListener(_onTimeframeChanged);
    super.dispose();
  }

  DateTime _periodCutoff() {
    final now = DateTime.now();
    final n = _periodCount < 1 ? 1 : _periodCount;
    switch (_period) {
      case TimeframePeriod.daily:   return DateTime(now.year, now.month, now.day - n);
      case TimeframePeriod.weekly:  return DateTime(now.year, now.month, now.day - n * 7);
      case TimeframePeriod.monthly: return DateTime(now.year, now.month - n, now.day);
      case TimeframePeriod.yearly:  return DateTime(now.year - n, now.month, now.day);
    }
  }

  bool _inPeriod(String dateStr) {
    if (dateStr.length < 10) return false;
    final cutoff = _periodCutoff();
    final cy = cutoff.year.toString().padLeft(4, '0');
    final cm = cutoff.month.toString().padLeft(2, '0');
    final cd = cutoff.day.toString().padLeft(2, '0');
    final cutoffStr = '$cy-$cm-$cd';
    return dateStr.compareTo(cutoffStr) >= 0;
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
    final result = engine.calculateGuacoScore(
      receipts.map((r) => engine.GuacoScoreInputReceipt(
        rating: r.rating,
        totalAmount: (r.totalAmount as num).toDouble(),
      )).toList(),
      bankBite: engine.GuacoBankBite(interest: _biteInterest, fees: _biteFees),
    );
    return _ScoreResult(
      score: result.score,
      grade: _gradeFor(result.score),
      ratedCount: result.ratedCount,
      weightedSpend: result.weightedSpend,
      bankPenalty: result.bankPenalty,
    );
  }

  @override
  Widget build(BuildContext context) {
    final receipts = context.watch<ReceiptProvider>().receipts;
    final r = _calc(receipts);
    final tone = r.grade.color;

    // Compute the 5 summary tiles matching web /guacanomics:
    // Net Spent (out) · Refunded (in) · Bank Bite · Receipts · Tax Paid
    final spendingReceipts = receipts.where((rec) => !isPaymentReceipt(rec)).toList();
    final inWindow = spendingReceipts.where((rec) => _inPeriod(rec.date)).toList();
    final purchases = inWindow.where((rec) => rec.totalAmount >= 0).toList();
    final returns   = inWindow.where((rec) => rec.totalAmount < 0).toList();
    final grossSpend = purchases.fold<double>(0, (s, rec) => s + rec.totalAmount);
    final refunded   = returns.fold<double>(0, (s, rec) => s + rec.totalAmount.abs());
    final netSpend   = grossSpend - refunded;
    final totalTax   = inWindow.fold<double>(0, (s, rec) => s + rec.taxPaid);
    final bankBite   = _biteInterest + _biteFees;
    final receiptCount = inWindow.length;
    final avgTicket = purchases.isNotEmpty ? grossSpend / purchases.length : 0.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Guacanomics')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          // Shared time-frame picker — same widget the dashboard
          // uses. Changes here propagate to the dashboard via the
          // shared TimeframeStore notifier.
          TimeframePicker(
            period: _period,
            count: _periodCount,
            onChange: (p, c) => setState(() { _period = p; _periodCount = c; }),
          ),
          const SizedBox(height: 18),
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
            // 5-tile summary row — Net Spent · Refunded · Bank Bite ·
            // Receipts · Tax Paid. Matches the web /guacanomics page.
            SizedBox(
              height: 84,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.zero,
                children: [
                  _summaryTile(
                    label: 'Net Spent (out)', icon: Icons.attach_money,
                    iconBg: const Color(0xFFfee2e2), iconColor: const Color(0xFFb91c1c),
                    value: '\$${netSpend.toStringAsFixed(2)}',
                    sub: 'Gross \$${grossSpend.toStringAsFixed(2)}',
                  ),
                  const SizedBox(width: 10),
                  _summaryTile(
                    label: 'Refunded (in)', icon: Icons.undo,
                    iconBg: const Color(0xFFd1fae5), iconColor: const Color(0xFF047857),
                    value: '\$${refunded.toStringAsFixed(2)}',
                    sub: '${returns.length} returned',
                  ),
                  const SizedBox(width: 10),
                  _summaryTile(
                    label: '🦷 Bank Bite', icon: Icons.account_balance_wallet,
                    iconBg: const Color(0xFFffedd5), iconColor: const Color(0xFFc2410c),
                    value: '\$${bankBite.toStringAsFixed(2)}',
                    sub: '\$${_biteInterest.toStringAsFixed(2)} int · \$${_biteFees.toStringAsFixed(2)} fees',
                  ),
                  const SizedBox(width: 10),
                  _summaryTile(
                    label: 'Receipts', icon: Icons.receipt_long,
                    iconBg: const Color(0xFFfef3c7), iconColor: const Color(0xFFb45309),
                    value: '$receiptCount',
                    sub: receiptCount > 0 ? 'Avg \$${avgTicket.toStringAsFixed(2)}' : null,
                  ),
                  const SizedBox(width: 10),
                  _summaryTile(
                    label: 'Tax Paid', icon: Icons.trending_up,
                    iconBg: const Color(0xFFd1fae5), iconColor: const Color(0xFF047857),
                    value: '\$${totalTax.toStringAsFixed(2)}',
                    sub: null,
                  ),
                ],
              ),
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

  /// Single tile in the summary scroll row — gradient-free, matches
  /// the web /guacanomics tiles: pale icon block + label + big bold
  /// value + small subtext.
  Widget _summaryTile({
    required String label, required IconData icon,
    required Color iconBg, required Color iconColor,
    required String value, String? sub,
  }) {
    return Container(
      width: 178,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFe5e7eb)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 4)],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: iconColor),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.black54, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(value,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF111827)),
            maxLines: 1, overflow: TextOverflow.ellipsis,
          ),
          if (sub != null) ...[
            const SizedBox(height: 1),
            Text(sub, style: const TextStyle(fontSize: 9, color: Colors.black45, fontWeight: FontWeight.w600),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
          ],
        ])),
      ]),
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
