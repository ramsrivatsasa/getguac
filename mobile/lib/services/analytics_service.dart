// Thin wrapper around posthog_flutter so callers can fire events without
// caring whether PostHog was actually initialized this run. POSTHOG_KEY is
// passed via --dart-define at build time; when empty, every method here
// no-ops. Identify on Supabase auth state change is wired in main.dart.

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:posthog_flutter/posthog_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AnalyticsService {
  static const String posthogKey = String.fromEnvironment('POSTHOG_KEY');
  static const String posthogHost = String.fromEnvironment(
    'POSTHOG_HOST',
    defaultValue: 'https://us.i.posthog.com',
  );

  static bool _initialized = false;
  static StreamSubscription<AuthState>? _authSub;

  /// One-shot setup. Safe to call when POSTHOG_KEY is empty — just no-ops.
  /// Subscribes to Supabase auth changes so identify()/reset() track the
  /// signed-in user across cold starts and sign-in/out events.
  static Future<void> init() async {
    if (posthogKey.isEmpty) return;
    if (_initialized) return;
    try {
      final config = PostHogConfig(posthogKey)
        ..host = posthogHost
        ..captureApplicationLifecycleEvents = true;
      await Posthog().setup(config);
      _initialized = true;
    } catch (e) {
      if (kDebugMode) debugPrint('[analytics] setup failed: $e');
      return;
    }

    // Identify the existing session, if any, then watch for changes.
    final existing = Supabase.instance.client.auth.currentSession?.user;
    if (existing != null) {
      await identify(existing.id, email: existing.email);
    }
    _authSub = Supabase.instance.client.auth.onAuthStateChange.listen((s) {
      final user = s.session?.user;
      if (s.event == AuthChangeEvent.signedIn && user != null) {
        identify(user.id, email: user.email);
      } else if (s.event == AuthChangeEvent.signedOut) {
        reset();
      }
    });
  }

  static Future<void> identify(String userId, {String? email}) async {
    if (!_initialized) return;
    try {
      await Posthog().identify(
        userId: userId,
        userProperties: email != null ? {'email': email} : null,
      );
    } catch (_) {/* analytics never throws into product code */}
  }

  static Future<void> reset() async {
    if (!_initialized) return;
    try {
      await Posthog().reset();
    } catch (_) {}
  }

  /// Fire-and-forget event capture. No-ops when PostHog wasn't initialized.
  static Future<void> track(String event, [Map<String, Object>? props]) async {
    if (!_initialized) return;
    try {
      await Posthog().capture(eventName: event, properties: props);
    } catch (_) {}
  }
}
