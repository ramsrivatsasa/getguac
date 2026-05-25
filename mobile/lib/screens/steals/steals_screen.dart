// Steals — surfaces expiring rewards + recently purchased items as quick
// search candidates. Tapping a chip opens the web Steals page where the
// AI price-finder lives (too heavy to replicate natively).

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/reward_provider.dart';
import '../../services/update_service.dart';
import '../../widgets/guac_mascot.dart';

const _kBrand = Color(0xFFdb2777);

class StealsScreen extends StatefulWidget {
  const StealsScreen({super.key});
  @override
  State<StealsScreen> createState() => _StealsScreenState();
}

class _StealsScreenState extends State<StealsScreen> {
  final _queryCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<RewardProvider>().loadRewards();
  }

  @override
  void dispose() {
    _queryCtrl.dispose();
    super.dispose();
  }

  void _search(String q) {
    final trimmed = q.trim();
    if (trimmed.isEmpty) return;
    final encoded = Uri.encodeComponent(trimmed);
    UpdateService.openDownload('https://getguac.app/steals?q=$encoded');
  }

  @override
  Widget build(BuildContext context) {
    final rewards = context.watch<RewardProvider>().rewards;
    final now = DateTime.now();
    final soon = now.add(const Duration(days: 30));
    final expiring = rewards.where((r) {
      final d = DateTime.tryParse(r.expiryDate);
      if (d == null) return false;
      return d.isAfter(now) && d.isBefore(soon);
    }).toList()
      ..sort((a, b) => a.expiryDate.compareTo(b.expiryDate));

    return Scaffold(
      appBar: AppBar(title: const Text('Steals')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Hero
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [_kBrand.withValues(alpha: 0.12), _kBrand.withValues(alpha: 0.04)]),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _kBrand.withValues(alpha: 0.25)),
            ),
            child: Row(children: [
              const GuacMascot(mood: MascotMood.rich, size: 60),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Find a Steal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: _kBrand)),
                const Text('AI-powered price hunt across the web. Type anything.',
                  style: TextStyle(fontSize: 11, color: Colors.black54)),
              ])),
            ]),
          ),
          const SizedBox(height: 16),
          // Search bar — opens the web for the actual AI price hunt
          Row(children: [
            Expanded(child: TextField(
              controller: _queryCtrl,
              textInputAction: TextInputAction.search,
              onSubmitted: _search,
              decoration: InputDecoration(
                hintText: 'product, SKU, or brand',
                prefixIcon: const Icon(Icons.search, color: _kBrand),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                isDense: true,
              ),
            )),
            const SizedBox(width: 8),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: _kBrand),
              onPressed: () => _search(_queryCtrl.text),
              child: const Text('Hunt'),
            ),
          ]),
          const SizedBox(height: 24),

          // Rewards expiring soon
          if (expiring.isNotEmpty) ...[
            const Text('Rewards expiring in 30 days', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            const SizedBox(height: 8),
            ...expiring.take(6).map((r) => Card(
              child: ListTile(
                leading: const Text('🎁', style: TextStyle(fontSize: 24)),
                title: Text(r.rewardTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${r.storeName}  •  expires ${r.expiryDate}',
                  style: const TextStyle(fontSize: 11)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/rewards/${r.id}'),
              ),
            )),
            const SizedBox(height: 20),
          ],

          // Why we bounce to web
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFf8fafc),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFe2e8f0)),
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: const [
              Icon(Icons.info_outline, size: 18, color: Color(0xFF64748b)),
              SizedBox(width: 10),
              Expanded(child: Text(
                'The AI price-hunt runs on getguac.app. Tapping Hunt opens your browser with results.',
                style: TextStyle(fontSize: 11, color: Color(0xFF475569), height: 1.4),
              )),
            ]),
          ),
        ],
      ),
    );
  }
}
