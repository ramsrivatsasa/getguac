import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/receipt_provider.dart';
import '../../models/receipt_model.dart';
import '../../widgets/worth_it_rating.dart';
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
      await context.read<ReceiptProvider>().loadReceipts(force: true);
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

    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: _goBack),
        title: Text(r.storeName, overflow: TextOverflow.ellipsis),
        actions: [
          if (total > 0)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
              child: Text(
                '${idx + 1}/$total',
                style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: hasPrev ? _goPrev : null,
            tooltip: 'Previous',
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: hasNext ? _goNext : null,
            tooltip: 'Next',
          ),
          IconButton(icon: const Icon(Icons.close), tooltip: 'Close', onPressed: _goBack),
        ],
      ),
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
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Hint banner — fades once user has navigated at least once. (Always on for now.)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFf0fdf4),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: const Color(0xFFa7f3d0)),
                ),
                child: const Text(
                  '← swipe for prev / next → · double-tap to close',
                  style: TextStyle(fontSize: 10, color: Color(0xFF065f46), fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
              ),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Source badge for statement-imported entries
                    if (r.fromStatement || r.isReturn)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: r.isReturn ? const Color(0xFFfee2e2) : const Color(0xFFf3f4f6),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(r.isReturn ? Icons.undo : Icons.account_balance_wallet_outlined,
                            size: 12, color: r.isReturn ? const Color(0xFF991b1b) : const Color(0xFF6b7280)),
                          const SizedBox(width: 4),
                          Text(
                            r.isReturn ? 'Refund / return' : 'From credit-card statement',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800,
                              color: r.isReturn ? const Color(0xFF991b1b) : const Color(0xFF374151)),
                          ),
                        ]),
                      ),

                    // Worth-It rating — only for real purchases, not statement imports or returns
                    if (!r.hideRatingUI)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFf0fdf4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFa7f3d0)),
                        ),
                        child: Row(children: [
                          const Icon(Icons.thumbs_up_down_outlined, size: 18, color: Color(0xFF15803d)),
                          const SizedBox(width: 8),
                          const Text('Worth it?',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF064e3b))),
                          const Spacer(),
                          WorthItRating(
                            value: r.rating,
                            showLabel: true,
                            size: 24,
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
                    _row('Store', r.storeName),
                    _row('Date', formatDateShort(r.date)),
                    _row('Total Amount', '\$${r.totalAmount.toStringAsFixed(2)}'),
                    _row('Tax Paid', '\$${r.taxPaid.toStringAsFixed(2)}'),
                    _row('Reward No', r.rewardNo.isEmpty ? '—' : r.rewardNo),
                    _row('Business', r.businessPurchase ? 'Yes' : 'No'),

                    // Receipt image(s). Single-page receipts get one button;
                    // multi-page receipts (long-receipt camera flow) show
                    // page chips so the user can tap any specific page.
                    if (r.receiptLink.isNotEmpty && !r.fromStatement)
                      Padding(
                        padding: const EdgeInsets.only(top: 14),
                        child: r.extraPageUrls.isEmpty
                          ? SizedBox(
                              width: double.infinity,
                              child: FilledButton.icon(
                                onPressed: () => _viewImage(r.receiptLink),
                                icon: const Icon(Icons.photo_camera_back_outlined, size: 20),
                                label: const Text('View Receipt Image',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFF15803d),
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  const Icon(Icons.photo_library_outlined, size: 16, color: Color(0xFF15803d)),
                                  const SizedBox(width: 6),
                                  Text('${r.extraPageUrls.length + 1} pages',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF064e3b))),
                                  const SizedBox(width: 6),
                                  const Text('· tap to view',
                                    style: TextStyle(fontSize: 11, color: Colors.black54)),
                                ]),
                                const SizedBox(height: 8),
                                SizedBox(
                                  height: 110,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: 1 + r.extraPageUrls.length,
                                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                                    itemBuilder: (_, i) {
                                      final url = i == 0 ? r.receiptLink : r.extraPageUrls[i - 1];
                                      return GestureDetector(
                                        onTap: () => _viewImage(url),
                                        child: Container(
                                          width: 80,
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(color: const Color(0xFFa7f3d0), width: 1),
                                            image: DecorationImage(
                                              image: NetworkImage(url),
                                              fit: BoxFit.cover,
                                              onError: (_, __) {},
                                            ),
                                          ),
                                          alignment: Alignment.bottomRight,
                                          padding: const EdgeInsets.all(4),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: Colors.black.withValues(alpha: 0.6),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text('${i + 1}',
                                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ),
                      ),

                    // Re-parse — re-runs the AI on the source (email body or
                    // image) and refills the receipt. Hidden for statement-
                    // imported rows since there's no source to re-parse.
                    if (!r.fromStatement)
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _reparse,
                            icon: const Icon(Icons.auto_fix_high, size: 18, color: Color(0xFF15803d)),
                            label: const Text('Re-parse with Guac-AI',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF15803d))),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFF15803d), width: 1.5),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ),
                  ]),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  TextButton.icon(
                    onPressed: () => _showAddItemDialog(),
                    icon: const Icon(Icons.add, size: 18), label: const Text('Add Item'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_items.isEmpty)
                if (r.fromStatement)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFf3f4f6),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFe5e7eb)),
                    ),
                    child: Row(children: const [
                      Text('💳', style: TextStyle(fontSize: 22)),
                      SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Straight from your card statement',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF374151))),
                        SizedBox(height: 2),
                        Text("Banks only share the total — no per-item breakdown.\nSnap or forward the original receipt to unlock items + Worth-It scoring.",
                          style: TextStyle(fontSize: 11, color: Color(0xFF6b7280), height: 1.4)),
                      ])),
                    ]),
                  )
                else if (r.isReturn)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFfee2e2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFfecaca)),
                    ),
                    child: Row(children: const [
                      Text('↩️', style: TextStyle(fontSize: 22)),
                      SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Refund / return',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF991b1b))),
                        SizedBox(height: 2),
                        Text("Money came back — no items to track here.",
                          style: TextStyle(fontSize: 11, color: Color(0xFFb91c1c))),
                      ])),
                    ]),
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFf0fdf4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFa7f3d0)),
                    ),
                    child: Row(children: const [
                      Text('🥑', style: TextStyle(fontSize: 22)),
                      SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Nothing chopped yet',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF064e3b))),
                        SizedBox(height: 2),
                        Text("Tap Add Item to log each line by hand,\nor re-scan a clearer photo so Guac-AI can pull them in.",
                          style: TextStyle(fontSize: 11, color: Color(0xFF065f46), height: 1.4)),
                      ])),
                    ]),
                  )
              else
                ..._items.map((item) => Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(item.itemName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          const SizedBox(height: 2),
                          Text('SKU: ${item.sku.isEmpty ? '—' : item.sku} • Qty: ${item.qty} • \$${item.price.toStringAsFixed(2)}',
                            style: const TextStyle(fontSize: 11, color: Colors.black54)),
                        ])),
                        if (item.returned)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFfee2e2),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Text('Returned', style: TextStyle(color: Color(0xFF991b1b), fontSize: 9, fontWeight: FontWeight.w800)),
                          ),
                      ]),
                      const SizedBox(height: 4),
                      // Hide rating UI on returned items and on statement-imported
                      // receipts (those line items don't represent rateable purchases).
                      if (!item.returned && !r.fromStatement && !r.isReturn)
                        WorthItRating(
                          value: item.rating,
                          size: 18,
                          onChanged: (v) async {
                            await context.read<ReceiptProvider>().updateItem(item.id, {'rating': v});
                            final items = await context.read<ReceiptProvider>().getItems(widget.id);
                            if (mounted) setState(() => _items = items);
                          },
                        ),
                    ]),
                  ),
                )),
              const SizedBox(height: 60),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13)),
          Flexible(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
        ],
      ),
    );
  }

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
