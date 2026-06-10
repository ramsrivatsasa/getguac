import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/guac_money_service.dart';

/// GuacMoney — a gamified points balance (1000 GM = $1). Status currency for
/// now: balance grows from scanning receipts + referrals, with a "redeem for
/// gift cards — coming soon" goal. No cash payout yet.
class GuacMoneyScreen extends StatefulWidget {
  const GuacMoneyScreen({super.key});
  @override
  State<GuacMoneyScreen> createState() => _GuacMoneyScreenState();
}

class _GuacMoneyScreenState extends State<GuacMoneyScreen> {
  late Future<({int receipts, int referrals})> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<({int receipts, int referrals})> _load() async {
    final sb = Supabase.instance.client;
    final user = sb.auth.currentUser;
    int receipts = 0;
    if (user != null) {
      try {
        final rows = await sb.from('receipts').select('id').eq('user_id', user.id);
        receipts = (rows as List).length;
      } catch (_) {/* offline / RLS — show 0 */}
    }
    final referrals = await fetchReferralCount();
    return (receipts: receipts, referrals: referrals);
  }

  @override
  Widget build(BuildContext context) {
    const emerald = Color(0xFF166534);
    return Scaffold(
      backgroundColor: const Color(0xFFf9fafb),
      appBar: AppBar(backgroundColor: emerald, foregroundColor: Colors.white, title: const Text('GuacMoney')),
      body: FutureBuilder<({int receipts, int referrals})>(
        future: _future,
        builder: (ctx, snap) {
          final r = snap.data?.receipts ?? 0;
          final ref = snap.data?.referrals ?? 0;
          final points = guacMoneyPoints(receipts: r, referrals: ref);
          final usd = gmToUsd(points);
          final into = points % kGmRewardStep;
          final toNext = kGmRewardStep - into;
          final progress = into / kGmRewardStep;
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
                const Text('🥑', style: TextStyle(fontSize: 34)),
                const SizedBox(height: 2),
                TweenAnimationBuilder<int>(
                  tween: IntTween(begin: 0, end: points),
                  duration: const Duration(milliseconds: 1100),
                  curve: Curves.easeOutCubic,
                  builder: (_, v, __) => Text(formatGm(v),
                    style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white, height: 1)),
                ),
                const Text('GUACMONEY', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 2)),
                const SizedBox(height: 6),
                Text('≈ \$${usd.toStringAsFixed(2)} value', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ]),
            ),
            const SizedBox(height: 16),
            _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Next reward', style: TextStyle(fontWeight: FontWeight.w800)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFe2e8f0), borderRadius: BorderRadius.circular(10)),
                  child: const Text('Redeem soon', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF475569))),
                ),
              ]),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(value: progress, minHeight: 10, backgroundColor: const Color(0xFFf1f5f9), color: const Color(0xFFf59e0b)),
              ),
              const SizedBox(height: 8),
              Text('${formatGm(toNext)} more GuacMoney → a \$5 gift card', style: const TextStyle(fontSize: 12, color: Colors.black54)),
            ])),
            const SizedBox(height: 16),
            _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('How you earn', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              _earnRow(Icons.photo_camera_rounded, 'Scan a receipt', '+$kGmPerReceipt', const Color(0xFF15803d)),
              _earnRow(Icons.person_add_alt_1, 'Refer a friend', '+$kGmPerReferral', const Color(0xFFdb2777)),
              const SizedBox(height: 4),
              const Text('1,000 GuacMoney = \$1', style: TextStyle(fontSize: 11, color: Colors.black45)),
            ])),
            const SizedBox(height: 16),
            SizedBox(width: double.infinity, child: FilledButton.icon(
              onPressed: () => context.push('/invite'),
              style: FilledButton.styleFrom(backgroundColor: emerald, padding: const EdgeInsets.symmetric(vertical: 14)),
              icon: const Icon(Icons.person_add_alt_1),
              label: const Text('Refer a friend — +1,000 each', style: TextStyle(fontWeight: FontWeight.w800)),
            )),
            const SizedBox(height: 10),
            Text("You've tracked $r receipt${r == 1 ? '' : 's'}.",
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

  Widget _earnRow(IconData icon, String label, String pts, Color color) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Container(width: 34, height: 34, alignment: Alignment.center, decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
          Text('$pts 🥑', style: TextStyle(fontWeight: FontWeight.w900, color: color)),
        ]),
      );
}
