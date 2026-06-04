// Mobile mirror of web's PostSignupReferralApply. On app start (post-
// auth), if there's a `pending_referral_code` stashed in
// SharedPreferences (e.g. captured from a referral deep-link), call
// the apply_referral_code RPC, clear the stash on any terminal
// response, and fire a mascot celebrate on success.
//
// Idempotent across cold starts: the stash is cleared the moment we
// get back a non-network response (success OR business-rejection),
// so we won't pester the user with "+3 Smash days" toasts twice.

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'mascot_event_bus.dart';

const String _kPendingRefKey = 'pending_referral_code';

class ReferralApplyService {
  /// Best-effort apply. Never throws. Safe to call on every app start.
  static Future<void> applyPendingIfAny() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_kPendingRefKey);
    if (code == null || code.isEmpty) return;

    final sb = Supabase.instance.client;
    final user = sb.auth.currentUser;
    if (user == null) return; // wait until signed in to apply

    try {
      final res = await sb.rpc('apply_referral_code', params: {'p_code': code});
      // Clear the stash on any non-network response so we don't retry
      // a known-rejected code on every cold start.
      await prefs.remove(_kPendingRefKey);
      if (res is Map && res['success'] == true) {
        final days = res['smash_days_credited'] ?? 3;
        mascotBus.celebrate('+$days Smash days');
      }
    } catch (e) {
      // Network / RLS error — leave the stash in place so the next
      // app start can retry. No mascot animation.
      if (kDebugMode) debugPrint('referral apply skipped: $e');
    }
  }

  /// Stash a code for later application — call from deep-link / signup
  /// flows that capture a referral code before the user is authenticated.
  static Future<void> stash(String code) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kPendingRefKey, code);
  }
}
