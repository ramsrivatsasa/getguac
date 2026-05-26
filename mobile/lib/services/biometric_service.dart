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
import 'debug_log.dart';

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
      final canCheck = await _auth.canCheckBiometrics;
      final available = isSupported && canCheck
          ? await _auth.getAvailableBiometrics()
          : <BiometricType>[];
      final ok = isSupported && canCheck && available.isNotEmpty;
      DebugLog.event('biometric', 'isDeviceCapable=$ok', meta: {
        'isSupported': isSupported,
        'canCheck': canCheck,
        'available': available.map((b) => b.toString()).toList(),
      });
      return ok;
    } catch (e) {
      DebugLog.event('biometric', 'isDeviceCapable threw',
        level: 'error', meta: {'error': e.toString()});
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
      // Show the email in a recognizable but not-fully-exposed form so the
      // user can confirm WHICH account is stored. Dart's String.replaceAll
      // does not substitute regex capture groups — use replaceAllMapped.
      final masked = (email == null || email.isEmpty)
          ? '?'
          : email.replaceAllMapped(
              RegExp(r'^(.{2})(.*)@(.*)$'),
              (m) => '${m[1]}${'*' * (m[2]!.length)}@${m[3]}',
            );
      return 'OK: enabled with email=$masked, biometrics=${available.join(", ")}.';
    } catch (e) {
      return 'Diagnostic failed: $e';
    }
  }

  /// Whether the user has enabled biometric login (they did the password
  /// login once and we stashed credentials).
  static Future<bool> isEnabled() async {
    try {
      final flag = await _storage.read(key: _kEnabled);
      final email = await _storage.read(key: _kEmail);
      final ok = flag == '1' && email != null;
      DebugLog.event('biometric', 'isEnabled=$ok', meta: {
        'flag': flag,
        'email_present': email != null,
      });
      return ok;
    } catch (e) {
      DebugLog.event('biometric', 'isEnabled threw',
        level: 'error', meta: {'error': e.toString()});
      return false;
    }
  }

  /// Raw email that's currently stored for biometric login (or null if none).
  /// Lets the UI compare the stored account against the signed-in account
  /// so the user can tell when biometric is stale.
  static Future<String?> storedEmail() async {
    return _storage.read(key: _kEmail);
  }

  /// Save credentials + mark biometric login as enabled. Called after a
  /// successful password sign-in. Returns null on success, or a short
  /// human-readable error string if the secure-storage write failed
  /// (typically Android Keystore key invalidation after a reinstall).
  /// We read each value back to make sure the write actually persisted —
  /// silent write failures were the recurring symptom of the credentials-
  /// not-stored bug.
  static Future<String?> enable(String email, String password) async {
    DebugLog.event('biometric', 'enable start', meta: {'email_domain': _domainOf(email)});
    try {
      await _storage.write(key: _kEmail, value: email);
      await _storage.write(key: _kPass,  value: password);
      await _storage.write(key: _kEnabled, value: '1');
      final back = await _storage.read(key: _kEmail);
      final pwBack = await _storage.read(key: _kPass);
      final flagBack = await _storage.read(key: _kEnabled);
      DebugLog.event('biometric', 'enable wrote', meta: {
        'email_read_back_ok': back == email,
        'password_read_back_ok': pwBack == password,
        'flag_read_back': flagBack,
      });
      if (back != email) {
        return 'Secure storage write didn\'t persist (read-back returned "${back ?? "null"}").';
      }
      return null;
    } catch (e) {
      DebugLog.event('biometric', 'enable threw',
        level: 'error', meta: {'error': e.toString()});
      return 'Secure storage error: $e';
    }
  }

  static String _domainOf(String email) {
    final i = email.indexOf('@');
    return i >= 0 ? email.substring(i) : '?';
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
    DebugLog.event('biometric', 'authenticate start');
    try {
      final ok = await _auth.authenticate(
        localizedReason: 'Unlock GetGuac',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
      DebugLog.event('biometric', 'authenticate prompt result', meta: {'ok': ok});
      if (!ok) return null;
      final email = await _storage.read(key: _kEmail);
      final pass  = await _storage.read(key: _kPass);
      DebugLog.event('biometric', 'authenticate read-back', meta: {
        'email_present': email != null,
        'password_present': pass != null,
      });
      if (email == null || pass == null) return null;
      return (email: email, password: pass);
    } catch (e) {
      DebugLog.event('biometric', 'authenticate threw',
        level: 'error', meta: {'error': e.toString()});
      return null;
    }
  }
}
