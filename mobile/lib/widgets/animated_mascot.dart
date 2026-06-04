// Animated wrapper around GuacMascot. Subscribes to the global
// MascotEventBus so any screen can fire bounce / wiggle / pulse /
// celebrate without prop-drilling a controller.
//
// Animations
// ----------
//   bounce    — scale 1.0 → 1.18 → 0.95 → 1.0 over 420ms, easeOutBack.
//               Receipt-saved / connection-active style "yes" moment.
//   wiggle    — rotation −8° / +8° / 0° over 360ms. For Smashlist
//               "Smashed!" — a quick attention-grab without scale.
//   pulse     — scale breathe 1.0 → 1.06 → 1.0 twice (≈800ms total).
//               Soft heartbeat for ambient ack moments.
//   celebrate — combo: bounce + wiggle simultaneously, plus a 12-dot
//               confetti burst from a CustomPainter overlay.
//
// Idle
// ----
// When `idle: true` the widget gently breathes (scale 1.0 → 1.02)
// on a 4-second loop. Designed so the mascot feels alive even when
// nothing's happening — Google-Doodle style.

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/mascot_event_bus.dart';
import 'guac_mascot.dart';

class AnimatedMascot extends StatefulWidget {
  final MascotMood mood;
  final double size;
  final bool idle;
  const AnimatedMascot({
    super.key,
    this.mood = MascotMood.happy,
    this.size = 120,
    this.idle = false,
  });

  @override
  State<AnimatedMascot> createState() => _AnimatedMascotState();
}

