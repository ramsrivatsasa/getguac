import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class CarMilesScreen extends StatefulWidget {
  const CarMilesScreen({super.key});
  @override
  State<CarMilesScreen> createState() => _CarMilesScreenState();
}

class _CarMilesScreenState extends State<CarMilesScreen> {
  final _db = FirebaseFirestore.instance;
  List<Map<String, dynamic>> _trips = [];
  bool _loading = true;
  final Set<String> _selected = {};
  bool get _selectionMode => _selected.isNotEmpty;

  String get _uid => context.read<AppAuthProvider>().currentUser?.uid ?? '';
  CollectionReference get _col => _db.collection('users').doc(_uid).collection('carMiles');

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    final snap = await _col.orderBy('startDate', descending: true).get();
    setState(() {
      _trips = snap.docs.map((d) => { 'id': d.id, ...d.data() as Map<String, dynamic> }).toList();
      _loading = false;
    });
  }

  double get _businessMiles => _trips.where((t) => t['category'] == 'Business').fold(0, (s, t) => s + (double.tryParse(t['totalMiles']?.toString() ?? '0') ?? 0));
  double get _personalMiles => _trips.where((t) => t['category'] == 'Personal').fold(0, (s, t) => s + (double.tryParse(t['totalMiles']?.toString() ?? '0') ?? 0));

  void _toggle(String id) {
    setState(() {
      if (_selected.contains(id)) {
        _selected.remove(id);
      } else {
        _selected.add(id);
      }
    });
  }

  void _selectAll() {
    setState(() {
      if (_selected.length == _trips.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(_trips.map((t) => t['id'] as String));
      }
    });
  }

  Future<void> _deleteSelected() async {
    if (_selected.isEmpty) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete trips?'),
        content: Text('Delete ${_selected.length} trip${_selected.length == 1 ? '' : 's'}?'),
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
    final ids = _selected.toList();
    for (final id in ids) {
      try { await _col.doc(id).delete(); } catch (_) {}
    }
    setState(_selected.clear);
    await _load();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Deleted ${ids.length}')));
    }
  }

  void _editTrip(Map<String, dynamic> trip) => _showTripDialog(existing: trip);
  void _addTrip() => _showTripDialog();

  void _showTripDialog({Map<String, dynamic>? existing}) {
    final milesCtrl = TextEditingController(text: existing?['totalMiles']?.toString() ?? '');
    final descCtrl = TextEditingController(text: existing?['description'] ?? '');
    String start = existing?['startDate'] ?? DateTime.now().toIso8601String().substring(0, 10);
    String end = existing?['endDate'] ?? DateTime.now().toIso8601String().substring(0, 10);
    String category = existing?['category'] ?? 'Personal';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text(existing != null ? 'Edit Trip' : 'Add Trip'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              InkWell(
                onTap: () async {
                  final p = await showDatePicker(context: ctx, initialDate: DateTime.tryParse(start) ?? DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime(2100));
                  if (p != null) setD(() => start = p.toIso8601String().substring(0, 10));
                },
                child: InputDecorator(decoration: const InputDecoration(labelText: 'Start Date'), child: Text(start)),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: () async {
                  final p = await showDatePicker(context: ctx, initialDate: DateTime.tryParse(end) ?? DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime(2100));
                  if (p != null) setD(() => end = p.toIso8601String().substring(0, 10));
                },
                child: InputDecorator(decoration: const InputDecoration(labelText: 'End Date'), child: Text(end)),
              ),
              const SizedBox(height: 8),
              TextField(controller: milesCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total Miles*')),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: ['Business','Personal'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setD(() => category = v ?? 'Personal'),
              ),
              const SizedBox(height: 8),
              TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description')),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (milesCtrl.text.isEmpty) return;
                final data = {
                  'startDate': start, 'endDate': end,
                  'totalMiles': milesCtrl.text, 'category': category,
                  'description': descCtrl.text,
                };
                if (existing != null) {
                  await _col.doc(existing['id']).update(data);
                } else {
                  await _col.add({ ...data, 'createdAt': DateTime.now().toIso8601String() });
                }
                if (mounted) { Navigator.of(ctx).pop(); _load(); }
              },
              child: Text(existing != null ? 'Update' : 'Add Trip'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: _selectionMode
          ? IconButton(icon: const Icon(Icons.close), onPressed: () => setState(_selected.clear))
          : null,
        title: Text(_selectionMode ? '${_selected.length} selected' : 'Car Miles'),
        actions: _selectionMode
          ? [
              IconButton(icon: const Icon(Icons.select_all), onPressed: _selectAll, tooltip: 'Select all'),
              IconButton(icon: const Icon(Icons.delete), onPressed: _deleteSelected, tooltip: 'Delete'),
            ]
          : null,
      ),
      floatingActionButton: _selectionMode ? null : FloatingActionButton(onPressed: _addTrip, child: const Icon(Icons.add)),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : Column(children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(children: [
                _summaryCard('Business', _businessMiles, Colors.blue),
                const SizedBox(width: 12),
                _summaryCard('Personal', _personalMiles, Colors.green),
              ]),
            ),
            Expanded(
              child: _trips.isEmpty
                ? const Center(child: Text('No trips yet. Tap + to add.', style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: _trips.length,
                    itemBuilder: (_, i) {
                      final t = _trips[i];
                      final id = t['id'] as String;
                      final isSelected = _selected.contains(id);
                      return Card(
                        color: isSelected ? Colors.blue.shade50 : null,
                        child: ListTile(
                          leading: _selectionMode
                            ? Checkbox(value: isSelected, onChanged: (_) => _toggle(id))
                            : CircleAvatar(
                                backgroundColor: t['category'] == 'Business' ? Colors.blue.shade100 : Colors.green.shade100,
                                child: Icon(Icons.directions_car, size: 18,
                                  color: t['category'] == 'Business' ? Colors.blue : Colors.green),
                              ),
                          title: Text('${t['totalMiles']} miles', style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('${t['startDate']} → ${t['endDate']}\n${t['description'] ?? ''}'),
                          isThreeLine: true,
                          trailing: _selectionMode
                            ? null
                            : Row(mainAxisSize: MainAxisSize.min, children: [
                                Chip(
                                  label: Text(t['category'] ?? '', style: const TextStyle(fontSize: 11)),
                                  backgroundColor: t['category'] == 'Business' ? Colors.blue.shade50 : Colors.green.shade50,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit, size: 18),
                                  onPressed: () => _editTrip(t),
                                  tooltip: 'Edit',
                                  visualDensity: VisualDensity.compact,
                                ),
                              ]),
                          onTap: _selectionMode ? () => _toggle(id) : null,
                          onLongPress: () => _toggle(id),
                        ),
                      );
                    },
                  ),
            ),
          ]),
    );
  }

  Widget _summaryCard(String label, double miles, MaterialColor color) {
    return Expanded(child: Card(
      color: color.shade50,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(children: [
          Text(label, style: TextStyle(color: color.shade700, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('${miles.toStringAsFixed(1)} mi', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        ]),
      ),
    ));
  }
}
