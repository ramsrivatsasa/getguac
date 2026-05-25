import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../providers/reward_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _tabIdx = 0; // 0=Monthly, 1=Weekly, 2=Daily

  @override
  void initState() {
    super.initState();
    // Providers read the current user from Supabase auth internally.
    context.read<ReceiptProvider>().loadReceipts();
    context.read<RewardProvider>().loadRewards();
    // (Update check now lives on the login screen so users are prompted
    // BEFORE they hit the dashboard — covers them even if a release fixes
    // a sign-in bug.)
  }

  // Native feature tiles — route into Flutter screens, no web bounces.
  // Icons mirror the web (Sparkles, Wand2, Package, BadgeDollarSign).
  Widget _featureGrid() {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _featureTile(icon: Icons.auto_awesome,  label: 'GuacScore', color: const Color(0xFF15803d), route: '/guacscore'),
          _featureTile(icon: Icons.auto_fix_high, label: 'Wizard',    color: const Color(0xFF7c3aed), route: '/guacwizard'),
          _featureTile(icon: Icons.inventory_2,   label: 'Stash',     color: const Color(0xFFca8a04), route: '/stash'),
          _featureTile(icon: Icons.local_offer,   label: 'Steals',    color: const Color(0xFFdb2777), route: '/steals'),
        ],
      ),
    );
  }

  Widget _featureTile({required IconData icon, required String label, required Color color, required String route}) {
    return Expanded(
      child: GestureDetector(
        onTap: () => context.go(route),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 26, color: color),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AppAuthProvider>();
    final receipts = context.watch<ReceiptProvider>().receipts;
    final rewards = context.watch<RewardProvider>().rewards;

    final now = DateTime.now();
    final filtered = receipts.where((r) {
      try {
        final d = DateTime.parse(r.date);
        if (_tabIdx == 2) return d.year == now.year && d.month == now.month && d.day == now.day;
        if (_tabIdx == 1) return d.isAfter(now.subtract(const Duration(days: 7)));
        return d.year == now.year && d.month == now.month;
      } catch (_) { return false; }
    }).toList();

    final totalSpend = filtered.fold<double>(0, (s, r) => s + r.totalAmount);
    final totalTax = filtered.fold<double>(0, (s, r) => s + r.taxPaid);

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, ${auth.userProfile?['firstName'] ?? 'User'}'),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Quick-link tiles to GuacScore / Wizard / Stash / Steals (open on web)
          _featureGrid(),
          // Stat cards
          Row(children: [
            _statCard('Total Spent', '\$${totalSpend.toStringAsFixed(2)}', Icons.attach_money, Colors.blue),
            const SizedBox(width: 12),
            _statCard('Tax Paid', '\$${totalTax.toStringAsFixed(2)}', Icons.receipt, Colors.orange),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            _statCard('Receipts', '${filtered.length}', Icons.receipt_long, Colors.green),
            const SizedBox(width: 12),
            _statCard('Rewards', '${rewards.length}', Icons.card_giftcard, Colors.purple),
          ]),
          const SizedBox(height: 20),

          // Time period tabs
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Spending', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 0, label: Text('Monthly')),
                      ButtonSegment(value: 1, label: Text('Weekly')),
                      ButtonSegment(value: 2, label: Text('Daily')),
                    ],
                    selected: {_tabIdx},
                    onSelectionChanged: (s) => setState(() => _tabIdx = s.first),
                  ),
                  const SizedBox(height: 16),
                  if (filtered.isEmpty)
                    const Center(child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('No transactions for this period', style: TextStyle(color: Colors.grey)),
                    ))
                  else
                    SizedBox(
                      height: 180,
                      child: BarChart(BarChartData(
                        barGroups: filtered.take(7).toList().asMap().entries.map((e) => BarChartGroupData(
                          x: e.key,
                          barRods: [BarChartRodData(toY: e.value.totalAmount, color: const Color(0xFF1d4ed8), width: 16, borderRadius: BorderRadius.circular(4))],
                        )).toList(),
                        gridData: FlGridData(show: false),
                        borderData: FlBorderData(show: false),
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          bottomTitles: AxisTitles(sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (v, meta) {
                              final idx = v.toInt();
                              if (idx >= filtered.length) return const SizedBox();
                              return Text(filtered[idx].storeName.length > 6 ? filtered[idx].storeName.substring(0, 6) : filtered[idx].storeName,
                                style: const TextStyle(fontSize: 9));
                            },
                          )),
                        ),
                      )),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Recent receipts
          const Text('Recent Transactions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...filtered.take(5).map((r) => ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(r.storeName, style: const TextStyle(fontWeight: FontWeight.w500)),
            subtitle: Text(r.date, style: const TextStyle(fontSize: 12)),
            trailing: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('\$${r.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                if (r.businessPurchase)
                  Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(color: Colors.blue.shade100, borderRadius: BorderRadius.circular(8)),
                    child: const Text('Business', style: TextStyle(fontSize: 10, color: Colors.blue))),
              ],
            ),
            onTap: () => context.go('/receipts/${r.id}'),
          )),
          const SizedBox(height: 16),

          // Recent rewards
          const Text('Recent Rewards', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...rewards.take(3).map((r) => Card(
            child: ListTile(
              leading: const Icon(Icons.card_giftcard, color: Colors.purple),
              title: Text(r.rewardTitle, style: const TextStyle(fontWeight: FontWeight.w500)),
              subtitle: Text('${r.storeName} • Expires ${r.expiryDate}'),
              trailing: r.isExpired
                ? const Text('Expired', style: TextStyle(color: Colors.red, fontSize: 12))
                : const Text('Active', style: TextStyle(color: Colors.green, fontSize: 12)),
              onTap: () => context.go('/rewards/${r.id}'),
            ),
          )),
        ]),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, MaterialColor color) {
    return Expanded(child: Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: color.shade100, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color.shade700, size: 20)),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ]),
        ]),
      ),
    ));
  }
}
