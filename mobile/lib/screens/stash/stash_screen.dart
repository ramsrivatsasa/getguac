// Stash — your owned items aggregated from receipt_items. Group by item name,
// sum qty, show last-bought date + a peek at the originating receipt.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _kBrand = Color(0xFFca8a04);

class StashScreen extends StatefulWidget {
  const StashScreen({super.key});
  @override
  State<StashScreen> createState() => _StashScreenState();
}

class _StashItem {
  final String name;
  int qty;
  double totalSpent;
  String lastDate;
  String lastReceiptId;
  String? category;
  _StashItem(this.name, this.qty, this.totalSpent, this.lastDate, this.lastReceiptId, this.category);
}

class _StashScreenState extends State<StashScreen> {
  bool _loading = true;
  String _query = '';
  List<_StashItem> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final sb = Supabase.instance.client;
      // Join via receipts so we get the date + receipt id without a second roundtrip
      final rows = await sb
          .from('receipt_items')
          .select('item_name, qty, price, category, returned, receipt_id, receipts!inner(date)')
          .eq('returned', false)
          .order('item_name')
          .limit(2000);

      final byName = <String, _StashItem>{};
      for (final r in rows as List) {
        final name = (r['item_name'] as String?)?.trim() ?? '';
        if (name.isEmpty) continue;
        final qty = (r['qty'] is int) ? r['qty'] as int : int.tryParse(r['qty']?.toString() ?? '1') ?? 1;
        final price = double.tryParse(r['price']?.toString() ?? '0') ?? 0;
        final date = (r['receipts']?['date'] ?? '').toString();
        final rid = (r['receipt_id'] ?? '').toString();
        final cat = r['category'] as String?;

        final existing = byName[name.toLowerCase()];
        if (existing == null) {
          byName[name.toLowerCase()] = _StashItem(name, qty, price * qty, date, rid, cat);
        } else {
          existing.qty += qty;
          existing.totalSpent += price * qty;
          if (date.compareTo(existing.lastDate) > 0) {
            existing.lastDate = date;
            existing.lastReceiptId = rid;
          }
          existing.category ??= cat;
        }
      }

      final list = byName.values.toList()..sort((a, b) => b.lastDate.compareTo(a.lastDate));
      if (mounted) setState(() { _items = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _query.isEmpty
        ? _items
        : _items.where((i) => i.name.toLowerCase().contains(_query.toLowerCase())).toList();
    final totalItems = filtered.fold<int>(0, (s, i) => s + i.qty);
    final totalSpent = filtered.fold<double>(0, (s, i) => s + i.totalSpent);

    return Scaffold(
      appBar: AppBar(title: const Text('Stash')),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: _items.isEmpty
              ? _emptyState()
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Summary card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [_kBrand.withOpacity(0.12), _kBrand.withOpacity(0.04)]),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: _kBrand.withOpacity(0.25)),
                      ),
                      child: Row(children: [
                        const Text('📦', style: TextStyle(fontSize: 40)),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${filtered.length} unique items', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _kBrand)),
                          Text('$totalItems units  •  \$${totalSpent.toStringAsFixed(2)} total', style: const TextStyle(fontSize: 12, color: Colors.black54)),
                        ])),
                      ]),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      decoration: InputDecoration(
                        hintText: 'Search your stash',
                        prefixIcon: const Icon(Icons.search),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        isDense: true,
                      ),
                      onChanged: (v) => setState(() => _query = v),
                    ),
                    const SizedBox(height: 12),
                    ...filtered.map((i) => Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _kBrand.withOpacity(0.15),
                          child: Text('×${i.qty}', style: const TextStyle(color: _kBrand, fontWeight: FontWeight.w800, fontSize: 12)),
                        ),
                        title: Text(i.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text([
                          if (i.category != null) i.category!,
                          if (i.lastDate.isNotEmpty) 'last ${i.lastDate}',
                        ].join(' • '), style: const TextStyle(fontSize: 11)),
                        trailing: Text('\$${i.totalSpent.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                        onTap: i.lastReceiptId.isEmpty ? null : () => context.go('/receipts/${i.lastReceiptId}'),
                      ),
                    )),
                  ],
                ),
          ),
    );
  }

  Widget _emptyState() => ListView(children: [
    const SizedBox(height: 80),
    Center(child: Column(children: const [
      Text('📦', style: TextStyle(fontSize: 80)),
      SizedBox(height: 16),
      Text('Your stash is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      SizedBox(height: 8),
      Padding(
        padding: EdgeInsets.symmetric(horizontal: 40),
        child: Text('Items extracted from your receipts will show up here. Upload some receipts to get started.',
          textAlign: TextAlign.center, style: TextStyle(color: Colors.black54)),
      ),
    ])),
  ]);
}
