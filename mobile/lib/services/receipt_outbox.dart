// Mobile receipt outbox.
//
// Why
// ---
// Receipts captured in low-signal places (basements, parking lots, planes)
// must never be lost. When /api/receipts/save fails, we queue the payload
// in shared_preferences and replay on next app launch / online window.
//
// Storage
// -------
// Single shared_preferences key 'getguac.outbox.v1' holding a JSON array.
// No Hive, no sqflite, no new packages — kept deliberately small so the
// mobile bundle stays lean (mobile-should-be-lightweight constraint).
//
// Each entry mirrors the web outbox shape:
//   { id, parsed, receipt_link, extra_page_urls, business_purchase,
//     validation_comment, user_category,
//     idempotency_key, attempts, last_error, queued_at }
//
// Flow
// ----
//   trySave(payload, sb)
//     1. POST /api/receipts/save with 30s timeout + Idempotency-Key.
//     2. 2xx → return SaveResult.success(receiptId, merged).
//     3. 4xx → throw (user fix needed, retry won't help).
//     4. Network / 5xx → enqueue + return SaveResult.queued(key).
//
//   flush(sb)
//     For each entry, POST it. 2xx / 4xx → remove. 5xx / network → keep
//     and bump attempts. Entries older than 7 days or with ≥10 attempts
//     are dropped with a warning.
//
// Auth: every POST forwards the user's Supabase access token as a Bearer
// header so the server-side /api/receipts/save can scope RLS correctly.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

const String _kApiBase = 'https://getguac.app';
const String _kStorageKey = 'getguac.outbox.v1';
const int _kMaxAttempts = 10;
const Duration _kMaxAge = Duration(days: 7);
const Duration _kRequestTimeout = Duration(seconds: 30);

class SaveResult {
  final String? receiptId;
  final bool merged;
  final bool queued;
  final String? idempotencyKey;
  final String? error;

  const SaveResult._({
    this.receiptId,
    this.merged = false,
    this.queued = false,
    this.idempotencyKey,
    this.error,
  });

  factory SaveResult.success(String id, bool merged) =>
      SaveResult._(receiptId: id, merged: merged);
  factory SaveResult.queued(String key) =>
      SaveResult._(queued: true, idempotencyKey: key);
  factory SaveResult.failure(String err) => SaveResult._(error: err);
}

class ReceiptOutbox {
  static const _uuid = Uuid();

