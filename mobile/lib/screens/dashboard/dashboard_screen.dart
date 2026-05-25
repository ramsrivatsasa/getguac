import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../providers/reward_provider.dart';
import '../../services/update_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _tabIdx = 0; // 0=Monthly, 1=Weekly, 2=Daily
  AvailableUpdate? _update;

  @override
  void initState() {
    super.initState();
    // Providers read the current user from Supabase auth internally.
    context.read<ReceiptProvider>().loadReceipts();
    context.read<RewardProvider>().loadRewards();
    // Fire-and-forget update check (silent failure on offline / rate limit)
    UpdateService.checkForUpdate().then((u) {
      if (mounted && u != null) setState(() => _update = u);
    });
  }

  Widget _updateBanner() {
    if (_update == null) return const SizedBox.shrink();
    final u = _update!;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF15803d), Color(0xFF65a30d)],
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Text('🥑', style: TextStyle(fontSize: 28)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Update available: ${u.tag}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                ),
                const Text(
                  'Tap to download the latest version',
                  style: TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ],
            ),
          ),
          FilledButton(
            onPressed: () => UpdateService.openDownload(u.downloadUrl),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF15803d),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
            child: const Text('Update', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white70, size: 18),
            onPressed: () => setState(() => _update = null),
            visualDensity: VisualDensity.compact,
          ),
        ],
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
          // In-app update banner (only when a newer GitHub release exists)
          _updateBanner(),
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
