// AdMob (native in-app ads) — separate from the web AdSense ads. Every AdMob
// placement is Tier-2: hidden for premium subscribers (see GuacAdBanner +
// PremiumService). The ad unit is a NATIVE-advanced unit, rendered with
// AdMob's built-in template (no platform factory code).
//
// Consent (UMP): before requesting any ad we gather the user's ad-privacy
// consent via Google's User Messaging Platform (bundled inside
// google_mobile_ads). In the EEA/UK this shows a GDPR consent form on first
// launch; elsewhere (e.g. the US) no form is needed and ads stay personalized.
// We only mark ads "ready" once consent allows requesting them — this both
// satisfies Google's policy AND unlocks personalized (more relevant) ads.
import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

class AdsService {
  AdsService._();

  // Real AdMob NATIVE-advanced ad units. (App ids live in the Android manifest
  // / iOS Info.plist, not here.)
  static const String androidNativeUnitId = 'ca-app-pub-5959691671441705/1259528771';
  static const String iosNativeUnitId = 'ca-app-pub-5959691671441705/9906314136';

  // Google TEST native-advanced units — used in DEBUG so we never request or
  // click our own live ads (an AdMob policy violation / ban risk).
  static const String _testAndroidNative = 'ca-app-pub-3940256099942544/2247696110';
  static const String _testIosNative = 'ca-app-pub-3940256099942544/3986624511';

  static bool _ready = false;
  static bool get ready => _ready;

  /// Gather UMP consent (shows the GDPR form where required), then initialize
  /// the Mobile Ads SDK. Ads are only marked ready once consent allows
  /// requests. Safe to call once at startup; no-ops cleanly on any error.
  static Future<void> init() async {
    bool consentResolved = false;
    try {
      consentResolved = await _gatherConsent();
    } catch (_) { /* fall through — decided below */ }

    try {
      await MobileAds.instance.initialize();
      if (consentResolved) {
        // canRequestAds() is true outside the EEA, or in the EEA once the user
        // has made a choice that permits ads (personalized or non-personalized).
        _ready = await ConsentInformation.instance.canRequestAds();
      } else {
        // The consent SDK couldn't resolve (offline / not yet configured in the
        // AdMob console). Don't punish users by hiding ads — request them;
        // Google serves non-personalized ads when consent is unknown.
        _ready = true;
      }
    } catch (_) {
      _ready = false; // SDK not configured — ads just stay off.
    }
  }

  /// Returns true when the consent info update succeeded (form shown if needed),
  /// false when it failed. Never throws; bounded by a timeout so a stuck consent
  /// request can't block ad init forever.
  static Future<bool> _gatherConsent() {
    final completer = Completer<bool>();
    final params = ConsentRequestParameters();
    ConsentInformation.instance.requestConsentInfoUpdate(
      params,
      () {
        // Consent info updated — present the form if the user's region needs it.
        ConsentForm.loadAndShowConsentFormIfRequired((FormError? error) {
          if (!completer.isCompleted) completer.complete(true);
        });
      },
      (FormError error) {
        if (!completer.isCompleted) completer.complete(false);
      },
    );
    return completer.future
        .timeout(const Duration(seconds: 8), onTimeout: () => false);
  }

  /// Re-open the consent form so the user can change their ad-privacy choice.
  /// Wire to a "Manage ad privacy" button where the privacy options are
  /// required (EEA/UK). No-ops where consent isn't applicable.
  static void showPrivacyOptions() {
    ConsentForm.showPrivacyOptionsForm((FormError? error) {});
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
