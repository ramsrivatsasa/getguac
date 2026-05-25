// Car Miles — lightweight trip log with monthly totals.
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/car_miles_model.dart';
import '../../services/share_intent_service.dart';

const _kBrand = Color(0xFF15803d);
const _kTripCols = 'id, start_date, end_date, total_miles, description, category';

class CarMilesScreen extends StatefulWidget {
  const CarMilesScreen({super.key});
  @override
  State<CarMilesScreen> createState() => _CarMilesScreenState();
}

class _CarMilesScreenState extends State<CarMilesScreen> {
  final _sb = Supabase.instance.client;
  bool _loading = true;
  List<CarTrip> _trips = [];

  @override
  void initState() {
    super.initState();
    _load();
    // If we landed here via a Google Maps share, pop the trip dialog with
    // the shared destination pre-filled. Single-use — consume() clears it.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final pending = PendingShare.instance.consume();
      if (pending != null && mounted) {
        _add(prefillDestination: pending);
      }
    });
    PendingShare.instance.addListener(_onShareArrived);
  }

  @override
  void dispose() {
    PendingShare.instance.removeListener(_onShareArrived);
    super.dispose();
  }

  void _onShareArrived() {
    final pending = PendingShare.instance.consume();
    if (pending != null && mounted) _add(prefillDestination: pending);
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final rows = await _sb
          .from('car_trips')
          .select(_kTripCols)
          .order('start_date', ascending: false)
          .limit(300);
      _trips = (rows as List)
          .map((r) => CarTrip.fromMap((r['id'] ?? '').toString(), r as Map<String, dynamic>))
          .toList();
    } catch (_) {
      // empty list
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _add({String? prefillDestination}) async {
    // If we got a Google Maps share, drop the destination into the description
    // so the user just needs to add miles + category. Strip the noisy URL
    // boilerplate Maps appends.
    final descCtrl = TextEditingController(
      text: prefillDestination == null ? '' : _cleanSharedText(prefillDestination),
    );
    final milesCtrl = TextEditingController();
    final today = DateTime.now().toIso8601String().substring(0, 10);
    String startDate = today;
    String endDate = today;
    String category = 'Business';

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSt) => AlertDialog(
        title: const Text('Log a trip'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description'), autofocus: true),
            const SizedBox(height: 8),
            TextField(controller: milesCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Miles*')),
            const SizedBox(height: 12),
            _DatePickRow(label: 'Start', value: startDate, onPicked: (d) => setSt(() => startDate = d)),
            _DatePickRow(label: 'End',   value: endDate,   onPicked: (d) => setSt(() => endDate = d)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: category,
              items: const [
                DropdownMenuItem(value: 'Business', child: Text('Business')),
                DropdownMenuItem(value: 'Personal', child: Text('Personal')),
              ],
              onChanged: (v) => setSt(() => category = v ?? category),
              decoration: const InputDecoration(labelText: 'Category'),
            ),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Save')),
        ],
      )),
    );
    if (ok == true) {
      final miles = double.tryParse(milesCtrl.text) ?? 0;
      if (miles > 0) {
        final uid = _sb.auth.currentUser?.id;
        try {
          await _sb.from('car_trips').insert({
            'user_id': uid,
            'start_date': startDate,
            'end_date': endDate,
            'total_miles': miles,
            'description': descCtrl.text.trim(),
            'category': category,
          });
          await _load();
        } catch (e) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Save failed: $e')));
        }
      }
    }
    descCtrl.dispose();
    milesCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final monthTotal = _trips
        .where((t) {
          final d = DateTime.tryParse(t.startDate);
          return d != null && d.year == now.year && d.month == now.month;
        })
        .fold<double>(0, (s, t) => s + t.totalMiles);
    final ytdTotal = _trips
        .where((t) {
          final d = DateTime.tryParse(t.startDate);
          return d != null && d.year == now.year;
        })
        .fold<double>(0, (s, t) => s + t.totalMiles);

    return Scaffold(
      appBar: AppBar(title: const Text('Car Miles')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: _kBrand,
        onPressed: _add,
        child: const Icon(Icons.add),
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  _stat('This month', monthTotal),
                  const SizedBox(width: 12),
                  _stat('YTD',        ytdTotal),
                ]),
                const SizedBox(height: 16),
                if (_trips.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 60),
                    child: Center(child: Text('No trips yet. Tap + to log one.', style: TextStyle(color: Colors.black54))),
                  )
                else
                  ..._trips.map((t) => Card(
                    child: ListTile(
                      leading: Icon(
                        t.category == 'Business' ? Icons.business_center : Icons.directions_car,
                        color: t.category == 'Business' ? _kBrand : Colors.blueGrey,
                      ),
                      title: Text(t.description.isEmpty ? '${t.category} trip' : t.description,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text('${t.startDate}  →  ${t.endDate}'),
                      trailing: Text('${t.totalMiles.toStringAsFixed(1)} mi',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  )),
              ],
            ),
          ),
    );
  }

  Widget _stat(String label, double miles) => Expanded(child: Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: _kBrand.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: _kBrand.withValues(alpha: 0.2)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
      const SizedBox(height: 4),
      Text('${miles.toStringAsFixed(1)} mi', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: _kBrand)),
    ]),
  ));

  /// Google Maps shares typically look like:
  ///   "Place Name\n123 Main St, City, ST\nhttps://maps.app.goo.gl/abc"
  /// We keep the first 2-3 lines as a description and drop the URL.
  String _cleanSharedText(String raw) {
    final lines = raw.split(RegExp(r'[\r\n]+'))
      .map((l) => l.trim())
      .where((l) => l.isNotEmpty && !RegExp(r'^https?://').hasMatch(l))
      .toList();
    if (lines.isEmpty) return raw;
    final joined = lines.take(3).join(' · ');
    return joined.length > 140 ? '${joined.substring(0, 140)}…' : joined;
  }
}

class _DatePickRow extends StatelessWidget {
  final String label;
  final String value;
  final void Function(String) onPicked;
  const _DatePickRow({required this.label, required this.value, required this.onPicked});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        SizedBox(width: 50, child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54))),
        Expanded(child: InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: DateTime.tryParse(value) ?? DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
            );
            if (picked != null) onPicked(picked.toIso8601String().substring(0, 10));
          },
          child: InputDecorator(
            decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
            child: Text(value),
          ),
        )),
      ]),
    );
  }
}
