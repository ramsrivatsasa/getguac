// GuacScore engine — TWO paths, ONE source of truth.
//
// 1. Remote path (preferred): `GuacoScoreApi.compute({days})` hits
//    GET /api/guacoscore on the server, which calls the canonical
//    `calculateGuacoScore` in web/src/lib/guacoscore.js. Same engine
//    web uses → guaranteed identical numbers.
//
// 2. Local Dart port (fallback): `calculateGuacoScore(...)` runs the
//    same math locally so an offline / API-down build still scores.
//    Validated against the JS via the shared fixture suite at
//    test-fixtures/guacoscore.json (51 cross-platform cases pass).
//
// Most surfaces should call `GuacoScoreApi.compute()` and accept the
// network roundtrip. The local function is for offline mode, tests,
// and surfaces that already have receipts in memory.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

// ── Local engine (offline fallback + tests) ─────────────────────────

class GuacoScoreInputReceipt {
  final int? rating;
  final double totalAmount;
  const GuacoScoreInputReceipt({this.rating, required this.totalAmount});
}

class GuacoBankBite {
  final double interest;
  final double fees;
  const GuacoBankBite({this.interest = 0, this.fees = 0});
  double get total => interest + fees;
}

class GuacoScoreResult {
  final int? score;
  final int ratedCount;
  final double weightedSpend;
  final int bankPenalty;
  // Only populated when the result came from the remote API; null
  // for local-fallback computations.
  final GuacoBankBite? bankBite;
  final String? scope;
  const GuacoScoreResult({
    this.score, required this.ratedCount,
    required this.weightedSpend, required this.bankPenalty,
    this.bankBite, this.scope,
  });
}

GuacoScoreResult calculateGuacoScore(
  List<GuacoScoreInputReceipt> receipts, {
  GuacoBankBite? bankBite,
}) {
  final rated = receipts.where((r) => r.rating != null && r.totalAmount > 0).toList();
  if (rated.isEmpty) {
    return const GuacoScoreResult(score: null, ratedCount: 0, weightedSpend: 0, bankPenalty: 0);
  }
  double weightedSum = 0;
  double weightTotal = 0;
  for (final r in rated) {
    final w = r.totalAmount.abs();
    final v = (r.rating! - 3) * 25;
    weightedSum += v * w;
    weightTotal += w;
  }
  final raw = weightTotal == 0 ? 50.0 : (weightedSum / weightTotal) + 50;

  int bankPenalty = 0;
  final bite = bankBite ?? const GuacoBankBite();
  final interest = bite.interest < 0 ? 0.0 : bite.interest;
  final fees     = bite.fees     < 0 ? 0.0 : bite.fees;
  if ((interest + fees) > 0) {
    final ratio = weightTotal > 0 ? (interest + fees) / weightTotal : 1.0;
    final ratioHit = (ratio * 100).clamp(0.0, 25.0);
    final dollarHit = (interest / 25) + (fees / 50);
    bankPenalty = (ratioHit + dollarHit).round().clamp(0, 25);
  }

  final score = (raw - bankPenalty).clamp(0, 100).round();
  return GuacoScoreResult(
    score: score,
    ratedCount: rated.length,
    weightedSpend: weightTotal,
    bankPenalty: bankPenalty,
  );
}

// ── Remote engine (canonical path) ──────────────────────────────────

class GuacoScoreApi {
  /// API base — points at production by default. Tests + local dev
  /// override via the optional `apiBase` argument on each call.
  static const String defaultApiBase = 'https://getguac.app';

  /// Compute the score for the signed-in user via the server-side
  /// canonical engine.
  ///
  /// `days` 0 → lifetime score (matches the dashboard tile)
  /// `days` N → trailing N-day window (matches /guacanomics range)
  ///
  /// Throws on auth failure or non-2xx response so the caller can
  /// fall back to the local engine if they want offline support.
  static Future<GuacoScoreResult> compute({
    int days = 0,
    String apiBase = defaultApiBase,
  }) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) throw Exception('not signed in');
    final uri = Uri.parse('$apiBase/api/guacoscore${days > 0 ? '?days=$days' : ''}');
    final res = await http.get(uri, headers: {
      'Authorization': 'Bearer ${session.accessToken}',
    });
    if (res.statusCode >= 400) {
      throw Exception('guacoscore ${res.statusCode}: ${res.body}');
    }
    final j = jsonDecode(res.body) as Map<String, dynamic>;
    final scoreRaw = j['score'];
    final score = scoreRaw is num ? scoreRaw.toInt() : null;
    final bb = (j['bankBite'] as Map?) ?? const {};
    return GuacoScoreResult(
      score: score,
      ratedCount: (j['ratedCount'] as num?)?.toInt() ?? 0,
      weightedSpend: (j['weightedSpend'] as num?)?.toDouble() ?? 0,
      bankPenalty: (j['bankPenalty'] as num?)?.toInt() ?? 0,
      bankBite: GuacoBankBite(
        interest: (bb['interest'] as num?)?.toDouble() ?? 0,
        fees:     (bb['fees']     as num?)?.toDouble() ?? 0,
      ),
      scope: j['scope'] is String ? j['scope'] as String : null,
    );
  }

  /// Convenience: call the API; on any failure return null so the
  /// caller can transparently fall back to a local compute.
  static Future<GuacoScoreResult?> computeOrNull({
    int days = 0,
    String apiBase = defaultApiBase,
  }) async {
    try { return await compute(days: days, apiBase: apiBase); }
    catch (_) { return null; }
  }
}
