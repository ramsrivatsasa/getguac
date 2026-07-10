// GuacMoney — the "we saved you real money" accounting layer.
// Dart port of web's lib/guacMoney.js. Same RLS-gated insert + same
// SQL aggregate function (guac_money_total) the dashboard tile reads.
//
// Each row in guac_money_events represents real dollars the user did
// NOT spend because GetGuac routed them to a cheaper option. The
// dashboard tile renders the cumulative balance; the activity feed
// surfaces individual earn events.

import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/receipt_model.dart';

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

// ── GuacMoney (1000 GM = $1 of VALUE — never a redeem claim) ─────────
// One umbrella balance combining:
//   • Money our Guac-AI saved you ($-for-$): purchases rated "not worth it"
//     (rating ≤ 2, you won't re-buy) + refunds recovered.  → ×1000 GM per $1
//   • Engagement: scan a receipt (+100), refer a friend (+1,000).
// The saved $ is the user's OWN money, so the balance is presented as
// value kept, matching the web dashboard tile.
const int kGmPerDollar   = 1000;  // 1000 GuacMoney = $1 of value
const int kGmPerReceipt  = 100;   // every receipt scanned
const int kGmPerReferral = 1000;  // every friend who joins
const int kGmRewardStep  = 5000;  // next milestone (= $5)
const String kGmTagline = 'Saved by our Guac-AI + earned by you 🥑';

/// Total GuacMoney = saved $ (×1000) + receipts (×100) + referrals (×1000).
int guacMoneyPoints({required int receipts, required int referrals, required double savedDollars}) =>
    receipts * kGmPerReceipt + referrals * kGmPerReferral + gmPointsFromSaved(savedDollars);

/// Count of the user's successful referrals (rows in `referrals`).
Future<int> fetchReferralCount() async {
  final sb = Supabase.instance.client;
  final user = sb.auth.currentUser;
  if (user == null) return 0;
  try {
    final rows = await sb.from('referrals').select('id').eq('referrer_id', user.id);
    return (rows as List).length;
  } catch (_) {
    return 0;
  }
}

/// Dollars saved = not-worth-it purchases (rating ≤ 2, you won't re-buy) +
/// refunds you got back ($-for-$).
double guacMoneySaved(List<Receipt> receipts) {
  var saved = 0.0;
  for (final r in receipts) {
    if (r.isReturn) {
      saved += r.totalAmount.abs();           // refund recovered — money back
    } else if (r.rating != null && r.rating! <= 2 && r.totalAmount > 0) {
      saved += r.totalAmount;                 // flagged not worth re-buying
    }
  }
  return saved;
}

/// Refunds recovered (the return-receipt portion of saved).
double guacMoneyRefunds(List<Receipt> receipts) => receipts
    .where((r) => r.isReturn)
    .fold(0.0, (s, r) => s + r.totalAmount.abs());

/// Not-worth-it portion of saved (rated ≤ 2).
double guacMoneyNotWorthIt(List<Receipt> receipts) => receipts
    .where((r) => !r.isReturn && r.rating != null && r.rating! <= 2 && r.totalAmount > 0)
    .fold(0.0, (s, r) => s + r.totalAmount);

/// GuacMoney points for a saved-dollar amount (1000 per $1).
int gmPointsFromSaved(double savedDollars) => (savedDollars * kGmPerDollar).round();

/// Dollar value of a points balance.
double gmToUsd(int points) => points / kGmPerDollar;

/// Thousands-formatted points (e.g. 5,200).
String formatGm(int points) {
  final s = points.abs().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return b.toString();
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
