// AdMob (native in-app ads) — separate from the web AdSense ads. Every AdMob
// placement is Tier-2: hidden for premium subscribers (see GuacAdBanner +
// PremiumService). The ad unit is a NATIVE-advanced unit, rendered with
// AdMob's built-in template (no platform factory code).
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

class AdsService {
  AdsService._();

  // Real AdMob NATIVE-advanced ad units. (App ids live in the Android manifest
  // / iOS Info.plist, not here.) iOS is blank until a GetGuac iOS AdMob app
  // exists.
  static const String androidNativeUnitId = 'ca-app-pub-5959691671441705/1259528771';
  static const String iosNativeUnitId = '';

  // Google TEST native-advanced units — used in DEBUG so we never request or
  // click our own live ads (an AdMob policy violation / ban risk).
  static const String _testAndroidNative = 'ca-app-pub-3940256099942544/2247696110';
  static const String _testIosNative = 'ca-app-pub-3940256099942544/3986624511';

  static bool _ready = false;
  static bool get ready => _ready;

  static Future<void> init() async {
    try {
      await MobileAds.instance.initialize();
      _ready = true;
    } catch (_) {
      _ready = false; // SDK not configured — ads just stay off.
    }
  }

  /// Native ad unit id to request, or null when no ad should show.
  static String? nativeUnitId() {
    if (kDebugMode) {
      return Platform.isIOS ? _testIosNative : _testAndroidNative;
    }
    final id = Platform.isIOS ? iosNativeUnitId : androidNativeUnitId;
    return id.isEmpty ? null : id;
  }
}
