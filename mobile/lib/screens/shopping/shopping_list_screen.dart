// Smashlist — shopping-list screen with Buy Again predictions on top
// + curated list below. Tap Auto-Add Cheapest to bulk-approve every
// Buy Again suggestion to its cheapest historical store, logging
// the per-item savings as GuacMoney events that show up on the
// dashboard tile.
//
// v0.3.x mobile-parity push: brand logos via StoreLogo widget, Auto-
// Add Cheapest with GuacMoney write-side, Refresh List button.
// Per-item Share, store accordion, and Compare Stores panel arrive
// in later phases.

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/guac_money_service.dart';
import '../../services/share_service.dart';
import '../../widgets/store_logo.dart';
import '../../widgets/top_app_bar_actions.dart';

const _kBrand = Color(0xFF15803d);

// Pulling more columns now — `predicted` + `price` + `store_name_id`
// drive the Buy Again section and the Auto-Add Cheapest math. The web
// query reads the same shape.
const _kListCols =
    'id, item_name, qty, price, list_name, frequency, approved, sent_to_store, '
    'predicted, predicted_reason, predicted_avg_cadence_days, store_name_id';

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
  final double price;
  final String listName;
  bool approved;
  final bool predicted;
  final String? storeNameId;
  String? storeNameDisplay;  // resolved from joined stores table
  _Item({
    required this.id,
    required this.name,
    required this.qty,
    required this.price,
    required this.listName,
    required this.approved,
    required this.predicted,
    required this.storeNameId,
  });
}

