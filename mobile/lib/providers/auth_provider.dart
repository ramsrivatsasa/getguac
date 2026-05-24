import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppAuthProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;

  User? get currentUser => _sb.auth.currentUser;
  Map<String, dynamic>? userProfile;

  AppAuthProvider() {
    _sb.auth.onAuthStateChange.listen((event) async {
      if (event.session?.user != null) {
        await fetchProfile(event.session!.user.id);
      } else {
        userProfile = null;
      }
      notifyListeners();
    });
    if (currentUser != null) fetchProfile(currentUser!.id);
  }

  Future<void> fetchProfile(String uid) async {
    final data = await _sb.from('profiles').select().eq('id', uid).single();
    userProfile = data;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    await _sb.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> register({
    required String email, required String password,
    required String firstName, required String lastName,
    required Map<String, dynamic> extra,
  }) async {
    await _sb.auth.signUp(
      email: email,
      password: password,
      data: { 'first_name': firstName, 'last_name': lastName, ...extra },
    );
  }

  Future<void> logout() async {
    await _sb.auth.signOut();
    userProfile = null;
    notifyListeners();
  }

  Future<void> resetPassword(String email) async {
    await _sb.auth.resetPasswordForEmail(email);
  }

  bool get isAdmin => userProfile?['is_admin'] == true;
}
