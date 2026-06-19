// AdMob (native in-app ads) — separate from the web AdSense ads. Every AdMob
// placement is Tier-2: hidden for premium subscribers (see GuacAdBanner +
// PremiumService). Web AdSense is never rendered inside the app (policy); this
// is how the native screens carry ads instead.
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

class AdsService {
  AdsService._();

  // TODO: paste your real AdMob banner unit ids before shipping to production.
  // Until these are set, RELEASE builds show no ad; DEBUG builds show Google's
  // test ads so the integration is verifiable now.
  static const String androidBannerUnitId = '';
  static const String iosBannerUnitId = '';

  // Google's official test banner units — safe to display/click, never billed.
  static const String _testAndroidBanner = 'ca-app-pub-3940256099942544/6300978111';
  static const String _testIosBanner = 'ca-app-pub-3940256099942544/2934735716';

  static bool _ready = false;
  static bool get ready => _ready;

  static Future<void> init() async {
    try {
      await MobileAds.instance.initialize();
      _ready = true;
    } catch (_) {
      _ready = false; // SDK not configured (no app id) — ads just stay off.
    }
  }

  /// Banner unit id to request, or null when no ad should show.
  static String? bannerUnitId() {
    if (kDebugMode) {
      return Platform.isIOS ? _testIosBanner : _testAndroidBanner;
    }
    final id = Platform.isIOS ? iosBannerUnitId : androidBannerUnitId;
    return id.isEmpty ? null : id;
  }
}
