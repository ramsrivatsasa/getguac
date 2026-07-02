// /items/:id — Single line-item detail screen (Flutter, mobile).
//
// Cross-platform parity with web's /items/[id] redesign:
//   • Tall pastel hero with product image (or store logo) centered.
//     Heart + Back chip top-left, Share chip top-right.
//   • Floating white card pulled up over the hero:
//       - small status pill ("Buy N" if any buys in last 90d, else "In your kitchen")
//       - bold product title
//       - lighter subtitle (category · last store · last date)
//       - emerald guac chip with the lifetime spend + "to go" text
//       - 6 pill placeholders representing the last 6 buys
//     "Where you've bought it" section (stores list)
//   • "Recent receipts" section — tappable rows -> /receipts/:id
//
// Data model is the same as the receipt detail screen: receipt_items joined
// to receipts. We pull the current item by id, then a history slice by SKU
// or exact item_name across the user's receipts (cap 50, same shape as web).
//
// No new dependencies. Reuses StoreLogo, formatDateShort, ProductImageService.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/store_logo.dart';
import '../../utils/date_format.dart';
import '../../services/product_image_service.dart';
import '../../widgets/animated_primitives.dart';
import '../../widgets/top_app_bar_actions.dart';
import '../../theme/gg_design.dart';

class ItemDetailScreen extends StatefulWidget {
  final String id;
  const ItemDetailScreen({super.key, required this.id});

  @override
  State<ItemDetailScreen> createState() => _ItemDetailScreenState();
}

// Local typed model — only the fields this screen reads. Skip the full
// ReceiptItem model so we keep the receipt join on a single SELECT and
// don't shuttle through ReceiptProvider (the provider doesn't expose a
// single-item-by-id fetch with the receipt joined).
class _Row {
  final String id;
  final String receiptId;
  final String storeName;
  final String date;       // ISO yyyy-MM-dd
  final int qty;
  final double price;
  final bool returned;
  final bool isCurrent;
  _Row({
    required this.id,
    required this.receiptId,
    required this.storeName,
    required this.date,
    required this.qty,
    required this.price,
    required this.returned,
    this.isCurrent = false,
  });
}

