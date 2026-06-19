// GetGuac Premium — in-app purchase flow (Google Play Billing / Apple IAP).
//
// Flow: queryProductDetails → buyNonConsumable → purchaseStream fires →
// validate the receipt on our server (getguac.app/api/iap/verify, which is the
// ONLY thing that can grant premium) → refresh PremiumService.
//
// Set up `premium_monthly` as a subscription in the Play Console (and App Store
// Connect for iOS) before this returns real products. Test with license testers
// on an internal-testing track — IAP doesn't work on a sideloaded debug build.
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'premium_service.dart';

class PurchaseService {
  PurchaseService._();
  static final PurchaseService instance = PurchaseService._();

  /// Must match the product/subscription id created in the store console.
  static const String premiumProductId = 'premium_monthly';
  static const String _verifyUrl = 'https://getguac.app/api/iap/verify';

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _sub;

  bool available = false;
  List<ProductDetails> products = const [];

  /// Initialize once at app start (after Supabase is ready).
  Future<void> init() async {
    try {
      available = await _iap.isAvailable();
    } catch (_) {
      available = false;
    }
    if (!available) return;

    _sub = _iap.purchaseStream.listen(
      _onPurchasesUpdated,
      onError: (e) => debugPrint('[iap] stream error: $e'),
      onDone: () => _sub?.cancel(),
    );

    await _loadProducts();
    // Re-deliver purchases made on another device / before reinstall.
    try {
      await _iap.restorePurchases();
    } catch (_) {}
  }

  Future<void> _loadProducts() async {
    try {
      final resp = await _iap.queryProductDetails({premiumProductId});
      products = resp.productDetails;
    } catch (e) {
      debugPrint('[iap] queryProductDetails failed: $e');
    }
  }

  ProductDetails? get premiumProduct {
    for (final p in products) {
      if (p.id == premiumProductId) return p;
    }
    return null;
  }

  /// Localized price string for the upgrade button, or null if not loaded.
  String? get premiumPrice => premiumProduct?.price;

  /// Kick off the purchase. Returns false if the product isn't available.
  Future<bool> buyPremium() async {
    final product = premiumProduct;
    if (product == null) return false;
    final param = PurchaseParam(productDetails: product);
    // Subscriptions and other non-consumables both use buyNonConsumable.
    return _iap.buyNonConsumable(purchaseParam: param);
  }

  Future<void> restore() async {
    try {
      await _iap.restorePurchases();
    } catch (_) {}
  }

  Future<void> _onPurchasesUpdated(List<PurchaseDetails> purchases) async {
    for (final p in purchases) {
      if (p.status == PurchaseStatus.purchased ||
          p.status == PurchaseStatus.restored) {
        final granted = await _verifyOnServer(p);
        if (granted) await PremiumService.instance.refresh();
      } else if (p.status == PurchaseStatus.error) {
        debugPrint('[iap] purchase error: ${p.error}');
      }
      // ALWAYS complete, or the store keeps re-delivering the purchase.
      if (p.pendingCompletePurchase) {
        await _iap.completePurchase(p);
      }
    }
  }

  /// Send the receipt to our server for validation. The server grants premium;
  /// we never trust the client. Returns true when the server confirms premium.
  Future<bool> _verifyOnServer(PurchaseDetails p) async {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return false;
    final platform =
        defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    try {
      final res = await http.post(
        Uri.parse(_verifyUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body:
            '{"platform":"$platform","productId":"${p.productID}","purchaseToken":"${p.verificationData.serverVerificationData}"}',
      );
      return res.statusCode == 200;
    } catch (e) {
      debugPrint('[iap] verify failed: $e');
      return false;
    }
  }

  void dispose() {
    _sub?.cancel();
  }
}
