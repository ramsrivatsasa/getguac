// Returns — receipts whose refund window is still open. Mobile
// parity for /returns on web. Joins receipts with the per-receipt
// refund_policies table (or falls back to a "no refund policy
// captured" sub-set). Items are sorted by days-left ascending so
// the ones closing soonest are top.

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ReturnsScreen extends StatefulWidget {
  const ReturnsScreen({super.key});
  @override
  State<ReturnsScreen> createState() => _ReturnsScreenState();
}

class _ReturnsScreenState extends State<ReturnsScreen> {
  List<_ReturnRow> _rows = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final sb = Supabase.instance.client;
    try {
      // Get receipts from the last 365 days + their refund policies.
      // RLS scopes to user.
      final cutoff = DateTime.now().subtract(const Duration(days: 365))
          .toIso8601String().substring(0, 10);
      final rows = await sb.from('receipts')
          .select('id, store_name, date, total_amount, receipt_refund_policies(policy_id, days, expiry_date, eligible)')
          .gte('date', cutoff)
          .gt('total_amount', 0)
          .order('date', ascending: false)
          .limit(500);
      final out = <_ReturnRow>[];
      final todayIso = DateTime.now().toIso8601String().substring(0, 10);
      for (final r in (rows as List)) {
        final policies = (r['receipt_refund_policies'] as List?) ?? const [];
        // Best open policy = the eligible one with the FURTHEST expiry
        // that's still in the future.
        Map? best;
        for (final p in policies) {
          if (p['eligible'] == false) continue;
          final exp = (p['expiry_date'] ?? '').toString();
          if (exp.isEmpty || exp.compareTo(todayIso) < 0) continue;
          if (best == null || (best['expiry_date'] ?? '').toString().compareTo(exp) < 0) best = p;
        }
        if (best == null) continue;
        final exp = (best['expiry_date'] ?? '').toString();
        final daysLeft = DateTime.parse(exp).difference(DateTime.now()).inDays + 1;
        out.add(_ReturnRow(
          id: r['id'] as String,
          storeName: (r['store_name'] ?? '').toString(),
          date: (r['date'] ?? '').toString(),
          totalAmount: double.tryParse((r['total_amount'] ?? '0').toString()) ?? 0,
          expiryDate: exp,
          daysLeft: daysLeft,
        ));
      }
      out.sort((a, b) => a.daysLeft.compareTo(b.daysLeft));
      if (mounted) setState(() { _rows = out; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Returns')),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _rows.isEmpty
          ? const Center(child: Padding(
              padding: EdgeInsets.all(32),
              child: Text('No open return windows right now.\nEvery receipt either has no refund policy or its window has closed.',
                textAlign: TextAlign.center, style: TextStyle(color: Colors.black54),
              ),
            ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                itemCount: _rows.length,
                itemBuilder: (_, i) {
                  final r = _rows[i];
                  final urgent = r.daysLeft <= 7;
                  final soon = r.daysLeft <= 30;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Container(
                        width: 48, height: 48,
                        decoration: BoxDecoration(
                          color: urgent ? const Color(0xFFfee2e2) : soon ? const Color(0xFFfef3c7) : const Color(0xFFd1fae5),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignment: Alignment.center,
                        child: Text('${r.daysLeft}d',
                          style: TextStyle(
                            fontWeight: FontWeight.w900, fontSize: 14,
                            color: urgent ? const Color(0xFFb91c1c) : soon ? const Color(0xFFb45309) : const Color(0xFF065f46),
                          ),
                        ),
                      ),
                      title: Text(r.storeName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                      subtitle: Text('Bought ${r.date} · expires ${r.expiryDate}',
                        style: const TextStyle(fontSize: 11, color: Colors.black54)),
                      trailing: Text('\$${r.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                      onTap: () => context.push('/receipts/${r.id}'),
                    ),
                  );
                },
              ),
            ),
    );
  }
}

class _ReturnRow {
  final String id;
  final String storeName;
  final String date;
  final double totalAmount;
  final String expiryDate;
  final int daysLeft;
  _ReturnRow({
    required this.id, required this.storeName, required this.date,
    required this.totalAmount, required this.expiryDate, required this.daysLeft,
  });
}
