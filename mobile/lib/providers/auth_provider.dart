import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:crypto/crypto.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/push_notifications.dart';

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

  // Only the columns actually used by mobile screens — keeps the payload tiny.
  static const _kProfileCols = 'id, first_name, last_name, email_alias, is_admin';

  Future<void> fetchProfile(String uid) async {
    // .maybeSingle() returns null if no row — .single() throws "PGRST116".
    // Newly registered users often don't have a profiles row until the
    // server-side trigger creates one.
    final data = await _sb.from('profiles').select(_kProfileCols).eq('id', uid).maybeSingle();
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

  // OAuth client IDs from the Google Cloud Console (see
  // mobile/SOCIAL-LOGIN-SETUP.md). Injected at build via --dart-define so no
  // secrets live in source; empty-string fallback means a mis-config surfaces
  // as a clean "provider not available" error instead of a crash.
  static const _googleIosClientId = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');
  static const _googleWebClientId = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');

  /// Native Google sign-in → Supabase session via the returned ID token.
  /// Returns false when the user cancels the Google account chooser (so the
  /// caller can stay on the login screen without showing an error).
  Future<bool> signInWithGoogle() async {
    final googleSignIn = GoogleSignIn(
      // iOS uses the iOS OAuth client; Android resolves its client from the
      // SHA-registered entry in Google Cloud, so clientId stays null there.
      clientId: Platform.isIOS && _googleIosClientId.isNotEmpty
          ? _googleIosClientId
          : null,
      // serverClientId (the "Web" OAuth client) makes Google mint an ID token
      // with the audience Supabase validates against.
      serverClientId: _googleWebClientId.isNotEmpty ? _googleWebClientId : null,
    );
    final googleUser = await googleSignIn.signIn();
    if (googleUser == null) return false; // user cancelled the chooser
    final googleAuth = await googleUser.authentication;
    final idToken = googleAuth.idToken;
    final accessToken = googleAuth.accessToken;
    if (idToken == null) {
      throw const AuthException('Google did not return an ID token.');
    }
    await _sb.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
      accessToken: accessToken,
    );
    return true;
  }

  /// Native Apple sign-in (iOS/macOS) → Supabase session. Binds the token to
  /// this request with a hashed nonce, per Supabase's recommended flow.
  Future<bool> signInWithApple() async {
    final rawNonce = _sb.auth.generateRawNonce();
    final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: const [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
      nonce: hashedNonce,
    );
    final idToken = credential.identityToken;
    if (idToken == null) {
      throw const AuthException('Apple did not return an identity token.');
    }
    await _sb.auth.signInWithIdToken(
      provider: OAuthProvider.apple,
      idToken: idToken,
      nonce: rawNonce,
    );
    // Apple only sends the display name on the FIRST authorization. Persist it
    // to user metadata so the profile keeps a real name (best-effort).
    final given = credential.givenName;
    final family = credential.familyName;
    if ((given?.isNotEmpty ?? false) || (family?.isNotEmpty ?? false)) {
      try {
        await _sb.auth.updateUser(UserAttributes(data: {
          if (given != null && given.isNotEmpty) 'first_name': given,
          if (family != null && family.isNotEmpty) 'last_name': family,
        }));
      } catch (_) {/* name enrichment only — never block sign-in */}
    }
    return true;
  }

  Future<void> logout() async {
    // We intentionally keep biometric credentials across sign-outs — the
    // whole point of biometric is to come back the next day and unlock
    // without re-typing the password. Old behaviour wiped them here,
    // which meant every sign-out cost the user their saved unlock.
    // If a user really wants to clear biometric, Profile -> Diagnose
    // biometric -> "Clear stored credentials" wipes them explicitly.
    // Drop the device's FCM token from `push_tokens` so the user
    // stops receiving sends targeted at this signed-out session.
    // Best-effort — never blocks the signOut path.
    try { await PushNotifications.instance.clearToken(); } catch (_) {}
    await _sb.auth.signOut();
    userProfile = null;
    notifyListeners();
  }

  Future<void> resetPassword(String email) async {
    // redirectTo lands the user on the branded getguac.app/reset-password
    // route after they click the email link — without it the browser
    // bounces through *.supabase.co which looks untrustworthy.
    await _sb.auth.resetPasswordForEmail(
      email,
      redirectTo: 'https://getguac.app/reset-password',
    );
  }

  bool get isAdmin => userProfile?['is_admin'] == true;
}
