// Push-notification service. Wires up Firebase Cloud Messaging,
// requests OS permission, captures the device's FCM token, and
// upserts it into the `push_tokens` Supabase table so the
// server-side dispatcher (web/api/notify/...) can target this
// device.
//
// All Firebase calls are wrapped in try/catch so a build without a
// configured Firebase project (no google-services.json /
// GoogleService-Info.plist) starts cleanly — permission won't be
// requested and no token is stored, but the rest of the app is
// unaffected.
//
// Foreground messages are surfaced via flutter_local_notifications
// because FCM by itself doesn't show a system-tray banner while
// the app is open. Background + terminated states are handled by
// the OS automatically.

import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PushNotifications {
  PushNotifications._();
  static final instance = PushNotifications._();

  bool _initialized = false;
  String? _currentToken;
  GoRouter? _router;
  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _foregroundMsgSub;
  StreamSubscription<RemoteMessage>? _openedAppSub;
  StreamSubscription<AuthState>? _authSub;

  final _localNotifs = FlutterLocalNotificationsPlugin();
  // High-importance channel — Android requires a registered channel
  // for foreground notifications to show in the tray.
  static const _androidChannel = AndroidNotificationChannel(
    'getguac_default',
    'GetGuac alerts',
    description: 'Rewards expiring, return windows, weekly digests.',
    importance: Importance.high,
  );

  /// Bootstrap. Safe to call multiple times — second-and-later
  /// invocations are no-ops. Call from `main()` AFTER
  /// `Supabase.initialize()` and after the GoRouter exists, so the
  /// upsert can write under the authenticated user and notification
  /// taps have somewhere to navigate.
  Future<void> init(GoRouter router) async {
    _router = router;
    if (_initialized) return;
    try {
      // FlutterFire CLI generates lib/firebase_options.dart with
      // platform-specific config. If the file isn't present (the
      // user hasn't run `flutterfire configure` yet), fall back to
      // a bare init that picks up google-services.json /
      // GoogleService-Info.plist by convention. Whichever path
      // succeeds, _initialized flips to true.
      await Firebase.initializeApp();
      _initialized = true;
    } catch (e) {
      // Firebase not configured (no google-services.json /
      // GoogleService-Info.plist, or no Firebase project for this
      // bundle id). App should keep running without push.
      debugPrint('[PushNotifications] Firebase init skipped: $e');
      return;
    }

    try {
      // Request OS permission (iOS shows the system prompt the first
      // time; Android 13+ also requires runtime permission since the
      // POST_NOTIFICATIONS permission was added).
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true, badge: true, sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        debugPrint('[PushNotifications] Permission denied');
        // Keep going — token capture still works on Android with
        // permission denied; the system just won't display banners.
      }

      // Local-notification plugin (foreground banner). One-time init.
      await _localNotifs.initialize(
        const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(
            requestAlertPermission: false,  // already done above
            requestBadgePermission: false,
            requestSoundPermission: false,
          ),
        ),
        onDidReceiveNotificationResponse: (r) => _openRoute(r.payload),
      );
      await _localNotifs
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_androidChannel);

      // Capture + persist the initial token.
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        _currentToken = token;
        await _upsertToken(token);
      }

      // Future refreshes (e.g. app reinstall, FCM server-side
      // refresh) — upsert the new token.
      _tokenRefreshSub?.cancel();
      _tokenRefreshSub = FirebaseMessaging.instance.onTokenRefresh.listen((t) async {
        _currentToken = t;
        await _upsertToken(t);
      });

      // The FCM token belongs to the DEVICE, but a `push_tokens` row
      // belongs to a USER — and at cold start there usually isn't one
      // yet. `init()` runs exactly once, the token above rarely
      // changes, so without this listener anyone who signs in AFTER
      // launch (i.e. every new install) or signs back in after a
      // logout never gets a row written, and every send for them
      // comes back `noTokens`. Re-upsert whenever a session appears.
      _authSub?.cancel();
      _authSub = Supabase.instance.client.auth.onAuthStateChange.listen((s) async {
        if (s.session == null) return;
        final t = _currentToken;
        if (t != null) await _upsertToken(t);
      });

      // Foreground message handler. The OS doesn't show a banner
      // while the app is in the foreground unless we do it ourselves.
      _foregroundMsgSub?.cancel();
      _foregroundMsgSub = FirebaseMessaging.onMessage.listen(_onForegroundMessage);

      // Tap handling for the two states the OS owns: notification
      // tapped while the app was backgrounded, and one that launched
      // the app from terminated. (Foreground taps come through the
      // local-notification callback wired above.) Without these the
      // `route` the dispatcher attaches to every send is dead weight.
      _openedAppSub?.cancel();
      _openedAppSub = FirebaseMessaging.onMessageOpenedApp
          .listen((m) => _openRoute(m.data['route']?.toString()));
      final launchMsg = await FirebaseMessaging.instance.getInitialMessage();
      if (launchMsg != null) _openRoute(launchMsg.data['route']?.toString());
    } catch (e) {
      debugPrint('[PushNotifications] Setup error: $e');
    }
  }

  /// Logout cleanup — drop the device's token from the user's
  /// Supabase row so they stop receiving sends for this device.
  Future<void> clearToken() async {
    final token = _currentToken;
    if (token == null) return;
    try {
      final sb = Supabase.instance.client;
      final user = sb.auth.currentUser;
      if (user == null) return;
      await sb.from('push_tokens').delete().eq('user_id', user.id).eq('token', token);
    } catch (_) { /* best-effort */ }
    // Deliberately KEEP _currentToken. It identifies the device, not
    // the session, and it's still valid after sign-out — the auth
    // listener needs it to re-register when someone signs back in.
    // Nulling it here made a single logout silence the device forever.
  }

  /// Navigate to a route carried by a notification payload. No-ops on
  /// an empty route or before the router is attached.
  void _openRoute(String? route) {
    if (route == null || route.isEmpty) return;
    final router = _router;
    if (router == null) return;
    try {
      router.go(route);
    } catch (e) {
      debugPrint('[PushNotifications] navigation failed for "$route": $e');
    }
  }

  Future<void> _upsertToken(String token) async {
    try {
      final sb = Supabase.instance.client;
      final user = sb.auth.currentUser;
      if (user == null) return;
      final platform = !kIsWeb && Platform.isIOS ? 'ios'
                     : !kIsWeb && Platform.isAndroid ? 'android'
                     : 'web';
      await sb.from('push_tokens').upsert(
        {
          'user_id':   user.id,
          'token':     token,
          'platform':  platform,
          'updated_at': DateTime.now().toUtc().toIso8601String(),
        },
        onConflict: 'user_id,token',
      );
    } catch (e) {
      debugPrint('[PushNotifications] Token upsert failed: $e');
    }
  }

  Future<void> _onForegroundMessage(RemoteMessage m) async {
    // Build a local notification from the FCM payload so the user
    // sees a banner even while the app is open.
    final title = m.notification?.title ?? m.data['title'] ?? 'GetGuac';
    final body  = m.notification?.body  ?? m.data['body']  ?? '';
    if (body.isEmpty) return;
    await _localNotifs.show(
      m.hashCode,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id, _androidChannel.name,
          channelDescription: _androidChannel.description,
          importance: Importance.high, priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: m.data['route']?.toString(),
    );
  }
}
