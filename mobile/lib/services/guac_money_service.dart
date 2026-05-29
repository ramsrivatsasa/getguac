// GuacMoney — the "we saved you real money" accounting layer.
// Dart port of web's lib/guacMoney.js. Same RLS-gated insert + same
// SQL aggregate function (guac_money_total) the dashboard tile reads.
//
// Each row in guac_money_events represents real dollars the user did
// NOT spend because GetGuac routed them to a cheaper option. The
// dashboard tile renders the cumulative balance; the activity feed
// surfaces individual earn events.

import 'package:supabase_flutter/supabase_flutter.dart';

class GuacMoneyEvent {
  final String id;
  final String source;
  final double amount;
  final String? itemName;
  final String? storeName;
  final DateTime createdAt;
  GuacMoneyEvent({
    required this.id,
    required this.source,
    required this.amount,
    this.itemName,
    this.storeName,
    required this.createdAt,
  });
  factory GuacMoneyEvent.fromMap(Map<String, dynamic> m) => GuacMoneyEvent(
    id: m['id']?.toString() ?? '',
    source: m['source']?.toString() ?? 'unknown',
    amount: double.tryParse(m['amount']?.toString() ?? '0') ?? 0,
    itemName: m['item_name']?.toString(),
    storeName: m['store_name']?.toString(),
    createdAt: DateTime.tryParse(m['created_at']?.toString() ?? '') ?? DateTime.now(),
  );
}

/// Source-taxonomy keys that match the web side.
class GuacMoneySource {
  static const autoAddCheapest = 'auto_add_cheapest';
  static const pickCheapest    = 'pick_cheapest';
  static const webBeat         = 'web_beat';
  static const predictedSave   = 'predicted_save';
}

/// Log a single save event. Best-effort — never throws so the
/// user-facing action (Auto-Add, etc.) isn't blocked by a telemetry
/// write failure.
Future<bool> logGuacMoney({
  required String source,
  required double amount,
  String? itemName,
  String? storeName,
  Map<String, dynamic>? metadata,
}) async {
  if (amount <= 0) return false;
  final sb = Supabase.instance.client;
  final user = sb.auth.currentUser;
  if (user == null) return false;
  try {
    await sb.from('guac_money_events').insert({
      'user_id': user.id,
      'source': source,
      'amount': amount > 9999.99 ? 9999.99 : amount,
      'item_name': itemName,
      'store_name': storeName,
      'metadata': metadata,
    });
    return true;
  } catch (e) {
    // Migration not yet run / RLS rejection / transient network. Swallow
    // — caller's action still succeeded.
    return false;
  }
}

/// Current accumulated balance for the signed-in user. Uses the SQL
/// aggregate from migration 055 so the client doesn't pull every row.
/// Returns 0 on any failure (migration missing, no auth, etc.).
Future<double> fetchGuacMoneyTotal() async {
  final sb = Supabase.instance.client;
  final user = sb.auth.currentUser;
  if (user == null) return 0;
  try {
    final data = await sb.rpc('guac_money_total', params: {
      'target_user_id': user.id,
    });
    if (data == null) return 0;
    return double.tryParse(data.toString()) ?? 0;
  } catch (e) {
    return 0;
  }
}

/// Latest N events for the activity-feed surface.
Future<List<GuacMoneyEvent>> fetchRecentGuacMoney({int limit = 20}) async {
  final sb = Supabase.instance.client;
  final user = sb.auth.currentUser;
  if (user == null) return const [];
  try {
    final rows = await sb
        .from('guac_money_events')
        .select('id, source, amount, item_name, store_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', ascending: false)
        .limit(limit);
    return (rows as List).map((r) => GuacMoneyEvent.fromMap(r as Map<String, dynamic>)).toList();
  } catch (e) {
    return const [];
  }
}

/// Pretty-print helper — matches web's formatGuacMoney().
String formatGuacMoney(double amount) {
  if (amount >= 1000) return '\$${amount.toStringAsFixed(0)}';
  return '\$${amount.toStringAsFixed(2)}';
}

/// Human-readable label for the source.
String guacMoneySourceLabel(String source) {
  switch (source) {
    case GuacMoneySource.autoAddCheapest: return 'Cheapest-store routing';
    case GuacMoneySource.pickCheapest:    return 'Picked the cheaper store';
    case GuacMoneySource.webBeat:         return 'Web price beat your last buy';
    case GuacMoneySource.predictedSave:   return 'Predictor caught a save';
    default:                              return 'Save';
  }
}
