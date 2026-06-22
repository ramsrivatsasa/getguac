// Bottom native ad. Tier-2 — never shown to premium subscribers. Uses AdMob's
// built-in "small" native template (no platform factory code). Renders zero
// height until an ad loads, and nothing at all in release until a real native
// unit id is set in AdsService.
//
// Used in two places: above the bottom nav on the native shell (MainScaffold),
// and below the WebView on embedded web pages (WebAppScreen) — where it
// REPLACES the page's own AdSense slots, which are suppressed inside the app
// (AdSense is browser-only; serving it in an app WebView violates policy).
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:provider/provider.dart';

import '../services/ads_service.dart';
import '../services/premium_service.dart';

class GuacAdBanner extends StatefulWidget {
  const GuacAdBanner({super.key});

  @override
  State<GuacAdBanner> createState() => _GuacAdBannerState();
}

class _GuacAdBannerState extends State<GuacAdBanner> {
  NativeAd? _ad;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    // Tier-2: premium subscribers never request an ad.
    if (PremiumService.instance.isPremium) return;
    if (!AdsService.ready) return;
    final unitId = AdsService.nativeUnitId();
    if (unitId == null) return;

    final ad = NativeAd(
      adUnitId: unitId,
      request: const AdRequest(),
      // Built-in "small" template — brand-tinted to match GetGuac.
      nativeTemplateStyle: NativeTemplateStyle(
        templateType: TemplateType.small,
        mainBackgroundColor: Colors.white,
        cornerRadius: 10.0,
        callToActionTextStyle: NativeTemplateTextStyle(
          textColor: Colors.white,
          backgroundColor: const Color(0xFF15803d),
          style: NativeTemplateFontStyle.bold,
          size: 14.0,
        ),
        primaryTextStyle: NativeTemplateTextStyle(
          textColor: const Color(0xFF0f172a),
          style: NativeTemplateFontStyle.bold,
          size: 14.0,
        ),
        secondaryTextStyle: NativeTemplateTextStyle(
          textColor: const Color(0xFF64748b),
          size: 12.0,
        ),
      ),
      listener: NativeAdListener(
        onAdLoaded: (_) {
          if (mounted) setState(() => _loaded = true);
        },
        onAdFailedToLoad: (ad, err) => ad.dispose(),
      ),
    );
    _ad = ad;
    ad.load();
  }

  @override
  void dispose() {
    _ad?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isPremium = context.watch<PremiumService>().isPremium;
    final ad = _ad;
    if (isPremium || !_loaded || ad == null) return const SizedBox.shrink();
    // The small template needs a bounded height inside the Column.
    return Container(
      color: Colors.white,
      height: 110,
      width: double.infinity,
      child: AdWidget(ad: ad),
    );
  }
}
