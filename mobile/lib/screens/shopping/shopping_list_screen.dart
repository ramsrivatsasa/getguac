import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class ShoppingListScreen extends StatefulWidget {
  const ShoppingListScreen({super.key});
  @override
  State<ShoppingListScreen> createState() => _ShoppingListScreenState();
}

class _ShoppingListScreenState extends State<ShoppingListScreen> {
  final _db = FirebaseFirestore.instance;
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;

  String get _uid => context.read<AppAuthProvider>().currentUser?.uid ?? '';
  CollectionReference get _col => _db.collection('users').doc(_uid).collection('shoppingList');

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final snap = await _col.orderBy('createdAt', descending: true).get();
    setState(() {
      _items = snap.docs.map((d) => { 'id': d.id, ...d.data() as Map<String, dynamic> }).toList();
      _loading = false;
    });
  }

  void _addItem() {
    final itemCtrl = TextEditingController();
    final storeCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '1');
    String frequency = 'Monthly';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Add Shopping Item'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: itemCtrl, decoration: const InputDecoration(labelText: 'Item Name*')),
            const SizedBox(height: 8),
            TextField(controller: storeCtrl, decoration: const InputDecoration(labelText: 'Store')),
            const SizedBox(height: 8),
            TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Qty')),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: frequency,
              decoration: const InputDecoration(labelText: 'Frequency'),
              items: ['Monthly','Weekly','Biweekly'].map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
              onChanged: (v) => setState(() => frequency = v ?? 'Monthly'),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (itemCtrl.text.isEmpty) return;
                await _col.add({
                  'itemName': itemCtrl.text, 'storeNameId': storeCtrl.text,
                  'qty': qtyCtrl.text, 'frequency': frequency,
                  'approved': false, 'sentToStore': false,
                  'createdAt': DateTime.now().toIso8601String(),
                });
                if (mounted) { Navigator.of(ctx).pop(); _load(); }
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggle(String id, String field, bool val) async {
    await _col.doc(id).update({ field: val });
    setState(() {
      for (var item in _items) {
        if (item['id'] == id) item[field] = val;
      }
    });
  }

  Future<void> _delete(String id) async {
    await _col.doc(id).delete();
    setState(() => _items.removeWhere((i) => i['id'] == id));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shopping Lists')),
      floatingActionButton: FloatingActionButton(onPressed: _addItem, child: const Icon(Icons.add)),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _items.isEmpty
          ? const Center(child: Text('Shopping list empty. Tap + to add.', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _items.length,
              itemBuilder: (_, i) {
                final item = _items[i];
                return Card(
                  child: ListTile(
                    title: Text(item['itemName'] ?? '', style: const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Text('${item['storeNameId'] ?? ''} • Qty: ${item['qty']} • ${item['frequency']}'),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      IconButton(
                        icon: Icon(Icons.check_circle, color: item['approved'] == true ? Colors.green : Colors.grey),
                        onPressed: () => _toggle(item['id'], 'approved', item['approved'] != true),
                        tooltip: 'Approve',
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () => _delete(item['id']),
                      ),
                    ]),
                  ),
                );
              },
            ),
    );
  }
}
