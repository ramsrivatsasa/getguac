// Direct messages — mobile service.
//
// Dart mirror of web/src/lib/dms.js. All UI reads + writes for DMs go
// through here so the schema + validation rules live in one place,
// matching the central-logic pattern the web side already uses.
//
// Schema (migration 048):
//   dm_threads   { id, user_a, user_b, last_message_at, created_at }
//                user_a < user_b enforced by table CHECK — same pair
//                always produces the same row.
//   dm_messages  { id, thread_id, user_id, body, created_at }
//
// RLS: only the two participants can read/write a thread. Enforced
// server-side by `is_dm_participant()` SECURITY DEFINER helper.

import 'package:supabase_flutter/supabase_flutter.dart';
import 'display_names_service.dart';

class DmThread {
  final String id;
  final String peerId;
  final DateTime lastMessageAt;
  final DateTime createdAt;
  const DmThread({
    required this.id,
    required this.peerId,
    required this.lastMessageAt,
    required this.createdAt,
  });
}

class DmMessage {
  final String id;
  final String userId;
  final String body;
  final DateTime createdAt;
  const DmMessage({
    required this.id,
    required this.userId,
    required this.body,
    required this.createdAt,
  });

  factory DmMessage.fromRow(Map<String, dynamic> row) => DmMessage(
    id: row['id'] as String,
    userId: row['user_id'] as String,
    body: row['body'] as String,
    createdAt: DateTime.parse(row['created_at'] as String),
  );
}

class DmsService {
  static SupabaseClient get _sb => Supabase.instance.client;

  /// All threads the current user participates in, newest first.
  static Future<List<DmThread>> listMyThreads() async {
    final me = _sb.auth.currentUser?.id;
    if (me == null) return const [];
    final rows = await _sb
        .from('dm_threads')
        .select('id, user_a, user_b, last_message_at, created_at')
        .or('user_a.eq.$me,user_b.eq.$me')
        .order('last_message_at', ascending: false);
    return (rows as List).map<DmThread>((r) {
      final ua = r['user_a'] as String;
      final ub = r['user_b'] as String;
      return DmThread(
        id: r['id'] as String,
        peerId: ua == me ? ub : ua,
        lastMessageAt: DateTime.parse(r['last_message_at'] as String),
        createdAt: DateTime.parse(r['created_at'] as String),
      );
    }).toList();
  }

  /// Open (or create) the thread between the current user and `peerId`.
  /// Idempotent — duplicate inserts collapse via the unique
  /// (user_a, user_b) index. Returns the thread id.
  static Future<String> openThreadWith(String peerId) async {
    final me = _sb.auth.currentUser?.id;
    if (me == null) throw Exception('Not signed in');
    if (peerId == me) throw Exception('You cannot DM yourself.');

    // Canonical ordering: user_a < user_b (string compare on uuids).
    final a = me.compareTo(peerId) < 0 ? me : peerId;
    final b = me.compareTo(peerId) < 0 ? peerId : me;

    final existing = await _sb
        .from('dm_threads')
        .select('id')
        .eq('user_a', a)
        .eq('user_b', b)
        .maybeSingle();
    if (existing != null && existing['id'] != null) {
      return existing['id'] as String;
    }

    try {
      final created = await _sb
          .from('dm_threads')
          .insert({'user_a': a, 'user_b': b})
          .select('id')
          .single();
      return created['id'] as String;
    } on PostgrestException catch (e) {
      // Race: another insert won. Re-fetch.
      if (e.code == '23505') {
        final retry = await _sb
            .from('dm_threads')
            .select('id')
            .eq('user_a', a)
            .eq('user_b', b)
            .single();
        return retry['id'] as String;
      }
      rethrow;
    }
  }

  /// Convenience: start (or resume) a thread by any of the peer's handle
  /// forms — real email, GetGuac username, or username@getguac.app. Uses
  /// the SECURITY DEFINER RPC `lookup_user_id_by_email` (migration 048
  /// + 050; both folded) which accepts all three.
  static Future<String> openThreadByHandle(String input) async {
    final clean = input.trim().toLowerCase();
    if (clean.isEmpty) throw Exception('Handle or email is required');
    final peerId = await DisplayNamesService.lookupUserIdByEmail(clean);
    if (peerId == null) {
      throw Exception('No GetGuac account for "$clean". Ask them to sign up first.');
    }
    return openThreadWith(peerId);
  }

  /// Latest N messages oldest-first, so the UI appends new at the bottom.
  static Future<List<DmMessage>> listMessages(String threadId, {int limit = 200}) async {
    final rows = await _sb
        .from('dm_messages')
        .select('id, user_id, body, created_at')
        .eq('thread_id', threadId)
        .order('created_at', ascending: false)
        .limit(limit);
    final list = (rows as List).map<DmMessage>((r) => DmMessage.fromRow(r as Map<String, dynamic>)).toList();
    // Reverse to oldest-first.
    return list.reversed.toList();
  }

  /// Post a message. Trims + caps at 2000 chars (matches DB CHECK).
  /// Bumps the thread's last_message_at so listMyThreads stays sorted.
  static Future<DmMessage> postMessage(String threadId, String body) async {
    final trimmed = body.trim();
    if (trimmed.isEmpty) throw Exception('Empty message');
    final me = _sb.auth.currentUser?.id;
    if (me == null) throw Exception('Not signed in');

    final inserted = await _sb
        .from('dm_messages')
        .insert({
          'thread_id': threadId,
          'user_id':   me,
          'body':      trimmed.length > 2000 ? trimmed.substring(0, 2000) : trimmed,
        })
        .select('id, user_id, body, created_at')
        .single();
    final msg = DmMessage.fromRow(inserted);

    // Best-effort: bump thread sort key. Failure means the thread list
    // won't re-sort until next message — harmless.
    try {
      await _sb
          .from('dm_threads')
          .update({'last_message_at': msg.createdAt.toIso8601String()})
          .eq('id', threadId);
    } catch (_) { /* swallow */ }

    return msg;
  }
}
