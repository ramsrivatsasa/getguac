// Full-screen "parsing your receipt…" overlay.
//
// Mirrors web/src/components/ReceiptScanAnimation.jsx beat-for-beat:
//   - Frosted-glass white backdrop (0.85 white + 12px blur) so the
//     character + receipt strip read as the focus, not the dim.
//   - AnimatedMascot bobbing in the center, with a 🔍 magnifying glass
//     swinging beside it.
//   - A faux paper receipt card with horizontal "lines" and a green
//     scan-line sweeping top→bottom on a 1.6s loop.
//   - Rotating ticker copy every 1.4s through 5 status strings.
//   - If `count > 1`, an "N receipts" pill below the ticker.
//
// Mount strategy
// --------------
// We use a global Overlay + OverlayEntry inserted on top of the whole
// app's Navigator. That means show() can be called from anywhere
// (provider, service, deep button handler) without prop-drilling a
// flag down to the receipts screen. show() is idempotent — calling it
// twice (or while already mounted) just updates the count + re-uses
// the existing entry, never stacking two backdrops.
//
// Reduce-motion
// -------------
// If MediaQuery.disableAnimations is true, we skip every animated
// element (mascot wobble, loupe swing, scan-line, ticker rotation,
// backdrop blur) and just render the plain "Parsing receipt…" text
// centered on a white surface. Same accessibility contract as the
// rest of the app — see AnimatedMascot._onEvent for the precedent.

import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'animated_mascot.dart';
import 'guac_mascot.dart';

/// Static API for popping the scan overlay above the whole app.
///
/// ```dart
/// ReceiptScanOverlay.show(context);            // single receipt
/// ReceiptScanOverlay.show(context, count: 3);  // multi-receipt batch
/// // …later, when parsing finishes…
/// ReceiptScanOverlay.hide();
/// ```
class ReceiptScanOverlay {
  ReceiptScanOverlay._();

  // The single mounted entry, plus its state-handle so show() can
  // update the displayed count without rebuilding the OverlayEntry.
  static OverlayEntry? _entry;
  static final GlobalKey<_ReceiptScanOverlayBodyState> _bodyKey =
      GlobalKey<_ReceiptScanOverlayBodyState>();

  /// Insert the overlay above the entire app. Idempotent — calling
  /// twice does not stack; the second call just nudges the count.
  static void show(BuildContext context, {int count = 1}) {
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;

    // Already mounted? Just update the count and bail. This is the
    // "called twice" guard — we never want a double-stacked backdrop.
    if (_entry != null) {
      _bodyKey.currentState?.updateCount(count);
      return;
    }

    final entry = OverlayEntry(
      builder: (_) => _ReceiptScanOverlayBody(key: _bodyKey, initialCount: count),
    );
    _entry = entry;
    overlay.insert(entry);
  }

  /// Remove whatever overlay is currently mounted. No-op if nothing
  /// is showing — safe to call defensively in finally blocks.
  static void hide() {
    _entry?.remove();
    _entry = null;
  }

  /// Test hook — true while the overlay is mounted.
  @visibleForTesting
  static bool get isVisible => _entry != null;
}

// --- internals -------------------------------------------------------------

const _ticker = <String>[
  'Looking for the store name…',
  'Reading the date and total…',
  'Tallying line items…',
  'Categorising your purchases…',
  'Saving to your Stash 🥑',
];

class _ReceiptScanOverlayBody extends StatefulWidget {
  final int initialCount;
  const _ReceiptScanOverlayBody({super.key, required this.initialCount});

  @override
  State<_ReceiptScanOverlayBody> createState() => _ReceiptScanOverlayBodyState();
}

