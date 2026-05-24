import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../providers/reward_provider.dart';
import '../../models/reward_model.dart';

class RewardsScreen extends StatefulWidget {
  const RewardsScreen({super.key});
  @override
  State<RewardsScreen> createState() => _RewardsScreenState();
}

class _RewardsScreenState extends State<RewardsScreen> {
  final Set<String> _selected = {};
  bool get _selectionMode => _selected.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (context.read<AppAuthProvider>().currentUser?.id != null) {
      context.read<RewardProvider>().loadRewards();
    }
  }

  void _toggle(String id) {
    setState(() {
      if (_selected.contains(id)) {
        _selected.remove(id);
      } else {
        _selected.add(id);
      }
    });
  }

  void _selectAll(List<Reward> visible) {
    setState(() {
      if (_selected.length == visible.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(visible.map((r) => r.id));
      }
    });
  }

  Future<void> _deleteSelected() async {
    if (_selected.isEmpty) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete rewards?'),
        content: Text('Delete ${_selected.length} reward${_selected.length == 1 ? '' : 's'}?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final provider = context.read<RewardProvider>();
    final ids = _selected.toList();
    for (final id in ids) {
      try { await provider.deleteReward(id); } catch (_) {}
    }
    setState(_selected.clear);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Deleted ${ids.length}')));
    }
  }

  void _editReward(Reward r) => _showRewardDialog(existing: r);
  void _addReward() => _showRewardDialog();

  void _showRewardDialog({Reward? existing}) {
    final noCtrl = TextEditingController(text: existing?.rewardNo ?? '');
    final titleCtrl = TextEditingController(text: existing?.rewardTitle ?? '');
    final typeCtrl = TextEditingController(text: existing?.rewardType ?? '');
    final storeCtrl = TextEditingController(text: existing?.storeName ?? '');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    String expiry = existing?.expiryDate ?? DateTime.now().toIso8601String().substring(0, 10);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: Text(existing != null ? 'Edit Reward' : 'Add Reward'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: noCtrl, decoration: const InputDecoration(labelText: 'Reward No*')),
              const SizedBox(height: 8),
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Title*')),
              const SizedBox(height: 8),
              TextField(controller: typeCtrl, decoration: const InputDecoration(labelText: 'Type (Points/Coupon…)')),
              const SizedBox(height: 8),
              TextField(controller: storeCtrl, decoration: const InputDecoration(labelText: 'Store Name*')),
              const SizedBox(height: 8),
              TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 2),
              const SizedBox(height: 8),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(context: ctx, initialDate: DateTime.tryParse(expiry) ?? DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime(2100));
                  if (picked != null) setState(() => expiry = picked.toIso8601String().substring(0, 10));
                },
                child: InputDecorator(decoration: const InputDecoration(labelText: 'Expiry Date'), child: Text(expiry)),
              ),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (noCtrl.text.isEmpty || titleCtrl.text.isEmpty || storeCtrl.text.isEmpty) return;
                final provider = context.read<RewardProvider>();
                if (existing != null) {
                  await provider.updateReward(existing.id, {
                    'reward_no': noCtrl.text,
                    'expiry_date': expiry,
                    'reward_type': typeCtrl.text,
                    'reward_title': titleCtrl.text,
                    'description': descCtrl.text,
                    'store_name': storeCtrl.text,
                  });
                } else {
                  await provider.addReward(Reward(
                    id: '', rewardNo: noCtrl.text, expiryDate: expiry,
                    rewardType: typeCtrl.text, rewardTitle: titleCtrl.text,
                    description: descCtrl.text, storeName: storeCtrl.text,
                  ));
                }
                if (mounted) Navigator.of(ctx).pop();
              },
              child: Text(existing != null ? 'Update' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final rewards = context.watch<RewardProvider>().rewards;
    final loading = context.watch<RewardProvider>().loading;

    return Scaffold(
      appBar: AppBar(
        leading: _selectionMode
          ? IconButton(icon: const Icon(Icons.close), onPressed: () => setState(_selected.clear))
          : null,
        title: Text(_selectionMode ? '${_selected.length} selected' : 'Rewards'),
        actions: _selectionMode
          ? [
              IconButton(
                icon: const Icon(Icons.select_all),
                onPressed: () => _selectAll(rewards),
                tooltip: 'Select all',
              ),
              IconButton(icon: const Icon(Icons.delete), onPressed: _deleteSelected, tooltip: 'Delete'),
            ]
          : null,
      ),
      floatingActionButton: _selectionMode ? null : FloatingActionButton(onPressed: _addReward, child: const Icon(Icons.add)),
      body: loading
        ? const Center(child: CircularProgressIndicator())
        : rewards.isEmpty
          ? const Center(child: Text('No rewards yet. Tap + to add.', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: rewards.length,
              itemBuilder: (_, i) {
                final r = rewards[i];
                final isSelected = _selected.contains(r.id);
                return Card(
                  color: isSelected ? Colors.blue.shade50 : null,
                  child: ListTile(
                    leading: _selectionMode
                      ? Checkbox(value: isSelected, onChanged: (_) => _toggle(r.id))
                      : CircleAvatar(
                          backgroundColor: r.isExpired ? Colors.red.shade100 : Colors.purple.shade100,
                          child: Icon(Icons.card_giftcard, color: r.isExpired ? Colors.red : Colors.purple, size: 20),
                        ),
                    title: Text(r.rewardTitle, style: const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Text('${r.storeName} • ${r.rewardType}\nExpires ${r.expiryDate}'),
                    isThreeLine: true,
                    trailing: _selectionMode
                      ? null
                      : Row(mainAxisSize: MainAxisSize.min, children: [
                          Text(r.isExpired ? 'Expired' : 'Active',
                            style: TextStyle(color: r.isExpired ? Colors.red : Colors.green, fontSize: 12, fontWeight: FontWeight.w500)),
                          IconButton(
                            icon: const Icon(Icons.edit, size: 18),
                            onPressed: () => _editReward(r),
                            tooltip: 'Edit',
                            visualDensity: VisualDensity.compact,
                          ),
                        ]),
                    onTap: _selectionMode ? () => _toggle(r.id) : () => context.go('/rewards/${r.id}'),
                    onLongPress: () => _toggle(r.id),
                  ),
                );
              },
            ),
    );
  }
}
