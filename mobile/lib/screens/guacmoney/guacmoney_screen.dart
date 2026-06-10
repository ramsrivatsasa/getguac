import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/guac_money_service.dart';

/// GuacMoney — one balance combining the money our Guac-AI saved you
/// (not-worth-it ratings + refunds, $-for-$) plus engagement (scan +100,
/// refer +1,000). 1,000 GuacMoney = $1, redeemable — coming soon.
class GuacMoneyScreen extends StatefulWidget {
  const GuacMoneyScreen({super.key});
  @override
  State<GuacMoneyScreen> createState() => _GuacMoneyScreenState();
}

class _GuacMoneyScreenState extends State<GuacMoneyScreen> {
  late Future<_Gm> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_Gm> _load() async {
    final sb = Supabase.instance.client;
    final user = sb.auth.currentUser;
    double notWorth = 0, refunds = 0;
    int rated = 0, receipts = 0;
    if (user != null) {
      try {
        final rows = await sb.from('receipts')
            .select('total_amount, rating, is_return').eq('user_id', user.id);
        receipts = (rows as List).length;
        for (final r in rows) {
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
    final referrals = await fetchReferralCount();
    return _Gm(notWorth: notWorth, refunds: refunds, rated: rated, receipts: receipts, referrals: referrals);
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
      body: FutureBuilder<_Gm>(
        future: _future,
        builder: (ctx, snap) {
          final d = snap.data ?? const _Gm(notWorth: 0, refunds: 0, rated: 0, receipts: 0, referrals: 0);
          final saved = d.notWorth + d.refunds;
          final points = guacMoneyPoints(receipts: d.receipts, referrals: d.referrals, savedDollars: saved);
          final redeemable = gmToUsd(points);
          final into = points % kGmRewardStep;
          final toNext = kGmRewardStep - into;
          final progress = kGmRewardStep == 0 ? 0.0 : into / kGmRewardStep;
          return ListView(padding: const EdgeInsets.all(16), children: [
            // Balance hero
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFfbbf24), Color(0xFFf59e0b)]),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: const Color(0xFFf59e0b).withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 6))],
              ),
              child: Column(children: [
                const Text('🥑', style: TextStyle(fontSize: 32)),
                TweenAnimationBuilder<int>(
                  tween: IntTween(begin: 0, end: points),
                  duration: const Duration(milliseconds: 1100), curve: Curves.easeOutCubic,
                  builder: (_, v, __) => Text(formatGm(v),
                    style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white, height: 1)),
                ),
                const Text('GUACMONEY', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 2)),
                const SizedBox(height: 6),
                const Text(kGmTagline, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.22), borderRadius: BorderRadius.circular(20)),
                  child: Text('Redeem ≈ \$${redeemable.toStringAsFixed(2)} · coming soon',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
                ),
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
              _row(Icons.thumb_down_alt_rounded, 'Rated "not worth it"', '\$${d.notWorth.toStringAsFixed(2)}', gmPointsFromSaved(d.notWorth), const Color(0xFFb45309)),
              _row(Icons.undo_rounded, 'Refunds recovered', '\$${d.refunds.toStringAsFixed(2)}', gmPointsFromSaved(d.refunds), const Color(0xFF15803d)),
              _row(Icons.photo_camera_rounded, 'Receipts scanned', '${d.receipts}', d.receipts * kGmPerReceipt, const Color(0xFF1d4ed8)),
              _row(Icons.person_add_alt_1, 'Friends referred', '${d.referrals}', d.referrals * kGmPerReferral, const Color(0xFFdb2777)),
            ])),
            const SizedBox(height: 16),
            _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Text('How you earn', style: TextStyle(fontWeight: FontWeight.w800)),
              SizedBox(height: 6),
              Text('• Rate purchases in Worth It? — anything "not worth it" is money you\'ll save by skipping it (\$-for-\$).\n• Refunds you recover count too, dollar for dollar.\n• Scan a receipt: +100. Refer a friend: +1,000.\n• 1,000 GuacMoney = \$1 — redeemable for gift cards, coming soon.',
                style: TextStyle(fontSize: 12.5, color: Colors.black54, height: 1.5)),
            ])),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: FilledButton.icon(
                onPressed: () => context.push('/validate'),
                style: FilledButton.styleFrom(backgroundColor: emerald, padding: const EdgeInsets.symmetric(vertical: 13)),
                icon: const Icon(Icons.fact_check_rounded, size: 18),
                label: const Text('Rate buys', style: TextStyle(fontWeight: FontWeight.w800)),
              )),
              const SizedBox(width: 10),
              Expanded(child: OutlinedButton.icon(
                onPressed: () => context.push('/invite'),
                style: OutlinedButton.styleFrom(foregroundColor: emerald, side: const BorderSide(color: emerald), padding: const EdgeInsets.symmetric(vertical: 13)),
                icon: const Icon(Icons.person_add_alt_1, size: 18),
                label: const Text('Refer +1,000', style: TextStyle(fontWeight: FontWeight.w800)),
              )),
            ]),
            const SizedBox(height: 16),
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

  Widget _row(IconData icon, String label, String sub, int gm, Color color) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Container(width: 34, height: 34, alignment: Alignment.center, decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            Text(sub, style: const TextStyle(fontSize: 11, color: Colors.black45)),
          ])),
          Text('+${formatGm(gm)}', style: TextStyle(fontWeight: FontWeight.w900, color: color)),
        ]),
      );
}

class _Gm {
  final double notWorth;
  final double refunds;
  final int rated;
  final int receipts;
  final int referrals;
  const _Gm({required this.notWorth, required this.refunds, required this.rated, required this.receipts, required this.referrals});
}