class _ShoppingListScreenState extends State<ShoppingListScreen> {
  final _sb = Supabase.instance.client;
  bool _loading = true;
  bool _autoAdding = false;
  List<_Item> _items = [];
  String _activeList = 'Pantry';
  String? _loadError;
  // Compare Stores selection — IDs of Buy Again items the user has
  // ticked. Drives the bottom action bar and the "Send to <store>"
  // picker.
  final Set<String> _selectedBuyAgain = <String>{};
  // All stores the user has shopped at — populated in _load() once so
  // the Send-to-store picker has the full menu, not just the stores
  // already referenced by the current Smashlist.
  List<_StoreLite> _knownStores = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _loadError = null; });
    try {
      // Two-step fetch matches the web getShoppingList(): shopping_list
      // rows first, then resolve store_name_id to a display name via
      // stores. RLS gates both reads to the current user.
      final rows = await _sb
          .from('shopping_list')
          .select(_kListCols)
          .order('order_date', ascending: false)
          .limit(500);
      final items = (rows as List).map((r) => _Item(
        id: (r['id'] ?? '').toString(),
        name: (r['item_name'] ?? '').toString(),
        qty: (r['qty'] is int) ? r['qty'] as int : int.tryParse(r['qty']?.toString() ?? '1') ?? 1,
        price: double.tryParse(r['price']?.toString() ?? '0') ?? 0,
        listName: (r['list_name'] ?? 'Pantry').toString(),
        approved: r['approved'] == true,
        predicted: r['predicted'] == true,
        storeNameId: r['store_name_id']?.toString(),
      )).toList();

      // Resolve store names — single batched query.
      final storeIds = items
          .map((i) => i.storeNameId)
          .whereType<String>()
          .where((s) => s.isNotEmpty)
          .toSet()
          .toList();
      if (storeIds.isNotEmpty) {
        try {
          final stores = await _sb
              .from('stores')
              .select('id, store_name')
              .inFilter('id', storeIds);
          final byId = <String, String>{};
          for (final s in (stores as List)) {
            byId[(s['id'] ?? '').toString()] = (s['store_name'] ?? '').toString();
          }
          for (final it in items) {
            final sid = it.storeNameId;
            if (sid != null && byId.containsKey(sid)) {
              it.storeNameDisplay = byId[sid];
            }
          }
        } catch (_) { /* best-effort; missing names just leaves them null */ }
      }

      _items = items;

      // Load the full list of known stores in parallel — used by the
      // Send-to-store picker in the Compare Stores bottom bar. Best-
      // effort: a failure here just leaves the picker empty.
      try {
        final allStores = await _sb
            .from('stores')
            .select('id, store_name')
            .order('store_name');
        _knownStores = (allStores as List)
          .map((r) => _StoreLite(
                id: (r['id'] ?? '').toString(),
                name: (r['store_name'] ?? '').toString(),
              ))
          .where((s) => s.id.isNotEmpty && s.name.isNotEmpty)
          .toList();
      } catch (_) {}
    } catch (e) {
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
      if (mounted) setState(() => it.approved = !it.approved);
    }
  }

  // Bulk-add: send every checked Buy Again item to one specific store
  // and mark approved. Mirrors web's addSelectedToStore() — the same
  // affordance for users who already know "I'm hitting Costco today,
  // route this whole pile there." Refreshes the list after success.
  Future<void> _addSelectedToStore(_StoreLite store) async {
    final ids = _selectedBuyAgain.toList();
    if (ids.isEmpty) return;
    try {
      await _sb.from('shopping_list')
        .update({'approved': true, 'store_name_id': store.id})
        .inFilter('id', ids);
      setState(() => _selectedBuyAgain.clear());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Added ${ids.length} to ${store.name}'),
          duration: const Duration(seconds: 2),
        ));
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Send-to-store failed: $e')));
      }
    }
  }

  // Smart-delete: predicted items get sent back to Buy Again (set
  // approved=false), non-predicted items are removed from the table
  // entirely. Mirrors web's removeFromSmashlist — feedback that the
  // user wanted the curated row off the list without losing the
  // prediction's history.
  Future<void> _delete(_Item it) async {
    if (it.predicted) {
      setState(() => it.approved = false);
      try {
        await _sb.from('shopping_list').update({'approved': false}).eq('id', it.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Sent back to Buy Again ↩'), duration: Duration(seconds: 2)),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => it.approved = true);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not move: $e')));
        }
      }
      return;
    }
    setState(() => _items.removeWhere((x) => x.id == it.id));
    try {
      await _sb.from('shopping_list').delete().eq('id', it.id);
    } catch (e) {
      if (mounted) {
        setState(() => _items.add(it));
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not delete: $e')));
      }
    }
  }

  // Mint a /share/<token> link via the web API and pop the OS share
  // sheet. The web endpoint handles GuacMoney-total + smash-day
  // enrichment, so the landing page renders the same on web and mobile.
  Future<void> _share(_Item it) async {
    final url = await ShareService.shareItem(
      context: context,
      itemName: it.name,
      storeName: it.storeNameDisplay,
      lastPrice: it.price > 0 ? it.price : null,
    );
    if (!mounted) return;
    if (url == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not create share link. Try again later.')),
      );
    }
  }

  // Auto-Add Cheapest — the GuacMoney engagement loop. For every
  // predicted-and-not-approved item, pull per-store price history,
  // pick the store with the lowest min_price, log a GuacMoney event
  // for the dollars saved vs the average of other stores. Then mark
  // each item as approved so it drops out of Buy Again.
  Future<void> _autoAddCheapest() async {
    final targets = _items.where((i) => i.predicted && !i.approved).toList();
    if (targets.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text("Nothing to add yet — wait for the nightly predictor or add items manually."),
      ));
      return;
    }
    setState(() => _autoAdding = true);
    try {
      // Pull all receipt_items × receipts.store for these item names
      // in ONE query, then build a per-item store map client-side.
      final names = targets.map((t) => t.name).toList();
      final rows = await _sb
          .from('receipt_items')
          .select('item_name, price, receipts!inner(store_id, store_name)')
          .inFilter('item_name', names)
          .limit(2000);
      final perItem = <String, Map<String, _StoreStat>>{};
      for (final r in (rows as List)) {
        final iname = (r['item_name'] ?? '').toString();
        final price = double.tryParse(r['price']?.toString() ?? '');
        final sid = (r['receipts'] as Map?)?['store_id']?.toString();
        final sname = (r['receipts'] as Map?)?['store_name']?.toString();
        if (iname.isEmpty || sid == null || sid.isEmpty || price == null) continue;
        final m = perItem.putIfAbsent(iname, () => <String, _StoreStat>{});
        final s = m.putIfAbsent(sid, () => _StoreStat(sid, sname ?? ''));
        s.count++;
        if (s.minPrice == null || price < s.minPrice!) s.minPrice = price;
      }

      double totalSaved = 0;
      int okCount = 0;
      for (final t in targets) {
        final m = perItem[t.name];
        if (m == null || m.isEmpty) continue;
        final stores = m.values.toList();
        stores.sort((a, b) => (a.minPrice ?? double.infinity).compareTo(b.minPrice ?? double.infinity));
        final chosen = stores.first;
        if (chosen.minPrice == null) continue;

        // Compute savings: avg of OTHER stores' min_price minus chosen.
        final others = stores.skip(1).where((s) => s.minPrice != null).toList();
        double saved = 0;
        if (others.isNotEmpty) {
          final avgOther = others.fold<double>(0, (s, x) => s + x.minPrice!) / others.length;
          saved = (avgOther - chosen.minPrice!) * t.qty;
          if (saved < 0) saved = 0;
        }

        // Update the shopping_list row: approved=true + store_name_id=chosen.
        try {
          await _sb.from('shopping_list').update({
            'approved': true,
            'store_name_id': chosen.id,
          }).eq('id', t.id);
          okCount++;
          if (saved > 0) {
            totalSaved += saved;
            // Best-effort GuacMoney write — never block the flow.
            await logGuacMoney(
              source: GuacMoneySource.autoAddCheapest,
              amount: saved,
              itemName: t.name,
              storeName: chosen.name,
              metadata: {
                'chosen_price': chosen.minPrice,
                'other_count': others.length,
                'qty': t.qty,
              },
            );
          }
        } catch (_) { /* keep going on per-item failures */ }
      }

      if (mounted) {
        final msg = totalSaved > 0
          ? 'Added $okCount/${targets.length} via cheapest store · +\$${totalSaved.toStringAsFixed(2)} GuacMoney 🥑'
          : 'Added $okCount/${targets.length} via cheapest store ✓';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), duration: const Duration(seconds: 4)));
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Auto-Add failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _autoAdding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final inList = _items.where((i) => i.listName == _activeList).toList();
    final buyAgain = inList.where((i) => i.predicted && !i.approved).toList();
    final approved = inList.where((i) => !i.predicted || i.approved).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smashlist'),
        actions: [
          // Refresh — re-fetches the list. Same affordance the web
          // page has as "Refresh list" button next to Auto-Add.
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Refresh list',
            onPressed: _loading ? null : _load,
          ),
          ...topAppBarActions(context),
        ],
      ),
      bottomNavigationBar: _selectedBuyAgain.isEmpty ? null : _compareStoresBar(),
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

        // Auto-Add Cheapest — visible only when Buy Again has items.
        // Same engagement loop the web Smashlist has; logs GuacMoney
        // events per item routed to its historical-cheapest store.
        if (buyAgain.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _autoAdding ? null : _autoAddCheapest,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF10b981),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: _autoAdding
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.savings_outlined),
                label: Text(_autoAdding ? 'Adding…' : '💰 Auto-Add ${buyAgain.length} via cheapest store',
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ),

        Expanded(
          child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _loadError != null
              ? _errorView()
              : inList.isEmpty
                ? _emptyView()
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(0, 0, 0, 24),
                      children: [
                        if (buyAgain.isNotEmpty) ...[
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
                            child: Row(children: [
                              const Icon(Icons.auto_awesome, size: 14, color: Color(0xFF7c3aed)),
                              const SizedBox(width: 4),
                              Text('Buy Again · ${buyAgain.length}',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5, color: Color(0xFF6b21a8))),
                            ]),
                          ),
                          ...buyAgain.map((it) => _itemTile(it, isPredicted: true)),
                          const SizedBox(height: 8),
                        ],
                        if (approved.isNotEmpty) ...[
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
                            child: Row(children: [
                              const Icon(Icons.shopping_cart_outlined, size: 14, color: _kBrand),
                              const SizedBox(width: 4),
                              Text('Your Smashlist · ${approved.length}',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5, color: _kBrand)),
                            ]),
                          ),
                          // Group curated rows by store so each header
                          // doubles as a per-store trip plan. Mirrors the
                          // web Smashlist's ownByStore accordion. Items
                          // without a routed store fall under "Any Store".
                          ..._groupByStore(approved).entries.map((g) =>
                            _StoreAccordion(
                              storeName: g.key,
                              items: g.value,
                              buildTile: (it) => _itemTile(it, isPredicted: false),
                            )),
                        ],
                      ],
                    ),
                  ),
        ),
      ]),
    );
  }

  Widget _itemTile(_Item it, {required bool isPredicted}) {
    final picked = isPredicted && _selectedBuyAgain.contains(it.id);
    return Dismissible(
      key: ValueKey(it.id),
      background: Container(color: Colors.red, alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20), child: const Icon(Icons.delete, color: Colors.white)),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => _delete(it),
      child: ListTile(
        // Per-card checkbox only shows for Buy Again rows. Lets the user
        // hand-pick which suggestions get routed to one specific store
        // via the bottom action bar (Compare Stores flow).
        leading: isPredicted
          ? Row(mainAxisSize: MainAxisSize.min, children: [
              Checkbox(
                value: picked,
                onChanged: (v) => setState(() {
                  if (v == true) {
                    _selectedBuyAgain.add(it.id);
                  } else {
                    _selectedBuyAgain.remove(it.id);
                  }
                }),
                activeColor: const Color(0xFF7c3aed),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
              StoreLogo(
                storeName: it.storeNameDisplay,
                fallbackEmoji: '🪄',
                size: 32,
                emojiBg: const Color(0xFF7c3aed),
              ),
            ])
          : StoreLogo(
              storeName: it.storeNameDisplay,
              fallbackEmoji: '🛒',
              size: 36,
              emojiBg: _kBrand,
            ),
        title: Text(it.name, style: TextStyle(
          fontWeight: FontWeight.w600,
          decoration: it.approved ? TextDecoration.lineThrough : null,
          color: it.approved ? Colors.black54 : null,
        )),
        subtitle: Row(children: [
          Text('×${it.qty}', style: const TextStyle(fontSize: 12, color: Colors.black54)),
          if (it.storeNameDisplay != null && it.storeNameDisplay!.isNotEmpty) ...[
            const SizedBox(width: 6),
            const Text('·', style: TextStyle(color: Colors.black38)),
            const SizedBox(width: 6),
            Flexible(child: Text(it.storeNameDisplay!, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: _kBrand, fontWeight: FontWeight.w600))),
          ],
        ]),
        trailing: isPredicted
          ? Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(
                icon: const Icon(Icons.ios_share, size: 20, color: Color(0xFF0ea5e9)),
                tooltip: 'Share',
                padding: const EdgeInsets.symmetric(horizontal: 4),
                constraints: const BoxConstraints(),
                onPressed: () => _share(it),
              ),
              IconButton(
                icon: const Icon(Icons.add_circle, color: _kBrand),
                tooltip: 'Add to Smashlist',
                onPressed: () => _toggle(it),
              ),
            ])
          : Checkbox(
              value: it.approved,
              onChanged: (_) => _toggle(it),
              activeColor: _kBrand,
            ),
      ),
    );
  }

  // Compare Stores bottom bar — appears once the user has ticked at
  // least one Buy Again item. Opens a modal store picker; on pick,
  // every selected item gets approved=true + store_name_id=<picked>
  // in a single Supabase update. Same affordance the web sticky bar
  // provides ("Add selected to <store>").
  Widget _compareStoresBar() {
    final count = _selectedBuyAgain.length;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        decoration: const BoxDecoration(
          color: Color(0xFFf5f3ff),
          border: Border(top: BorderSide(color: Color(0xFFddd6fe), width: 1)),
        ),
        child: Row(children: [
          Text('$count selected',
            style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF5b21b6))),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: _knownStores.isEmpty ? null : _pickStoreAndSend,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF7c3aed),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              icon: const Icon(Icons.store_outlined, size: 18),
              label: const Text('Send to store…',
                style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: () => setState(() => _selectedBuyAgain.clear()),
            child: const Text('Cancel'),
          ),
        ]),
      ),
    );
  }

  Future<void> _pickStoreAndSend() async {
    final picked = await showModalBottomSheet<_StoreLite>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Text('Send to store', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
            const Divider(height: 1),
            ..._knownStores.map((s) => ListTile(
              leading: StoreLogo(storeName: s.name, size: 32, fallbackEmoji: '🏬', emojiBg: _kBrand),
              title: Text(s.name),
              onTap: () => Navigator.pop(ctx, s),
            )),
          ],
        ),
      ),
    );
    if (picked != null) {
      await _addSelectedToStore(picked);
    }
  }

  // Bucket curated items by store. Stable-iteration LinkedHashMap so
  // groups render in insertion order (which is name-sorted from _load).
  // Items with no routed store get bucketed under "Any Store" — matches
  // web's "(Any store)" group key.
  Map<String, List<_Item>> _groupByStore(List<_Item> items) {
    final groups = <String, List<_Item>>{};
    for (final it in items) {
      final key = (it.storeNameDisplay != null && it.storeNameDisplay!.isNotEmpty)
        ? it.storeNameDisplay!
        : 'Any Store';
      groups.putIfAbsent(key, () => <_Item>[]).add(it);
    }
    return groups;
  }

  Widget _emptyView() => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    Text(_kListEmoji[_activeList] ?? '🛒', style: const TextStyle(fontSize: 60)),
    const SizedBox(height: 12),
    Text('$_activeList is empty', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
    const SizedBox(height: 4),
    Text(
      _items.isEmpty
        ? 'No items yet. Add some via web or by parsing a receipt.'
        : 'Nothing in $_activeList. Check the other tabs.',
      textAlign: TextAlign.center,
      style: const TextStyle(color: Colors.black54),
    ),
  ]));

  Widget _errorView() => Padding(
    padding: const EdgeInsets.all(20),
    child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.error_outline, color: Colors.red, size: 48),
      const SizedBox(height: 8),
      const Text('Could not load Smashlist',
        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.red)),
      const SizedBox(height: 6),
      Text(_loadError!, textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 12, color: Colors.black54)),
      const SizedBox(height: 12),
      FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Retry')),
    ])),
  );
}

