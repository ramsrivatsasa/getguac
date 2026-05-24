import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../models/receipt_model.dart';

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

  Future<void> _load() async {
    final provider = context.read<ReceiptProvider>();
    final receipt = provider.receipts.where((r) => r.id == widget.id).firstOrNull;
    final items = await provider.getItems(widget.id);
    setState(() { _receipt = receipt; _items = items; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_receipt == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('Receipt not found')));
    final r = _receipt!;

    return Scaffold(
      appBar: AppBar(title: Text(r.storeName)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                _row('Store', r.storeName),
                _row('Date', r.date),
                _row('Total Amount', '\$${r.totalAmount.toStringAsFixed(2)}'),
                _row('Tax Paid', '\$${r.taxPaid.toStringAsFixed(2)}'),
                _row('Reward No', r.rewardNo.isEmpty ? '—' : r.rewardNo),
                _row('Business', r.businessPurchase ? 'Yes' : 'No'),
                if (r.receiptLink.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.image), label: const Text('View Receipt Image'),
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
            const Text('No items. Tap Add Item to add.', style: TextStyle(color: Colors.grey))
          else
            ..._items.map((item) => Card(
              child: ListTile(
                title: Text(item.itemName, style: const TextStyle(fontWeight: FontWeight.w500)),
                subtitle: Text('SKU: ${item.sku.isEmpty ? '—' : item.sku} • Qty: ${item.qty} • \$${item.price.toStringAsFixed(2)}'),
                trailing: item.returned
                  ? const Text('Returned', style: TextStyle(color: Colors.red, fontSize: 11))
                  : null,
              ),
            )),
        ]),
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
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
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
              setState(() => _items = items);
              if (mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}
