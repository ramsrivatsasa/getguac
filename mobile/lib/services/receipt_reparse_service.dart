// Re-parse an existing receipt by calling the web endpoint
// /api/receipts/[id]/reparse. The server handles both source types:
//   - email-linked   → re-runs Gemini on the original email body
//   - image-linked   → fetches receipt_link and runs Gemini vision
// Use case from mobile: a camera-captured receipt landed with blank
// store/total/items (pre-v0.2.25 bug), or the AI got something wrong.
// User taps "Re-parse" on the receipt detail and the row fills in.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

const _kApiBase = 'https://getguac.app';

class ReparseResult {
  final bool ok;
  final String? error;
  final int itemsParsed;
  final String? provider;
  ReparseResult({required this.ok, this.error, this.itemsParsed = 0, this.provider});
}

class ReceiptReparseService {
  static Future<ReparseResult> reparse(String receiptId) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      return ReparseResult(ok: false, error: 'Not signed in.');
    }
    try {
      final uri = Uri.parse('$_kApiBase/api/receipts/$receiptId/reparse');
      // Server-side timeout is 30s (maxDuration). Give the request 35s
      // wall-clock before we bail, so we surface the server's own error
      // message instead of a generic client timeout.
      final res = await http.post(uri, headers: {
        'Authorization': 'Bearer ${session.accessToken}',
        'Content-Type': 'application/json',
      }, body: '{}').timeout(const Duration(seconds: 35));

      final map = jsonDecode(res.body) as Map<String, dynamic>;
      if (res.statusCode == 200 && map['ok'] == true) {
        return ReparseResult(
          ok: true,
          itemsParsed: (map['items_parsed'] as num?)?.toInt() ?? 0,
          provider: map['provider'] as String?,
        );
      }
      return ReparseResult(ok: false, error: (map['error'] ?? 'HTTP ${res.statusCode}').toString());
    } catch (e) {
      return ReparseResult(ok: false, error: e.toString());
    }
  }
}