  /// Attempt a save. Never throws on network errors — queues instead.
  /// 4xx (user errors) still throw via the returned SaveResult.error.
  static Future<SaveResult> trySave(Map<String, dynamic> payload) async {
    final sb = Supabase.instance.client;
    final session = sb.auth.currentSession;
    if (session == null) {
      return SaveResult.failure('Not signed in');
    }
    final idemKey = (payload['idempotency_key'] as String?) ?? _uuid.v4();

    try {
      final res = await _post(idemKey, payload, session.accessToken);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return SaveResult.success(
          body['receipt_id'] as String,
          body['merged'] == true,
        );
      }
      if (res.statusCode >= 400 && res.statusCode < 500) {
        // 4xx — user fix needed. Don't queue; surface to caller.
        return SaveResult.failure(_decodeError(res));
      }
      // 5xx — queue + return
      await _enqueue(idemKey, payload, 'server ${res.statusCode}');
      return SaveResult.queued(idemKey);
    } catch (e) {
      // Network / timeout — queue + return.
      await _enqueue(idemKey, payload, e.toString());
      return SaveResult.queued(idemKey);
    }
  }

  /// Sweep the queue. Safe to call any time; never throws.
  /// Returns counts for diagnostics. Run from main() on app start +
  /// after each new save attempt.
  static Future<({int sent, int failed, int dropped})> flush() async {
    final sb = Supabase.instance.client;
    final session = sb.auth.currentSession;
    if (session == null) return (sent: 0, failed: 0, dropped: 0);

    final prefs = await SharedPreferences.getInstance();
    final list = _readList(prefs);
    if (list.isEmpty) return (sent: 0, failed: 0, dropped: 0);

    final now = DateTime.now().millisecondsSinceEpoch;
    final kept = <Map<String, dynamic>>[];
    int sent = 0, failed = 0, dropped = 0;

    for (final entry in list) {
      final queuedAt = (entry['queued_at'] as int?) ?? now;
      final attempts = (entry['attempts'] as int?) ?? 0;
      if (now - queuedAt > _kMaxAge.inMilliseconds || attempts >= _kMaxAttempts) {
        if (kDebugMode) {
          debugPrint('[outbox] dropping (TTL or attempts): ${entry['idempotency_key']}');
        }
        dropped++;
        continue;
      }

      final idemKey = entry['idempotency_key'] as String;
      try {
        final res = await _post(idemKey, entry, session.accessToken);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          sent++;
          continue; // remove from queue
        }
        if (res.statusCode >= 400 && res.statusCode < 500) {
          if (kDebugMode) {
            debugPrint('[outbox] dropping 4xx ($idemKey): ${res.statusCode}');
          }
          dropped++;
          continue;
        }
        kept.add({
          ...entry,
          'attempts': attempts + 1,
          'last_error': 'server ${res.statusCode}',
        });
        failed++;
      } catch (e) {
        kept.add({
          ...entry,
          'attempts': attempts + 1,
          'last_error': e.toString(),
        });
        failed++;
      }
    }

    await _writeList(prefs, kept);
    return (sent: sent, failed: failed, dropped: dropped);
  }

  /// Read-only count for UI badges.
  static Future<int> size() async {
    final prefs = await SharedPreferences.getInstance();
    return _readList(prefs).length;
  }

  // ── Internals ─────────────────────────────────────────────────────

  static Future<http.Response> _post(
    String idemKey,
    Map<String, dynamic> entry,
    String accessToken,
  ) {
    final uri = Uri.parse('$_kApiBase/api/receipts/save');
    final body = jsonEncode({
      'parsed':             entry['parsed'],
      'receipt_link':       entry['receipt_link'],
      'extra_page_urls':    entry['extra_page_urls'],
      'business_purchase':  entry['business_purchase'],
      'validation_comment': entry['validation_comment'],
      'user_category':      entry['user_category'],
    });
    return http
        .post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $accessToken',
            'Idempotency-Key': idemKey,
          },
          body: body,
        )
        .timeout(_kRequestTimeout);
  }

  static String _decodeError(http.Response res) {
    try {
      final body = jsonDecode(res.body);
      if (body is Map && body['error'] is String) return body['error'] as String;
    } catch (_) {}
    return 'Save failed (${res.statusCode})';
  }

  static Future<void> _enqueue(
    String idemKey,
    Map<String, dynamic> payload,
    String lastError,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final list = _readList(prefs);
    final entry = <String, dynamic>{
      'idempotency_key':    idemKey,
      'parsed':             payload['parsed'],
      'receipt_link':       payload['receipt_link'],
      'extra_page_urls':    payload['extra_page_urls'],
      'business_purchase':  payload['business_purchase'],
      'validation_comment': payload['validation_comment'],
      'user_category':      payload['user_category'],
      'attempts':           1,
      'last_error':         lastError,
      'queued_at':          DateTime.now().millisecondsSinceEpoch,
    };
    // De-dup by idempotency key — replays must not double-enqueue.
    final filtered = list.where((e) => e['idempotency_key'] != idemKey).toList();
    filtered.add(entry);
    await _writeList(prefs, filtered);
  }

  static List<Map<String, dynamic>> _readList(SharedPreferences prefs) {
    final raw = prefs.getString(_kStorageKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.whereType<Map<String, dynamic>>().toList();
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[outbox] read failed: $e');
    }
    return const [];
  }

  static Future<void> _writeList(
    SharedPreferences prefs,
    List<Map<String, dynamic>> list,
  ) async {
    try {
      await prefs.setString(_kStorageKey, jsonEncode(list));
    } catch (e) {
      if (kDebugMode) debugPrint('[outbox] write failed: $e');
    }
  }
}
