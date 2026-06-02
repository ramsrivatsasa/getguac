import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/receipt_provider.dart';
import '../../models/receipt_model.dart';
import '../../widgets/worth_it_rating.dart';
import '../../widgets/store_logo.dart';
import '../../utils/date_format.dart';
import '../../services/receipt_reparse_service.dart';

class ReceiptDetailScreen extends StatefulWidget {
  final String id;
  const ReceiptDetailScreen({super.key, required this.id});
  @override
  State<ReceiptDetailScreen> createState() => _ReceiptDetailScreenState();
}

class _ReceiptDetailScreenState extends State<ReceiptDetailScreen> {
  Receipt? _receipt;
  List<ReceiptItem> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(ReceiptDetailScreen old) {
    super.didUpdateWidget(old);
    if (old.id != widget.id) {
      setState(() { _loading = true; _receipt = null; _items = []; });
      _load();
    }
  }

  Future<void> _load() async {
    final provider = context.read<ReceiptProvider>();
    // Try the in-memory list first (zero round-trips for the common case).
    Receipt? receipt = provider.receipts.where((r) => r.id == widget.id).firstOrNull;
    // Fall through to Supabase when the receipt is outside the current
    // period filter (e.g. the merged-into row is older than the 1-month
    // default) — without this, View on a merged dedup toast lands on
    // "Receipt not found" because the cached list doesn't contain it.
    if (receipt == null) {
      try {
        final sb = Supabase.instance.client;
        final row = await sb
            .from('receipts')
            .select('*')
            .eq('id', widget.id)
            .maybeSingle();
        if (row != null && row is Map) {
          final m = Map<String, dynamic>.from(row as Map);
          receipt = Receipt.fromMap(m['id'] as String, m);
        }
      } catch (_) {
        // Best-effort. The "Receipt not found" empty state covers true misses.
      }
    }
    final items = await provider.getItems(widget.id);
    if (mounted) setState(() { _receipt = receipt; _items = items; _loading = false; });
  }

  // Sibling navigation — pulls the visible receipts list from the provider
  // and finds the current row's neighbours.
  List<Receipt> get _siblings => context.read<ReceiptProvider>().receipts;
  int get _currentIdx => _siblings.indexWhere((r) => r.id == widget.id);

  void _goBack() => context.go('/receipts');

  void _goPrev() {
    final i = _currentIdx;
    if (i <= 0) {
      _toast('Already at the first receipt');
      return;
    }
    context.go('/receipts/${_siblings[i - 1].id}');
  }

  void _goNext() {
    final i = _currentIdx;
    if (i < 0 || i >= _siblings.length - 1) {
      _toast('Already at the last receipt');
      return;
    }
    context.go('/receipts/${_siblings[i + 1].id}');
  }

