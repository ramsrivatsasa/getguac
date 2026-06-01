// GuacWizard — finance-insights screen. Pulls bank_fees + bank_transactions
// for the current period and surfaces interest, fees, and top regrets.

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/receipt_provider.dart';
import '../../utils/date_format.dart';
import '../../services/timeframe_store.dart';
import '../../widgets/timeframe_picker.dart';

const _kBrand = Color(0xFF7c3aed);

class GuacWizardScreen extends StatefulWidget {
  const GuacWizardScreen({super.key});
  @override
  State<GuacWizardScreen> createState() => _GuacWizardScreenState();
}

class _GuacWizardScreenState extends State<GuacWizardScreen> {
  // Time-frame is hydrated from the shared TimeframeStore so this
  // screen agrees with the dashboard the moment the user lands on
  // it. Changing the picker here writes back to the store —
  // popping back to the dashboard, the dashboard's listener
  // updates instantly.
  TimeframePeriod _period = TimeframePeriod.monthly;
  int _periodCount = 3;
  bool _loading = true;
  List<Map<String, dynamic>> _fees = [];

  @override
  void initState() {
    super.initState();
    _loadFees();
    // Hydrate time-frame from the shared store + listen for changes
    // made on other screens (or popped back from this one).
    TimeframeStore.load().then((tf) {
      if (!mounted) return;
      setState(() {
        _period = timeframePeriodFromString(tf.period);
        _periodCount = tf.count;
      });
    });
    TimeframeStore.notifier.addListener(_onTimeframeChanged);
    // ReceiptPeriod.all preserves the dashboard's full-history
    // cache scope — see the same fix in guacscore_screen.dart.
    context.read<ReceiptProvider>().loadReceipts(period: ReceiptPeriod.all);
  }

