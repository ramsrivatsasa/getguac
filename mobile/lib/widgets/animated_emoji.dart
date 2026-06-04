// AnimatedEmoji — wraps any emoji glyph with a chosen looping animation.
// Dart/Flutter port of web/src/components/AnimatedEmoji.jsx; the keyframe
// timings, transform values, and tap-burst geometry all mirror the CSS
// @keyframes anim-emoji-* rules in web/src/app/globals.css so a grid of
// emojis on mobile reads the same as on web.
//
//   AnimatedEmoji(char: '🥑', anim: 'bob',       size: 32)
//   AnimatedEmoji(char: '❤️',  anim: 'heartBeat', size: 48, tapBurst: true)
//   AnimatedEmoji(char: '🎉', anim: 'party',     size: 56)
//
// Named animations:
//   bob        — gentle Y-axis float (3.2s loop, easeInOut)
//   spin       — slow full rotation (4.8s loop, linear)
//   jiggle     — small playful wiggle (2.2s loop)
//   drop       — one-shot fall + bounce (700ms easeOutBack), then idle bob
//   wave       — hand-wave rotation around bottom-right (2.6s loop)
//   heartBeat  — scale pulse at heartbeat tempo (1.4s loop)
//   dance      — bob + jiggle combo (3s loop)
//   party      — vigorous scale + rotation (2s loop, easeOutBack)
//   none       — disables animation
//
// tapBurst: when true, tapping fires an 8-dot radial particle burst
// (~600ms) plus HapticFeedback.lightImpact. Mirrors the web's CSS-based
// burst-dot; in Flutter we paint the dots via a CustomPainter so we don't
// have to manage 8 short-lived widgets per tap.
//
// Accessibility:
//   - Respects MediaQuery.disableAnimations — when on, renders a static
//     Text with the emoji and skips all controllers / gestures' bursts.
//   - Wrapped in Semantics(label: ...) so screen readers announce the
//     emoji's meaning, not the raw glyph.

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Public widget. Stateless wrapper that swaps to a stripped-down static
/// `Text` when `MediaQuery.disableAnimations` is true, otherwise delegates
/// to the stateful animator below.
class AnimatedEmoji extends StatefulWidget {
  final String char;
  final double size;
  final String anim;
  final bool tapBurst;
  final String? label;

  const AnimatedEmoji({
    super.key,
    required this.char,
    required this.size,
    this.anim = 'bob',
    this.tapBurst = false,
    this.label,
  });

  @override
  State<AnimatedEmoji> createState() => _AnimatedEmojiState();
}

