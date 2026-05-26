// App-lock state. When the user has biometric enabled, the app gates ALL
// authenticated routes behind a biometric unlock on every cold start (same
// pattern as banking / wallet apps). This service tracks two facts:
//   - whether biometric is enabled (cached on init so the router redirect
//     can read it synchronously)
//   - whether the user has unlocked this session yet
//
// "Session" here = process lifetime. Killing the app and reopening = locked
// again. We don't yet auto-relock on background-resume; that's a future tweak.

import 'package:shared_preferences/shared_preferences.dart';
import 'biometric_service.dart';
import 'debug_log.dart';

class AppLockService {
  static bool _enabled = false;
  static bool _unlocked = false;
  static bool _keepSignedIn = true; // default: bypass the lock screen

  /// Read whether biometric is set up. Called once from main() before
  /// runApp() so the router has the state ready when it builds.
  static Future<void> init() async {
    try {
      final enabled = await BiometricService.isEnabled();
      final capable = await BiometricService.isDeviceCapable();
      _enabled = enabled && capable;
      final prefs = await SharedPreferences.getInstance();
      _keepSignedIn = prefs.getBool('gg_keep_signed_in') ?? true;
      DebugLog.event('app-lock', 'init', meta: {
        'enabled_in_storage': enabled,
        'device_capable': capable,
        '_enabled': _enabled,
        'keep_signed_in': _keepSignedIn,
      });
    } catch (e) {
      _enabled = false;
      DebugLog.event('app-lock', 'init threw',
        level: 'error', meta: {'error': e.toString()});
    }
    _unlocked = false; // fresh process = locked
  }

  /// True when the router should bounce the user to the lock screen.
  /// When the user has "Keep me signed in" enabled, we skip the lock — the
  /// Supabase session is already persisted, so there's nothing extra to gate.
  static bool get shouldLock => _enabled && !_unlocked && !_keepSignedIn;

  static bool get keepSignedIn => _keepSignedIn;

  /// True when biometric is configured (whether or not currently unlocked).
  static bool get isEnabled => _enabled;

  /// True when the user has authenticated this session.
  static bool get isUnlocked => _unlocked;

  /// Call after a successful biometric prompt.
  static void markUnlocked() {
    _unlocked = true;
  }

  /// Lock the app (e.g., on sign-out). After this, the next route navigation
  /// hits the lock screen until biometric passes.
  static void lock() {
    _unlocked = false;
  }

  /// Re-read the enabled flag (e.g., after the user toggles biometric in
  /// Profile, or after a fresh sign-in that just stored credentials). Cheap.
  static Future<void> refreshEnabled() async {
    try {
      final enabled = await BiometricService.isEnabled();
      final capable = await BiometricService.isDeviceCapable();
      _enabled = enabled && capable;
      final prefs = await SharedPreferences.getInstance();
      _keepSignedIn = prefs.getBool('gg_keep_signed_in') ?? true;
      DebugLog.event('app-lock', 'refreshEnabled', meta: {
        'enabled_in_storage': enabled,
        'device_capable': capable,
        '_enabled': _enabled,
        'keep_signed_in': _keepSignedIn,
      });
    } catch (e) {
      _enabled = false;
      DebugLog.event('app-lock', 'refreshEnabled threw',
        level: 'error', meta: {'error': e.toString()});
    }
  }
}