class _AnimatedMascotState extends State<AnimatedMascot>
    with TickerProviderStateMixin {
  late final AnimationController _scaleCtrl;
  late final AnimationController _rotCtrl;
  late final AnimationController _idleCtrl;
  late final AnimationController _confettiCtrl;

  late Animation<double> _scaleAnim;
  late Animation<double> _rotAnim;
  late Animation<double> _idleAnim;

  StreamSubscription<MascotEvent>? _sub;
  final _rand = math.Random();
  List<_ConfettiDot> _dots = const [];
  // True while a bounce is the active scale-controller animation —
  // build() reads _bounceFrame() instead of treating _scaleAnim.value
  // as a uniform scale (since bounce uses non-uniform X/Y scaling).
  bool _isBounce = false;

  @override
  void initState() {
    super.initState();
    // Durations bumped per user request — "animations that run for more
    // time". Each ctrl gets a sensible default; per-animation overrides
    // (e.g. wiggle's 1.2s) happen in the play methods below.
    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );
    _rotCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _idleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4000),
    );
    _confettiCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    _scaleAnim = const AlwaysStoppedAnimation(1.0);
    _rotAnim = const AlwaysStoppedAnimation(0.0);
    _idleAnim = Tween<double>(begin: 1.0, end: 1.02).animate(
      CurvedAnimation(parent: _idleCtrl, curve: Curves.easeInOut),
    );

    if (widget.idle) _idleCtrl.repeat(reverse: true);

    _sub = mascotBus.stream.listen(_onEvent);
  }

  @override
  void didUpdateWidget(covariant AnimatedMascot old) {
    super.didUpdateWidget(old);
    if (widget.idle != old.idle) {
      if (widget.idle) {
        _idleCtrl.repeat(reverse: true);
      } else {
        _idleCtrl.stop();
        _idleCtrl.value = 0.0;
      }
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    _scaleCtrl.dispose();
    _rotCtrl.dispose();
    _idleCtrl.dispose();
    _confettiCtrl.dispose();
    super.dispose();
  }

  void _onEvent(MascotEvent ev) {
    if (!mounted) return;
    // Respect OS-level "remove animations" / "reduce motion" toggle.
    // When MediaQuery.disableAnimations is true, every event is a
    // no-op so users with vestibular sensitivities aren't ambushed.
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) return;
    switch (ev.animation) {
      case MascotAnimation.bounce:
        _playBounce();
        break;
      case MascotAnimation.wiggle:
        _playWiggle();
        break;
      case MascotAnimation.pulse:
        _playPulse();
        break;
      case MascotAnimation.celebrate:
        _playBounce();
        _playWiggle();
        _playConfetti();
        break;
    }
  }

  void _playBounce() {
    _scaleCtrl.stop();
    _scaleCtrl.value = 0;
    _isBounce = true;
    // Soft-body squash-and-stretch bounce. We can't do X/Y scale
    // independently with a single Animation<double>, so we drive a
    // unit progress 0→1 and let the build() Transform compose squash
    // (X<Y) and stretch (X>Y) inversely via _bounceFrame. 1200ms
    // matches the web AnimatedMascot.
    _scaleAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _scaleCtrl, curve: Curves.easeInOut),
    );
    _scaleCtrl.duration = const Duration(milliseconds: 1200);
    _scaleCtrl.forward().then((_) { if (mounted) _isBounce = false; });
  }

  // Translate unit progress 0..1 → (scaleX, scaleY, translateY)
  // matching the squash-and-stretch keyframes on web. Six waypoints
  // at offsets 0 / .20 / .45 / .65 / .82 / 1.0.
  static (double, double, double) _bounceFrame(double t) {
    const stops = [0.0, 0.20, 0.45, 0.65, 0.82, 1.0];
    const sx = [1.0, 0.86, 1.16, 0.94, 1.04, 1.0];
    const sy = [1.0, 1.16, 0.86, 1.06, 0.96, 1.0];
    const ty = [0.0, -0.12, -0.04, -0.08, 0.0, 0.0];   // fraction of mascot height
    for (var i = 0; i < stops.length - 1; i++) {
      if (t <= stops[i + 1]) {
        final p = (t - stops[i]) / (stops[i + 1] - stops[i]);
        return (
          sx[i] + (sx[i + 1] - sx[i]) * p,
          sy[i] + (sy[i + 1] - sy[i]) * p,
          ty[i] + (ty[i + 1] - ty[i]) * p,
        );
      }
    }
    return (1.0, 1.0, 0.0);
  }

  void _playWiggle() {
    _rotCtrl.stop();
    _rotCtrl.value = 0;
    const deg = math.pi / 180;
    // Three full back-and-forths over 1.2s — reads as a "happy dance"
    // instead of one flinch.
    _rotAnim = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0,         end: -10.0 * deg).chain(CurveTween(curve: Curves.easeOut)),   weight: 12),
      TweenSequenceItem(tween: Tween(begin: -10.0 * deg, end:  10.0 * deg).chain(CurveTween(curve: Curves.easeInOut)), weight: 18),
      TweenSequenceItem(tween: Tween(begin:  10.0 * deg, end:  -8.0 * deg).chain(CurveTween(curve: Curves.easeInOut)), weight: 20),
      TweenSequenceItem(tween: Tween(begin:  -8.0 * deg, end:   8.0 * deg).chain(CurveTween(curve: Curves.easeInOut)), weight: 20),
      TweenSequenceItem(tween: Tween(begin:   8.0 * deg, end:  -4.0 * deg).chain(CurveTween(curve: Curves.easeInOut)), weight: 16),
      TweenSequenceItem(tween: Tween(begin:  -4.0 * deg, end:   0.0).chain(CurveTween(curve: Curves.easeIn)),          weight: 14),
    ]).animate(_rotCtrl);
    _rotCtrl.duration = const Duration(milliseconds: 1200);
    _rotCtrl.forward();
  }

  void _playPulse() {
    _scaleCtrl.stop();
    _scaleCtrl.value = 0;
    // Three breaths over ~1.8s — softer than bounce, longer than the
    // previous two-beat 800ms so the user actually notices the cue.
    _scaleAnim = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0,  end: 1.08).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.08, end: 1.0 ).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.0,  end: 1.08).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.08, end: 1.0 ).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.0,  end: 1.08).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.08, end: 1.0 ).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
    ]).animate(_scaleCtrl);
    _scaleCtrl.duration = const Duration(milliseconds: 1800);
    _scaleCtrl.forward();
  }

  void _playConfetti() {
    _confettiCtrl.stop();
    // 24 dots (was 12) so the longer 2.4s burst stays visually dense
    // throughout. Faster initial speed + stronger gravity arc handled
    // by the painter so dots visibly fall instead of fading flat.
    _dots = List.generate(24, (_) {
      final angle = -math.pi / 2 + (_rand.nextDouble() - 0.5) * math.pi * 1.4;
      final speed = 90 + _rand.nextDouble() * 90;
      return _ConfettiDot(
        angle: angle,
        speed: speed,
        color: _confettiColors[_rand.nextInt(_confettiColors.length)],
        size: 5 + _rand.nextDouble() * 3,
        rotation: _rand.nextDouble() * math.pi,
        rotationVel: (_rand.nextDouble() - 0.5) * 6,
      );
    });
    _confettiCtrl.value = 0;
    _confettiCtrl.forward();
  }

  static const _confettiColors = <Color>[
    Color(0xFF15803d), // emerald
    Color(0xFFa3e635), // lime
    Color(0xFFfacc15), // amber
    Color(0xFFf472b6), // pink
    Color(0xFF60a5fa), // sky
  ];

  @override
  Widget build(BuildContext context) {
    // Layout footprint matches plain GuacMascot — same width × same
    // visual height ratio — so swapping AnimatedMascot for GuacMascot
    // doesn't reflow tight containers (AppBar rows, list tiles, etc.).
    // The confetti paints OUTSIDE that footprint via OverflowBox so
    // dots can drift past the bounds without clipping or grabbing
    // hit-tests from sibling widgets.
    final mascotW = widget.size;
    final mascotH = widget.size * (280 / 220); // matches GuacMascot
    final overlaySize = widget.size * 2.4;

    return AnimatedBuilder(
      animation: Listenable.merge([_scaleCtrl, _rotCtrl, _idleCtrl, _confettiCtrl]),
      builder: (ctx, _) {
        // Bounce mode: derive (sx, sy, ty) from the unit-progress
        // _scaleAnim via _bounceFrame so we get the squash-and-stretch
        // deformation matching the web side. All other modes (pulse,
        // celebrate-composed) use _scaleAnim.value as a uniform scale.
        double sx, sy;
        double ty = 0;
        if (_isBounce && (_scaleCtrl.isAnimating || _scaleCtrl.value > 0)) {
          final f = _bounceFrame(_scaleAnim.value);
          sx = f.$1; sy = f.$2; ty = f.$3 * mascotH;
        } else {
          final eventScale = _scaleCtrl.isAnimating || _scaleCtrl.value != 0
              ? _scaleAnim.value
              : 1.0;
          sx = sy = eventScale;
        }
        final idleScale = widget.idle ? _idleAnim.value : 1.0;
        sx *= idleScale;
        sy *= idleScale;
        final rot = _rotCtrl.isAnimating || _rotCtrl.value != 0
            ? _rotAnim.value
            : 0.0;

        return SizedBox(
          width: mascotW,
          height: mascotH,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Transform.translate(
                offset: Offset(0, ty),
                child: Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.diagonal3Values(sx, sy, 1),
                  child: Transform.rotate(
                    angle: rot,
                    child: GuacMascot(mood: widget.mood, size: widget.size),
                  ),
                ),
              ),
              if (_confettiCtrl.value > 0)
                Positioned.fill(
                  child: IgnorePointer(
                    child: OverflowBox(
                      maxWidth: overlaySize,
                      maxHeight: overlaySize,
                      child: SizedBox(
                        width: overlaySize,
                        height: overlaySize,
                        child: CustomPaint(
                          size: Size(overlaySize, overlaySize),
                          painter: _ConfettiPainter(
                            progress: _confettiCtrl.value,
                            dots: _dots,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ConfettiDot {
  final double angle;
  final double speed; // logical px per second-equivalent (scaled by progress)
  final Color color;
  final double size;
  final double rotation;
  final double rotationVel;
  const _ConfettiDot({
    required this.angle,
    required this.speed,
    required this.color,
    required this.size,
    required this.rotation,
    required this.rotationVel,
  });
}

class _ConfettiPainter extends CustomPainter {
  final double progress; // 0..1
  final List<_ConfettiDot> dots;
  _ConfettiPainter({required this.progress, required this.dots});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final fade = (1 - progress).clamp(0.0, 1.0);

    for (final d in dots) {
      // Distance grows with progress, but with a slight ease-out so
      // the burst pops fast then slows. Gravity is a small downward
      // drift added at the end of the trajectory.
      final ease = 1 - math.pow(1 - progress, 2.0).toDouble();
      final dist = d.speed * ease;
      final dx = math.cos(d.angle) * dist;
      // Stronger gravity (was 28) so dots visibly fall over the longer
      // 2.4s burst instead of drifting flat off-frame.
      final dy = math.sin(d.angle) * dist + (progress * progress * 80);
      final paint = Paint()
        ..color = d.color.withValues(alpha: fade)
        ..style = PaintingStyle.fill;

      canvas.save();
      canvas.translate(cx + dx, cy + dy);
      canvas.rotate(d.rotation + d.rotationVel * progress);
      // Small rounded rectangle reads as confetti, not pellets.
      final r = d.size;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset.zero, width: r * 1.6, height: r * 0.7),
          Radius.circular(r * 0.35),
        ),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter old) =>
      old.progress != progress || old.dots != dots;
}
