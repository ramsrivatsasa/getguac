// App-lock state. When the user has biometric enabled, the app gates ALL
// authenticated routes behind a biometric unlock on every cold start (same
// pattern as banking / wallet apps). This service tracks two facts:
//   - whether biometric is enabled (cached on init so the router redirect
//     can read it synchronously)
//   - whether the user has unlocked this session yet
//
// "Session" here = process lifetime. Killing the app and reopening = locked
// again. We don't yet auto-relock on background-resume; that's a future tweak.

import 'biometric_service.dart';

class AppLockService {
  static bool _enabled = false;
  static bool _unlocked = false;

  /// Read whether biometric is set up. Called once from main() before
  /// runApp() so the router has the state ready when it builds.
  static Future<void> init() async {
    try {
      _enabled = await BiometricService.isEnabled() && await BiometricService.isDeviceCapable();
    } catch (_) {
      _enabled = false;
    }
    _unlocked = false; // fresh process = locked
  }

  /// True when the router should bounce the user to the lock screen.
  static bool get shouldLock => _enabled && !_unlocked;

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
  /// Profile). Cheap — just two storage reads.
  static Future<void> refreshEnabled() async {
    try {
      _enabled = await BiometricService.isEnabled() && await BiometricService.isDeviceCapable();
    } catch (_) {
      _enabled = false;
    }
  }
}
