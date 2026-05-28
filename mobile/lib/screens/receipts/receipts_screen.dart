import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../models/receipt_model.dart';
import '../../utils/date_format.dart';
import '../../services/receipt_parse_service.dart';
import '../../categories.dart' as cat;

class ReceiptsScreen extends StatefulWidget {
  /// Optional initial store filter from a deep-link like
  /// /receipts?store=Glory%20Days%20Grill. Pre-populates the search box so
  /// tapping a bar on the dashboard's Spending-by-Store chart lands the
  /// user on a pre-filtered list.
  final String? initialStoreFilter;
  const ReceiptsScreen({super.key, this.initialStoreFilter});
  @override
  State<ReceiptsScreen> createState() => _ReceiptsScreenState();
}

class _ReceiptsScreenState extends State<ReceiptsScreen> {
  final _search = TextEditingController();
  String _filter = '';
  final Set<String> _selected = {};
  bool get _selectionMode => _selected.isNotEmpty;

  /// Period chip selection is LOCAL to this screen, not driven by the
  /// provider. The provider holds whatever was most recently fetched
  /// (often the dashboard's wider .all pre-fetch); this screen filters
  /// it client-side by [_selectedPeriod] so opening the tab is instant
  /// when the dashboard already has data in memory. We only call
  /// loadReceipts when the cache genuinely can't cover the requested
  /// period (cold start, or user taps a wider chip than cached).
  ReceiptPeriod _selectedPeriod = ReceiptPeriod.month;

  @override
  void initState() {
    super.initState();
    if (context.read<AppAuthProvider>().currentUser?.id != null) {
      final p = context.read<ReceiptProvider>();
      // Only fetch on cold start. If the dashboard (or any other surface)
      // pre-fetched a superset of 1M, the data is already in memory and
      // we render instantly via client-side filtering — no network wait.
      if (p.receipts.isEmpty) {
        p.loadReceipts(period: ReceiptPeriod.month);
      }
    }
    // Apply the deep-link store filter (if any) by pre-filling both the
    // visible search text and the filter state used by the list query.
    final initial = widget.initialStoreFilter;
    if (initial != null && initial.isNotEmpty) {
      _filter = initial;
      _search.text = initial;
    }
  }

  /// True when [have] (what's cached) covers everything [want] needs.
  /// .all covers anything; otherwise compare durations.
  bool _periodCovers(ReceiptPeriod have, ReceiptPeriod want) {
    if (have == ReceiptPeriod.all) return true;
    if (want == ReceiptPeriod.all) return false;
    return have.duration!.inDays >= want.duration!.inDays;
  }

  /// User tapped a chip. Update local state; only hit the network if the
  /// cached data can't cover the new period.
  void _selectPeriod(ReceiptPeriod p) {
    setState(() => _selectedPeriod = p);
    final prov = context.read<ReceiptProvider>();
    if (prov.receipts.isEmpty || !_periodCovers(prov.currentPeriod, p)) {
      prov.loadReceipts(period: p);
    }
  }