  void _toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), duration: const Duration(milliseconds: 900)),
    );
  }

  void _viewImage(String url) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _ImageViewer(url: url),
      fullscreenDialog: true,
    ));
  }

  // Re-run the AI parse against this receipt's source (email body OR
  // image at receipt_link). Used to fix camera uploads from pre-v0.2.25
  // that landed with blank fields, or any receipt where the AI got it
  // wrong the first time.
  Future<void> _reparse() async {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const AlertDialog(
        content: Row(children: [
          SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5)),
          SizedBox(width: 16),
          Expanded(child: Text('Re-parsing — Guac-AI is reading the receipt…')),
        ]),
      ),
    );
    final result = await ReceiptReparseService.reparse(widget.id);
    if (!mounted) return;
    Navigator.of(context, rootNavigator: true).pop(); // dismiss loader
    if (result.ok) {
      // Refresh provider data so the new fields land in the list AND on
      // this detail screen.
      // Force a refetch with `all` so the cache stays at dashboard
      // scope; default (month) would shrink the cached set and
      // make the dashboard's tile values drift.
      await context.read<ReceiptProvider>().loadReceipts(period: ReceiptPeriod.all, force: true);
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Re-parsed. ${result.itemsParsed} item${result.itemsParsed == 1 ? "" : "s"} found.')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Re-parse failed: ${result.error}'), duration: const Duration(seconds: 5)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: _goBack)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_receipt == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: _goBack)),
        body: const Center(child: Text('Receipt not found')),
      );
    }
    final r = _receipt!;
    final idx = _currentIdx;
    final total = _siblings.length;
    final hasPrev = idx > 0;
    final hasNext = idx >= 0 && idx < total - 1;

    // ── Headline number for the hero ─────────────────────────────────
    // Fetch shows "500 points" in the hero. GetGuac's equivalent is
    // the receipt total — that's what users care about per-receipt.
    // Rating impact (a "guac delta") rendered in the secondary slot.
    final headlineValue = r.totalAmount.abs();
    final headlineLabel = r.isReturn ? 'REFUNDED' : 'TOTAL';
    final ratedItemCount = _items.where((it) => !it.returned).length;

    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      body: PopScope(
        canPop: false,
        onPopInvoked: (didPop) { if (!didPop) _goBack(); },
        child: GestureDetector(
          behavior: HitTestBehavior.translucent,
          // Double-tap anywhere closes the detail screen
          onDoubleTap: _goBack,
          // Left swipe → previous, right swipe → next
          onHorizontalDragEnd: (details) {
            final v = details.primaryVelocity ?? 0;
            if (v < -400) _goPrev();        // finger moves left
            else if (v > 400) _goNext();    // finger moves right
          },
          child: SingleChildScrollView(
            padding: EdgeInsets.zero,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // ── HERO (GuacGreen, store-logo centered inside) ────────
              // Distinct from Fetch's orange-stars-zigzag treatment:
              // emerald→lime gradient with the store logo as the
              // centered focal point, total + date below it, and a
              // smooth wave at the bottom instead of a torn zigzag.
              _buildHero(r, idx, total, hasPrev, hasNext, headlineValue, headlineLabel, ratedItemCount),

              // ── WORTH IT? ROW (replaces "Receipt Points") ───────────
              if (!r.hideRatingUI)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(
                      top: BorderSide(color: Color(0xFFf1f5f9)),
                      bottom: BorderSide(color: Color(0xFFf1f5f9)),
                    ),
                  ),
                  child: Row(children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFfef3c7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: const Text('🥑', style: TextStyle(fontSize: 24)),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(child: Text('Worth it?',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0f172a)),
                    )),
                    WorthItRating(
                      value: r.rating,
                      showLabel: false,
                      size: 22,
                      onChanged: (v) async {
                        await context.read<ReceiptProvider>().updateReceipt(r.id, {'rating': v});
                        if (mounted) setState(() => _receipt = Receipt(
                          id: r.id, storeName: r.storeName, date: r.date,
                          totalAmount: r.totalAmount, taxPaid: r.taxPaid,
                          rewardNo: r.rewardNo, receiptLink: r.receiptLink,
                          businessPurchase: r.businessPurchase, processed: r.processed,
                          category: r.category, rating: v,
                          fromStatement: r.fromStatement, isReturn: r.isReturn,
                        ));
                      },
                    ),
                  ]),
                ),

              // ── ITEMS LIST (clean rows like the screenshot) ─────────
              if (_items.isNotEmpty)
                Container(
                  color: Colors.white,
                  child: Column(children: [
                    for (var i = 0; i < _items.length; i++) ...[
                      _buildFetchItemRow(_items[i], r),
                      if (i < _items.length - 1)
                        const Divider(height: 1, indent: 20, endIndent: 20, color: Color(0xFFf1f5f9)),
                    ],
                  ]),
                ),

              // ── SOURCE NOTE (statement / return) ────────────────────
              if (r.fromStatement || r.isReturn || _items.isEmpty) _buildSourceNote(r),

              // ── HELPER BANNER ───────────────────────────────────────
              // "Missing points for this receipt?" equivalent — prompts
              // the user to take action that improves their GuacScore.
              if (r.rating == null && !r.hideRatingUI && _items.isNotEmpty)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFf5f3ff),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFe9d5ff)),
                  ),
                  child: Row(children: [
                    Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: const Text('🔍', style: TextStyle(fontSize: 18)),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(child: Text(
                      'Rate this receipt to nudge your GuacScore.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF5b21b6), fontWeight: FontWeight.w700, height: 1.4),
                    )),
                  ]),
                ),

              // ── RE-PARSE BUTTON ─────────────────────────────────────
              if (!r.fromStatement)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: OutlinedButton.icon(
                    onPressed: _reparse,
                    icon: const Icon(Icons.auto_fix_high, size: 18, color: Color(0xFF15803d)),
                    label: const Text('Re-parse with Guac-AI',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF15803d))),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF15803d), width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      minimumSize: const Size.fromHeight(44),
                    ),
                  ),
                ),

              const SizedBox(height: 100), // breathing room for the floating footer
            ]),
          ),
        ),
      ),
      // ── FLOATING ACTION FOOTER ──────────────────────────────────────
      // Two buttons matching the Fetch reference: outline "Snap another"
      // (returns to /receipts with the camera trigger) + filled primary
      // "Done" (returns to /receipts list).
      bottomNavigationBar: _buildActionFooter(r),
    );
  }

  // ── REBRAND HELPERS ───────────────────────────────────────────────

  /// GetGuac-branded hero — emerald→lime gradient, store logo centered
  /// as the focal point, total + date below it, smooth wave at the
  /// bottom. Action row pinned to the top. Avocado decorations instead
  /// of stars/sparkles. Replaces the Fetch-look hero from v0.3.21.
  Widget _buildHero(Receipt r, int idx, int total, bool hasPrev, bool hasNext,
                    double headlineValue, String headlineLabel, int ratedItemCount) {
    return Stack(children: [
      ClipPath(
        clipper: _WaveClipper(),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 50, 16, 56),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF15803d), Color(0xFF65a30d)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
          ),
          child: Column(children: [
            // Top action row — back · counter · prev/next · image · edit
            Row(children: [
              _heroIconButton(icon: Icons.arrow_back, onTap: _goBack, tooltip: 'Back'),
              const Spacer(),
              if (total > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text('${idx + 1} / $total',
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
                ),
              const SizedBox(width: 6),
              _heroIconButton(icon: Icons.chevron_left, onTap: hasPrev ? _goPrev : null, tooltip: 'Previous'),
              _heroIconButton(icon: Icons.chevron_right, onTap: hasNext ? _goNext : null, tooltip: 'Next'),
              const SizedBox(width: 4),
              if (r.receiptLink.isNotEmpty && !r.fromStatement)
                _heroIconButton(icon: Icons.image_outlined, onTap: () => _viewImage(r.receiptLink), tooltip: 'View image'),
              _heroIconButton(icon: Icons.edit_outlined, onTap: () => _showAddItemDialog(), tooltip: 'Add item'),
            ]),
            const SizedBox(height: 18),
            // ── Store logo — centered focal point ────────────────────
            // Big white tile (80px) with a soft glow ring. Replaces
            // the star-coin + big-number that Fetch leads with.
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 14, offset: const Offset(0, 4))],
                border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 3),
              ),
              child: ClipOval(
                child: StoreLogo(
                  storeName: r.storeName,
                  size: 80,
                  borderRadius: 40,
                  fallbackEmoji: '🛒',
                  emojiBg: const Color(0xFFca8a04),
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Store name on the hero, big white type
            Text(r.storeName,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text('\$${headlineValue.toStringAsFixed(2)}  •  ${formatDateShort(r.date)}',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.92), fontSize: 13,
                fontWeight: FontWeight.w700, letterSpacing: 0.2,
              ),
            ),
            if (ratedItemCount > 0 && r.rating == null) ...[
              const SizedBox(height: 8),
              Text('$ratedItemCount items · tap a star below to rate',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.85), fontSize: 11, fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ]),
        ),
      ),
      // ── Decorative avocado leaves ──────────────────────────────────
      // GetGuac signature. Three tilted leaves at varying opacity,
      // positioned in the corners so they don't crowd the logo.
      const Positioned(top: 58, left: 30,
        child: Text('🥑', style: TextStyle(fontSize: 18))),
      const Positioned(top: 96, left: 56,
        child: Opacity(opacity: 0.6, child: Text('✿', style: TextStyle(color: Colors.white, fontSize: 14)))),
      const Positioned(top: 60, right: 92,
        child: Opacity(opacity: 0.55, child: Text('✿', style: TextStyle(color: Colors.white, fontSize: 11)))),
    ]);
  }

  Widget _heroIconButton({required IconData icon, VoidCallback? onTap, String? tooltip}) {
    final enabled = onTap != null;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Material(
        color: Colors.white.withValues(alpha: enabled ? 0.18 : 0.08),
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Tooltip(
            message: tooltip ?? '',
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Icon(icon, size: 18, color: Colors.white.withValues(alpha: enabled ? 1.0 : 0.4)),
            ),
          ),
        ),
      ),
    );
  }

  /// Single item row matching the Fetch reference — name on the left,
  /// price on the right, hairline divider between rows. Tappable to
  /// open the worth-it rating in a quick action sheet.
  Widget _buildFetchItemRow(ReceiptItem item, Receipt r) {
    final canRate = !item.returned && !r.fromStatement && !r.isReturn;
    return InkWell(
      onTap: canRate ? () => _showItemRatingSheet(item) : null,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
        child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item.itemName,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0f172a)),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
            if (item.qty > 1 || item.rating != null) ...[
              const SizedBox(height: 2),
              Row(children: [
                if (item.qty > 1)
                  Text('Qty ${item.qty}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94a3b8), fontWeight: FontWeight.w600),
                  ),
                if (item.qty > 1 && item.rating != null) const SizedBox(width: 8),
                if (item.rating != null) Row(children: [
                  for (var n = 1; n <= 5; n++)
                    Icon(n <= item.rating! ? Icons.star : Icons.star_outline,
                      size: 11, color: const Color(0xFFf59e0b)),
                ]),
              ]),
            ],
          ])),
          const SizedBox(width: 12),
          Text('\$${(item.price * item.qty).toStringAsFixed(2)}',
            style: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w800,
              color: item.returned ? const Color(0xFF94a3b8) : const Color(0xFF0f172a),
              decoration: item.returned ? TextDecoration.lineThrough : null,
            ),
          ),
        ]),
      ),
    );
  }

  /// Bottom-sheet star picker for a single item — opened on tap. Same
  /// UX as the FetchCard's rating picker but scoped to the receipt
  /// item rather than the product aggregate.
  void _showItemRatingSheet(ReceiptItem item) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 14),
          const Text('Worth it?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(item.itemName,
            style: const TextStyle(fontSize: 13, color: Color(0xFF64748b)),
            maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center,
          ),
          const SizedBox(height: 18),
          WorthItRating(
            value: item.rating,
            showLabel: false,
            size: 40,
            onChanged: (v) async {
              await context.read<ReceiptProvider>().updateItem(item.id, {'rating': v});
              final items = await context.read<ReceiptProvider>().getItems(widget.id);
              if (mounted) setState(() => _items = items);
              if (mounted) Navigator.of(context).pop();
            },
          ),
        ]),
      ),
    );
  }

  /// Source/empty-state explainer block. Renders for statement-imported
  /// rows (no per-item data), returns (negative amounts), or receipts
  /// with no items yet.
  Widget _buildSourceNote(Receipt r) {
    if (r.fromStatement) {
      return _noteBox(
        bg: const Color(0xFFf3f4f6), border: const Color(0xFFe5e7eb),
        emoji: '💳',
        title: 'Straight from your card statement',
        body: 'Banks only share the total — no per-item breakdown. Snap or forward the original receipt to unlock items + Worth-It scoring.',
        titleColor: const Color(0xFF374151), bodyColor: const Color(0xFF6b7280),
      );
    }
    if (r.isReturn) {
      return _noteBox(
        bg: const Color(0xFFfee2e2), border: const Color(0xFFfecaca),
        emoji: '↩️', title: 'Refund / return',
        body: 'Money came back — no items to track here.',
        titleColor: const Color(0xFF991b1b), bodyColor: const Color(0xFFb91c1c),
      );
    }
    return _noteBox(
      bg: const Color(0xFFf0fdf4), border: const Color(0xFFa7f3d0),
      emoji: '🥑', title: 'Nothing chopped yet',
      body: 'Tap Add Item to log each line by hand, or re-scan a clearer photo so Guac-AI can pull them in.',
      titleColor: const Color(0xFF064e3b), bodyColor: const Color(0xFF065f46),
    );
  }

  Widget _noteBox({required Color bg, required Color border, required String emoji,
                   required String title, required String body,
                   required Color titleColor, required Color bodyColor}) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Row(children: [
        Text(emoji, style: const TextStyle(fontSize: 22)),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: titleColor)),
          const SizedBox(height: 2),
          Text(body, style: TextStyle(fontSize: 11, color: bodyColor, height: 1.4)),
        ])),
      ]),
    );
  }

  /// Sticky bottom action footer matching the Fetch reference —
  /// outline "Snap another" + filled primary "Done."
  Widget _buildActionFooter(Receipt r) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFf1f5f9))),
        ),
        child: Row(children: [
          Expanded(child: OutlinedButton.icon(
            onPressed: () => context.go('/receipts?capture=1'),
            icon: const Icon(Icons.camera_alt_outlined, size: 18),
            label: const Text('Snap another'),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF15803d),
              side: const BorderSide(color: Color(0xFF15803d), width: 1.5),
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          )),
          const SizedBox(width: 10),
          Expanded(child: FilledButton.icon(
            onPressed: _goBack,
            icon: const Icon(Icons.check, size: 18),
            label: Text(r.rating != null ? 'Done' : 'Skip rating'),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF15803d),
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          )),
        ]),
      ),
    );
  }
  // _row removed in the Fetch-style rebrand — store/date/total now
  // render as a centered block in the hero + store-info card. If a
  // future surface wants the old key→value row layout, lift it from
  // the git history (commit 5f1109d~).

  void _showAddItemDialog() {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Item'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Item Name*')),
          const SizedBox(height: 8),
          TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Qty')),
          const SizedBox(height: 8),
          TextField(controller: priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price', prefixText: '\$')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.isEmpty) return;
              final item = ReceiptItem(
                id: '', itemName: nameCtrl.text,
                qty: int.tryParse(qtyCtrl.text) ?? 1,
                price: double.tryParse(priceCtrl.text) ?? 0,
              );
              await context.read<ReceiptProvider>().addItem(widget.id, item);
              final items = await context.read<ReceiptProvider>().getItems(widget.id);
              if (mounted) setState(() => _items = items);
              if (mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

/// Full-screen pinch-to-zoom image viewer. Resolves a signed URL via Supabase
/// storage so it works whether the bucket is public or private. Tap or
/// back button to close.
class _ImageViewer extends StatefulWidget {
  final String url;
  const _ImageViewer({required this.url});
  @override
  State<_ImageViewer> createState() => _ImageViewerState();
}

class _ImageViewerState extends State<_ImageViewer> {
  String? _resolvedUrl;
  String? _error;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  /// Try to turn the stored receipt_link into a working URL.
  /// 1) Parse the storage path out of the stored URL.
  /// 2) Ask Supabase for a 1-hour signed URL (works regardless of bucket visibility).
  /// 3) On failure, fall back to the raw URL — it'll work if the bucket is public.
  Future<void> _resolve() async {
    try {
      final uri = Uri.tryParse(widget.url);
      if (uri == null) {
        if (mounted) setState(() => _resolvedUrl = widget.url);
        return;
      }
      // Find "/object/<public|sign>/<bucket>/<rest...>" then extract bucket + path
      final segs = uri.pathSegments;
      final objIdx = segs.indexOf('object');
      if (objIdx >= 0 && objIdx + 2 < segs.length) {
        // segs: [..., 'object', 'public'|'sign'|'authenticated', 'receipts', 'uid', 'file.jpg']
        final bucket = segs[objIdx + 2];
        final pathSegs = segs.sublist(objIdx + 3);
        final path = pathSegs.join('/');
        if (bucket.isNotEmpty && path.isNotEmpty) {
          final signed = await Supabase.instance.client.storage
              .from(bucket)
              .createSignedUrl(path, 3600);
          if (mounted) setState(() => _resolvedUrl = signed);
          return;
        }
      }
      // Couldn't parse a path — just use the original
      if (mounted) setState(() => _resolvedUrl = widget.url);
    } catch (e) {
      // Signed URL creation failed — try the raw URL as a last resort
      if (mounted) setState(() {
        _resolvedUrl = widget.url;
        _error = 'Signed URL failed: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
        title: const Text('Receipt image', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            tooltip: 'Save to phone',
            onPressed: () {
              // Open the image URL in the browser — user long-presses
              // to save to gallery via Chrome's native save action.
              final urlToSave = _resolvedUrl ?? widget.url;
              launchUrl(Uri.parse(urlToSave), mode: LaunchMode.externalApplication)
                  .catchError((_) => false);
            },
          ),
        ],
      ),
      body: GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: _resolvedUrl == null
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : InteractiveViewer(
              minScale: 0.5,
              maxScale: 5,
              child: Center(
                child: Image.network(
                  _resolvedUrl!,
                  fit: BoxFit.contain,
                  loadingBuilder: (_, child, progress) {
                    if (progress == null) return child;
                    return const Center(child: CircularProgressIndicator(color: Colors.white));
                  },
                  errorBuilder: (_, error, __) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.broken_image_outlined, size: 64, color: Colors.white54),
                        const SizedBox(height: 12),
                        Text('Could not load image', style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
                        const SizedBox(height: 4),
                        Text(error.toString(),
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11)),
                        if (_error != null) ...[
                          const SizedBox(height: 4),
                          Text(_error!,
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 10)),
                        ],
                      ]),
                    ),
                  ),
                ),
              ),
            ),
      ),
    );
  }
}

/// Smooth wave bottom edge for the hero — replaces the v0.3.21
/// zigzag (which was too close to Fetch's torn-receipt look) with
/// a gentle sinusoidal curve. Clips the gradient container so the
/// bottom rolls into the page rather than ending abruptly.
class _WaveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 24);
    // Two control points for an asymmetric S-wave that feels organic.
    path.cubicTo(
      size.width * 0.25, size.height - 50,
      size.width * 0.65, size.height + 18,
      size.width, size.height - 18,
    );
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(_WaveClipper old) => false;
}
