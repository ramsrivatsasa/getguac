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

  @override
  void initState() {
    super.initState();
    _scaleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );
    _rotCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 360),
    );
    _idleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4000),
    );
    _confettiCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
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
    _scaleAnim = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 1.18).chain(
          CurveTween(curve: Curves.easeOutBack),
        ),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.18, end: 0.95).chain(
          CurveTween(curve: Curves.easeIn),
        ),
        weight: 25,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.95, end: 1.0).chain(
          CurveTween(curve: Curves.easeOut),
        ),
        weight: 25,
      ),
    ]).animate(_scaleCtrl);
    _scaleCtrl.duration = const Duration(milliseconds: 420);
    _scaleCtrl.forward();
  }

  void _playWiggle() {
    _rotCtrl.stop();
    _rotCtrl.value = 0;
    const deg = math.pi / 180;
    _rotAnim = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: -8.0 * deg).chain(
          CurveTween(curve: Curves.easeOut),
        ),
        weight: 1,
      ),
      TweenSequenceItem(
        tween: Tween(begin: -8.0 * deg, end: 8.0 * deg).chain(
          CurveTween(curve: Curves.easeInOut),
        ),
        weight: 2,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 8.0 * deg, end: 0.0).chain(
          CurveTween(curve: Curves.easeIn),
        ),
        weight: 1,
      ),
    ]).animate(_rotCtrl);
    _rotCtrl.forward();
  }

  void _playPulse() {
    _scaleCtrl.stop();
    _scaleCtrl.value = 0;
    // Two breaths, 1.0 -> 1.06 -> 1.0 -> 1.06 -> 1.0 over ~800ms.
    _scaleAnim = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.06).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.06, end: 1.0).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.06).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.06, end: 1.0).chain(CurveTween(curve: Curves.easeInOut)), weight: 1),
    ]).animate(_scaleCtrl);
    _scaleCtrl.duration = const Duration(milliseconds: 800);
    _scaleCtrl.forward();
  }

  void _playConfetti() {
    _confettiCtrl.stop();
    _dots = List.generate(12, (_) {
      // Random angle in the upper hemisphere so dots burst outward
      // from the mascot rather than drifting straight down.
      final angle = -math.pi / 2 + (_rand.nextDouble() - 0.5) * math.pi * 1.4;
      final speed = 60 + _rand.nextDouble() * 60;
      return _ConfettiDot(
        angle: angle,
        speed: speed,
        color: _confettiColors[_rand.nextInt(_confettiColors.length)],
        size: 5 + _rand.nextDouble() * 3,
        rotation: _rand.nextDouble() * math.pi,
        rotationVel: (_rand.nextDouble() - 0.5) * 4,
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
        final eventScale = _scaleCtrl.isAnimating || _scaleCtrl.value != 0
            ? _scaleAnim.value
            : 1.0;
        final idleScale = widget.idle ? _idleAnim.value : 1.0;
        final scale = eventScale * idleScale;
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
              Transform.scale(
                scale: scale,
                child: Transform.rotate(
                  angle: rot,
                  child: GuacMascot(mood: widget.mood, size: widget.size),
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
      final dy = math.sin(d.angle) * dist + (progress * progress * 28);
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
