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
import '../../services/mascot_event_bus.dart';
import '../../services/share_service.dart';
import '../../widgets/store_logo.dart';
import '../../widgets/top_app_bar_actions.dart';
import '../../widgets/animated_primitives.dart';
import '../../theme/gg_design.dart';

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
          .order('created_at', ascending: false)
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
    final wasApproved = it.approved;
    setState(() => it.approved = !it.approved);
    try {
      await _sb.from('shopping_list').update({'approved': it.approved}).eq('id', it.id);
      // Mascot wiggles only on the "Smashed!" direction (false → true).
      // Unchecking shouldn't celebrate.
      if (!wasApproved) mascotBus.wiggle();
    } catch (_) {
      if (mounted) setState(() => it.approved = wasApproved);
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

  // Manual add — the mobile Smashlist previously had NO way to create an
  // item (the form was web-only; the empty state even pointed users at the
  // website). FAB → bottom sheet → insert, mirroring web addToShoppingList()
  // defaults: approved=false, frequency Monthly, order_date today.
  Future<void> _addItemSheet() async {
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    final priceCtrl = TextEditingController();
    String listName = _activeList;
    _StoreLite? store;
    bool saving = false;
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        Future<void> save() async {
          final name = nameCtrl.text.trim();
          if (name.isEmpty) return;
          setSheet(() => saving = true);
          try {
            await _sb.from('shopping_list').insert({
              'user_id': _sb.auth.currentUser?.id,
              'item_name': name,
              'qty': int.tryParse(qtyCtrl.text.trim()) ?? 1,
              'price': double.tryParse(priceCtrl.text.trim()),
              'store_name_id': store?.id,
              'frequency': 'Monthly',
              'list_name': listName,
              'order_date': DateTime.now().toIso8601String().substring(0, 10),
              'approved': false,
              'sent_to_store': false,
            });
            if (ctx.mounted) Navigator.pop(ctx, true);
          } catch (e) {
            setSheet(() => saving = false);
            if (ctx.mounted) {
              ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Could not add: $e')));
            }
          }
        }

        return Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Add to Smashlist', style: ggHeading(size: 18, color: ggInk)),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                autofocus: true,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Item', hintText: 'e.g. Whole milk'),
                onSubmitted: (_) => save(),
              ),
              const SizedBox(height: 10),
              Row(children: [
                SizedBox(
                  width: 90,
                  child: TextField(
                    controller: qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Qty'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: priceCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Est. price (optional)', prefixText: '\$'),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: _kLists.map((l) => ChoiceChip(
                  label: Text('${_kListEmoji[l] ?? ''} $l'),
                  selected: listName == l,
                  selectedColor: ggChipBg,
                  onSelected: (_) => setSheet(() => listName = l),
                )).toList(),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<_StoreLite?>(
                initialValue: store,
                decoration: const InputDecoration(labelText: 'Store (optional)'),
                items: [
                  const DropdownMenuItem<_StoreLite?>(value: null, child: Text('Any store')),
                  ..._knownStores.map((s) => DropdownMenuItem<_StoreLite?>(
                        value: s,
                        child: Text(s.name, overflow: TextOverflow.ellipsis),
                      )),
                ],
                onChanged: (v) => setSheet(() => store = v),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: saving ? null : save,
                style: FilledButton.styleFrom(
                  backgroundColor: ggLime,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: const StadiumBorder(),
                ),
                icon: saving
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.add),
                label: Text('Add item',
                    style: TextStyle(fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800))),
              ),
            ],
          ),
        );
      }),
    );
    if (added == true) {
      // Land the user on the tab the item went to so they SEE it appear.
      if (mounted && listName != _activeList) setState(() => _activeList = listName);
      mascotBus.wiggle();
      await _load();
    }
    nameCtrl.dispose();
    qtyCtrl.dispose();
    priceCtrl.dispose();
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
        // Celebrate parity with the web's fireConfetti — Auto-Add is
        // the GuacMoney engagement loop's hero moment.
        if (okCount > 0) {
          mascotBus.celebrate(totalSaved > 0
              ? '+\$${totalSaved.toStringAsFixed(2)} saved'
              : 'Added $okCount');
        }
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
      appBar: ggAppBar(context, 'Smashlist', extraActions: [
        // Refresh — re-fetches the list. Same affordance the web
        // page has as "Refresh list" button next to Auto-Add.
        IconButton(
          icon: const Icon(Icons.refresh),
          tooltip: 'Refresh list',
          onPressed: _loading ? null : _load,
        ),
      ]),
      bottomNavigationBar: _selectedBuyAgain.isEmpty ? null : _compareStoresBar(),
      // Manual add — parity with the web Smashlist's add form.
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _loading ? null : _addItemSheet,
        backgroundColor: ggLime,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text('Add item',
            style: TextStyle(fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800))),
      ),
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
                child: GestureDetector(
                  onTap: () => setState(() => _activeList = l),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(
                      color: active ? ggChipBg : Colors.white,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: active ? ggLime : ggBorder),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      if (active)
                        const Icon(Icons.check_rounded, size: 16, color: ggLimeDk)
                      else
                        Text(_kListEmoji[l] ?? '', style: const TextStyle(fontSize: 14)),
                      const SizedBox(width: 6),
                      Text('$l${count > 0 ? " ($count)" : ""}',
                        style: ggBody(size: 13.5, weight: FontWeight.w700,
                          color: active ? ggLimeDk : ggInk)),
                    ]),
                  ),
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
                  style: TextStyle(fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800))),
              ),
            ),
          ),

        Expanded(
          child: _loading
            ? ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                itemCount: 5,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(children: [
                    const ShimmerBox(width: 36, height: 36, radius: 18),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                      ShimmerBox(width: 160, height: 14),
                      SizedBox(height: 8),
                      ShimmerBox(width: 80, height: 11),
                    ])),
                    const ShimmerBox(width: 24, height: 24, radius: 6),
                  ]),
                ),
              )
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
                                style: ggBody(size: 12, weight: FontWeight.w800, color: const Color(0xFF6b21a8))
                                  .copyWith(letterSpacing: 0.3)),
                            ]),
                          ),
                          Container(
                            margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                            decoration: ggCard(radius: 16),
                            clipBehavior: Clip.antiAlias,
                            child: Column(children: [
                              for (int bi = 0; bi < buyAgain.length; bi++) ...[
                                if (bi > 0) const Divider(height: 1, color: ggBorder),
                                _itemTile(buyAgain[bi], isPredicted: true),
                              ],
                            ]),
                          ),
                        ],
                        if (approved.isNotEmpty) ...[
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
                            child: Row(children: [
                              const Icon(Icons.shopping_cart_outlined, size: 14, color: _kBrand),
                              const SizedBox(width: 4),
                              Text('Your Smashlist · ${approved.length}',
                                style: ggBody(size: 12, weight: FontWeight.w800, color: _kBrand)
                                  .copyWith(letterSpacing: 0.3)),
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
    return FadeUpOnMount(
      key: ValueKey('item-anim-${it.id}'),
      child: Dismissible(
      key: ValueKey(it.id),
      background: Container(color: Colors.red, alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20), child: const Icon(Icons.delete, color: Colors.white)),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => _delete(it),
      child: ListTile(
        // Per-card checkbox only shows for Buy Again rows. Lets the user
        // hand-pick which suggestions get routed to one specific store
        // via the bottom action bar (Compare Stores flow).
        // No per-item store image — each store's logo already sits in the
        // card header, so repeating it on every line was redundant. Buy Again
        // rows keep just the selection checkbox for the Compare-Stores flow.
        leading: isPredicted
          ? Checkbox(
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
            )
          : null,
        title: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          style: ggBody(size: 14, weight: FontWeight.w700, color: it.approved ? ggFaint : ggInk)
            .copyWith(decoration: it.approved ? TextDecoration.lineThrough : TextDecoration.none),
          child: Text(it.name),
        ),
        subtitle: Row(children: [
          Text('×${it.qty}', style: ggBody(size: 12, color: ggMuted)),
          // The store name is NOT repeated here — it already headlines the
          // card above (that was the redundant "Lowe's / Costco Wholesale"
          // on every row). Show the estimated price instead, like the web
          // Smashlist's "est. $X".
          if (it.price > 0) ...[
            const SizedBox(width: 6),
            Text('·', style: ggBody(size: 12, color: ggFaint)),
            const SizedBox(width: 6),
            Text('est. \$${it.price.toStringAsFixed(it.price % 1 == 0 ? 0 : 2)}',
              style: ggBody(size: 12, color: ggMuted)),
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
          : Row(mainAxisSize: MainAxisSize.min, children: [
              Checkbox(
                value: it.approved,
                onChanged: (_) => _toggle(it),
                activeColor: _kBrand,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              // Visible delete — the swipe-to-delete gesture exists but is
              // undiscoverable; users reported "no way to delete items".
              // Same smart semantics as the swipe: predicted rows round-trip
              // to Buy Again, hand-added rows are deleted for real.
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20, color: ggFaint),
                tooltip: 'Remove from Smashlist',
                padding: const EdgeInsets.symmetric(horizontal: 4),
                constraints: const BoxConstraints(),
                onPressed: () => _delete(it),
              ),
            ]),
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
            style: TextStyle(fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800), color: Color(0xFF5b21b6))),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: _knownStores.isEmpty ? null : _pickStoreAndSend,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF7c3aed),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              icon: const Icon(Icons.store_outlined, size: 18),
              label: Text('Send to store…',
                style: TextStyle(fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800))),
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
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Text('Send to store', style: TextStyle(fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800), fontSize: 16)),
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
    Text('$_activeList is empty', style: ggBody(size: 16, weight: FontWeight.w800, color: ggInk)),
    const SizedBox(height: 4),
    Text(
      _items.isEmpty
        ? 'No items yet. Tap "Add item" below, or scan a receipt and they build themselves.'
        : 'Nothing in $_activeList. Tap "Add item" below or check the other tabs.',
      textAlign: TextAlign.center,
      style: ggBody(size: 13, color: ggMuted),
    ),
  ]));

  Widget _errorView() => Padding(
    padding: const EdgeInsets.all(20),
    child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.error_outline, color: Colors.red, size: 48),
      const SizedBox(height: 8),
      Text('Could not load Smashlist',
        style: ggBody(size: 16, weight: FontWeight.w800, color: const Color(0xFFdc2626))),
      const SizedBox(height: 6),
      Text(_loadError!, textAlign: TextAlign.center,
        style: ggBody(size: 12, color: ggMuted)),
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
      margin: const EdgeInsets.fromLTRB(12, 6, 12, 6),
      decoration: ggCard(radius: 16),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 11, 12, 11),
            child: Row(children: [
              StoreLogo(
                storeName: widget.storeName == 'Any Store' ? null : widget.storeName,
                fallbackEmoji: '🏬',
                size: 34,
                emojiBg: ggLime,
              ),
              const SizedBox(width: 10),
              Expanded(
                // Store header is the PRIMARY line of each card — larger than
                // the item names below it so the hierarchy reads store → items
                // (was 14.5, smaller than the 14px items, which read as
                // backwards). All Plus Jakarta Sans (ggBody).
                child: Text(widget.storeName,
                  style: ggBody(size: 17, weight: FontWeight.w800, color: ggInk)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: ggChipBg,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('${widget.items.length} item${widget.items.length == 1 ? "" : "s"}',
                  style: ggBody(size: 11.5, weight: FontWeight.w800, color: ggLimeDk)),
              ),
              const SizedBox(width: 4),
              Icon(_expanded ? Icons.expand_less : Icons.expand_more, color: ggFaint),
            ]),
          ),
        ),
        if (_expanded) ...[
          const Divider(height: 1, color: ggBorder),
          ...widget.items.map(widget.buildTile),
        ],
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
