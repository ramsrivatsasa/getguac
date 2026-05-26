// Lightweight in-app diagnostic log that captures events from the
// biometric / app-lock / sign-in flow. The mobile app surfaces these in
// the Profile -> Diagnose dialog AND auto-uploads them to Supabase
// (client_logs table) once the user has an active session — that way
// we can debug failures that happen on-device without asking the user
// to read out a log file.
//
// Events are kept in memory + mirrored to SharedPreferences so the
// buffer survives an app restart (cold-start biometric path is the
// flow we care about most). 500-event ring buffer.

import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DebugLog {
  static const _kPrefsKey = 'gg_debug_log_v1';
  static const _maxBuf = 500;
  // Runtime-detected so the same APK/IPA labels itself correctly across
  // platforms. Cached at class init to avoid the Platform call on every event.
  static final String platform =
      Platform.isIOS ? 'ios' : Platform.isAndroid ? 'android' : 'other';

  static final List<Map<String, dynamic>> _buffer = [];
  static String? _sessionId;
  static String? _appVersion;
  static bool _loaded = false;
  static Timer? _autoUploadTimer;

  static String get sessionId {
    _sessionId ??= DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    return _sessionId!;
  }

  /// Call once from main() after WidgetsFlutterBinding.ensureInitialized().
  /// Hydrates the persistent buffer + warms the app-version cache.
  static Future<void> init() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kPrefsKey);
      if (raw != null && raw.isNotEmpty) {
        final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
        _buffer.addAll(list);
      }
    } catch (_) { /* fresh buffer on any decode error */ }
    try {
      final info = await PackageInfo.fromPlatform();
      _appVersion = 'v${info.version}+${info.buildNumber}';
    } catch (_) { _appVersion = '?'; }
    _loaded = true;
    event('debug-log', 'init',
      meta: {'buffer_size': _buffer.length, 'app_version': _appVersion});
  }

  /// Append an event. Safe to call before init() — the buffer will accumulate
  /// in memory and get persisted on the next persist(). Error-level events
  /// kick off an immediate upload (no debounce) so the trace lands on the
  /// server before the app potentially crashes.
  static void event(String tag, String message,
      {Map<String, dynamic>? meta, String level = 'info'}) {
    final ev = <String, dynamic>{
      'ts': DateTime.now().toUtc().toIso8601String(),
      'session_id': sessionId,
      'app_version': _appVersion,
      'platform': platform,
      'level': level,
      'tag': tag,
      'message': message,
      if (meta != null) 'meta': meta,
    };
    _buffer.add(ev);
    if (_buffer.length > _maxBuf) _buffer.removeAt(0);
    if (kDebugMode) {
      debugPrint('[$tag/$level] $message ${meta ?? ""}');
    }
    if (level == 'error' || level == 'warn') {
      // No debounce — error/warn events upload right away. We still keep
      // them in the buffer until the upload returns successfully, so a
      // crash between event() and upload still surfaces them on the next
      // app start.
      unawaited(uploadPending());
    } else {
      _scheduleAutoUpload();
    }
    unawaited(_persist());
  }

  static Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kPrefsKey, jsonEncode(_buffer));
    } catch (_) { /* persistence is best-effort */ }
  }

  /// Debounced upload: any time an event lands, we (re)arm a 3-second timer.
  /// On fire, if there is a Supabase session we upload everything currently
  /// in the buffer that hasn't been uploaded yet, then mark those rows so we
  /// don't re-send them. Uploaded events stay in the local ring buffer for
  /// the Diagnose dialog.
  static void _scheduleAutoUpload() {
    _autoUploadTimer?.cancel();
    _autoUploadTimer = Timer(const Duration(seconds: 3), () {
      unawaited(uploadPending());
    });
  }

  static Future<UploadResult> uploadPending() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      return UploadResult(uploaded: 0, skipped: _buffer.length, error: 'no session');
    }
    if (_buffer.isEmpty) return UploadResult(uploaded: 0, skipped: 0);
    // Snapshot what we're trying to send. We evict successful ones from the
    // live buffer as we go, so a concurrent event() during upload still
    // lands in the buffer and gets picked up on the next call.
    final pending = List<Map<String, dynamic>>.from(_buffer);
    final sb = Supabase.instance.client;
    int written = 0;
    String? lastErr;
    for (final e in pending) {
      try {
        await sb.rpc('log_audit', params: {
          'p_action': 'debug_log',
          'p_status': e['level'] ?? 'info',
          'p_detail': {
            'tag': e['tag'],
            'message': e['message'],
            'meta': e['meta'],
            'session_id': e['session_id'],
            'app_version': e['app_version'],
            'platform': e['platform'],
            'client_ts': e['ts'],
          },
        });
        _buffer.remove(e); // user requested: delete locally after upload + persist
        written++;
      } catch (err) {
        lastErr = err.toString();
        // Best-effort per event — keep going so a single bad row doesn't
        // block the rest of the batch.
      }
    }
    await _persist();
    if (written == 0) {
      return UploadResult(uploaded: 0, skipped: pending.length,
        error: lastErr ?? 'no events uploaded');
    }
    return UploadResult(uploaded: written, skipped: pending.length - written);
  }

  /// All buffered events, newest last.
  static List<Map<String, dynamic>> events() => List.unmodifiable(_buffer);

  /// Plain-text dump for the Diagnose dialog / copy-to-clipboard.
  static String formatText({int? lastN}) {
    final list = lastN == null || lastN >= _buffer.length
        ? _buffer
        : _buffer.sublist(_buffer.length - lastN);
    return list.map((e) {
      final meta = e['meta'] != null ? ' ' + jsonEncode(e['meta']) : '';
      return '${e['ts']} [${e['level']}] [${e['tag']}] ${e['message']}$meta';
    }).join('\n');
  }

  /// Wipe the local buffer (does NOT delete server-side rows).
  static Future<void> clear() async {
    _buffer.clear();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_kPrefsKey);
    } catch (_) {}
  }
}

class UploadResult {
  final int uploaded;
  final int skipped;
  final String? error;
  UploadResult({required this.uploaded, required this.skipped, this.error});
  bool get ok => error == null;
}
