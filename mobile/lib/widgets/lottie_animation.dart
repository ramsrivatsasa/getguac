// Lottie wrapper — mobile mirror of web/src/components/LottieAnimation.jsx.
// Renders character-quality JSON animations bundled under assets/lottie/.
//
// Usage:
//   const LottieAnimation(asset: 'assets/lottie/celebrate.json')
//   LottieAnimation(asset: 'assets/lottie/empty-receipts.json',
//                   size: 160, fallback: '🧾', label: 'no receipts yet')
//
// Falls back gracefully — if the asset is missing, fails to decode,
// or the OS reduce-motion preference is on (MediaQuery.disableAnimations),
// we render `fallback` (an emoji glyph) at the same footprint so the
// surrounding layout doesn't shift between motion / no-motion users.
// This is the parity contract with the web component.
//
// HOW TO ADD A NEW ANIMATION
//   1. Drop a Lottie JSON under web/src/lottie/<name>.json (web is the
//      source of truth — keep the two pipelines in sync).
//   2. Copy the same file to mobile/assets/lottie/<name>.json. The
//      `- assets/lottie/` glob in pubspec.yaml picks it up.
//   3. `flutter pub get` (the manifest scan happens at build time).

import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class LottieAnimation extends StatelessWidget {
  /// Asset path, e.g. `'assets/lottie/celebrate.json'`. Must be declared
  /// under the `flutter > assets:` glob in pubspec.yaml.
  final String asset;

  /// Square footprint in logical pixels. Matches the web `size` prop.
  final double size;

  /// Emoji glyph rendered when the animation can't play (missing asset,
  /// decode error, or OS reduce-motion is on).
  final String fallback;

  /// Loop forever (true) vs play once and freeze on the last frame.
  final bool repeat;

  /// Autoplay on mount. False keeps the animation paused on frame 0 —
  /// useful for "tap to play" surfaces.
  final bool animate;

  /// Semantics label. Falls through to a sensible default per state.
  final String? label;

  const LottieAnimation({
    super.key,
    required this.asset,
    this.size = 200,
    this.fallback = '🥑',
    this.repeat = true,
    this.animate = true,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    // Respect the OS reduce-motion preference — same short-circuit as
    // the web component's prefersReducedMotion() probe. Flutter exposes
    // this as MediaQueryData.disableAnimations.
    final reduced = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduced) {
      return _fallback(context, reason: 'animation paused');
    }

    return SizedBox(
      width: size,
      height: size,
      child: Semantics(
        label: label ?? 'animation',
        image: true,
        child: Lottie.asset(
          asset,
          width: size,
          height: size,
          repeat: repeat,
          animate: animate,
          fit: BoxFit.contain,
          // errorBuilder fires for missing/corrupt assets. We log to the
          // debug console (visible in `flutter logs`) but never throw —
          // an empty slot would be worse than the emoji fallback.
          errorBuilder: (context, error, stack) {
            debugPrint('LottieAnimation: failed to load $asset → $error');
            return _fallback(context, reason: 'animation unavailable');
          },
        ),
      ),
    );
  }

  Widget _fallback(BuildContext context, {required String reason}) {
    return SizedBox(
      width: size,
      height: size,
      child: Semantics(
        label: label ?? reason,
        image: true,
        child: Center(
          child: Text(
            fallback,
            style: TextStyle(
              fontSize: size * 0.6,
              height: 1.0,
            ),
          ),
        ),
      ),
    );
  }
}
