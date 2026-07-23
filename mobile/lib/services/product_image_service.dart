// Product-image resolver — mobile counterpart to
// web/src/lib/productImage.js. Doesn't reimplement the Google CSE
// call; just hits /api/product-image-batch which does the cache
// lookup + CSE fallback server-side.
//
// Same cache normalization (imageCacheKey) so the URLs the server
// returns survive a round-trip to mobile keyed off the item_name.
//
// Returns an empty Map on auth/network failure so the card falls
// back to its emoji.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth_token.dart';

class ProductImageService {
  static const String defaultApiBase = 'https://getguac.app';

  /// Mirror of web `imageCacheKey` — lowercase, strip non-alphanum,
  /// collapse whitespace, cap at 120. The server returns BOTH a
  /// keyed map AND a name-keyed map; the name-keyed one (byName)
  /// is what we use most, but exposing this helps callers correlate
  /// with the server cache if needed.
  static String cacheKey(String itemName) {
    final lowered = itemName.toLowerCase();
    final cleaned = lowered.replaceAll(RegExp(r'[^a-z0-9 ]+'), ' ');
    final collapsed = cleaned.replaceAll(RegExp(r'\s+'), ' ').trim();
    return collapsed.length > 120 ? collapsed.substring(0, 120) : collapsed;
  }

  /// Batch-resolve item images. Sends the raw item_names; server
  /// normalizes + dedupes + checks the product_images cache + falls
  /// back to Google CSE on miss. Returns Map<rawName, imageUrl>.
  ///
  /// Caps the batch at 80 names — server enforces this too, but
  /// trimming client-side keeps the payload small.
  static Future<Map<String, String>> resolveBatch(
    List<String> itemNames, {
    String apiBase = defaultApiBase,
  }) async {
    if (itemNames.isEmpty) return {};
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return {};
    final unique = {...itemNames}.where((n) => n.trim().isNotEmpty).take(80).toList();
    if (unique.isEmpty) return {};
    try {
      final res = await http.post(
        Uri.parse('$apiBase/api/product-image-batch'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${await ggAccessToken() ?? session.accessToken}',
        },
        body: jsonEncode({'names': unique}),
      );
      if (res.statusCode >= 400) return {};
      final decoded = jsonDecode(res.body) as Map<String, dynamic>;
      final byName = (decoded['byName'] as Map?) ?? const {};
      final out = <String, String>{};
      byName.forEach((k, v) {
        if (v is String && v.isNotEmpty) out[k.toString()] = v;
      });
      return out;
    } catch (_) {
      return {};
    }
  }
}