// Per-store accordion section in the curated Smashlist. Expanded by
// default — first-time users see their whole list without tapping each
// header. Header shows store name + brand favicon + item count; body
// renders each item via the passed-in builder.
class _StoreAccordion extends StatefulWidget {
  final String storeName;
  final List<_Item> items;
  final Widget Function(_Item) buildTile;
  const _StoreAccordion({
    required this.storeName,
    required this.items,
    required this.buildTile,
  });
  @override
  State<_StoreAccordion> createState() => _StoreAccordionState();
}

class _StoreAccordionState extends State<_StoreAccordion> {
  bool _expanded = true;
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFf3f4f6))),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            child: Row(children: [
              StoreLogo(
                storeName: widget.storeName == 'Any Store' ? null : widget.storeName,
                fallbackEmoji: '🏬',
                size: 28,
                emojiBg: const Color(0xFF15803d),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(widget.storeName,
                  style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF064e3b))),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFf3f4f6),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('${widget.items.length}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black54)),
              ),
              const SizedBox(width: 4),
              Icon(_expanded ? Icons.expand_less : Icons.expand_more, color: Colors.black54),
            ]),
          ),
        ),
        if (_expanded) ...widget.items.map(widget.buildTile),
      ]),
    );
  }
}

class _StoreLite {
  final String id;
  final String name;
  const _StoreLite({required this.id, required this.name});
}

class _StoreStat {
  final String id;
  final String name;
  int count = 0;
  double? minPrice;
  _StoreStat(this.id, this.name);
}
