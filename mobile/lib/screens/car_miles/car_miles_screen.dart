// Car Miles — lightweight trip log with monthly totals.
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/car_miles_model.dart';
import '../../services/share_intent_service.dart';
import '../../services/location_distance_service.dart';

const _kBrand = Color(0xFF15803d);
const _kTripCols = 'id, start_date, end_date, total_miles, description, category, from_address, to_address';

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
    // If we got a Google Maps share, drop the destination into the To field
    // and use the cleaned text as the description. From auto-fills from GPS.
    final cleanedDestination = prefillDestination == null ? '' : _cleanSharedText(prefillDestination);
    final descCtrl  = TextEditingController(text: cleanedDestination);
    final fromCtrl  = TextEditingController();
    final toCtrl    = TextEditingController(text: cleanedDestination);
    final milesCtrl = TextEditingController();
    final today = DateTime.now().toIso8601String().substring(0, 10);
    String startDate = today;
    String endDate = today;
    String category = 'Business';
    bool calculating = prefillDestination != null;
    bool resolvedFromAddress = false;
    String? calcError;

    // For Maps-shared trips, kick off GPS → reverse-geocode → distance
    // in the background and update the dialog when results arrive.
    Future<void> autoDistance(void Function(VoidCallback) setSt) async {
      try {
        final pos = await LocationDistanceService.currentPosition();
        if (pos == null) {
          setSt(() { calculating = false; calcError = 'Location off — fill in From + miles manually.'; });
          return;
        }
        final addr = await LocationDistanceService.reverseGeocode(pos.latitude, pos.longitude);
        final fromLabel = addr ?? '${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}';
        setSt(() {
          if (fromCtrl.text.trim().isEmpty) fromCtrl.text = fromLabel;
          resolvedFromAddress = true;
        });
        // Prefer the raw share text for geocoding (preserves the address line
        // and the maps.app.goo.gl URL when that's all Maps gives us).
        final result = await LocationDistanceService.estimate(
          fromLat: pos.latitude,
          fromLng: pos.longitude,
          fromLabel: fromLabel,
          to: (prefillDestination ?? cleanedDestination).trim(),
        );
        if (result.estimate == null) {
          setSt(() { calculating = false; calcError = result.error ?? "Couldn't compute distance — enter manually."; });
          return;
        }
        setSt(() {
          calculating = false;
          milesCtrl.text = result.estimate!.miles.toStringAsFixed(1);
        });
      } catch (_) {
        setSt(() { calculating = false; calcError = "Couldn't compute distance — enter manually."; });
      }
    }

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSt) {
        // Fire once when the dialog first builds.
        if (prefillDestination != null && !resolvedFromAddress && calculating && calcError == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) => autoDistance(setSt));
        }
        return AlertDialog(
          title: const Text('Log a trip'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              TextField(
                controller: fromCtrl,
                decoration: InputDecoration(
                  labelText: 'From',
                  prefixIcon: const Icon(Icons.my_location, size: 18),
                  helperText: calculating && !resolvedFromAddress ? 'Getting your location…' : null,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: toCtrl,
                decoration: const InputDecoration(
                  labelText: 'To',
                  prefixIcon: Icon(Icons.place_outlined, size: 18),
                ),
              ),
              const SizedBox(height: 8),
              TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description (optional)')),
              const SizedBox(height: 8),
              TextField(
                controller: milesCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Miles*',
                  suffixIcon: calculating
                    ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)))
                    : null,
                  helperText: calculating
                    ? 'Calculating driving distance…'
                    : (calcError ?? (prefillDestination != null && milesCtrl.text.isNotEmpty ? 'Auto-estimated — adjust if needed' : null)),
                ),
              ),
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
        );
      }),
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
            'from_address': fromCtrl.text.trim(),
            'to_address':   toCtrl.text.trim(),
          });
          await _load();
        } catch (e) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Save failed: $e')));
        }
      }
    }
    descCtrl.dispose();
    fromCtrl.dispose();
    toCtrl.dispose();
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
                  ..._trips.map((t) {
                    final hasRoute = t.fromAddress.isNotEmpty || t.toAddress.isNotEmpty;
                    final title = t.description.isNotEmpty
                      ? t.description
                      : (hasRoute
                          ? '${_short(t.fromAddress, fallback: 'From')} → ${_short(t.toAddress, fallback: 'To')}'
                          : '${t.category} trip');
                    return Card(
                      child: ListTile(
                        leading: Icon(
                          t.category == 'Business' ? Icons.business_center : Icons.directions_car,
                          color: t.category == 'Business' ? _kBrand : Colors.blueGrey,
                        ),
                        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (hasRoute && t.description.isNotEmpty)
                              Text('${_short(t.fromAddress, fallback: '?')} → ${_short(t.toAddress, fallback: '?')}',
                                style: const TextStyle(fontSize: 12, color: Colors.black54),
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                            Text('${t.startDate}  →  ${t.endDate}'),
                          ],
                        ),
                        trailing: Text('${t.totalMiles.toStringAsFixed(1)} mi',
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    );
                  }),
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

  /// Truncate a long address to its first comma-separated chunk for list display.
  /// "13619 Beckingham Drive, Herndon, VA 20171, USA" -> "13619 Beckingham Drive"
  String _short(String addr, {String fallback = ''}) {
    final trimmed = addr.trim();
    if (trimmed.isEmpty) return fallback;
    final first = trimmed.split(',').first.trim();
    return first.length > 28 ? '${first.substring(0, 28)}…' : first;
  }

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
