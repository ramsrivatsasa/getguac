// Reports — monthly spending summary. Mobile parity for /reports
// on web. Lean version: one card per month, ordered newest-first,
// showing total spent + number of receipts. Tap a month → /receipts
// pre-filtered to that month (uses the existing receipts-deeplink
// shape: `?from=YYYY-MM-01&to=YYYY-MM-31`).
//
// Source of truth is the same `receipts` table the web reports page
// reads. We aggregate client-side so there's no new RPC required.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/animated_primitives.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  List<_MonthBucket> _buckets = [];
  bool _loading = true;
  double _grandTotal = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final sb = Supabase.instance.client;
    try {
      // Pull lifetime receipts at the columns we need. RLS scopes
      // to the signed-in user.
      final rows = await sb.from('receipts')
          .select('date, total_amount')
          .order('date', ascending: false);
      final m = <String, _MonthBucket>{};
      double grand = 0;
      for (final r in (rows as List)) {
        final date = (r['date'] ?? '').toString();
        if (date.length < 7) continue;
        final ym = date.substring(0, 7); // YYYY-MM
        final amt = double.tryParse((r['total_amount'] ?? '0').toString()) ?? 0;
        final bucket = m.putIfAbsent(ym, () => _MonthBucket(ym));
        bucket.total += amt;
        bucket.count += 1;
        grand += amt;
      }
      final list = m.values.toList()..sort((a, b) => b.ym.compareTo(a.ym));
      if (mounted) setState(() {
        _buckets = list;
        _grandTotal = grand;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: _loading
        ? ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 8,
            itemBuilder: (_, i) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: i == 0
                ? const ShimmerBox(height: 90, radius: 18)
                : Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                      ShimmerBox(width: 140, height: 14),
                      SizedBox(height: 6),
                      ShimmerBox(width: 80, height: 11),
                    ])),
                    const ShimmerBox(width: 70, height: 16),
                  ]),
            ),
          )
        : _buckets.isEmpty
          ? const Center(child: Padding(
              padding: EdgeInsets.all(32),
              child: Text('No receipts yet — start scanning to see monthly summaries.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.black54),
              ),
            ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  // Lifetime total card up top
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF15803d), Color(0xFF65a30d)]),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('LIFETIME TOTAL',
                        style: TextStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.w900, letterSpacing: 1.4)),
                      const SizedBox(height: 4),
                      CountUp(
                        value: _grandTotal,
                        duration: const Duration(milliseconds: 700),
                        formatter: (v) => '\$${v.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 2),
                      Text('${_buckets.length} month${_buckets.length == 1 ? '' : 's'} of data',
                        style: const TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                  const SizedBox(height: 16),
                  for (var i = 0; i < _buckets.length; i++) FadeUpOnMount(
                    key: ValueKey('bucket-${_buckets[i].ym}'),
                    delay: i < 8 ? Duration(milliseconds: i * 40) : Duration.zero,
                    child: _bucketTile(_buckets[i]),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _bucketTile(_MonthBucket b) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(b.label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        subtitle: Text('${b.count} receipt${b.count == 1 ? '' : 's'}',
          style: const TextStyle(fontSize: 11, color: Colors.black54)),
        trailing: Text('\$${b.total.toStringAsFixed(2)}',
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF065f46))),
        onTap: () {
          // Open /receipts filtered to this month
          final end = _lastDayOfMonth(b.ym);
          context.push('/receipts?from=${b.ym}-01&to=$end');
        },
      ),
    );
  }

  static String _lastDayOfMonth(String ym) {
    final parts = ym.split('-');
    final y = int.tryParse(parts[0]) ?? DateTime.now().year;
    final m = int.tryParse(parts[1]) ?? 1;
    final next = m == 12 ? DateTime(y + 1, 1, 1) : DateTime(y, m + 1, 1);
    final last = next.subtract(const Duration(days: 1));
    return '${last.year}-${last.month.toString().padLeft(2, '0')}-${last.day.toString().padLeft(2, '0')}';
  }
}

class _MonthBucket {
  final String ym;       // YYYY-MM
  double total = 0;
  int count = 0;
  _MonthBucket(this.ym);
  String get label {
    final parts = ym.split('-');
    final y = int.tryParse(parts[0]) ?? 0;
    final m = int.tryParse(parts[1]) ?? 1;
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${names[(m - 1).clamp(0, 11)]} $y';
  }
}
