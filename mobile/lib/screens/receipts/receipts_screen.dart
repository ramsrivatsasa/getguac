import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../models/receipt_model.dart';

class ReceiptsScreen extends StatefulWidget {
  const ReceiptsScreen({super.key});
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

    if (!mounted) return;
    showDialog(context: context, builder: (ctx) => _AddReceiptDialog(uid: uid, imageFile: File(img.path)));
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
                          if (r.rating != null) ...[
                            Icon(Icons.star, size: 13, color: _ratingColor(r.rating!)),
                            const SizedBox(width: 1),
                            Text('${r.rating}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: _ratingColor(r.rating!))),
                          ],
                        ]),
                        subtitle: Text('${r.date} • Tax: \$${r.taxPaid.toStringAsFixed(2)}'),
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
  const _AddReceiptDialog({required this.uid, this.imageFile, this.existing});
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
    _store = TextEditingController(text: e?.storeName ?? '');
    _amount = TextEditingController(text: e?.totalAmount.toString() ?? '');
    _tax = TextEditingController(text: e?.taxPaid.toString() ?? '');
    _rewardNo = TextEditingController(text: e?.rewardNo ?? '');
    _date = e?.date ?? DateTime.now().toIso8601String().substring(0, 10);
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
