import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
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
    if (mounted) setState(() { _receipt = receipt; _items = items; _loading = false; });
  }

  void _goBack() => context.go('/receipts');

  void _viewImage(String url) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _ImageViewer(url: url),
      fullscreenDialog: true,
    ));
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

    // GestureDetector wraps the whole body so a right-swipe from anywhere
    // (not just the screen edge) pops to /receipts. Threshold is generous so
    // accidental horizontal scrolls don't trigger.
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: _goBack),
        title: Text(r.storeName, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(icon: const Icon(Icons.close), tooltip: 'Close', onPressed: _goBack),
        ],
      ),
      body: PopScope(
        canPop: false,
        onPopInvoked: (didPop) { if (!didPop) _goBack(); },
        child: GestureDetector(
          behavior: HitTestBehavior.translucent,
          onHorizontalDragEnd: (details) {
            final v = details.primaryVelocity ?? 0;
            if (v > 600) _goBack();   // fast right-swipe
          },
          child: SingleChildScrollView(
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
                        padding: const EdgeInsets.only(top: 12),
                        child: SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: () => _viewImage(r.receiptLink),
                            icon: const Icon(Icons.image_outlined),
                            label: const Text('View Receipt Image'),
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF15803d),
                              padding: const EdgeInsets.symmetric(vertical: 12),
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

/// Full-screen pinch-to-zoom image viewer. Tap or back button to close.
class _ImageViewer extends StatelessWidget {
  final String url;
  const _ImageViewer({required this.url});

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
      ),
      body: GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 5,
          child: Center(
            child: Image.network(
              url,
              fit: BoxFit.contain,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return const Center(child: CircularProgressIndicator(color: Colors.white));
              },
              errorBuilder: (_, error, __) => Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.broken_image_outlined, size: 64, color: Colors.white54),
                  const SizedBox(height: 12),
                  Text('Could not load image', style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
                  const SizedBox(height: 4),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(error.toString(),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 11)),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
