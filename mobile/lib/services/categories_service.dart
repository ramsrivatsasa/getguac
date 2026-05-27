// Reads + creates rows in the Supabase `user_categories` table directly from
// the mobile client. Mirrors web/src/lib/db.js::getUserCategories /
// createUserCategory. RLS on the table already enforces per-user isolation.
//
// Graceful fallback: if the schema cache says the table is missing (a user on
// an older DB without migration_011), we return an empty list so the picker
// still shows the preset categories. Same trick the web client uses.

import 'package:supabase_flutter/supabase_flutter.dart';
import '../categories.dart';

class CategoriesService {
  static SupabaseClient get _sb => Supabase.instance.client;

  static Future<List<Category>> getUserCategories() async {
    try {
      final rows = await _sb
          .from('user_categories')
          .select()
          .order('label', ascending: true);
      return (rows as List).map<Category>(_rowToCategory).toList();
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('schema cache') ||
          msg.contains('does not exist') ||
          msg.contains('pgrst205') ||
          msg.contains('42p01')) {
        // Migration not applied yet — fall back to presets only.
        return const <Category>[];
      }
      rethrow;
    }
  }

  /// Inserts a new row, returns the freshly-created Category. Slug is derived
  /// from the label on the server-side to match the web flow.
  static Future<Category> createUserCategory({
    required String label,
    required String emoji,
    required String color,
    required String healthTier,
  }) async {
    final trimmed = label.trim();
    if (trimmed.isEmpty) throw Exception('label required');

    final user = _sb.auth.currentUser;
    if (user == null) throw Exception('Not signed in');

    final slug = trimmed
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    final safeSlug = (slug.isEmpty ? 'custom' : slug).substring(0, slug.length.clamp(0, 32));

    final safeColor = kColorOptions.contains(color) ? color : 'gray';
    final safeTier  = kHealthTiers.contains(healthTier) ? healthTier : kHealthTierDefault;

    final row = {
      'user_id': user.id,
      'slug': safeSlug,
      'label': trimmed,
      'emoji': emoji.isEmpty ? '📦' : emoji,
      'color': safeColor,
      'health_tier': safeTier,
    };

    Map<String, dynamic> result;
    try {
      result = await _sb.from('user_categories').insert(row).select().single();
    } catch (e) {
      // health_tier column missing → migration_031 not applied. Retry without it.
      if (e.toString().toLowerCase().contains('health_tier')) {
        final legacy = Map<String, dynamic>.from(row)..remove('health_tier');
        result = await _sb.from('user_categories').insert(legacy).select().single();
      } else {
        rethrow;
      }
    }

    return _rowToCategory(result);
  }

  static Future<void> deleteUserCategory(String id) async {
    await _sb.from('user_categories').delete().eq('id', id);
  }

  static Category _rowToCategory(dynamic row) {
    final m = row as Map<String, dynamic>;
    return Category(
      slug: m['slug'] as String,
      label: m['label'] as String,
      emoji: (m['emoji'] as String?) ?? '📦',
      desc: '',
      color: (m['color'] as String?) ?? 'gray',
      healthTier: (m['health_tier'] as String?) ?? kHealthTierDefault,
      custom: true,
      id: m['id']?.toString(),
    );
  }
}
