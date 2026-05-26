import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/reward_provider.dart';
import '../../utils/date_format.dart';

class RewardDetailScreen extends StatelessWidget {
  final String id;
  const RewardDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context) {
    final rewards = context.watch<RewardProvider>().rewards;
    final reward = rewards.where((r) => r.id == id).firstOrNull;

    if (reward == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('Reward not found')));

    return Scaffold(
      appBar: AppBar(title: Text(reward.rewardTitle)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _row('Reward No', reward.rewardNo),
              _row('Type', reward.rewardType),
              _row('Store', reward.storeName),
              _row('Expiry Date', formatDateShort(reward.expiryDate)),
              _row('Status', reward.isExpired ? 'Expired' : 'Active'),
              const Divider(height: 24),
              const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
              const SizedBox(height: 6),
              Text(reward.description.isEmpty ? 'No description' : reward.description),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          SizedBox(width: 110, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
        ],
      ),
    );
  }
}
