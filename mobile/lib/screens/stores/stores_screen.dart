// Stores — list of distinct stores the user has shopped at, with
// receipt count + lifetime spend. Mobile parity for /stores on web.
// Tap a row → /receipts pre-filtered to that store.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/store_logo.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});
  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  List<_StoreRow> _rows = [];
  bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final sb = Supabase.instance.client;
    try {
      final rows = await sb.from('receipts')
          .select('store_name, total_amount, date')
          .gt('total_amount', 0)
          .order('date', ascending: false)
          .limit(5000);
      final m = <String, _StoreRow>{};
      for (final r in (rows as List)) {
        final name = (r['store_name'] ?? '').toString().trim();
        if (name.isEmpty) continue;
        final amt = double.tryParse((r['total_amount'] ?? '0').toString()) ?? 0;
        final date = (r['date'] ?? '').toString();
        final existing = m.putIfAbsent(name, () => _StoreRow(name));
        existing.count += 1;
        existing.total += amt;
        if (date.compareTo(existing.lastDate) > 0) existing.lastDate = date;
      }
      final list = m.values.toList()..sort((a, b) => b.total.compareTo(a.total));
      if (mounted) setState(() { _rows = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final filtered = q.isEmpty
      ? _rows
      : _rows.where((r) => r.name.toLowerCase().contains(q)).toList();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stores'),
        actions: [
          IconButton(
            icon: const Icon(Icons.link_rounded),
            onPressed: () => context.go('/connections'),
            tooltip: 'Connect retailers',
          ),
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: TextField(
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search, size: 18),
                  hintText: 'Search ${_rows.length} stores',
                  isDense: true,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            Expanded(child: RefreshIndicator(
              onRefresh: _load,
              child: filtered.isEmpty
                ? const Center(child: Text('No matches', style: TextStyle(color: Colors.black54)))
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) {
                      final r = filtered[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: StoreLogo(storeName: r.name, size: 40),
                          title: Text(r.name,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text('${r.count} receipt${r.count == 1 ? '' : 's'} · last ${r.lastDate}',
                            style: const TextStyle(fontSize: 11, color: Colors.black54)),
                          trailing: Text('\$${r.total.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF065f46))),
                          onTap: () => context.push('/receipts?store=${Uri.encodeComponent(r.name)}'),
                        ),
                      );
                    },
                  ),
            )),
          ]),
    );
  }
}

class _StoreRow {
  final String name;
  int count = 0;
  double total = 0;
  String lastDate = '';
  _StoreRow(this.name);
}
