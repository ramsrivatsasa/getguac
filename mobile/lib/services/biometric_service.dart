// Biometric (fingerprint / face) authentication service.
//
// Flow: after the user successfully signs in with email/password once, we
// stash their credentials in flutter_secure_storage (Android Keystore /
// iOS Keychain backed). On subsequent app opens, the login screen shows
// a "Unlock with biometric" button — tapping it prompts fingerprint, and
// on success we re-issue the Supabase signInWithPassword call using the
// stored credentials.
//
// The stored password never leaves the device's secure storage, and the
// user can clear it any time by signing out.

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

class BiometricService {
  static const _kEmail = 'gg_bio_email';
  static const _kPass  = 'gg_bio_pass';
  static const _kEnabled = 'gg_bio_enabled';

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static final _auth = LocalAuthentication();

  /// Whether the device CAN do biometric auth (sensor + enrolled credential).
  static Future<bool> isDeviceCapable() async {
    try {
      final isSupported = await _auth.isDeviceSupported();
      if (!isSupported) return false;
      final canCheck = await _auth.canCheckBiometrics;
      if (!canCheck) return false;
      final available = await _auth.getAvailableBiometrics();
      return available.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Detailed diagnostic for the UI to surface to the user when biometric
  /// isn't working as expected. Returns a one-line summary of WHY biometric
  /// would or wouldn't trigger right now.
  static Future<String> diagnose() async {
    try {
      final supported = await _auth.isDeviceSupported();
      if (!supported) return 'Device does not support biometric (no hardware).';
      final canCheck = await _auth.canCheckBiometrics;
      if (!canCheck) return 'OS biometric API unavailable. Check device settings.';
      final available = await _auth.getAvailableBiometrics();
      if (available.isEmpty) return 'No fingerprint or face enrolled on this device. Enroll one in Settings.';
      final enabled = await isEnabled();
      if (!enabled) return 'Biometric capable (${available.join(", ")}) but credentials are NOT stored. Sign in with password first — make sure "Remember me" is checked.';
      final email = await _storage.read(key: _kEmail);
      return 'OK: enabled with email=${email?.replaceAll(RegExp(r"(.{2}).*@"), r"$1***@") ?? "?"}, biometrics=${available.join(", ")}.';
    } catch (e) {
      return 'Diagnostic failed: $e';
    }
  }

  /// Whether the user has enabled biometric login (they did the password
  /// login once and we stashed credentials).
  static Future<bool> isEnabled() async {
    return (await _storage.read(key: _kEnabled)) == '1'
        && (await _storage.read(key: _kEmail)) != null;
  }

  /// Save credentials + mark biometric login as enabled. Called after a
  /// successful password sign-in.
  static Future<void> enable(String email, String password) async {
    await _storage.write(key: _kEmail, value: email);
    await _storage.write(key: _kPass,  value: password);
    await _storage.write(key: _kEnabled, value: '1');
  }

  /// Wipe stored credentials (call on sign-out or "disable biometric").
  static Future<void> disable() async {
    await _storage.delete(key: _kEmail);
    await _storage.delete(key: _kPass);
    await _storage.delete(key: _kEnabled);
  }

  /// Prompt biometric. Returns the stored email+password if user authenticated,
  /// null otherwise.
  static Future<({String email, String password})?> authenticate() async {
    try {
      final ok = await _auth.authenticate(
        localizedReason: 'Unlock GetGuac',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
      if (!ok) return null;
      final email = await _storage.read(key: _kEmail);
      final pass  = await _storage.read(key: _kPass);
      if (email == null || pass == null) return null;
      return (email: email, password: pass);
    } catch (_) {
      return null;
    }
  }
}
