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

  @override
  void initState() {
    super.initState();
    if (context.read<AppAuthProvider>().currentUser?.id != null) {
      // Honour the 60s cache so re-entering the tab doesn't network-spam.
      // Pull-to-refresh forces a fresh fetch when the user actually wants one.
      context.read<ReceiptProvider>().loadReceipts();
    }
    // Apply the deep-link store filter (if any) by pre-filling both the
    // visible search text and the filter state used by the list query.
    final initial = widget.initialStoreFilter;
    if (initial != null && initial.isNotEmpty) {
      _filter = initial;
      _search.text = initial;
    }
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

    // Duplicate check — same key as /api/receipts/dedup. If we already have
    // this store+date+total, ask before opening the Add dialog.
    if (parsed.storeName.isNotEmpty && parsed.totalAmount > 0) {
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final dupDate = (parsed.date != null && parsed.date!.isNotEmpty) ? parsed.date! : today;
      final dup = await context.read<ReceiptProvider>().findDuplicate(
        storeName: parsed.storeName,
        date: dupDate,
        totalAmount: parsed.totalAmount,
      );
      if (!mounted) return;
      if (dup != null) {
        final action = await _askDuplicateAction(dup);
        if (!mounted || action == null) return;
        if (action == false) { context.go('/receipts/${dup.id}'); return; }
        // action == true → fall through and open the Add dialog
      }
    }

    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => _AddReceiptDialog(uid: uid, imageFile: file, prefill: parsed),
    );
  }

  /// Same dialog shape as the dashboard FAB's duplicate prompt.
  /// Returns: null=cancel, true=save anyway, false=view existing.
  Future<bool?> _askDuplicateAction(Receipt existing) async {
    return showDialog<bool?>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Looks like a duplicate'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text(
            'We already have a receipt from the same store, date, and total. Save another copy?',
            style: TextStyle(fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFf0fdf4),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFa7f3d0)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(existing.storeName,
                style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF064e3b))),
              const SizedBox(height: 2),
              Text('${existing.date}  ·  \$${existing.totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF065f46))),
            ]),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(null), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('View existing'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF15803d)),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Save anyway'),
          ),
        ],
      ),
    );
  }

  void _addManual() {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null) return;
    showDialog(context: context, builder: (ctx) => _AddReceiptDialog(uid: uid));
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
    final filtered = receipts.where((r) =>
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
      floatingActionButton: _selectionMode ? null : FloatingActionButton(onPressed: _addManual, child: const Icon(Icons.add)),
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
                    selected: context.watch<ReceiptProvider>().currentPeriod == p,
                    onSelected: (_) => context.read<ReceiptProvider>().loadReceipts(period: p),
                    selectedColor: const Color(0xFFd1fae5),
                    labelStyle: TextStyle(
                      color: context.watch<ReceiptProvider>().currentPeriod == p
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
            onRefresh: () {
              final p = context.read<ReceiptProvider>();
              return p.loadReceipts(period: p.currentPeriod, force: true);
            },
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
                        subtitle: Text(
                          '${formatDateShort(r.date)} • Tax: \$${r.taxPaid.toStringAsFixed(2)}'
                          '${r.itemCount > 0 ? " • ${r.itemCount} ${r.itemCount == 1 ? "item" : "items"}" : ""}',
                        ),
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
