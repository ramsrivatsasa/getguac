// Product-likes engine — Dart port of web/src/lib/productLikes.js.
//
// === CANONICAL ENGINE — DO NOT FORK ===
// Single source of truth lives in JS. The Dart implementation
// resolves to the same Supabase RPC (`product_like_counts`) and the
// same `product_likes` table, so web + mobile produce identical
// counts and toggle behavior.
//
// === PUBLIC API ===
//   ProductLikesService.fetchStats(itemKeys)
//     → Map<key, {totalLikes, likedByMe}>
//
//   ProductLikesService.toggleLike(itemKey)
//     → Future<{liked: bool, totalLikes: int}>
//
//   formatLikeCount(n) → '22k' / '1.5k' / '999' / '0'
//
// Pure formatting lives in `formatLikeCount` so it can be tested
// without a Supabase connection.

import 'package:supabase_flutter/supabase_flutter.dart';

class LikeStats {
  final int totalLikes;
  final bool likedByMe;
  const LikeStats({required this.totalLikes, required this.likedByMe});
}

class ToggleResult {
  final bool liked;
  final int totalLikes;
  const ToggleResult({required this.liked, required this.totalLikes});
}

class ProductLikesService {
  static SupabaseClient get _sb => Supabase.instance.client;

  /// Batch-fetch like stats for a list of item keys. Calls the
  /// SECURITY DEFINER RPC so individual likers aren't exposed —
  /// only the aggregate count + whether the calling user liked
  /// each one. Returns an empty map on any error so the UI
  /// degrades to "no love-count badge."
  static Future<Map<String, LikeStats>> fetchStats(List<String> itemKeys) async {
    if (itemKeys.isEmpty) return {};
    try {
      final res = await _sb.rpc('product_like_counts', params: {
        'item_keys': itemKeys,
      });
      final out = <String, LikeStats>{};
      for (final row in (res as List)) {
        out[row['item_key'] as String] = LikeStats(
          totalLikes: (row['total_likes'] as num?)?.toInt() ?? 0,
          likedByMe: row['liked_by_me'] == true,
        );
      }
      return out;
    } catch (_) {
      return {};
    }
  }

  /// Toggle the calling user's like on a product. Idempotent — call
  /// twice and the user is back to their original state. Returns the
  /// new state + the authoritative total (re-fetched via the RPC so
  /// concurrent likes from other users are reflected).
  ///
  /// Throws when no Supabase session — the caller should surface a
  /// "sign in to like" prompt rather than swallowing.
  static Future<ToggleResult> toggleLike(String itemKey) async {
    if (itemKey.isEmpty) throw Exception('itemKey required');
    final user = _sb.auth.currentUser;
    if (user == null) throw Exception('sign in to like products');
    // Check current state.
    final existing = await _sb
        .from('product_likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('item_key', itemKey)
        .maybeSingle();
    bool liked;
    if (existing != null) {
      await _sb.from('product_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('item_key', itemKey);
      liked = false;
    } else {
      await _sb.from('product_likes')
          .insert({'user_id': user.id, 'item_key': itemKey});
      liked = true;
    }
    final stats = await fetchStats([itemKey]);
    return ToggleResult(
      liked: liked,
      totalLikes: stats[itemKey]?.totalLikes ?? (liked ? 1 : 0),
    );
  }
}

/// Format a like count for the card badge. Mirrors
/// web/src/lib/productLikes.js#formatLikeCount exactly.
///   < 1000        → exact integer
///   1000..<10000  → '1k' / '1.5k'
///   10000..<1M    → '22k' (no decimal)
///   >= 1M         → '1.2M'
String formatLikeCount(num n) {
  final v = n.abs().toDouble();
  if (v < 1000) return v.round().toString();
  if (v < 10000) {
    final k = v / 1000;
    return k == k.roundToDouble() ? '${k.round()}k' : '${k.toStringAsFixed(1)}k';
  }
  if (v < 1000000) return '${(v / 1000).round()}k';
  final m = v / 1000000;
  return m == m.roundToDouble() ? '${m.round()}M' : '${m.toStringAsFixed(1)}M';
}
