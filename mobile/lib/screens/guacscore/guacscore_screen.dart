// GuacScore — 0-100 spending-quality score, native Flutter version.
//
// Math is NOT defined here. Delegates to the canonical engine in
// services/guacoscore.dart, which mirrors web/src/lib/guacoscore.js
// line-for-line and is validated against the same fixture suite the
// JS implementation runs. This screen only handles the UI surface +
// the bank-fee fetch.

import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/receipt_provider.dart';
import '../../widgets/guac_mascot.dart';
import '../../widgets/timeframe_picker.dart';
import '../../services/timeframe_store.dart';
import '../../services/guacoscore.dart' as engine;
import '../../payment_rows.dart';
import '../../widgets/animated_primitives.dart';
import '../../theme/gg_design.dart';

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
                // Both the arc fill (TweenAnimationBuilder<double>) and
                // the numeric value (CountUp) tween from 0 to the score
                // over 700ms — matches the web GuacoScoreCard ease so
                // mobile and web breathe with the same cadence.
                Stack(alignment: Alignment.center, children: [
                  TweenAnimationBuilder<double>(
                    tween: Tween<double>(begin: 0, end: r.score! / 100),
                    duration: const Duration(milliseconds: 700),
                    curve: Curves.easeOutCubic,
                    builder: (ctx, v, _) => SizedBox(
                      width: 140, height: 140,
                      child: CircularProgressIndicator(
                        value: v,
                        strokeWidth: 12,
                        backgroundColor: Colors.white,
                        valueColor: AlwaysStoppedAnimation(tone),
                      ),
                    ),
                  ),
                  Column(mainAxisSize: MainAxisSize.min, children: [
                    CountUp(
                      value: r.score!.toDouble(),
                      duration: const Duration(milliseconds: 700),
                      formatter: (v) => v.round().toString(),
                      style: ggHeading(size: 44, weight: FontWeight.w900, color: tone),
                    ),
                    Text('/ 100', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
                  ]),
                ]),
                const SizedBox(width: 16),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(r.grade.emoji + '  ' + r.grade.label, style: ggHeading(size: 20, weight: FontWeight.w900, color: tone)),
                  const SizedBox(height: 6),
                  Text(r.grade.desc, style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.3)),
                  const SizedBox(height: 8),
                  Text('From ${r.ratedCount} rated purchase${r.ratedCount == 1 ? '' : 's'}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                  if (r.bankPenalty > 0) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFFfee2e2), borderRadius: BorderRadius.circular(99)),
                      child: Text('🦷 Bank Bite −${r.bankPenalty}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF991b1b), fontVariations: ggWght(FontWeight.w800))),
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
                      style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF7c2d12), fontSize: 13, fontVariations: ggWght(FontWeight.w800))),
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
                      child: Text('Retry', style: TextStyle(color: Color(0xFFb91c1c), fontSize: 11, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
                    ),
                  ]),
                ),
              ),
            const SizedBox(height: 24),
            // ── Spending Trend (line chart) ─────────────────────────
            // Monthly buckets from the active window. Mirrors web's
            // Charts component for /guacanomics. fl_chart line plot
            // with rounded tooltips + amber/emerald gradient stroke.
            _spendingTrendCard(_monthlyBuckets(purchases)),
            const SizedBox(height: 12),
            // ── Worth It? (donut pie) ───────────────────────────────
            // Rating-distribution by SPEND (not count) — each slice
            // is the dollar share of that rating's purchases. Five
            // bands (1★ Regret → 5★ Essential) with the GuacScore-
            // palette. Auto-hides when no rated purchases exist.
            _worthItDonut(purchases),
            const SizedBox(height: 24),
            Text('How the score works', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, fontVariations: ggWght(FontWeight.w800))),
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
  /// Bucket the in-window purchases by YYYY-MM month → total $.
  /// Sparse months are omitted (no zero-fill between data points)
  /// since the chart auto-fits the x-range to whatever it has.
  List<MapEntry<String, double>> _monthlyBuckets(List purchases) {
    final m = <String, double>{};
    for (final r in purchases) {
      final d = r.date as String? ?? '';
      if (d.length < 7) continue;
      final ym = d.substring(0, 7); // YYYY-MM
      m[ym] = (m[ym] ?? 0) + (r.totalAmount as num).toDouble();
    }
    final list = m.entries.toList()..sort((a, b) => a.key.compareTo(b.key));
    return list;
  }

  /// Spending Trend card — fl_chart LineChart of monthly $ totals.
  /// Empty-state when there are fewer than 2 months of data.
  Widget _spendingTrendCard(List<MapEntry<String, double>> buckets) {
    if (buckets.length < 2) {
      return _chartShell(
        title: '📈 Spending Trend',
        subtitle: 'Need at least 2 months of purchases to chart.',
        child: const SizedBox.shrink(),
      );
    }
    final spots = <FlSpot>[];
    double maxY = 0;
    for (var i = 0; i < buckets.length; i++) {
      final v = buckets[i].value;
      spots.add(FlSpot(i.toDouble(), v));
      if (v > maxY) maxY = v;
    }
    // 20% headroom above the highest point so the line never kisses
    // the top of the chart and labels have room.
    final yMax = maxY <= 0 ? 100.0 : maxY * 1.2;
    return _chartShell(
      title: '📈 Spending Trend',
      subtitle: '${buckets.length} months · peak \$${maxY.toStringAsFixed(0)}',
      child: SizedBox(
        height: 160,
        child: LineChart(LineChartData(
          minY: 0,
          maxY: yMax,
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 22,
              interval: (buckets.length / 4).ceilToDouble().clamp(1, 12),
              getTitlesWidget: (v, _) {
                final i = v.toInt();
                if (i < 0 || i >= buckets.length) return const SizedBox();
                final yyyymm = buckets[i].key;
                final mm = int.tryParse(yyyymm.substring(5)) ?? 1;
                const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(labels[(mm - 1).clamp(0, 11)],
                    style: const TextStyle(fontSize: 10, color: Colors.black54),
                  ),
                );
              },
            )),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              gradient: const LinearGradient(colors: [Color(0xFF15803d), Color(0xFFca8a04)]),
              barWidth: 3,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [const Color(0xFF15803d).withValues(alpha: 0.18), Colors.transparent],
                  begin: Alignment.topCenter, end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
        )),
      ),
    );
  }

  /// Worth It? donut — fl_chart PieChart with one slice per rating
  /// (1★ → 5★), sized by spend $ in that bucket. Centered total $
  /// in the donut hole. Auto-hides when no rated purchases exist.
  Widget _worthItDonut(List purchases) {
    final byRating = <int, double>{};
    for (final r in purchases) {
      final rating = r.rating as int?;
      if (rating == null || rating < 1 || rating > 5) continue;
      final amt = (r.totalAmount as num).toDouble();
      if (amt <= 0) continue;
      byRating[rating] = (byRating[rating] ?? 0) + amt;
    }
    if (byRating.isEmpty) {
      return _chartShell(
        title: '🥑 Worth It?',
        subtitle: 'Rate purchases on the Receipts screen to see this.',
        child: const SizedBox.shrink(),
      );
    }
    final total = byRating.values.fold<double>(0, (a, b) => a + b);
    const colors = {
      5: Color(0xFF10b981), // emerald — Essential
      4: Color(0xFF84cc16), // lime    — Important
      3: Color(0xFFf59e0b), // amber   — OK
      2: Color(0xFFf97316), // orange  — Splurge
      1: Color(0xFFe11d48), // rose    — Regret
    };
    const labels = {
      5: '💎 Essential', 4: '✅ Important', 3: '🙂 OK',
      2: '🍿 Splurge',   1: '🙈 Regret',
    };
    final sections = <PieChartSectionData>[];
    final legend = <Widget>[];
    for (final n in [5, 4, 3, 2, 1]) {
      final v = byRating[n] ?? 0;
      if (v <= 0) continue;
      final pct = v / total * 100;
      sections.add(PieChartSectionData(
        value: v, color: colors[n]!, radius: 26,
        showTitle: pct >= 10,
        title: '${pct.toStringAsFixed(0)}%',
        titleStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white, fontVariations: ggWght(FontWeight.w800)),
      ));
      legend.add(Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(color: colors[n], borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 6),
          Expanded(child: Text(labels[n]!, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700)))),
          Text('\$${v.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
        ]),
      ));
    }
    return _chartShell(
      title: '🥑 Worth It?',
      subtitle: '\$${total.toStringAsFixed(0)} rated · ${sections.length} bands',
      child: SizedBox(
        height: 150,
        child: Row(children: [
          SizedBox(
            width: 150, height: 150,
            child: Stack(alignment: Alignment.center, children: [
              PieChart(PieChartData(
                sections: sections,
                centerSpaceRadius: 38,
                sectionsSpace: 2,
                startDegreeOffset: -90,
              )),
              Column(mainAxisSize: MainAxisSize.min, children: [
                Text('\$${total.toStringAsFixed(0)}',
                  style: ggAmount(size: 16, weight: FontWeight.w900)),
                const Text('rated', style: TextStyle(fontSize: 10, color: Colors.black54)),
              ]),
            ]),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: legend)),
        ]),
      ),
    );
  }

  /// Shared wrapper card for the two charts — title + subtitle +
  /// content with consistent padding/border so they read as a pair.
  Widget _chartShell({required String title, required String subtitle, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFe5e7eb)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800))),
        const SizedBox(height: 2),
        Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.black54)),
        const SizedBox(height: 12),
        child,
      ]),
    );
  }

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
          Text(label, style: TextStyle(fontSize: 10, color: Colors.black54, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
          const SizedBox(height: 2),
          Text(value,
            style: ggAmount(size: 15, weight: FontWeight.w900, color: Color(0xFF111827)),
            maxLines: 1, overflow: TextOverflow.ellipsis,
          ),
          if (sub != null) ...[
            const SizedBox(height: 1),
            Text(sub, style: TextStyle(fontSize: 9, color: Colors.black45, fontWeight: FontWeight.w600, fontVariations: ggWght(FontWeight.w600)),
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
      child: Column(children: [
        const GuacMascot(mood: MascotMood.relaxing, size: 120),
        const SizedBox(height: 16),
        Text('Rate to unlock your score', style: ggHeading(size: 18, weight: FontWeight.w800)),
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
