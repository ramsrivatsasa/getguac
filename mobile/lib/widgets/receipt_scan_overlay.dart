// Full-screen "parsing your receipt…" overlay.
//
// Mirrors web/src/components/ReceiptScanAnimation.jsx:
//   - Frosted-glass white backdrop (0.85 white + 12px blur).
//   - The search-scan Lottie (a magnifier sweeping a report with a $ coin)
//     beside the maracas-avocado mascot Lottie — the exact same two assets
//     the web overlay uses (assets/lottie/search-scan.json + our-mascot-
//     maracas.json).
//   - An animated rounded speech bubble above the scene: bounce-in entrance,
//     a 3-dot "typing" indicator, and a status line that rotates every 1.6s
//     (Looking for the store… → Saving to your Stash 🥑).
//   - If `count > 1`, an "N receipts" pill inside the bubble.
//
// Mount strategy
// --------------
// Global Overlay + OverlayEntry on top of the whole app's Navigator, so
// show() can be called from anywhere. show() is idempotent — calling it
// twice just updates the count, never stacking two backdrops.
//
// Reduce-motion: when MediaQuery.disableAnimations is true we skip every
// animated element and render plain "Parsing receipt…" text on white.

import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import '../theme/gg_design.dart';

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

  static OverlayEntry? _entry;
  static final GlobalKey<_ReceiptScanOverlayBodyState> _bodyKey =
      GlobalKey<_ReceiptScanOverlayBodyState>();

  /// Insert the overlay above the entire app. Idempotent.
  static void show(BuildContext context, {int count = 1}) {
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;
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

  /// Remove whatever overlay is currently mounted. Safe to call defensively.
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

const _kEmerald900 = Color(0xFF064E3B);
const _kEmerald700 = Color(0xFF15803D);
const _kEmerald400 = Color(0xFF34D399);

class _ReceiptScanOverlayBody extends StatefulWidget {
  final int initialCount;
  const _ReceiptScanOverlayBody({super.key, required this.initialCount});

  @override
  State<_ReceiptScanOverlayBody> createState() => _ReceiptScanOverlayBodyState();
}

class _ReceiptScanOverlayBodyState extends State<_ReceiptScanOverlayBody> {
  late int _count;
  int _tick = 0;
  Timer? _tickerTimer;

  @override
  void initState() {
    super.initState();
    _count = widget.initialCount;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final reduceMotion =
          MediaQuery.maybeOf(context)?.disableAnimations ?? false;
      if (!reduceMotion) {
        _tickerTimer = Timer.periodic(const Duration(milliseconds: 1600), (_) {
          if (!mounted) return;
          setState(() => _tick = (_tick + 1) % _ticker.length);
        });
      }
    });
  }

  @override
  void dispose() {
    _tickerTimer?.cancel();
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

    if (reduceMotion) {
      return Positioned.fill(
        child: Container(
          color: Colors.white,
          alignment: Alignment.center,
          child: Semantics(
            liveRegion: true,
            label: 'Parsing receipt',
            child: Text(
              'Parsing receipt…',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700), color: _kEmerald900),
            ),
          ),
        ),
      );
    }

    return Positioned.fill(
      child: Stack(
        children: [
          // Frosted-glass backdrop.
          Positioned.fill(
            child: BackdropFilter(
              filter: ui.ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Container(color: Colors.white.withValues(alpha: 0.85)),
            ),
          ),
          // Centre column: speech bubble above the magnifier + mascot scene.
          Positioned.fill(
            child: Semantics(
              liveRegion: true,
              container: true,
              label: _ticker[_tick],
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _SpeechBubble(text: _ticker[_tick], count: _count),
                    const SizedBox(height: 14),
                    // The GuacWizard genie casts a spell to read your receipt —
                    // matches the web receipts scan animation.
                    Image.asset(
                      'assets/mascot/genie.png',
                      width: 196, height: 250, fit: BoxFit.contain,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Rounded white speech bubble — bounce-in entrance, a 3-dot typing
/// indicator, and the rotating status line (with an optional batch badge).
class _SpeechBubble extends StatelessWidget {
  final String text;
  final int count;
  const _SpeechBubble({required this.text, required this.count});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.7, end: 1.0),
      duration: const Duration(milliseconds: 420),
      curve: Curves.elasticOut,
      builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 300),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 18, offset: const Offset(0, 6)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const _TypingDots(),
            const SizedBox(width: 10),
            Flexible(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 320),
                transitionBuilder: (c, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position: Tween(begin: const Offset(0, 0.3), end: Offset.zero).animate(anim),
                    child: c,
                  ),
                ),
                child: Text(
                  text,
                  key: ValueKey(text),
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800), color: _kEmerald900),
                ),
              ),
            ),
            if (count > 1) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: _kEmerald700.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$count receipts',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800), color: _kEmerald700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Three dots that pop in sequence — the talk.json "typing" indicator,
/// looped as a live cue that Guac is working.
class _TypingDots extends StatefulWidget {
  const _TypingDots();
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1150))..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, __) => Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) {
          final t = (_c.value - i * 0.18) % 1.0;
          // 0→1 lift over the first ~35%, back to 0 by ~70%, then rest.
          final double lift = t < 0.35
              ? Curves.easeInOut.transform(t / 0.35)
              : (t < 0.70 ? 1.0 - Curves.easeInOut.transform((t - 0.35) / 0.35) : 0.0);
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 1.5),
            width: 6, height: 6,
            transform: Matrix4.translationValues(0, -3.0 * lift, 0),
            decoration: BoxDecoration(
              color: _kEmerald400.withValues(alpha: 0.45 + 0.55 * lift),
              shape: BoxShape.circle,
            ),
          );
        }),
      ),
    );
  }
}