class _ReceiptScanOverlayBodyState extends State<_ReceiptScanOverlayBody>
    with TickerProviderStateMixin {
  late int _count;
  int _tick = 0;
  Timer? _tickerTimer;

  // 1.6s loop driving both the loupe swing and the scan-line sweep.
  // Both web animations are 1.6s / 1.4s respectively; we share one
  // controller and use different Tweens — saves a ticker and keeps
  // them visually phase-locked.
  late final AnimationController _loop;

  @override
  void initState() {
    super.initState();
    _count = widget.initialCount;
    _loop = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );
    // We can't read MediaQuery in initState; defer the animation /
    // ticker boot to the first frame so we can honour disableAnimations.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final reduceMotion =
          MediaQuery.maybeOf(context)?.disableAnimations ?? false;
      if (!reduceMotion) {
        _loop.repeat();
        _tickerTimer = Timer.periodic(const Duration(milliseconds: 1400), (_) {
          if (!mounted) return;
          setState(() => _tick = (_tick + 1) % _ticker.length);
        });
      }
    });
  }

  @override
  void dispose() {
    _tickerTimer?.cancel();
    _loop.dispose();
    super.dispose();
  }

  void updateCount(int count) {
    if (!mounted) return;
    if (count == _count) return;
    setState(() => _count = count);
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    // Accessibility-first fallback: when the OS / app says "no
    // animations", we skip everything decorative. Plain text on a
    // solid-white surface, semantically labelled as a status update
    // so screen-readers announce it.
    if (reduceMotion) {
      return Positioned.fill(
        child: IgnorePointer(
          ignoring: false,
          child: Container(
            color: Colors.white,
            alignment: Alignment.center,
            child: Semantics(
              liveRegion: true,
              label: 'Parsing receipt',
              child: const Text(
                'Parsing receipt…',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF064E3B),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Positioned.fill(
      child: IgnorePointer(
        // The backdrop catches no taps — but the inner card layer
        // does (mirrors web's pointer-events-none / -auto split).
        ignoring: false,
        child: Stack(
          children: [
            // Frosted-glass backdrop.
            Positioned.fill(
              child: BackdropFilter(
                filter: ui.ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: Container(color: Colors.white.withValues(alpha: 0.85)),
              ),
            ),
            // Center column.
            Positioned.fill(
              child: Semantics(
                liveRegion: true,
                container: true,
                label: _ticker[_tick],
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _MascotWithLoupe(loop: _loop),
                      const SizedBox(height: 16),
                      _ReceiptCard(loop: _loop),
                      const SizedBox(height: 20),
                      _TickerPill(text: _ticker[_tick], count: _count),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// AnimatedMascot (idle breathing) + a 🔍 emoji that swings on the
// shared 1.6s loop. Web swings from -12° → +18°; we match.
class _MascotWithLoupe extends StatelessWidget {
  final AnimationController loop;
  const _MascotWithLoupe({required this.loop});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      height: 140,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const AnimatedMascot(
            mood: MascotMood.happy,
            size: 96,
            idle: true,
          ),
          Positioned(
            right: 0,
            bottom: 6,
            child: AnimatedBuilder(
              animation: loop,
              builder: (_, __) {
                // Triangle wave: 0→1→0 across the loop, mapped to
                // the -12°…+18° swing range. Sin-eased so the
                // endpoints feel like a pendulum instead of a snap.
                final t = loop.value;
                final eased = (1 - (2 * t - 1).abs()); // 0..1..0
                final smooth = Curves.easeInOut.transform(eased);
                final deg = -12.0 + smooth * 30.0;
                return Transform.rotate(
                  angle: deg * 3.1415926535 / 180,
                  alignment: Alignment.center,
                  child: const Text(
                    '🔍',
                    style: TextStyle(
                      fontSize: 28,
                      shadows: [
                        Shadow(blurRadius: 6, color: Color(0x55000000), offset: Offset(0, 2)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// Paper-styled card with grey "text lines" and a sweeping emerald
// scan-line. Same proportions as the web SVG (180×220).
class _ReceiptCard extends StatelessWidget {
  final AnimationController loop;
  const _ReceiptCard({required this.loop});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 180,
      height: 220,
      child: Stack(
        children: [
          // Paper background — rounded white with slate stroke.
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 18,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
            ),
          ),
          // Header bar (emerald).
          Positioned(
            left: 20,
            right: 20,
            top: 18,
            child: Container(
              height: 10,
              decoration: BoxDecoration(
                color: const Color(0xE615803D), // emerald-700 @ 0.9
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          // Text "lines" — alternating long / short, matches the SVG.
          ...[
            (44.0, 130.0),
            (60.0, 100.0),
            (76.0, 130.0),
            (92.0, 100.0),
            (108.0, 130.0),
            (124.0, 100.0),
            (140.0, 130.0),
          ].map((row) {
            final (top, width) = row;
            return Positioned(
              left: 12,
              top: top,
              child: Container(
                width: width,
                height: 6,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
          // Total bar (amber tint with darker amber sub-bar).
          Positioned(
            left: 12,
            top: 162,
            child: Container(
              width: 140,
              height: 14,
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          Positioned(
            left: 90,
            top: 166,
            child: Container(
              width: 50,
              height: 6,
              decoration: BoxDecoration(
                color: const Color(0xFFD97706),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Scan line — clipped to the card so it never escapes the
          // rounded corners. Tracks the shared 1.6s loop, sweeping
          // top→bottom with a soft glow.
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: AnimatedBuilder(
                animation: loop,
                builder: (_, __) {
                  final t = loop.value; // 0..1
                  // Match web: starts slightly above (-20%), exits
                  // far below (220% of card height). Opacity fades
                  // in/out at the edges.
                  final y = (-0.2 + t * 2.4) * 220;
                  final opacity = t < 0.1
                      ? (t / 0.1) * 0.9 + 0.1
                      : t > 0.9
                          ? ((1 - t) / 0.1) * 0.9 + 0.1
                          : 1.0;
                  return Stack(
                    children: [
                      Positioned(
                        left: 8,
                        right: 8,
                        top: y,
                        child: Opacity(
                          opacity: opacity.clamp(0.0, 1.0),
                          child: Container(
                            height: 6,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(999),
                              gradient: const LinearGradient(
                                colors: [
                                  Color(0x0034D399),
                                  Color(0xE634D399),
                                  Color(0x0034D399),
                                ],
                                stops: [0.0, 0.5, 1.0],
                              ),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x9934D399),
                                  blurRadius: 18,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// White pill with emerald border + the current ticker copy. Tacks
// an "N receipts" badge to the right when count > 1.
class _TickerPill extends StatelessWidget {
  final String text;
  final int count;
  const _TickerPill({required this.text, required this.count});

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      transitionBuilder: (child, anim) => FadeTransition(
        opacity: anim,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.15),
            end: Offset.zero,
          ).animate(anim),
          child: child,
        ),
      ),
      child: Container(
        // Key on the text so AnimatedSwitcher cross-fades when copy
        // rotates. The count-badge changing doesn't trigger a fade —
        // intentional, it just snaps.
        key: ValueKey(text),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.95),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0xFFD1FAE5), width: 1),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1F000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              text,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF064E3B), // emerald-900
              ),
            ),
            if (count > 1) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFD1FAE5),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$count receipts',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                    color: Color(0xFF047857),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
