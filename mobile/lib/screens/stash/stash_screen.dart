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
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/guac_mascot.dart';
import '../../widgets/category_picker_sheet.dart';
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
      final rows = await sb
          .from('receipt_items')
          .select('item_name, qty, price, category, returned, receipt_id, receipts!inner(date, from_statement)')
          .eq('returned', false)
          .eq('receipts.from_statement', false)
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
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: SliverList.builder(
                        itemCount: filtered.length,
                        itemBuilder: (ctx, idx) {
                          final i = filtered[idx];
                          final preset = i.category == null ? null : presetBySlug(i.category!);
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _kBrand.withValues(alpha: 0.15),
                                child: Text('×${i.qty}', style: const TextStyle(color: _kBrand, fontWeight: FontWeight.w800, fontSize: 12)),
                              ),
                              title: Text(i.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Row(
                                children: [
                                  GestureDetector(
                                    onTap: () => _openPicker(i),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: tintFor(preset?.color).withValues(alpha: 0.15),
                                        border: Border.all(color: tintFor(preset?.color).withValues(alpha: 0.35)),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        preset != null
                                            ? '${preset.emoji} ${preset.label}'
                                            : (i.category ?? '＋ Categorize'),
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                  ),
                                  if (i.lastDate.isNotEmpty) ...[
                                    const SizedBox(width: 8),
                                    Text('last ${i.lastDate}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                                  ],
                                ],
                              ),
                              trailing: Text('\$${i.totalSpent.toStringAsFixed(2)}',
                                style: const TextStyle(fontWeight: FontWeight.w800)),
                              onTap: i.lastReceiptId.isEmpty ? null : () => context.go('/receipts/${i.lastReceiptId}'),
                            ),
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