class _AnimatedEmojiState extends State<AnimatedEmoji>
    with TickerProviderStateMixin {
  // Single repeating controller drives all looping animations. Per-char
  // hashCode % 1000 seeds an initial phase offset so a grid of emojis
  // doesn't pulse in sync — the web side achieves this via inline
  // animation-delay; here we just set _loopCtrl.value before forward().
  AnimationController? _loopCtrl;
  // Separate one-shot controller for `drop` (700ms easeOutBack on mount).
  AnimationController? _dropCtrl;
  // Tap-burst overlay. Repaints every frame while progress < 1.
  AnimationController? _burstCtrl;
  late List<_BurstDot> _burstDots = const [];

  // Cached so dispose() can early-out when we never built the controllers
  // (happens when disableAnimations is true on first build).
  bool _ctrlsInit = false;

  @override
  void initState() {
    super.initState();
    // We can't read MediaQuery in initState, so defer controller creation
    // to the first build(). _ensureControllers is idempotent.
  }

  void _ensureControllers() {
    if (_ctrlsInit) return;
    _ctrlsInit = true;

    final dur = _loopDurationFor(widget.anim);
    if (dur != null) {
      _loopCtrl = AnimationController(vsync: this, duration: dur);
      // Per-char phase offset. Web uses `(charSeed * 1.7) % 1` of the
      // animation duration; we approximate with a stable 0..1 fraction.
      final seed = (widget.char.hashCode % 1000) / 1000.0;
      _loopCtrl!.value = seed;
      _loopCtrl!.repeat();
    }

    if (widget.anim == 'drop') {
      // 700ms easeOutBack, then start the idle bob loop. The loop ctrl
      // is already running (we set up `bob` timing for `drop` below),
      // but we offset its starting value so the bob picks up smoothly
      // after the drop completes.
      _dropCtrl = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 700),
      );
      _dropCtrl!.forward();
    }

    _burstCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
  }

  // Loop duration per animation name. `drop` uses bob's 3.2s loop for
  // its idle-after-drop phase. Returns null for `none` (no loop ctrl).
  Duration? _loopDurationFor(String anim) {
    switch (anim) {
      case 'bob':
      case 'drop':
        return const Duration(milliseconds: 3200);
      case 'spin':
        return const Duration(milliseconds: 4800);
      case 'jiggle':
        return const Duration(milliseconds: 2200);
      case 'wave':
        return const Duration(milliseconds: 2600);
      case 'heartBeat':
        return const Duration(milliseconds: 1400);
      case 'dance':
        return const Duration(milliseconds: 3000);
      case 'party':
        return const Duration(milliseconds: 2000);
      case 'none':
        return null;
      default:
        // Unknown name — default to bob to match the web's fallback.
        return const Duration(milliseconds: 3200);
    }
  }

  @override
  void dispose() {
    _loopCtrl?.dispose();
    _dropCtrl?.dispose();
    _burstCtrl?.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (!widget.tapBurst) return;
    if (_burstCtrl == null) return;
    HapticFeedback.lightImpact();
    setState(() {
      _burstDots = _generateBurstDots(widget.size);
    });
    _burstCtrl!
      ..stop()
      ..value = 0
      ..forward();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    final semanticsLabel = widget.label ?? 'emoji';

    // Reduce-motion path: static text, no controllers, no gestures fire
    // the burst (taps still call back if added later — we wrap in
    // Semantics only). Cheap, zero per-frame work.
    if (reduceMotion) {
      return Semantics(
        label: semanticsLabel,
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: Center(
            child: Text(
              widget.char,
              style: TextStyle(fontSize: widget.size, height: 1),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    _ensureControllers();

    // Pre-build the listenables list so we don't allocate per-frame.
    final listenables = <Listenable>[
      if (_loopCtrl != null) _loopCtrl!,
      if (_dropCtrl != null) _dropCtrl!,
      _burstCtrl!,
    ];

    Widget child = AnimatedBuilder(
      animation: Listenable.merge(listenables),
      builder: (ctx, _) {
        final t = _loopCtrl?.value ?? 0.0;
        _Frame frame;
        switch (widget.anim) {
          case 'bob':
            frame = _bobFrame(t);
            break;
          case 'spin':
            frame = _spinFrame(t);
            break;
          case 'jiggle':
            frame = _jiggleFrame(t);
            break;
          case 'drop':
            // While the drop ctrl is running, blend its one-shot output
            // on top of the bob loop. Once drop completes, only the bob
            // loop drives the transform.
            final dropping = (_dropCtrl?.isAnimating ?? false) ||
                (_dropCtrl != null && _dropCtrl!.value < 1.0);
            if (dropping) {
              frame = _dropFrame(_dropCtrl!.value);
            } else {
              frame = _bobFrame(t);
            }
            break;
          case 'wave':
            frame = _waveFrame(t);
            break;
          case 'heartBeat':
            frame = _heartBeatFrame(t);
            break;
          case 'dance':
            frame = _danceFrame(t);
            break;
          case 'party':
            frame = _partyFrame(t);
            break;
          case 'none':
            frame = _Frame.identity();
            break;
          default:
            frame = _bobFrame(t);
        }

        // transformAlignment matches CSS transform-origin for wave
        // (bottom-right ≈ 70% / 90%) and jiggle/dance (50% 90%); for
        // everything else the default Alignment.center matches CSS's
        // implicit 50% 50%.
        Alignment origin = Alignment.center;
        if (widget.anim == 'wave') {
          // 70% x, 90% y in CSS == Alignment(0.4, 0.8).
          origin = const Alignment(0.4, 0.8);
        } else if (widget.anim == 'jiggle' ||
            widget.anim == 'dance') {
          // 50% x, 90% y in CSS == Alignment(0.0, 0.8).
          origin = const Alignment(0.0, 0.8);
        }

        // translateY in our _Frame is a fraction of font size — convert
        // to logical px so the magnitude matches the CSS `translateY(%)`.
        final translateY = frame.ty * widget.size;

        final emoji = Opacity(
          opacity: frame.opacity,
          child: Transform.translate(
            offset: Offset(0, translateY),
            child: Transform.rotate(
              angle: frame.rot,
              alignment: origin,
              child: Transform.scale(
                scale: frame.scale,
                alignment: origin,
                child: Text(
                  widget.char,
                  style: TextStyle(fontSize: widget.size, height: 1),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        );

        // Burst overlay — only painted while a burst is in flight.
        final burstActive = _burstCtrl!.value > 0 && _burstCtrl!.value < 1;

        return Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: widget.size,
              height: widget.size,
              child: Center(child: emoji),
            ),
            if (burstActive)
              Positioned.fill(
                child: IgnorePointer(
                  child: CustomPaint(
                    painter: _BurstPainter(
                      progress: _burstCtrl!.value,
                      dots: _burstDots,
                      emojiSize: widget.size,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );

    if (widget.tapBurst) {
      child = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _handleTap,
        child: child,
      );
    }

    return Semantics(
      label: semanticsLabel,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: child,
      ),
    );
  }
}

// ─── Per-animation frame computation ──────────────────────────────────
// Each helper returns a _Frame for unit-loop progress t∈[0,1). Values
// are interpolated linearly between keyframe stops — eyeballing the
// curves matches the CSS `ease-in-out` closely enough for emoji-scale
// motion and avoids per-segment CurvedAnimation allocations.

class _Frame {
  final double ty; // fraction of font size
  final double rot; // radians
  final double scale;
  final double opacity;
  const _Frame({
    this.ty = 0,
    this.rot = 0,
    this.scale = 1,
    this.opacity = 1,
  });
  factory _Frame.identity() => const _Frame();
}

// Lerp helper: piecewise-linear interpolation across a sorted stop list.
double _lerpStops(double t, List<double> stops, List<double> vals) {
  if (t <= stops.first) return vals.first;
  if (t >= stops.last) return vals.last;
  for (var i = 0; i < stops.length - 1; i++) {
    if (t <= stops[i + 1]) {
      final p = (t - stops[i]) / (stops[i + 1] - stops[i]);
      // easeInOut approximation (smoothstep) for the loop helpers below.
      final eased = p * p * (3 - 2 * p);
      return vals[i] + (vals[i + 1] - vals[i]) * eased;
    }
  }
  return vals.last;
}

const _deg = math.pi / 180.0;

// bob: translateY 0 → -12% → 0, rotate -1deg → 2deg → -1deg.
_Frame _bobFrame(double t) {
  final ty = _lerpStops(t, const [0, 0.5, 1.0], const [0.0, -0.12, 0.0]);
  final rot = _lerpStops(t, const [0, 0.5, 1.0],
      const [-1 * _deg, 2 * _deg, -1 * _deg]);
  return _Frame(ty: ty, rot: rot);
}

// spin: linear 0 → 2π.
_Frame _spinFrame(double t) {
  return _Frame(rot: t * 2 * math.pi);
}

// jiggle: rotate -9 / +8 / -6 / +5 / 0 at 0/20/40/60/80/100.
_Frame _jiggleFrame(double t) {
  final rot = _lerpStops(
    t,
    const [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
    const [
      0.0,
      -9 * _deg,
      8 * _deg,
      -6 * _deg,
      5 * _deg,
      0.0,
    ],
  );
  return _Frame(rot: rot);
}

// drop: one-shot easeOutBack-ish from translateY -80% scale 0.6 opacity 0
// to translateY 0 scale 1 opacity 1, with overshoot at 60% (8% / 1.1).
// Caller passes the raw 0..1 progress; we apply easeOutBack here.
_Frame _dropFrame(double t) {
  // Web keyframes: 0% (-80% / 0.6 / 0), 60% (8% / 1.1 / 1), 80% (-4% / 0.96),
  // 100% (0 / 1). Match those stops directly with linear segments — the
  // cubic-bezier(0.34, 1.56, 0.64, 1) feel comes mostly from the overshoot
  // waypoint at 60%, not the per-segment curve, so a piecewise-linear
  // approximation is visually indistinguishable for ~700ms.
  final ty = _lerpStops(
    t,
    const [0.0, 0.6, 0.8, 1.0],
    const [-0.80, 0.08, -0.04, 0.0],
  );
  final scale = _lerpStops(
    t,
    const [0.0, 0.6, 0.8, 1.0],
    const [0.6, 1.1, 0.96, 1.0],
  );
  final opacity = _lerpStops(
    t,
    const [0.0, 0.6, 1.0],
    const [0.0, 1.0, 1.0],
  );
  return _Frame(ty: ty, scale: scale, opacity: opacity);
}

// wave: rotation about bottom-right.
// 0/60/100 → 0, 10/30/50 → -22, 20/40 → 18.
_Frame _waveFrame(double t) {
  final rot = _lerpStops(
    t,
    const [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1.0],
    const [
      0.0,
      -22 * _deg,
      18 * _deg,
      -22 * _deg,
      18 * _deg,
      -22 * _deg,
      0.0,
      0.0,
    ],
  );
  return _Frame(rot: rot);
}

// heartBeat: scale 1 / 1.22 / 1.0 / 1.18 / 1 at 0/14/28/42/70/100.
_Frame _heartBeatFrame(double t) {
  final scale = _lerpStops(
    t,
    const [0.0, 0.14, 0.28, 0.42, 0.70, 1.0],
    const [1.0, 1.22, 1.0, 1.18, 1.0, 1.0],
  );
  return _Frame(scale: scale);
}

// dance: translateY 0 → -8% → 0 → -6% → 0 and rotate -6 → 6 → -4 → 8 → -6.
_Frame _danceFrame(double t) {
  final ty = _lerpStops(
    t,
    const [0.0, 0.25, 0.5, 0.75, 1.0],
    const [0.0, -0.08, 0.0, -0.06, 0.0],
  );
  final rot = _lerpStops(
    t,
    const [0.0, 0.25, 0.5, 0.75, 1.0],
    const [-6 * _deg, 6 * _deg, -4 * _deg, 8 * _deg, -6 * _deg],
  );
  return _Frame(ty: ty, rot: rot);
}

// party: rotate -8 / 10 / -6 / 8 / -8 and scale 1 / 1.18 / 0.92 / 1.12 / 1.
_Frame _partyFrame(double t) {
  final rot = _lerpStops(
    t,
    const [0.0, 0.25, 0.5, 0.75, 1.0],
    const [-8 * _deg, 10 * _deg, -6 * _deg, 8 * _deg, -8 * _deg],
  );
  final scale = _lerpStops(
    t,
    const [0.0, 0.25, 0.5, 0.75, 1.0],
    const [1.0, 1.18, 0.92, 1.12, 1.0],
  );
  return _Frame(rot: rot, scale: scale);
}

// ─── Tap-burst ────────────────────────────────────────────────────────
// 8 dots radiating outward to radius = emojiSize * 1.4, matching the
// `r = size * 1.4` constant on the web.

class _BurstDot {
  final double angle; // radians
  final Color color;
  const _BurstDot({required this.angle, required this.color});
}

const _burstColors = <Color>[
  Color(0xFF15803D), // emerald
  Color(0xFFA3E635), // lime
  Color(0xFFFACC15), // amber
  Color(0xFFF472B6), // pink
  Color(0xFF60A5FA), // sky
  Color(0xFFFB923C), // orange
];

List<_BurstDot> _generateBurstDots(double size) {
  return List.generate(8, (i) {
    final angle = (i / 8.0) * math.pi * 2;
    return _BurstDot(
      angle: angle,
      color: _burstColors[i % _burstColors.length],
    );
  });
}

class _BurstPainter extends CustomPainter {
  final double progress; // 0..1
  final List<_BurstDot> dots;
  final double emojiSize;

  _BurstPainter({
    required this.progress,
    required this.dots,
    required this.emojiSize,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    // cubic-bezier(0.16, 1, 0.3, 1) is an aggressive ease-out; approximate
    // with `1 - (1 - t)^3` so dots leap out then settle.
    final eased = 1 - math.pow(1 - progress, 3).toDouble();
    final radius = emojiSize * 1.4 * eased;
    // CSS animation goes opacity 0 → 1 (at 20%) → 0; approximate.
    double opacity;
    if (progress < 0.2) {
      opacity = progress / 0.2;
    } else {
      opacity = 1.0 - ((progress - 0.2) / 0.8);
    }
    opacity = opacity.clamp(0.0, 1.0);
    // Scale from 0.4 → 0.6 over the burst (matches web keyframes).
    final dotScale = 0.4 + (0.2 * progress);
    final dotR = 3.0 * dotScale;

    for (final d in dots) {
      final dx = math.cos(d.angle) * radius;
      final dy = math.sin(d.angle) * radius;
      final paint = Paint()
        ..color = d.color.withValues(alpha: opacity)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(cx + dx, cy + dy), dotR, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _BurstPainter old) =>
      old.progress != progress ||
      old.dots != dots ||
      old.emojiSize != emojiSize;
}