class _ItemDetailScreenState extends State<ItemDetailScreen> {
  bool _loading = true;
  Map<String, dynamic>? _item;       // current receipt_items row + joined receipt
  List<_Row> _history = [];          // sibling buys (excludes current)
  String? _productImageUrl;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ItemDetailScreen old) {
    super.didUpdateWidget(old);
    if (old.id != widget.id) {
      setState(() { _loading = true; _item = null; _history = []; _productImageUrl = null; });
      _load();
    }
  }

  Future<void> _load() async {
    final sb = Supabase.instance.client;
    try {
      // Current row + joined receipt (single round-trip).
      final raw = await sb
          .from('receipt_items')
          .select('*, receipt:receipt_id (id, store_name, date, from_statement, is_return)')
          .eq('id', widget.id)
          .maybeSingle();
      if (raw == null) {
        if (mounted) setState(() { _item = null; _loading = false; });
        return;
      }
      final item = Map<String, dynamic>.from(raw as Map);
      final receipt = item['receipt'] is Map ? Map<String, dynamic>.from(item['receipt']) : <String, dynamic>{};

      // History — same selector + filter strategy as web.
      final sku = (item['sku'] as String?)?.trim() ?? '';
      final name = (item['item_name'] as String?)?.trim() ?? '';
      final userId = sb.auth.currentUser?.id;
      List<_Row> history = [];
      if (userId != null && (sku.isNotEmpty || name.isNotEmpty)) {
        // Filter on the joined receipt's user_id SERVER-side. RLS would
        // catch the leak too, but without an explicit filter we over-
        // fetch up to 50 other-user matches per SKU and discard client-
        // side. Belt-and-suspenders + bandwidth cost.
        var q = sb
            .from('receipt_items')
            .select('id, qty, price, returned, item_name, sku, '
                'receipt:receipt_id!inner (id, store_name, date, user_id)')
            .neq('id', widget.id)
            .eq('receipt.user_id', userId);
        if (sku.isNotEmpty) {
          q = q.ilike('sku', sku);
        } else {
          q = q.ilike('item_name', name);
        }
        final rows = await q.order('id', ascending: false).limit(50);
        for (final r in rows as List) {
          final m = Map<String, dynamic>.from(r as Map);
          final rec = m['receipt'] is Map ? Map<String, dynamic>.from(m['receipt']) : <String, dynamic>{};
          history.add(_Row(
            id: m['id'].toString(),
            receiptId: (rec['id'] ?? '').toString(),
            storeName: (rec['store_name'] ?? '').toString(),
            date: (rec['date'] ?? '').toString(),
            qty: m['qty'] is int ? m['qty'] : int.tryParse(m['qty']?.toString() ?? '1') ?? 1,
            price: double.tryParse(m['price']?.toString() ?? '0') ?? 0,
            returned: m['returned'] == true,
          ));
        }
      }

      if (!mounted) return;
      setState(() {
        _item = {
          ...item,
          'receipt': receipt,
        };
        _history = history;
        _loading = false;
      });

      // Resolve product image (fire-and-forget — degrades to store logo).
      if (name.isNotEmpty) {
        ProductImageService.resolveBatch([name]).then((m) {
          if (!mounted) return;
          final url = m[name];
          if (url != null && url.isNotEmpty) setState(() => _productImageUrl = url);
        });
      }
    } catch (e) {
      if (mounted) setState(() { _item = null; _loading = false; });
    }
  }

  // Soft pastel gradient per category (single soft pastel, not heavy emerald).
  // Same palette as web/items/[id].
  List<Color> _gradientForCategory(String? slug) {
    const map = <String, List<Color>>{
      'grocery':     [Color(0xFFecfccb), Color(0xFFf7fee7)], // lime
      'beverages':   [Color(0xFFfef3c7), Color(0xFFfffbeb)], // amber
      'alcohol':     [Color(0xFFfee2e2), Color(0xFFfff1f2)], // rose
      'pet':         [Color(0xFFfce7f3), Color(0xFFfdf2f8)], // pink
      'household':   [Color(0xFFdbeafe), Color(0xFFeff6ff)], // sky
      'health':      [Color(0xFFf3e8ff), Color(0xFFfaf5ff)], // violet
      'restaurant':  [Color(0xFFfef9c3), Color(0xFFfefce8)], // yellow
      'clothing':    [Color(0xFFfde68a), Color(0xFFfffbeb)], // amber-warm
      'electronics': [Color(0xFFe0e7ff), Color(0xFFeef2ff)], // indigo
      'toys':        [Color(0xFFfbcfe8), Color(0xFFfdf2f8)], // pink
      'baby':        [Color(0xFFfef3c7), Color(0xFFfffbeb)], // amber
      'fuel':        [Color(0xFFe5e7eb), Color(0xFFf9fafb)], // gray
      'auto':        [Color(0xFFe5e7eb), Color(0xFFf9fafb)], // gray
    };
    return map[slug] ?? const [Color(0xFFf1f5f9), Color(0xFFf8fafc)];
  }

  // ISO -> compact ("May 30" / "May 30, 2025"). Mirrors stash_screen's
  // _friendlyDate so the chronological pill strip stays consistent.
  String _friendlyDate(String iso) {
    if (iso.isEmpty) return '—';
    final parts = iso.split('-');
    if (parts.length < 3) return iso;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    final m = int.tryParse(parts[1]) ?? 1;
    final d = int.tryParse(parts[2]) ?? 1;
    final thisYear = DateTime.now().year.toString();
    final label = months[(m - 1).clamp(0, 11)];
    return parts[0] == thisYear ? '$label $d' : '$label $d, ${parts[0]}';
  }

  String _titleCase(String? slug) {
    if (slug == null || slug.isEmpty) return '';
    return slug
        .replaceAll(RegExp(r'[-_]'), ' ')
        .split(' ')
        .where((w) => w.isNotEmpty)
        .map((w) => w[0].toUpperCase() + w.substring(1))
        .join(' ');
  }

  bool _within90(String iso) {
    if (iso.isEmpty) return false;
    final t = DateTime.tryParse(iso);
    if (t == null) return false;
    return DateTime.now().difference(t).inDays <= 90;
  }

  void _goBack() {
    // Fall back to /receipts if there's nothing to pop (e.g. cold-deep-link).
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/receipts');
    }
  }

  void _openReceipt(String receiptId) {
    if (receiptId.isEmpty) return;
    context.push('/receipts/$receiptId');
  }

  Future<void> _share() async {
    final name = (_item?['item_name'] ?? '').toString();
    try {
      await Share.share(name.isEmpty ? 'GetGuac item' : 'Check this out on GetGuac: $name');
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: _goBack), actions: [signOutAction(context)]),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_item == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: _goBack), actions: [signOutAction(context)]),
        body: const Center(child: Text('Item not found')),
      );
    }

    final item = _item!;
    final receipt = item['receipt'] is Map ? Map<String, dynamic>.from(item['receipt']) : <String, dynamic>{};
    final itemName = (item['item_name'] ?? '').toString();
    final storeName = (receipt['store_name'] ?? '').toString();
    final category = item['category'] as String?;
    final receiptDate = (receipt['date'] ?? '').toString();
    final qtyCurrent = item['qty'] is int ? item['qty'] as int : int.tryParse(item['qty']?.toString() ?? '1') ?? 1;
    final priceCurrent = double.tryParse(item['price']?.toString() ?? '0') ?? 0;
    final returnedCurrent = item['returned'] == true;

    // Combine current row + history; sort chronologically (newest first).
    final allRows = <_Row>[
      _Row(
        id: (item['id'] ?? '').toString(),
        receiptId: (receipt['id'] ?? '').toString(),
        storeName: storeName,
        date: receiptDate,
        qty: qtyCurrent,
        price: priceCurrent,
        returned: returnedCurrent,
        isCurrent: true,
      ),
      ..._history,
    ]..sort((a, b) => b.date.compareTo(a.date));

    final totalSpent = allRows.fold<double>(0, (s, r) => s + r.price);
    final totalQty = allRows.fold<int>(0, (s, r) => s + r.qty);
    final buys90 = allRows.where((r) => _within90(r.date)).length;

    // Stores rollup — name → count + spend, sorted by buy count.
    final byStore = <String, Map<String, dynamic>>{};
    for (final r in allRows) {
      final key = r.storeName.isEmpty ? 'Unknown' : r.storeName;
      final prev = byStore[key] ?? {'name': key, 'count': 0, 'spent': 0.0};
      prev['count'] = (prev['count'] as int) + 1;
      prev['spent'] = (prev['spent'] as double) + r.price;
      byStore[key] = prev;
    }
    final stores = byStore.values.toList()
      ..sort((a, b) => (b['count'] as int).compareTo(a['count'] as int));

    final gradient = _gradientForCategory(category);

    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      body: SingleChildScrollView(
        padding: EdgeInsets.zero,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _buildHero(itemName, storeName, gradient),
          // Floating white card pulled up over the hero.
          Transform.translate(
            offset: const Offset(0, -32),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildSummaryCard(
                itemName: itemName,
                category: category,
                storeName: storeName,
                receiptDate: receiptDate,
                totalSpent: totalSpent,
                totalQty: totalQty,
                buys: allRows.length,
                buys90: buys90,
                recentRows: allRows.take(6).toList(),
              ),
            ),
          ),
          if (stores.isNotEmpty) ...[
            const SizedBox(height: 4),
            FadeUpOnMount(
              delay: const Duration(milliseconds: 120),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildStoresCard(stores),
              ),
            ),
          ],
          const SizedBox(height: 16),
          FadeUpOnMount(
            delay: const Duration(milliseconds: 200),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildRecentReceiptsCard(allRows.take(5).toList()),
            ),
          ),
          const SizedBox(height: 32),
        ]),
      ),
    );
  }

  // ── Hero ─────────────────────────────────────────────────────────────
  // Pastel gradient, round chips top, product image or store logo center.
  Widget _buildHero(String itemName, String storeName, List<Color> gradient) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 44, 16, 56),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradient,
          begin: Alignment.topCenter, end: Alignment.bottomCenter,
        ),
      ),
      child: Column(children: [
        Row(children: [
          _chipButton(icon: Icons.arrow_back, onTap: _goBack, tooltip: 'Back'),
          const SizedBox(width: 8),
          _chipButton(icon: Icons.favorite_border, onTap: () {}, tooltip: 'Save'),
          const Spacer(),
          _chipButton(icon: Icons.ios_share, onTap: _share, tooltip: 'Share'),
        ]),
        const SizedBox(height: 18),
        SizedBox(
          height: 160,
          child: Center(
            child: _productImageUrl != null
                ? Image.network(
                    _productImageUrl!,
                    width: 160, height: 160,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => _heroFallbackLogo(storeName),
                  )
                : _heroFallbackLogo(storeName),
          ),
        ),
      ]),
    );
  }

  // Store logo fallback for the hero. Uses the existing StoreLogo widget so
  // brand favicons and the emoji fallback stay consistent with the rest of
  // the app.
  Widget _heroFallbackLogo(String storeName) {
    return StoreLogo(
      storeName: storeName,
      size: 120,
      borderRadius: 60,
      fallbackEmoji: '🛒',
      emojiBg: const Color(0xFF15803d),
    );
  }

  Widget _chipButton({required IconData icon, required VoidCallback onTap, String? tooltip}) {
    return Material(
      color: Colors.white.withValues(alpha: 0.8),
      shape: const CircleBorder(),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Tooltip(
          message: tooltip ?? '',
          child: SizedBox(
            width: 40, height: 40,
            child: Icon(icon, size: 18, color: const Color(0xFF374151)),
          ),
        ),
      ),
    );
  }

  // ── Summary card ─────────────────────────────────────────────────────
  Widget _buildSummaryCard({
    required String itemName,
    required String? category,
    required String storeName,
    required String receiptDate,
    required double totalSpent,
    required int totalQty,
    required int buys,
    required int buys90,
    required List<_Row> recentRows,
  }) {
    final subtitleParts = <String>[];
    if (category != null && category.isNotEmpty) subtitleParts.add(_titleCase(category));
    if (storeName.isNotEmpty) subtitleParts.add(storeName);
    if (receiptDate.isNotEmpty) subtitleParts.add(formatDateShort(receiptDate));
    final subtitle = subtitleParts.join(' · ');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 14, offset: Offset(0, 4)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Status pill — 90-day buys -> "Buy N", else "In your kitchen".
        _statusPill(buys90),
        const SizedBox(height: 12),
        Text(itemName.isEmpty ? 'Item' : itemName,
          style: const TextStyle(
            fontSize: 22, fontWeight: FontWeight.w900,
            color: Color(0xFF0f172a), letterSpacing: -0.3, height: 1.15,
          ),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(subtitle,
            style: const TextStyle(
              fontSize: 13, color: Color(0xFF6b7280),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
        const SizedBox(height: 14),
        // Money row — emerald guac chip + "to go" / "across N buys" line.
        Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFd1fae5),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Text('🥑', style: TextStyle(fontSize: 14)),
              const SizedBox(width: 4),
              CountUp(
                value: totalSpent,
                duration: const Duration(milliseconds: 600),
                formatter: (v) => '\$${v.toStringAsFixed(2)}',
                style: ggAmount(size: 14, color: const Color(0xFF065f46)),
              ),
            ]),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _moneyCaption(buys: buys, totalQty: totalQty),
              style: const TextStyle(
                fontSize: 12, color: Color(0xFF6b7280), fontWeight: FontWeight.w600,
              ),
              maxLines: 2, overflow: TextOverflow.ellipsis,
            ),
          ),
        ]),
        const SizedBox(height: 14),
        _cadenceStrip(recentRows),
      ]),
    );
  }

  // Caption beside the money chip. Mirrors the web's "spent across N buys · K units".
  String _moneyCaption({required int buys, required int totalQty}) {
    final buysLabel = 'spent across $buys buy${buys == 1 ? '' : 's'}';
    if (totalQty != buys) {
      return '$buysLabel · $totalQty unit${totalQty == 1 ? '' : 's'}';
    }
    return buysLabel;
  }

  Widget _statusPill(int buys90) {
    if (buys90 > 0) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFFf3e8ff),
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text('BUY $buys90',
          style: const TextStyle(
            color: Color(0xFF6d28d9), fontSize: 10,
            fontWeight: FontWeight.w900, letterSpacing: 0.8,
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFecfdf5),
        borderRadius: BorderRadius.circular(99),
      ),
      child: const Text('IN YOUR KITCHEN',
        style: TextStyle(
          color: Color(0xFF047857), fontSize: 10,
          fontWeight: FontWeight.w900, letterSpacing: 0.8,
        ),
      ),
    );
  }

  // Six pill placeholders — most-recent on the left. Filled = within 90d.
  Widget _cadenceStrip(List<_Row> recent) {
    return Row(children: List.generate(6, (i) {
      final r = i < recent.length ? recent[i] : null;
      final filled = r != null && _within90(r.date);
      final present = r != null;
      return Expanded(
        child: Container(
          margin: EdgeInsets.only(right: i == 5 ? 0 : 6),
          height: 8,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(99),
            gradient: filled
                ? const LinearGradient(
                    colors: [Color(0xFF34d399), Color(0xFF84cc16)],
                  )
                : null,
            color: filled
                ? null
                : (present ? const Color(0xFFd1d5db) : const Color(0xFFf3f4f6)),
          ),
        ),
      );
    }));
  }

  // ── "Where you've bought it" ─────────────────────────────────────────
  Widget _buildStoresCard(List<Map<String, dynamic>> stores) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(color: Color(0x0a000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.place, size: 16, color: Color(0xFF059669)),
          SizedBox(width: 6),
          Text("Where you've bought it",
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0f172a)),
          ),
        ]),
        const SizedBox(height: 8),
        for (var i = 0; i < stores.length; i++) ...[
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(children: [
              ClipOval(
                child: StoreLogo(
                  storeName: stores[i]['name'] as String,
                  size: 32, borderRadius: 16,
                  fallbackEmoji: '🏬',
                  emojiBg: const Color(0xFF15803d),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(stores[i]['name'] as String,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${stores[i]['count']} buy${(stores[i]['count'] as int) == 1 ? '' : 's'} · \$${(stores[i]['spent'] as double).toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF6b7280), fontWeight: FontWeight.w600),
                ),
              ])),
            ]),
          ),
          if (i < stores.length - 1)
            const Divider(height: 1, color: Color(0xFFf1f5f9)),
        ],
        const SizedBox(height: 8),
      ]),
    );
  }

  // ── "Recent receipts" — tap to open /receipts/:id ─────────────────────
  Widget _buildRecentReceiptsCard(List<_Row> rows) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(color: Color(0x0a000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.receipt_long, size: 16, color: Color(0xFF0284c7)),
          SizedBox(width: 6),
          Text('Recent receipts',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0f172a)),
          ),
        ]),
        const SizedBox(height: 6),
        for (var i = 0; i < rows.length; i++) ...[
          InkWell(
            onTap: () => _openReceipt(rows[i].receiptId),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
              child: Row(children: [
                SizedBox(
                  width: 56,
                  child: Text(_friendlyDate(rows[i].date),
                    style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6b7280),
                    ),
                  ),
                ),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Flexible(
                      child: Text(
                        rows[i].storeName.isEmpty ? '—' : rows[i].storeName,
                        style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF111827),
                        ),
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (rows[i].isCurrent) ...[
                      const SizedBox(width: 6),
                      const Text('· this',
                        style: TextStyle(
                          fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF047857),
                        ),
                      ),
                    ],
                  ]),
                  const SizedBox(height: 2),
                  Text(
                    '${rows[i].qty} unit${rows[i].qty == 1 ? '' : 's'} · \$${rows[i].price.toStringAsFixed(2)}'
                    '${rows[i].returned ? ' · returned' : ''}',
                    style: TextStyle(
                      fontSize: 11,
                      color: rows[i].returned ? const Color(0xFFb91c1c) : const Color(0xFF6b7280),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ])),
                const Icon(Icons.chevron_right, size: 18, color: Color(0xFF9ca3af)),
              ]),
            ),
          ),
          if (i < rows.length - 1)
            const Divider(height: 1, color: Color(0xFFf1f5f9)),
        ],
        const SizedBox(height: 8),
      ]),
    );
  }
}
