import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/guac_money_service.dart';

/// GuacMoney — the money our Guac-AI saved you. Saved = purchases you rated
/// "not worth it" (won't re-buy) + refunds you recovered, dollar for dollar.
/// 1000 GuacMoney = $1. A status balance for now (redemption comes later,
/// funded by affiliate revenue).
class GuacMoneyScreen extends StatefulWidget {
  const GuacMoneyScreen({super.key});
  @override
  State<GuacMoneyScreen> createState() => _GuacMoneyScreenState();
}

class _GuacMoneyScreenState extends State<GuacMoneyScreen> {
  late Future<({double saved, double notWorth, double refunds, int rated})> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<({double saved, double notWorth, double refunds, int rated})> _load() async {
    final sb = Supabase.instance.client;
    final user = sb.auth.currentUser;
    double notWorth = 0, refunds = 0;
    int rated = 0;
    if (user != null) {
      try {
        final rows = await sb.from('receipts')
            .select('total_amount, rating, is_return').eq('user_id', user.id);
        for (final r in (rows as List)) {
          final amt = double.tryParse(r['total_amount']?.toString() ?? '0') ?? 0;
          final isReturn = r['is_return'] == true;
          final rating = r['rating'] is int ? r['rating'] as int : null;
          if (isReturn) {
            refunds += amt.abs();
          } else if (rating != null) {
            rated++;
            if (rating <= 2 && amt > 0) notWorth += amt;
          }
        }
      } catch (_) {/* offline / RLS — show 0 */}
    }
    return (saved: notWorth + refunds, notWorth: notWorth, refunds: refunds, rated: rated);
  }

  @override
  Widget build(BuildContext context) {
    const emerald = Color(0xFF166534);
    return Scaffold(
      backgroundColor: const Color(0xFFf9fafb),
      appBar: AppBar(
        backgroundColor: emerald,
        foregroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('GuacMoney', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      body: FutureBuilder<({double saved, double notWorth, double refunds, int rated})>(
        future: _future,
        builder: (ctx, snap) {
          final saved = snap.data?.saved ?? 0;
          final notWorth = snap.data?.notWorth ?? 0;
          final refunds = snap.data?.refunds ?? 0;
          final rated = snap.data?.rated ?? 0;
          final points = gmPointsFromSaved(saved);
          final into = points % kGmRewardStep;
          final toNext = kGmRewardStep - into;
          final progress = kGmRewardStep == 0 ? 0.0 : into / kGmRewardStep;
          return ListView(padding: const EdgeInsets.all(16), children: [
            // Balance hero
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFFfbbf24), Color(0xFFf59e0b)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: const Color(0xFFf59e0b).withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 6))],
              ),
              child: Column(children: [
                const Text('🥑', style: TextStyle(fontSize: 32)),
                TweenAnimationBuilder<int>(
                  tween: IntTween(begin: 0, end: points),
                  duration: const Duration(milliseconds: 1100),
                  curve: Curves.easeOutCubic,
                  builder: (_, v, __) => Text(formatGm(v),
                    style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white, height: 1)),
                ),
                const Text('GUACMONEY', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 2)),
                const SizedBox(height: 6),
                const Text(kGmTagline, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 4),
                Text('≈ \$${saved.toStringAsFixed(2)} saved', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15)),
              ]),
            ),
            const SizedBox(height: 16),
            _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Your progress', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(value: progress, minHeight: 10, backgroundColor: const Color(0xFFf1f5f9), color: const Color(0xFFf59e0b)),
              ),
              const SizedBox(height: 8),
              Text('${formatGm(toNext)} more GuacMoney to your next milestone 🥑', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            ])),
            const SizedBox(height: 16),
            _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Where it came from', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              _row(Icons.thumb_down_alt_rounded, 'Rated "not worth it"', notWorth, const Color(0xFFb45309)),
              _row(Icons.undo_rounded, 'Refunds recovered', refunds, const Color(0xFF15803d)),
            ])),
            const SizedBox(height: 16),
            _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Text('How it works', style: TextStyle(fontWeight: FontWeight.w800)),
              SizedBox(height: 6),
              Text('Rate your purchases in Worth It? — anything you mark "not worth it" is money you\'ll save by skipping it next time. Refunds you recover count too, dollar for dollar. 1,000 GuacMoney = \$1.',
                style: TextStyle(fontSize: 12.5, color: Colors.black54, height: 1.4)),
            ])),
            const SizedBox(height: 16),
            SizedBox(width: double.infinity, child: FilledButton.icon(
              onPressed: () => context.push('/validate'),
              style: FilledButton.styleFrom(backgroundColor: emerald, padding: const EdgeInsets.symmetric(vertical: 14)),
              icon: const Icon(Icons.fact_check_rounded),
              label: const Text('Rate your purchases →', style: TextStyle(fontWeight: FontWeight.w800)),
            )),
            const SizedBox(height: 10),
            Text(rated == 0 ? 'Rate a purchase to start banking GuacMoney.' : "You've rated $rated purchase${rated == 1 ? '' : 's'}.",
              textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: Colors.black45)),
          ]);
        },
      ),
    );
  }

  Widget _card(Widget child) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFf1f5f9))),
        child: child,
      );

  Widget _row(IconData icon, String label, double amount, Color color) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Container(width: 34, height: 34, alignment: Alignment.center, decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
          Text('\$${amount.toStringAsFixed(2)}', style: TextStyle(fontWeight: FontWeight.w900, color: color)),
        ]),
      );
}
