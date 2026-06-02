// Stash — your owned items aggregated from receipt_items. Group by item name,
// sum qty, show last-bought date + a peek at the originating receipt.
//
// Each row is tappable to change its category — opens CategoryPickerSheet
// with the same preset list as web and the user's custom categories. New
// categories can be created inline.
//
// Rendering uses CustomScrollView + SliverList.builder so rows are built only
// as they scroll into view (the previous `...filtered.map()` spread built every
// Card upfront and bogged down long stashes).

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/guac_mascot.dart';
import '../../widgets/category_picker_sheet.dart';
import '../../widgets/fetch_card.dart';
import '../../widgets/stash_actions_sheet.dart';
import '../../services/stash_service.dart';
import '../../categories.dart';

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
  int? rating;            // 1-5, null if unrated. Mirrors web's per-item rating.
  _StashItem(this.name, this.qty, this.totalSpent, this.lastDate, this.lastReceiptId, this.category, [this.rating]);
}

enum _Sort { recent, alpha, spent, qty }

class _StashScreenState extends State<StashScreen> {
  bool _loading = true;
  String _query = '';
  String? _categoryFilter;     // slug of selected category pill, null = "All"
  _Sort _sort = _Sort.recent;  // matches web's default SORT
  List<_StashItem> _items = [];
  Map<String, int> _onHand = {};  // item_key → qty (from stash_inventory)

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final sb = Supabase.instance.client;
      // Join via receipts so we get the date + receipt id without a second roundtrip.
      // Skip items belonging to receipts that came from a credit-card statement
      // (they don't have real per-line product data — Stash would just be noise).
      // PostgrestTransformBuilder + a typed Future don't play nice in
      // Future.wait without `<dynamic>` casts everywhere, and the second
      // call is so cheap that serializing it costs us ~50ms. Keep it
      // straightforward.
      final rows = await sb
          .from('receipt_items')
          .select('item_name, qty, price, category, returned, rating, receipt_id, receipts!inner(date, from_statement)')
          .eq('returned', false)
          .eq('receipts.from_statement', false)
          .order('item_name')
          .limit(2000);
      _onHand = await StashService.fetchInventoryMap();

      final byName = <String, _StashItem>{};
      for (final r in rows as List) {
        final name = (r['item_name'] as String?)?.trim() ?? '';
        if (name.isEmpty) continue;
        final qty = (r['qty'] is int) ? r['qty'] as int : int.tryParse(r['qty']?.toString() ?? '1') ?? 1;
        final price = double.tryParse(r['price']?.toString() ?? '0') ?? 0;
        final date = (r['receipts']?['date'] ?? '').toString();
        final rid = (r['receipt_id'] ?? '').toString();
        final cat = r['category'] as String?;
        final rRaw = r['rating'];
        final rating = rRaw is int ? rRaw : int.tryParse(rRaw?.toString() ?? '');

        final existing = byName[name.toLowerCase()];
        if (existing == null) {
          byName[name.toLowerCase()] = _StashItem(name, qty, price * qty, date, rid, cat, rating);
        } else {
          existing.qty += qty;
          existing.totalSpent += price * qty;
          if (date.compareTo(existing.lastDate) > 0) {
            existing.lastDate = date;
            existing.lastReceiptId = rid;
          }
          existing.category ??= cat;
          // Keep the highest rating we've seen (mirrors "most recent
          // rate stamps the product" — the upsert direction).
          if (rating != null && (existing.rating == null || rating > existing.rating!)) {
            existing.rating = rating;
          }
        }
      }

      final list = byName.values.toList()..sort((a, b) => b.lastDate.compareTo(a.lastDate));
      if (mounted) setState(() { _items = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Updates the category for every receipt_item that shares the same name
  // (mirrors web/src/lib/db.js::setStashProductCategory). RLS scopes the update
  // to the signed-in user's rows.
  Future<void> _setItemCategory(_StashItem item, String? slug) async {
    final prev = item.category;
    setState(() => item.category = slug);
    try {
      final sb = Supabase.instance.client;
      // Find receipt ids the user owns (RLS already filters).
      final receiptRows = await sb.from('receipts').select('id');
      final ids = (receiptRows as List).map((r) => r['id']).toList();
      if (ids.isEmpty) return;
      await sb
          .from('receipt_items')
          .update({'category': slug})
          .ilike('item_name', item.name)
          .inFilter('receipt_id', ids);
    } catch (e) {
      if (!mounted) return;
      setState(() => item.category = prev);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save category: $e')),
      );
    }
  }

  Future<void> _openPicker(_StashItem item) async {
    final picked = await showCategoryPickerSheet(context, currentSlug: item.category);
    if (picked == null) return; // dismissed without a pick
    await _setItemCategory(item, picked.isEmpty ? null : picked);
  }

  /// Counts items grouped by category — fuels the filter-pill row.
  Map<String?, int> _categoryCounts() {
    final m = <String?, int>{};
    for (final i in _items) {
      m[i.category] = (m[i.category] ?? 0) + 1;
    }
    return m;
  }

  @override
  Widget build(BuildContext context) {
    var filtered = _items;
    if (_query.isNotEmpty) {
      final q = _query.toLowerCase();
      filtered = filtered.where((i) => i.name.toLowerCase().contains(q)).toList();
    }
    if (_categoryFilter != null) {
      filtered = filtered.where((i) => i.category == _categoryFilter).toList();
    }
    // Sort — matches web's SORTS constant (recent / alpha / spent / qty)
    filtered = List<_StashItem>.from(filtered);
    switch (_sort) {
      case _Sort.recent: filtered.sort((a, b) => b.lastDate.compareTo(a.lastDate)); break;
      case _Sort.alpha:  filtered.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase())); break;
      case _Sort.spent:  filtered.sort((a, b) => b.totalSpent.compareTo(a.totalSpent)); break;
      case _Sort.qty:    filtered.sort((a, b) => b.qty.compareTo(a.qty)); break;
    }
    final totalItems = filtered.fold<int>(0, (s, i) => s + i.qty);
    final totalSpent = filtered.fold<double>(0, (s, i) => s + i.totalSpent);
    final categoryCounts = _categoryCounts();

