// Bundle up a user-submitted error report (subject + description) along with
// the recent debug log and post it to audit_log via the log_audit RPC.
// Users invoke this from:
//   - Profile -> Report a problem  (free-form)
//   - The batch-capture failure dialog (pre-fills with the failure list)
//
// The report shows up in audit_log with action='error_report' so it's easy
// to filter while triaging (separate from the action='debug_log' stream).

import 'package:supabase_flutter/supabase_flutter.dart';
import 'debug_log.dart';

class ErrorReportService {
  static Future<({bool ok, String? error})> send({
    required String subject,
    required String description,
    Map<String, dynamic>? context,
  }) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      return (ok: false, error: 'Not signed in — sign in to send the report.');
    }
    // Make sure any pending log events are flushed first so the report
    // includes the leading context, not just what we package below.
    await DebugLog.uploadPending();

    final recent = DebugLog.events().map((e) => {
      'ts': e['ts'],
      'level': e['level'],
      'tag': e['tag'],
      'message': e['message'],
      if (e['meta'] != null) 'meta': e['meta'],
    }).toList();

    try {
      await Supabase.instance.client.rpc('log_audit', params: {
        'p_action': 'error_report',
        'p_status': 'error',
        'p_detail': {
          'subject': subject,
          'description': description,
          'context': context,
          'recent_events': recent.length > 50
              ? recent.sublist(recent.length - 50)
              : recent,
          'platform': DebugLog.platform,
          'app_version': await _appVersion(),
          'session_id': DebugLog.sessionId,
          'client_ts': DateTime.now().toUtc().toIso8601String(),
        },
      });
      DebugLog.event('error-report', 'sent', meta: {'subject': subject});
      return (ok: true, error: null);
    } catch (e) {
      return (ok: false, error: e.toString());
    }
  }

  static Future<String> _appVersion() async {
    final ev = DebugLog.events();
    for (var i = ev.length - 1; i >= 0; i--) {
      final v = ev[i]['app_version'];
      if (v is String && v.isNotEmpty) return v;
    }
    return 'unknown';
  }
}
