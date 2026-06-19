// Premium entitlement reader. The entitlement itself is granted server-side
// (after a validated in-app purchase) and lives in the service-role-only
// `premium_entitlements` table; here we just read it so the UI can hide
// Tier-2 ads and show premium state. Tier-1 ads always show, premium or not.
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PremiumService extends ChangeNotifier {
  PremiumService._();
  static final PremiumService instance = PremiumService._();

  DateTime? _premiumUntil;
  bool _loaded = false;

  /// True while the user has an active (non-expired) premium subscription.
  bool get isPremium =>
      _premiumUntil != null && _premiumUntil!.isAfter(DateTime.now());
  bool get loaded => _loaded;
  DateTime? get premiumUntil => _premiumUntil;

  /// Re-read the entitlement. Call after login and after a purchase completes.
  Future<void> refresh() async {
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) {
      _premiumUntil = null;
      _loaded = true;
      notifyListeners();
      return;
    }
    try {
      final row = await client
          .from('premium_entitlements')
          .select('premium_until')
          .eq('user_id', user.id)
          .maybeSingle();
      final raw = row?['premium_until'] as String?;
      _premiumUntil = raw == null ? null : DateTime.tryParse(raw);
    } catch (_) {
      // Keep the last known value on transient errors — never crash the UI.
    }
    _loaded = true;
    notifyListeners();
  }
}