    return Scaffold(
      appBar: AppBar(title: const Text('Stash')),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: _items.isEmpty
              ? _emptyState()
              : CustomScrollView(
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.all(16),
                      sliver: SliverToBoxAdapter(
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(colors: [_kBrand.withValues(alpha: 0.12), _kBrand.withValues(alpha: 0.04)]),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: _kBrand.withValues(alpha: 0.25)),
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
                            // Search + Sort dropdown side-by-side
                            Row(children: [
                              Expanded(child: TextField(
                                decoration: InputDecoration(
                                  hintText: 'Search your stash',
                                  prefixIcon: const Icon(Icons.search),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  isDense: true,
                                ),
                                onChanged: (v) => setState(() => _query = v),
                              )),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(color: const Color(0xFFe5e7eb)),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: DropdownButton<_Sort>(
                                  value: _sort,
                                  underline: const SizedBox.shrink(),
                                  isDense: true,
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF111827), fontWeight: FontWeight.w700),
                                  items: const [
                                    DropdownMenuItem(value: _Sort.recent, child: Text('Recent')),
                                    DropdownMenuItem(value: _Sort.alpha,  child: Text('A–Z')),
                                    DropdownMenuItem(value: _Sort.spent,  child: Text('Top \$')),
                                    DropdownMenuItem(value: _Sort.qty,    child: Text('Most owned')),
                                  ],
                                  onChanged: (v) { if (v != null) setState(() => _sort = v); },
                                ),
                              ),
                            ]),
                            const SizedBox(height: 10),
                            // Category filter pill row — "All" first,
                            // then every category the user has stash
                            // items in. Mirrors web's CatChip strip.
                            SizedBox(
                              height: 32,
                              child: ListView(
                                scrollDirection: Axis.horizontal,
                                children: [
                                  _CatPill(
                                    label: 'All',
                                    count: _items.length,
                                    active: _categoryFilter == null,
                                    onTap: () => setState(() => _categoryFilter = null),
                                  ),
                                  for (final entry in categoryCounts.entries
                                      .where((e) => e.key != null)
                                      .toList()..sort((a, b) => b.value.compareTo(a.value)))
                                    Padding(
                                      padding: const EdgeInsets.only(left: 6),
                                      child: _CatPill(
                                        label: presetBySlug(entry.key!)?.label ?? entry.key!,
                                        emoji: presetBySlug(entry.key!)?.emoji,
                                        count: entry.value,
                                        active: _categoryFilter == entry.key,
                                        onTap: () => setState(() => _categoryFilter = entry.key),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                      sliver: SliverList.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (ctx, idx) {
                          final i = filtered[idx];
                          final preset = i.category == null ? null : presetBySlug(i.category!);
                          // Tile tint follows the category's brand
                          // color (or pale yellow fallback). Subtle —
                          // gives a glance-able category cue without
                          // dominating the card.
                          final tint = preset == null
                            ? const Color(0xFFfef9c3)
                            : tintFor(preset.color).withValues(alpha: 0.18);
                          // Decorate the subtitle with on-hand info when
                          // we have it — "×3 · last May 30 · 2 on hand".
                          final invKey = StashService.inventoryKey(i.name);
                          final onHand = _onHand[invKey] ?? 0;
                          final subtitle = onHand > 0
                            ? '×${i.qty} · last ${_friendlyDate(i.lastDate)} · $onHand on hand'
                            : '×${i.qty} · last ${_friendlyDate(i.lastDate)}';
                          return FetchCard(
                            title: i.name,
                            subtitle: subtitle,
                            imageEmoji: preset?.emoji ?? '📦',
                            tint: tint,
                            value: i.totalSpent,
                            valueLabel: '\$',
                            storeName: preset != null ? preset.label : 'Tap to categorize',
                            storeColor: preset != null ? tintFor(preset.color) : const Color(0xFF6b7280),
                            storeEmoji: preset?.emoji,
                            rating: i.rating ?? 0,
                            onRate: (n) => _rateItem(i, n),
                            onTap: i.lastReceiptId.isEmpty
                              ? () => _openPicker(i)
                              : () => context.push('/receipts/${i.lastReceiptId}'),
                            onShare: () => _shareItem(i),
                            onMenu: () => _openActions(i),
                          );
                        },
                      ),
                    ),
                    const SliverToBoxAdapter(child: SizedBox(height: 24)),
                  ],
                ),
          ),
    );
  }

  /// "2026-05-30" → "May 30", "2025-12-14" → "Dec 14, 2025". Drops
  /// the year when it matches today so the subtitle stays short.
  String _friendlyDate(String iso) {
    if (iso.isEmpty) return '—';
    final parts = iso.split('-');
    if (parts.length < 3) return iso;
    final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    final m = int.tryParse(parts[1]) ?? 1;
    final d = int.tryParse(parts[2]) ?? 1;
    final thisYear = DateTime.now().year.toString();
    final monthLabel = months[(m - 1).clamp(0, 11)];
    return parts[0] == thisYear ? '$monthLabel $d' : '$monthLabel $d, ${parts[0]}';
  }

  /// Bulk-rate every receipt_item belonging to this product. Optimistic:
  /// updates the local row instantly so the star fills before the
  /// network roundtrip. Rolls back on failure.
  Future<void> _rateItem(_StashItem item, int n) async {
    final prev = item.rating;
    setState(() => item.rating = n);
    final count = await StashService.setProductRating(itemName: item.name, rating: n);
    if (!mounted) return;
    if (count == 0) {
      setState(() => item.rating = prev);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not save rating')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Rated ${item.name} $n★ (across $count receipts)')),
      );
    }
  }

  /// Per-item bottom sheet — on-hand stepper + best prices + share +
  /// add to Smashlist. Opened from the FetchCard's ⋮ menu icon.
  Future<void> _openActions(_StashItem item) async {
    final invKey = StashService.inventoryKey(item.name);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => StashActionsSheet(
        itemName: item.name,
        category: item.category,
        currentOnHand: _onHand[invKey] ?? 0,
        onShare: () => _shareItem(item),
        onAddToSmashlist: null,  // TODO: wire mobile add-to-smashlist
      ),
    );
    // Re-pull inventory so the subtitle reflects any stepper changes
    // made inside the sheet.
    final fresh = await StashService.fetchInventoryMap();
    if (mounted) setState(() => _onHand = fresh);
  }

  /// OS share-sheet handoff. Drops the user's item name + last-bought
  /// date + GetGuac link onto whatever they pick. Reuses share_plus
  /// which is already a transitive dep for the share-link infra.
  Future<void> _shareItem(_StashItem item) async {
    const url = 'https://getguac.app/stash';
    final text = item.lastDate.isEmpty
      ? 'I keep buying ${item.name} — tracking it on GetGuac. $url'
      : 'Bought ${item.name} ×${item.qty} (last ${_friendlyDate(item.lastDate)}) — tracking on GetGuac. $url';
    try {
      await Share.share(text, subject: 'GetGuac · ${item.name}');
    } catch (_) {/* user cancelled, ignore */}
  }

  Widget _emptyState() => ListView(children: const [
    SizedBox(height: 60),
    Center(child: Column(children: [
      GuacMascot(mood: MascotMood.relaxing, size: 130),
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

/// Single-tap category filter pill — small rounded badge with the
/// category emoji (if any), label, count. Active pill renders in
/// brand-tinted background. Mirrors web's CatChip behaviour.
class _CatPill extends StatelessWidget {
  final String label;
  final String? emoji;
  final int count;
  final bool active;
  final VoidCallback onTap;
  const _CatPill({
    required this.label, required this.count,
    required this.active, required this.onTap, this.emoji,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFca8a04).withValues(alpha: 0.12) : const Color(0xFFf3f4f6),
          border: Border.all(color: active ? const Color(0xFFca8a04) : const Color(0xFFe5e7eb)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (emoji != null) ...[
            Text(emoji!, style: const TextStyle(fontSize: 12)),
            const SizedBox(width: 4),
          ],
          Text(label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: active ? const Color(0xFF78350f) : const Color(0xFF374151),
            )),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: active ? const Color(0xFFca8a04) : const Color(0xFFd1d5db),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text('$count',
              style: TextStyle(
                fontSize: 9, fontWeight: FontWeight.w900,
                color: active ? Colors.white : const Color(0xFF374151),
              )),
          ),
        ]),
      ),
    );
  }
}
