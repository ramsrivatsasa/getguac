// Bottom AdMob banner shown across the native shell. Tier-2 — never shown to
// premium subscribers, and renders zero-height until an ad actually loads (and
// nothing at all in release until a real ad-unit id is set in AdsService).
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
  BannerAd? _ad;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    // Tier-2: premium subscribers never load an ad in the first place.
    if (PremiumService.instance.isPremium) return;
    if (!AdsService.ready) return;
    final unitId = AdsService.bannerUnitId();
    if (unitId == null) return;

    final ad = BannerAd(
      adUnitId: unitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
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
    return Container(
      color: Colors.white,
      alignment: Alignment.center,
      width: double.infinity,
      height: ad.size.height.toDouble(),
      child: AdWidget(ad: ad),
    );
  }
}