  /// Client-side filter: keep only rows whose date is on or after the
  /// cutoff for [_selectedPeriod]. Uses YYYY-MM-DD string compare so
  /// timezone differences can't shift the boundary (same approach as
  /// the dashboard chart).
  List<Receipt> _scopeToPeriod(List<Receipt> all) {
    if (_selectedPeriod.duration == null) return all;
    final cutoff = DateTime.now().subtract(_selectedPeriod.duration!);
    final mm = cutoff.month.toString().padLeft(2, '0');
    final dd = cutoff.day.toString().padLeft(2, '0');
    final cutoffStr = '${cutoff.year}-$mm-$dd';
    return all.where((r) => r.date.compareTo(cutoffStr) >= 0).toList();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _captureReceipt() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.camera);
    if (img == null || !mounted) return;

    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null) return;

    final file = File(img.path);
    // Show a quick "Guac-AI is scanning" loader while we send the photo to
    // /api/parse-receipt. The web flow does this too; mobile used to skip it
    // entirely so the user had to type every field by hand.
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const AlertDialog(
        content: Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
            SizedBox(width: 14),
            Flexible(child: Text('Guac-AI is reading your receipt…')),
          ]),
        ),
      ),
    );
    // One automatic retry on transient errors so a single AI hiccup doesn't
    // drop the user into an empty edit form.
    ParseResult result = await ReceiptParseService.parseImage(file);
    if (!result.ok) result = await ReceiptParseService.parseImage(file);
    if (!mounted) return;
    Navigator.of(context, rootNavigator: true).pop();  // dismiss loader
    if (!mounted) return;

    if (!result.ok) {
      // Surface the real reason, let the user edit manually instead of
      // dropping a blank placeholder in the table.
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text("Couldn't auto-read: ${result.error}"),
        duration: const Duration(seconds: 4),
      ));
      // Open the Add dialog with the photo attached but no prefill so the
      // user can type the fields by hand.
      showDialog(
        context: context,
        builder: (ctx) => _AddReceiptDialog(uid: uid, imageFile: file),
      );
      return;
    }
    final parsed = result.data!;
    // Duplicate dialog removed (user-requested) — the substring matcher
    // caused too many false positives. Real dupes are cleaned up via the
    // web Find duplicates button which uses the strict server-side matcher.
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => _AddReceiptDialog(uid: uid, imageFile: file, prefill: parsed),
    );
  }

  /// Bottom-sheet category picker. Tapping a row's category chip opens
  /// this — pick a preset → updates receipts.category via the provider.
  /// Preset categories only; users edit custom categories on web.
  Future<void> _pickCategoryFor(Receipt r) async {
    final picked = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Expanded(child: Text('Categorize receipt',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF064e3b)))),
              IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.of(ctx).pop()),
            ]),
            const SizedBox(height: 4),
            Text(r.storeName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.black87)),
            const SizedBox(height: 12),
            Wrap(spacing: 6, runSpacing: 6, children: [
              ActionChip(
                avatar: const Icon(Icons.clear, size: 14, color: Colors.black54),
                label: const Text('Uncategorized', style: TextStyle(fontSize: 12)),
                onPressed: () => Navigator.of(ctx).pop(''),
              ),
              for (final c in cat.kPresetCategories)
                ActionChip(
                  avatar: Text(c.emoji, style: const TextStyle(fontSize: 14)),
                  label: Text(c.label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  backgroundColor: r.category == c.slug ? cat.tintFor(c.color).withValues(alpha: 0.18) : null,
                  onPressed: () => Navigator.of(ctx).pop(c.slug),
                ),
            ]),
            const SizedBox(height: 8),
          ]),
        ),
      ),
    );
    if (picked == null || !mounted) return;
    try {
      await context.read<ReceiptProvider>().updateReceipt(r.id, {'category': picked.isEmpty ? null : picked});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(picked.isEmpty ? 'Category cleared' : 'Categorized as $picked'),
        duration: const Duration(seconds: 2),
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Update failed: $e')));
    }
  }

  void _toggle(String id) {
    setState(() {
      if (_selected.contains(id)) {
        _selected.remove(id);
      } else {
        _selected.add(id);
      }
    });
  }

  void _selectAll(List<Receipt> visible) {
    setState(() {
      if (_selected.length == visible.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(visible.map((r) => r.id));
      }
    });
  }

  Future<void> _deleteSelected() async {
    if (_selected.isEmpty) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete receipts?'),
        content: Text('Delete ${_selected.length} receipt${_selected.length == 1 ? '' : 's'}?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final provider = context.read<ReceiptProvider>();
    final ids = _selected.toList();
    for (final id in ids) {
      try { await provider.deleteReceipt(id); } catch (_) {}
    }
    setState(_selected.clear);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Deleted ${ids.length}')));
    }
  }

  void _editReceipt(Receipt r) {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null) return;
    showDialog(context: context, builder: (_) => _AddReceiptDialog(uid: uid, existing: r));
  }

  @override
  Widget build(BuildContext context) {
    final receipts = context.watch<ReceiptProvider>().receipts;
    final loading = context.watch<ReceiptProvider>().loading;
    // Scope client-side by the chip selection first, then apply the
    // text search. This way changing chips is instant (no network)
    // whenever the provider cache already covers the period.
    final scoped = _scopeToPeriod(receipts);
    final filtered = scoped.where((r) =>
      r.storeName.toLowerCase().contains(_filter.toLowerCase()) || r.id.contains(_filter)
    ).toList();

    return Scaffold(
      appBar: AppBar(
        leading: _selectionMode
          ? IconButton(icon: const Icon(Icons.close), onPressed: () => setState(_selected.clear))
          : null,
        title: Text(_selectionMode ? '${_selected.length} selected' : 'Receipts'),
        actions: _selectionMode
          ? [
              IconButton(
                icon: const Icon(Icons.select_all),
                onPressed: () => _selectAll(filtered),
                tooltip: 'Select all',
              ),
              IconButton(icon: const Icon(Icons.delete), onPressed: _deleteSelected, tooltip: 'Delete'),
            ]
          : [
              IconButton(icon: const Icon(Icons.camera_alt), onPressed: _captureReceipt, tooltip: 'Camera'),
            ],
      ),
      body: Column(children: [
        // Period chips — scope the query to save load time on big accounts
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          alignment: Alignment.centerLeft,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              const Padding(
                padding: EdgeInsets.only(right: 6),
                child: Text('Show:', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
              ),
              for (final p in ReceiptPeriod.values)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(p.label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                    selected: _selectedPeriod == p,
                    onSelected: (_) => _selectPeriod(p),
                    selectedColor: const Color(0xFFd1fae5),
                    labelStyle: TextStyle(
                      color: _selectedPeriod == p
                        ? const Color(0xFF064e3b) : Colors.black54,
                    ),
                    visualDensity: VisualDensity.compact,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
            ]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _search,
            decoration: const InputDecoration(hintText: 'Search receipts…', prefixIcon: Icon(Icons.search)),
            onChanged: (v) => setState(() => _filter = v),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            // Force a refetch scoped to whatever chip the user has selected.
            // Falls back to the provider's last period if for some reason
            // our local selection hasn't been satisfied yet.
            onRefresh: () => context.read<ReceiptProvider>()
              .loadReceipts(period: _selectedPeriod, force: true),
            child: loading
            ? const Center(child: CircularProgressIndicator())
            : filtered.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 120),
                  Center(child: Text('No receipts yet. Pull to refresh or tap + to add.', style: TextStyle(color: Colors.grey))),
                ])
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final r = filtered[i];
                    final isSelected = _selected.contains(r.id);
                    return Card(
                      color: isSelected ? Colors.blue.shade50 : null,
                      child: ListTile(
                        leading: _selectionMode
                          ? Checkbox(value: isSelected, onChanged: (_) => _toggle(r.id))
                          : null,
                        title: Row(children: [
                          Expanded(child: Text(r.storeName, style: const TextStyle(fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
                          if (r.fromStatement) Container(
                            margin: const EdgeInsets.only(left: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFf3f4f6),
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(color: const Color(0xFFd1d5db)),
                            ),
                            child: const Row(mainAxisSize: MainAxisSize.min, children: [
                              Icon(Icons.account_balance_wallet_outlined, size: 9, color: Color(0xFF6b7280)),
                              SizedBox(width: 2),
                              Text('Statement', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF374151))),
                            ]),
                          ),
                          if (r.isReturn) Container(
                            margin: const EdgeInsets.only(left: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFfee2e2),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Text('Return', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF991b1b))),
                          ),
                          if (r.rating != null) ...[
                            const SizedBox(width: 4),
                            Icon(Icons.star, size: 13, color: _ratingColor(r.rating!)),
                            const SizedBox(width: 1),
                            Text('${r.rating}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: _ratingColor(r.rating!))),
                          ],
                        ]),
                        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                          Text(
                            '${formatDateShort(r.date)} • Tax: \$${r.taxPaid.toStringAsFixed(2)}'
                            '${r.itemCount > 0 ? " • ${r.itemCount} ${r.itemCount == 1 ? "item" : "items"}" : ""}',
                          ),
                          const SizedBox(height: 4),
                          GestureDetector(
                            onTap: () => _pickCategoryFor(r),
                            child: _CategoryChip(slug: r.category),
                          ),
                        ]),
                        trailing: _selectionMode
                          ? Text('\$${r.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold))
                          : Row(mainAxisSize: MainAxisSize.min, children: [
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('\$${r.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                  if (r.businessPurchase)
                                    const Text('Business', style: TextStyle(fontSize: 11, color: Colors.blue)),
                                ],
                              ),
                              IconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                onPressed: () => _editReceipt(r),
                                tooltip: 'Edit',
                                visualDensity: VisualDensity.compact,
                              ),
                            ]),
                        onTap: _selectionMode ? () => _toggle(r.id) : () => context.go('/receipts/${r.id}'),
                        onLongPress: () => _toggle(r.id),
                      ),
                    );
                  },
                ),
          ),
        ),
      ]),
    );
  }

  // Star colour scale 1→5 matches WorthItRating
  Color _ratingColor(int r) {
    switch (r) {
      case 1: return const Color(0xFFdc2626);
      case 2: return const Color(0xFFea580c);
      case 3: return const Color(0xFFca8a04);
      case 4: return const Color(0xFF65a30d);
      case 5: return const Color(0xFF15803d);
      default: return const Color(0xFF9ca3af);
    }
  }
}