  Future<void> _loadFees() async {
    setState(() => _loading = true);
    try {
      final sb = Supabase.instance.client;
      final rows = await sb
          .from('bank_fees')
          .select('amount, kind, fee_kind, date, merchant')
          .order('date', ascending: false)
          .limit(500);
      if (mounted) setState(() {
        _fees = (rows as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _inPeriod(String? dateStr) {
    if (dateStr == null) return false;
    final d = DateTime.tryParse(dateStr);
    if (d == null) return false;
    final since = _periodCutoff();
    return !d.isBefore(since);
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

  String _periodLabel() {
    final unit = _period == TimeframePeriod.daily ? 'day'
               : _period == TimeframePeriod.weekly ? 'week'
               : _period == TimeframePeriod.monthly ? 'month'
               : 'year';
    return 'Last $_periodCount $unit${_periodCount == 1 ? '' : 's'}';
  }

  void _onTimeframeChanged() {
    if (!mounted) return;
    final tf = TimeframeStore.notifier.value;
    final p = timeframePeriodFromString(tf.period);
    if (p == _period && tf.count == _periodCount) return;
    setState(() {
      _period = p;
      _periodCount = tf.count;
    });
  }

  @override
  void dispose() {
    TimeframeStore.notifier.removeListener(_onTimeframeChanged);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final receipts = context.watch<ReceiptProvider>().receipts;
    final filteredFees = _fees.where((f) => _inPeriod(f['date']?.toString())).toList();

    double interest = 0, fees = 0, penalties = 0;
    for (final f in filteredFees) {
      final amt = (double.tryParse(f['amount']?.toString() ?? '0') ?? 0).abs();
      switch (f['kind']) {
        case 'interest': interest += amt; break;
        case 'fee': fees += amt; break;
        case 'penalty': penalties += amt; break;
      }
    }
    final bite = interest + fees + penalties;

    // Top regret receipts in period
    final regrets = receipts
        .where((r) => r.rating != null && r.rating! <= 2 && r.totalAmount > 0)
        .toList()
      ..sort((a, b) => b.totalAmount.compareTo(a.totalAmount));
    final topRegrets = regrets.take(5).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('GuacWizard')),
      body: RefreshIndicator(
        onRefresh: _loadFees,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Shared time-frame picker — same widget the dashboard
            // uses. Reads/writes TimeframeStore so changes here
            // propagate back to the dashboard via the store's
            // ValueNotifier.
            TimeframePicker(
              period: _period,
              count: _periodCount,
              onChange: (p, c) => setState(() {
                _period = p;
                _periodCount = c;
              }),
            ),
            const SizedBox(height: 20),
            // Bank Bite headline
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [_kBrand.withValues(alpha: 0.12), _kBrand.withValues(alpha: 0.04)]),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _kBrand.withValues(alpha: 0.25)),
              ),
              child: Row(children: [
                // Hosted wizard avocado mascot — fetched from getguac.app so
                // the asset can be updated without shipping a new APK.
                // Falls back to the wizard emoji if the network image fails.
                SvgPicture.network(
                  'https://getguac.app/guacwizard.svg',
                  width: 60, height: 60,
                  placeholderBuilder: (_) => const SizedBox(
                    width: 60, height: 60,
                    child: Center(child: Text('🧙‍♂️', style: TextStyle(fontSize: 40))),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Bank Bite', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black54)),
                  Text('\$${bite.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: _kBrand)),
                  Text(_periodLabel(),
                    style: const TextStyle(fontSize: 11, color: Colors.black54)),
                ])),
              ]),
            ),
            const SizedBox(height: 16),
            // Three-up breakdown
            Row(children: [
              _miniCard('Interest', interest, const Color(0xFFdc2626)),
              const SizedBox(width: 10),
              _miniCard('Fees', fees, const Color(0xFFea580c)),
              const SizedBox(width: 10),
              _miniCard('Penalties', penalties, const Color(0xFF7c2d12)),
            ]),
            const SizedBox(height: 24),
            // Insights
            const Text('Insights', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(height: 8),
            ..._buildInsights(bite, interest, fees, topRegrets.length),
            const SizedBox(height: 24),
            if (topRegrets.isNotEmpty) ...[
              const Text('Top regrets', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              const SizedBox(height: 8),
              ...topRegrets.map((r) => Card(
                child: ListTile(
                  leading: const Text('🙈', style: TextStyle(fontSize: 24)),
                  title: Text(r.storeName, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${formatDateShort(r.date)}  •  ${r.rating}★'),
                  trailing: Text('\$${r.totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFdc2626))),
                ),
              )),
            ],
            if (_loading)
              const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator())),
          ],
        ),
      ),
    );
  }

  Widget _miniCard(String label, double amount, Color color) {
    return Expanded(child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700)),
        const SizedBox(height: 2),
        Text('\$${amount.toStringAsFixed(0)}',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color)),
      ]),
    ));
  }

  List<Widget> _buildInsights(double bite, double interest, double fees, int regretCount) {
    final tips = <_Tip>[];
    if (interest > 50) {
      tips.add(_Tip('💸', 'Interest is eating you',
        'You paid \$${interest.toStringAsFixed(0)} in interest. Pay the balance in full to save this every month.'));
    }
    if (fees > 0) {
      tips.add(_Tip('🦷', 'Avoidable fees',
        '\$${fees.toStringAsFixed(0)} in fees. Most fees are avoidable — review which card charged you.'));
    }
    if (regretCount >= 3) {
      tips.add(_Tip('🙈', '$regretCount low-rated purchases',
        'You rated $regretCount purchases 1–2★. Cutting these would lift your GuacScore.'));
    }
    if (tips.isEmpty) {
      tips.add(_Tip('🥑', 'You\'re smashing it',
        'No major bank bites or regrets in this period. Keep going.'));
    }
    return tips.map((t) => Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(t.emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            const SizedBox(height: 4),
            Text(t.body, style: const TextStyle(fontSize: 12, color: Colors.black87, height: 1.4)),
          ])),
        ]),
      ),
    )).toList();
  }
}

class _Tip {
  final String emoji, title, body;
  _Tip(this.emoji, this.title, this.body);
}
