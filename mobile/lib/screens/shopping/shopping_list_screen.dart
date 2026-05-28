// Smashlist — lightweight shopping-list screen. Reads only the columns the
// list view actually shows, groups by list_name, supports add/check/delete.
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _kBrand = Color(0xFF15803d);
const _kListCols = 'id, item_name, qty, list_name, frequency, approved, sent_to_store';

const _kLists = ['Pantry', 'Cravings', 'Snack Stack', 'Grub & Grab'];
const Map<String, String> _kListEmoji = {
  'Pantry': '🥫', 'Cravings': '🍫', 'Snack Stack': '🍿', 'Grub & Grab': '🛍️',
};

class ShoppingListScreen extends StatefulWidget {
  const ShoppingListScreen({super.key});
  @override
  State<ShoppingListScreen> createState() => _ShoppingListScreenState();
}

class _Item {
  final String id;
  final String name;
  final int qty;
  final String listName;
  bool approved;
  _Item(this.id, this.name, this.qty, this.listName, this.approved);
}

class _ShoppingListScreenState extends State<ShoppingListScreen> {
  final _sb = Supabase.instance.client;
  bool _loading = true;
  List<_Item> _items = [];
  String _activeList = 'Pantry';

  @override
  void initState() {
    super.initState();
    _load();
  }

  String? _loadError;

  Future<void> _load() async {
    setState(() { _loading = true; _loadError = null; });
    try {
      final rows = await _sb
          .from('shopping_list')
          .select(_kListCols)
          .order('order_date', ascending: false)
          .limit(500);
      _items = (rows as List).map((r) => _Item(
        (r['id'] ?? '').toString(),
        (r['item_name'] ?? '').toString(),
        (r['qty'] is int) ? r['qty'] as int : int.tryParse(r['qty']?.toString() ?? '1') ?? 1,
        (r['list_name'] ?? 'Pantry').toString(),
        r['approved'] == true,
      )).toList();
    } catch (e) {
      // Surface the error so we don't silently render empty when RLS or
      // a missing column is the real cause. Previously this catch was
      // bare and swallowed everything — users saw an empty list with
      // no signal that anything had gone wrong.
      _loadError = e.toString();
      _items = const [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle(_Item it) async {
    setState(() => it.approved = !it.approved);
    try {
      await _sb.from('shopping_list').update({'approved': it.approved}).eq('id', it.id);
    } catch (_) {
      if (mounted) setState(() => it.approved = !it.approved);  // rollback
    }
  }

  Future<void> _delete(_Item it) async {
    setState(() => _items.removeWhere((x) => x.id == it.id));
    try { await _sb.from('shopping_list').delete().eq('id', it.id); } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final inList = _items.where((i) => i.listName == _activeList).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Smashlist')),
      // FAB removed in v0.2.69. The web/email flows feed this list now;
      // mobile is read-only (check off + swipe to delete still work).
      body: Column(children: [
        // List tabs
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: _kLists.map((l) {
              final active = l == _activeList;
              final count = _items.where((i) => i.listName == l && !i.approved).length;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text('${_kListEmoji[l]}  $l${count > 0 ? "  ($count)" : ""}'),
                  selected: active,
                  onSelected: (_) => setState(() => _activeList = l),
                  selectedColor: _kBrand.withValues(alpha: 0.15),
                ),
              );
            }).toList()),
          ),
        ),
        Expanded(
          child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _loadError != null
              ? Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 48),
                    const SizedBox(height: 8),
                    const Text('Could not load Smashlist',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.red)),
                    const SizedBox(height: 6),
                    Text(_loadError!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: Colors.black54)),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retry'),
                    ),
                  ])),
                )
              : inList.isEmpty
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(_kListEmoji[_activeList] ?? '🛒', style: const TextStyle(fontSize: 60)),
                  const SizedBox(height: 12),
                  Text('$_activeList is empty', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(
                    _items.isEmpty
                      ? 'No items in any list yet. Add some via web or by parsing a receipt.'
                      : 'Nothing in $_activeList. Check the other tabs above.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.black54),
                  ),
                ]))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: inList.length,
                    itemBuilder: (_, i) {
                      final it = inList[i];
                      return Dismissible(
                        key: ValueKey(it.id),
                        background: Container(color: Colors.red, alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: 20), child: const Icon(Icons.delete, color: Colors.white)),
                        direction: DismissDirection.endToStart,
                        onDismissed: (_) => _delete(it),
                        child: CheckboxListTile(
                          value: it.approved,
                          onChanged: (_) => _toggle(it),
                          activeColor: _kBrand,
                          title: Text(it.name, style: TextStyle(
                            decoration: it.approved ? TextDecoration.lineThrough : null,
                            color: it.approved ? Colors.black54 : null,
                          )),
                          subtitle: Text('×${it.qty}'),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ]),
    );
  }
}
