// Stash service — mobile parity for web/src/lib/inventory.js and the
// per-item rating helper from web/src/lib/db.js (setStashProductRating).
//
// All writes use the signed-in user's Supabase session; RLS scopes
// updates to their own rows. Keep the inventory_key normalization
// identical to web/src/lib/inventory.js so the two clients read/write
// the same row for the same product name.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth_token.dart';

class StashService {
  static SupabaseClient get _sb => Supabase.instance.client;

  /// Mirrors web's inventoryKey: lower, strip non-alphanum, collapse
  /// whitespace, cap at 120. MUST stay in sync with web — same input
  /// has to map to the same row in stash_inventory.
  static String inventoryKey(String itemName) {
    final lowered = itemName.toLowerCase();
    final cleaned = lowered.replaceAll(RegExp(r'[^a-z0-9 ]+'), ' ');
    final collapsed = cleaned.replaceAll(RegExp(r'\s+'), ' ').trim();
    return collapsed.length > 120 ? collapsed.substring(0, 120) : collapsed;
  }

  /// Returns a `Map<item_key, on_hand_qty>` so the caller can decorate
  /// each Stash item with its on-hand value in one read. Returns an
  /// empty map on auth/network failure — the UI degrades gracefully.
  static Future<Map<String, int>> fetchInventoryMap() async {
    try {
      final user = _sb.auth.currentUser;
      if (user == null) return {};
      final rows = await _sb
          .from('stash_inventory')
          .select('item_key, on_hand_qty')
          .eq('user_id', user.id);
      final out = <String, int>{};
      for (final r in rows as List) {
        final k = r['item_key'] as String?;
        final raw = r['on_hand_qty'];
        final q = raw is int ? raw : int.tryParse(raw?.toString() ?? '');
        if (k != null && q != null) out[k] = q;
      }
      return out;
    } catch (_) {
      return {};
    }
  }

  /// Upserts the on-hand count for a single item. Returns the clamped
  /// value on success, null on failure. Same 0..9999 bounds as web.
  static Future<int?> setOnHand(String itemName, int qty) async {
    final user = _sb.auth.currentUser;
    if (user == null) return null;
    final key = inventoryKey(itemName);
    if (key.isEmpty) return null;
    final safe = qty.clamp(0, 9999);
    try {
      await _sb.from('stash_inventory').upsert({
        'user_id': user.id,
        'item_key': key,
        'on_hand_qty': safe,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }, onConflict: 'user_id,item_key');
      return safe;
    } catch (_) {
      return null;
    }
  }

  /// Bulk-rate every receipt_item belonging to the same product name.
  /// Mirrors setStashProductRating in db.js — RLS limits the update
  /// to receipts the user owns. We match on item_name (case-insensitive)
  /// since the mobile Stash aggregates by name, not by sku.
  ///
  /// Returns the number of rows updated, or 0 on failure.
  static Future<int> setProductRating({required String itemName, required int rating}) async {
    if (rating < 1 || rating > 5) return 0;
    try {
      final receipts = await _sb.from('receipts').select('id');
      final ids = (receipts as List).map((r) => r['id']).toList();
      if (ids.isEmpty) return 0;
      final updated = await _sb
          .from('receipt_items')
          .update({
            'rating': rating,
            'validated_at': DateTime.now().toUtc().toIso8601String(),
          })
          .ilike('item_name', itemName)
          .inFilter('receipt_id', ids)
          .select('id');
      return (updated as List).length;
    } catch (_) {
      return 0;
    }
  }

  /// /api/best-prices proxy — same payload shape as the web component.
  /// Returns the list of { store, price, url, notes } maps. Throws on
  /// non-2xx so the modal can show the error.
  static Future<List<Map<String, dynamic>>> fetchBestPrices({
    required String itemName,
    String? sku,
    String? category,
    String apiBase = 'https://getguac.app',
  }) async {
    final session = _sb.auth.currentSession;
    if (session == null) throw Exception('not signed in');
    final res = await http.post(
      Uri.parse('$apiBase/api/best-prices'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${await ggAccessToken() ?? session.accessToken}',
      },
      body: jsonEncode({
        'item_name': itemName,
        if (sku != null && sku.isNotEmpty) 'sku': sku,
        if (category != null && category.isNotEmpty) 'category': category,
      }),
    );
    if (res.statusCode >= 400) {
      throw Exception('best-prices ${res.statusCode}: ${res.body}');
    }
    final decoded = jsonDecode(res.body);
    return ((decoded?['results'] as List?) ?? const [])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }
}
