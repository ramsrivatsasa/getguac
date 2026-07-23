// =============================================================================
// One place to get a *valid* Supabase access token.
// =============================================================================
// `Supabase.instance.client.auth.currentSession?.accessToken` returns the
// CACHED token — it does not refresh an expired one. Access tokens live ~1
// hour, so an app that has been backgrounded past expiry sends a stale JWT and
// every authenticated API call comes back HTTP 401 ("Load failed: Exception:
// HTTP 401" on the inbox). The SDK's auto-refresh timer does not reliably fire
// while the process is suspended.
//
// ggAccessToken() refreshes pre-emptively when the token is expired or about to
// be, so callers get a token the server will actually accept.
// =============================================================================

import 'package:supabase_flutter/supabase_flutter.dart';

/// Refresh when the token expires within this window, so a request that takes
/// a moment to reach the server doesn't arrive just after expiry.
const Duration _kRefreshSkew = Duration(seconds: 60);

/// Returns a valid access token, refreshing the session if needed.
/// Returns null when nobody is signed in or the refresh fails (treat as
/// signed out — the refresh token itself is expired or revoked).
Future<String?> ggAccessToken({bool forceRefresh = false}) async {
  final auth = Supabase.instance.client.auth;
  var session = auth.currentSession;
  if (session == null) return null;

  if (forceRefresh || _expiresSoon(session)) {
    try {
      final res = await auth.refreshSession();
      session = res.session ?? auth.currentSession;
    } catch (_) {
      // Refresh token rejected/offline. Fall through and return whatever we
      // hold: if it is merely stale the caller gets a 401 it can surface, and
      // if the user is truly signed out the auth listener will route them out.
      session = auth.currentSession;
    }
  }
  return session?.accessToken;
}

/// Ready-made Authorization header map. Empty when signed out, so callers can
/// spread it without null juggling.
Future<Map<String, String>> ggAuthHeaders({bool json = false}) async {
  final token = await ggAccessToken();
  return {
    if (token != null) 'Authorization': 'Bearer $token',
    if (json) 'Content-Type': 'application/json',
  };
}

bool _expiresSoon(Session session) {
  final expiresAt = session.expiresAt; // seconds since epoch
  if (expiresAt == null) return session.isExpired;
  final deadline =
      DateTime.now().add(_kRefreshSkew).millisecondsSinceEpoch ~/ 1000;
  return expiresAt <= deadline;
}