class _AddReceiptDialog extends StatefulWidget {
  final String uid;
  final File? imageFile;
  final Receipt? existing;
  final ParsedReceipt? prefill;
  const _AddReceiptDialog({required this.uid, this.imageFile, this.existing, this.prefill});
  @override
  State<_AddReceiptDialog> createState() => _AddReceiptDialogState();
}

class _AddReceiptDialogState extends State<_AddReceiptDialog> {
  late final TextEditingController _store;
  late final TextEditingController _amount;
  late final TextEditingController _tax;
  late final TextEditingController _rewardNo;
  late String _date;
  late bool _business;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    final p = widget.prefill;
    // Initial values come from: edit-existing > AI-prefill > blank.
    _store    = TextEditingController(text: e?.storeName ?? p?.storeName ?? '');
    _amount   = TextEditingController(text: e?.totalAmount.toString() ?? (p?.totalAmount != null && p!.totalAmount > 0 ? p.totalAmount.toStringAsFixed(2) : ''));
    _tax      = TextEditingController(text: e?.taxPaid.toString()     ?? (p?.taxPaid     != null && p!.taxPaid     > 0 ? p.taxPaid.toStringAsFixed(2)     : ''));
    _rewardNo = TextEditingController(text: e?.rewardNo ?? '');
    _date     = e?.date ?? p?.date ?? DateTime.now().toIso8601String().substring(0, 10);
    _business = e?.businessPurchase ?? false;
  }

  @override
  void dispose() {
    _store.dispose();
    _amount.dispose();
    _tax.dispose();
    _rewardNo.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_store.text.isEmpty || _amount.text.isEmpty) return;
    setState(() => _saving = true);
    final provider = context.read<ReceiptProvider>();
    if (widget.existing != null) {
      await provider.updateReceipt(widget.existing!.id, {
        'store_name': _store.text,
        'date': _date,
        'total_amount': double.tryParse(_amount.text) ?? 0,
        'tax_paid': double.tryParse(_tax.text) ?? 0,
        'reward_no': _rewardNo.text,
        'business_purchase': _business,
      });
    } else {
      final receipt = Receipt(
        id: '', storeName: _store.text, date: _date,
        totalAmount: double.tryParse(_amount.text) ?? 0,
        taxPaid: double.tryParse(_tax.text) ?? 0,
        rewardNo: _rewardNo.text, businessPurchase: _business,
      );
      await provider.addReceipt(receipt, imageFile: widget.imageFile);
    }
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.existing != null ? 'Edit Receipt' : 'Add Receipt'),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (widget.imageFile != null) ...[
            Image.file(widget.imageFile!, height: 120, fit: BoxFit.cover),
            const SizedBox(height: 12),
          ],
          TextField(controller: _store, decoration: const InputDecoration(labelText: 'Store Name*')),
          const SizedBox(height: 8),
          TextField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total Amount*', prefixText: '\$')),
          const SizedBox(height: 8),
          TextField(controller: _tax, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Tax Paid', prefixText: '\$')),
          const SizedBox(height: 8),
          TextField(controller: _rewardNo, decoration: const InputDecoration(labelText: 'Reward No')),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final picked = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime(2100));
              if (picked != null) setState(() => _date = picked.toIso8601String().substring(0, 10));
            },
            child: InputDecorator(decoration: const InputDecoration(labelText: 'Date'), child: Text(_date)),
          ),
          CheckboxListTile(
            title: const Text('Business Purchase', style: TextStyle(fontSize: 14)),
            value: _business, onChanged: (v) => setState(() => _business = v ?? false),
            contentPadding: EdgeInsets.zero,
          ),
        ]),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _saving ? null : _save,
          child: _saving
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(widget.existing != null ? 'Update' : 'Save'),
        ),
      ],
    );
  }
}

/// Small pill showing the receipt's current category, tappable to change it.
/// Uncategorized rows render a dashed "+ Category" affordance so the action
/// is discoverable without explaining it.
class _CategoryChip extends StatelessWidget {
  final String? slug;
  const _CategoryChip({required this.slug});

  @override
  Widget build(BuildContext context) {
    final preset = (slug != null && slug!.isNotEmpty) ? cat.presetBySlug(slug!) : null;
    if (preset == null) {
      // Uncategorized state
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: const Color(0xFFcbd5e1), width: 1, style: BorderStyle.solid),
        ),
        child: const Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.add, size: 11, color: Color(0xFF64748b)),
          SizedBox(width: 3),
          Text('Category', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF64748b))),
        ]),
      );
    }
    final tint = cat.tintFor(preset.color);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: tint.withValues(alpha: 0.4)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(preset.emoji, style: const TextStyle(fontSize: 11)),
        const SizedBox(width: 4),
        Text(preset.label, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: tint)),
      ]),
    );
  }
}
