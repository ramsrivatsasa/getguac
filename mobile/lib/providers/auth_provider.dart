import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/biometric_service.dart';

class AppAuthProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;

  User? get currentUser => _sb.auth.currentUser;
  Map<String, dynamic>? userProfile;

  AppAuthProvider() {
    // Listen for auth changes — but DO NOT crash if profile fetch fails.
    _sb.auth.onAuthStateChange.listen((event) async {
      if (event.session?.user != null) {
        try {
          await fetchProfile(event.session!.user.id);
        } catch (e) {
          // Profile may not exist for fresh accounts. Don't kill auth.
          if (kDebugMode) debugPrint('fetchProfile error (non-fatal): $e');
          userProfile = null;
        }
      } else {
        userProfile = null;
      }
      notifyListeners();
    });
    if (currentUser != null) {
      // Fire and forget — never let this throw to the constructor.
      fetchProfile(currentUser!.id).catchError((e) {
        if (kDebugMode) debugPrint('initial fetchProfile error: $e');
      });
    }
  }

  Future<void> fetchProfile(String uid) async {
    // .maybeSingle() returns null if no row — .single() throws "PGRST116".
    // Newly registered users often don't have a profiles row until the
    // server-side trigger creates one.
    final data = await _sb.from('profiles').select().eq('id', uid).maybeSingle();
    userProfile = data;
    notifyListeners();
  }

  /// Login with email OR username (email_alias).
  /// Currently only email is supported directly via Supabase auth — username
  /// support requires server-side resolution (see /api/auth/sign-in on the web).
  /// For mobile v1, we surface a clear error if the user typed a username.
  Future<void> login(String identifier, String password) async {
    final value = identifier.trim();
    if (!value.contains('@')) {
      throw const AuthException(
        'Use your email address to sign in. Username login is coming soon to mobile.',
      );
    }
    await _sb.auth.signInWithPassword(email: value, password: password);
  }

  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required Map<String, dynamic> extra,
  }) async {
    await _sb.auth.signUp(
      email: email,
      password: password,
      data: {'first_name': firstName, 'last_name': lastName, ...extra},
    );
  }

  Future<void> logout() async {
    // Wipe stored biometric credentials too — signing out should clear
    // the "remembered" state, otherwise next biometric unlock pulls
    // stale creds and silently fails.
    await BiometricService.disable();
    await _sb.auth.signOut();
    userProfile = null;
    notifyListeners();
  }

  Future<void> resetPassword(String email) async {
    await _sb.auth.resetPasswordForEmail(email);
  }

  bool get isAdmin => userProfile?['is_admin'] == true;
}
