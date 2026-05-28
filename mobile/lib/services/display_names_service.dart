// Display-name resolution — mobile service.
//
// Dart mirror of web/src/lib/displayNames.js. The `profiles` RLS policy
// is "own row only" so a direct SELECT returns 0 rows for anyone else.
// Migration 048 added the SECURITY DEFINER RPC `get_display_names(uuid[])`
// that returns just first+last name (never email). This wraps it with
// batched lookup + a safe fallback formatter.
//
// Callers should ALWAYS use this service — never read `profiles.first_name`
// directly, because the RLS will return null for any other user.

import 'package:supabase_flutter/supabase_flutter.dart';

class DisplayName {
  final String? firstName;
  final String? lastName;
  const DisplayName({this.firstName, this.lastName});
}

class DisplayNamesService {
  static SupabaseClient get _sb => Supabase.instance.client;

  /// Batched lookup over a set of user ids. Empty/duplicate inputs handled.
  /// Missing ids simply don't appear in the map — caller uses formatName().
  static Future<Map<String, DisplayName>> getDisplayNames(Iterable<String> userIds) async {
    final ids = userIds.toSet().where((s) => s.isNotEmpty).toList();
    if (ids.isEmpty) return {};
    try {
      final rows = await _sb.rpc('get_display_names', params: {'p_ids': ids});
      final map = <String, DisplayName>{};
      for (final r in (rows as List)) {
        final m = r as Map<String, dynamic>;
        map[m['id'] as String] = DisplayName(
          firstName: m['first_name'] as String?,
          lastName:  m['last_name']  as String?,
        );
      }
      return map;
    } catch (e) {
      // RPC missing → migration 048 not applied yet. Caller falls back.
      return {};
    }
  }

  /// Prefer first+last, fall back to either alone, fall back to
  /// "User abc12345" — never returns empty.
  static String formatName(DisplayName? row, String userId) {
    final f = row?.firstName?.trim();
    final l = row?.lastName?.trim();
    if (f != null && f.isNotEmpty && l != null && l.isNotEmpty) return '$f $l';
    if (f != null && f.isNotEmpty) return f;
    if (l != null && l.isNotEmpty) return l;
    final short = userId.length >= 8 ? userId.substring(0, 8) : userId;
    return 'User $short';
  }

  /// First letter of the resolved name, uppercased. For avatar bubbles.
  static String initialFor(DisplayName? row, String userId) {
    final name = formatName(row, userId);
    final stripped = name.startsWith('User ') ? '?' : name;
    return stripped.isEmpty ? '?' : stripped[0].toUpperCase();
  }

  /// Look up a user-id from any of three handle forms:
  ///   - real email       (alex@gmail.com)
  ///   - getguac handle   (alex)
  ///   - getguac address  (alex@getguac.app)
  ///
  /// Returns the uuid or null. Migration 048 extended the RPC to handle
  /// all three; we just normalize whitespace + lowercase.
  static Future<String?> lookupUserIdByEmail(String input) async {
    final clean = input.trim().toLowerCase();
    if (clean.isEmpty) return null;
    try {
      final res = await _sb.rpc('lookup_user_id_by_email', params: {'p_email': clean});
      if (res == null) return null;
      return res as String;
    } catch (_) {
      return null;
    }
  }
}
