// Animated primitives library — the tasteful, reusable building blocks
// every GetGuac screen reaches for to feel alive. Designed to layer ON
// TOP of existing layouts without refactoring them.
//
// Curves
// ------
// - Curves.easeOutCubic        — entries (fade-in, slide-up)
// - Curves.easeInOutCubic      — transforms (size, color)
// - Curves.easeOutBack         — pops (button-press release, success-pop)
//
// Respect for reduced-motion: callers can wrap in MediaQuery.maybeOf
// and pass `enabled: false` to bail out if needed. Defaults are short
// (160-420ms) so they read as polish, not delay.

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ============================================================
// FadeUpStagger
// ------------------------------------------------------------
// Wraps a list of children in a staggered fade+translateY entrance.
// Each child waits `delay` * index ms before tweening 0->1 opacity
// and 8->0 translateY over `duration`. Matches the web's
// StaggeredFadeIn behavior (40ms stagger, cap at ~8-12 items so a
// long list doesn't feel slow).
// ============================================================
class FadeUpStagger extends StatefulWidget {
  final List<Widget> children;
  final Duration itemDuration;
  final Duration stagger;
  final int staggerCap; // after this index, all items share the cap delay
  final double translateY;
  final Axis axis; // vertical (Column) or horizontal (Row) layouts
  final CrossAxisAlignment crossAxisAlignment;
  final MainAxisAlignment mainAxisAlignment;
  final MainAxisSize mainAxisSize;

  const FadeUpStagger({
    super.key,
    required this.children,
    this.itemDuration = const Duration(milliseconds: 360),
    this.stagger = const Duration(milliseconds: 40),
    this.staggerCap = 8,
    this.translateY = 8,
    this.axis = Axis.vertical,
    this.crossAxisAlignment = CrossAxisAlignment.stretch,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.mainAxisSize = MainAxisSize.min,
  });

  @override
  State<FadeUpStagger> createState() => _FadeUpStaggerState();
}

class _FadeUpStaggerState extends State<FadeUpStagger> {
  @override
  Widget build(BuildContext context) {
    final wrapped = <Widget>[];
    for (var i = 0; i < widget.children.length; i++) {
      final capped = math.min(i, widget.staggerCap);
      final delay = widget.stagger * capped;
      wrapped.add(_StaggerItem(
        delay: delay,
        duration: widget.itemDuration,
        translateY: widget.translateY,
        child: widget.children[i],
      ));
    }
    if (widget.axis == Axis.horizontal) {
      return Row(
        crossAxisAlignment: widget.crossAxisAlignment,
        mainAxisAlignment: widget.mainAxisAlignment,
        mainAxisSize: widget.mainAxisSize,
        children: wrapped,
      );
    }
    return Column(
      crossAxisAlignment: widget.crossAxisAlignment,
      mainAxisAlignment: widget.mainAxisAlignment,
      mainAxisSize: widget.mainAxisSize,
      children: wrapped,
    );
  }
}

class _StaggerItem extends StatefulWidget {
  final Duration delay;
  final Duration duration;
  final double translateY;
  final Widget child;
  const _StaggerItem({
    required this.delay,
    required this.duration,
    required this.translateY,
    required this.child,
  });
  @override
  State<_StaggerItem> createState() => _StaggerItemState();
}

class _StaggerItemState extends State<_StaggerItem>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration);
    _t = Timer(widget.delay, () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() {
    _t?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, child) {
        final eased = Curves.easeOutCubic.transform(_c.value);
        return Opacity(
          opacity: eased,
          child: Transform.translate(
            offset: Offset(0, (1 - eased) * widget.translateY),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

// ============================================================
// CountUp
// ------------------------------------------------------------
// Tweens from the previous value to the current value over
// `duration`, formatting via the provided `formatter`. Use for
// GuacScore, GuacMoney totals, smash days, headline dollar
// figures. Mirrors the web's <CountUp /> primitive.
// ============================================================
class CountUp extends StatefulWidget {
  final double value;
  final Duration duration;
  final String Function(double) formatter;
  final TextStyle? style;
  final TextAlign? textAlign;
  final Curve curve;
  final int? maxLines;

  const CountUp({
    super.key,
    required this.value,
    this.duration = const Duration(milliseconds: 420),
    required this.formatter,
    this.style,
    this.textAlign,
    this.curve = Curves.easeOutCubic,
    this.maxLines,
  });

  @override
  State<CountUp> createState() => _CountUpState();
}

class _CountUpState extends State<CountUp> {
  late double _from;
  late double _to;

  @override
  void initState() {
    super.initState();
    // Start AT the current value — NOT 0. In a scrolling ListView the tiles
    // are recycled, so a new State is created every time one scrolls back into
    // view; resetting to 0 replayed the 0->value count-up each time, which made
    // the dashboard "shake"/jump while scrolling. Real value changes still
    // animate via didUpdateWidget below.
    _from = widget.value;
    _to = widget.value;
  }

  @override
  void didUpdateWidget(covariant CountUp old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) {
      _from = old.value;
      _to = widget.value;
    }
  }

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: _from, end: _to),
      duration: widget.duration,
      curve: widget.curve,
      builder: (ctx, v, _) => Text(
        widget.formatter(v),
        style: widget.style,
        textAlign: widget.textAlign,
        maxLines: widget.maxLines,
        overflow: widget.maxLines != null ? TextOverflow.ellipsis : null,
      ),
    );
  }
}

// ============================================================
// TapScale
// ------------------------------------------------------------
// Wraps any tappable widget in an InkWell + scale-down on press.
// Mirrors iOS / Material You "feels alive" button microinteraction.
// Default scale 0.96, easeOutCubic, 120ms in / 160ms out.
// ============================================================
class TapScale extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double pressedScale;
  final BorderRadius borderRadius;
  final Duration duration;
  final HitTestBehavior behavior;
  final bool haptic;

  const TapScale({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.pressedScale = 0.96,
    this.borderRadius = const BorderRadius.all(Radius.circular(12)),
    this.duration = const Duration(milliseconds: 140),
    this.behavior = HitTestBehavior.opaque,
    this.haptic = true,
  });

  @override
  State<TapScale> createState() => _TapScaleState();
}

class _TapScaleState extends State<TapScale> {
  bool _pressed = false;

  void _set(bool v) {
    if (_pressed != v && mounted) setState(() => _pressed = v);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: widget.behavior,
      onTapDown: widget.onTap == null && widget.onLongPress == null
          ? null
          : (_) => _set(true),
      onTapCancel: () => _set(false),
      onTapUp: (_) => _set(false),
      onTap: widget.onTap == null
          ? null
          : () {
              if (widget.haptic) HapticFeedback.selectionClick();
              widget.onTap!();
            },
      onLongPress: widget.onLongPress,
      child: AnimatedScale(
        scale: _pressed ? widget.pressedScale : 1.0,
        duration: widget.duration,
        curve: Curves.easeOutCubic,
        child: widget.child,
      ),
    );
  }
}

// ============================================================
// ShimmerBox
// ------------------------------------------------------------
// Subtle gradient sweep loading skeleton. Matches the layout of
// whatever you'd otherwise show — a card, a chip, a row. Don't
// use animate-spin everywhere; a shimmer block reads as
// "content loading" not "system thinking".
// ============================================================
class ShimmerBox extends StatefulWidget {
  final double? width;
  final double height;
  final double radius;
  final EdgeInsetsGeometry? margin;
  final Color? baseColor;
  final Color? highlightColor;

  const ShimmerBox({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 8,
    this.margin,
    this.baseColor,
    this.highlightColor,
  });

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = widget.baseColor ?? const Color(0xFFE5E7EB);
    final highlight = widget.highlightColor ?? const Color(0xFFF3F4F6);
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, _) {
        final t = _c.value;
        return Container(
          width: widget.width,
          height: widget.height,
          margin: widget.margin,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            gradient: LinearGradient(
              begin: Alignment(-1.0 + t * 2, 0),
              end: Alignment(1.0 + t * 2, 0),
              colors: [base, highlight, base],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        );
      },
    );
  }
}

// ============================================================
// SlideInFromBottom
// ------------------------------------------------------------
// Sheet / modal entrance — slides up 24px and fades over 320ms.
// Good for bottom sheets, action sheets, the connection setup
// modal. Plays once on mount.
// ============================================================
class SlideInFromBottom extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Duration delay;
  final double offset;

  const SlideInFromBottom({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 320),
    this.delay = Duration.zero,
    this.offset = 24,
  });

  @override
  State<SlideInFromBottom> createState() => _SlideInFromBottomState();
}

class _SlideInFromBottomState extends State<SlideInFromBottom>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration);
    if (widget.delay == Duration.zero) {
      _c.forward();
    } else {
      _t = Timer(widget.delay, () {
        if (mounted) _c.forward();
      });
    }
  }

  @override
  void dispose() {
    _t?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, child) {
        final eased = Curves.easeOutCubic.transform(_c.value);
        return Opacity(
          opacity: eased,
          child: Transform.translate(
            offset: Offset(0, (1 - eased) * widget.offset),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

// ============================================================
// PulseRing
// ------------------------------------------------------------
// Soft animated halo for "needs attention" CTAs (e.g. an unread
// notification badge, an unverified action). Uses an expanding
// box-shadow style ring via CustomPaint.
// ============================================================
class PulseRing extends StatefulWidget {
  final Widget child;
  final Color color;
  final double maxRadius;
  final Duration duration;
  final bool enabled;

  const PulseRing({
    super.key,
    required this.child,
    this.color = const Color(0xFF15803d),
    this.maxRadius = 14,
    this.duration = const Duration(milliseconds: 1600),
    this.enabled = true,
  });

  @override
  State<PulseRing> createState() => _PulseRingState();
}

class _PulseRingState extends State<PulseRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration);
    if (widget.enabled) _c.repeat();
  }

  @override
  void didUpdateWidget(covariant PulseRing old) {
    super.didUpdateWidget(old);
    if (widget.enabled != old.enabled) {
      if (widget.enabled) {
        _c.repeat();
      } else {
        _c.stop();
        _c.value = 0;
      }
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) return widget.child;
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, child) {
        final t = Curves.easeOut.transform(_c.value);
        return CustomPaint(
          painter: _PulseRingPainter(
            progress: t,
            color: widget.color,
            maxRadius: widget.maxRadius,
          ),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _PulseRingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double maxRadius;
  _PulseRingPainter({
    required this.progress,
    required this.color,
    required this.maxRadius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final r = maxRadius * progress;
    final alpha = (1 - progress).clamp(0.0, 1.0) * 0.4;
    final paint = Paint()
      ..color = color.withValues(alpha: alpha)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final rect = Rect.fromLTWH(-r, -r, size.width + r * 2, size.height + r * 2);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(12 + r)),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _PulseRingPainter old) =>
      old.progress != progress || old.color != color;
}

// ============================================================
// SuccessPop
// ------------------------------------------------------------
// Drop-in overlay that scales a checkmark on top of any widget
// when `trigger` increments. Use on save-success or rating
// confirmation. 480ms total: 280ms pop, 200ms hold, then fade.
// ============================================================
class SuccessPop extends StatefulWidget {
  final Widget child;
  final int trigger;
  final Color color;
  final double size;
  final VoidCallback? onComplete;

  const SuccessPop({
    super.key,
    required this.child,
    required this.trigger,
    this.color = const Color(0xFF15803d),
    this.size = 28,
    this.onComplete,
  });

  @override
  State<SuccessPop> createState() => _SuccessPopState();
}

class _SuccessPopState extends State<SuccessPop>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 720),
    );
    _c.addStatusListener((s) {
      if (s == AnimationStatus.completed) widget.onComplete?.call();
    });
  }

  @override
  void didUpdateWidget(covariant SuccessPop old) {
    super.didUpdateWidget(old);
    if (widget.trigger != old.trigger) {
      _c.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        widget.child,
        IgnorePointer(
          child: AnimatedBuilder(
            animation: _c,
            builder: (ctx, _) {
              if (_c.value == 0) return const SizedBox.shrink();
              // 0 -> 0.45: pop in (easeOutBack scale 0 -> 1)
              // 0.45 -> 0.65: hold
              // 0.65 -> 1.0: fade out
              double scale;
              double opacity;
              final p = _c.value;
              if (p < 0.45) {
                final t = p / 0.45;
                scale = Curves.easeOutBack.transform(t);
                opacity = t.clamp(0.0, 1.0);
              } else if (p < 0.65) {
                scale = 1.0;
                opacity = 1.0;
              } else {
                final t = (p - 0.65) / 0.35;
                scale = 1.0;
                opacity = (1 - t).clamp(0.0, 1.0);
              }
              return Opacity(
                opacity: opacity,
                child: Transform.scale(
                  scale: scale,
                  child: Container(
                    width: widget.size,
                    height: widget.size,
                    decoration: BoxDecoration(
                      color: widget.color,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: widget.color.withValues(alpha: 0.35),
                          blurRadius: 12,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: widget.size * 0.7,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ============================================================
// ShakeOnError
// ------------------------------------------------------------
// Wiggle the child horizontally when `trigger` changes. Use on
// form validation errors or denied actions. 360ms, 3 oscillations
// of ±6px, eased so the last shake decays.
// ============================================================
class ShakeOnError extends StatefulWidget {
  final Widget child;
  final int trigger;
  final double amplitude;

  const ShakeOnError({
    super.key,
    required this.child,
    required this.trigger,
    this.amplitude = 6,
  });

  @override
  State<ShakeOnError> createState() => _ShakeOnErrorState();
}

class _ShakeOnErrorState extends State<ShakeOnError>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 360),
    );
  }

  @override
  void didUpdateWidget(covariant ShakeOnError old) {
    super.didUpdateWidget(old);
    if (widget.trigger != old.trigger && widget.trigger > 0) {
      _c.forward(from: 0);
      HapticFeedback.lightImpact();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, child) {
        if (_c.value == 0) return child!;
        // 3 oscillations decaying linearly to 0.
        final decay = 1 - _c.value;
        final dx = math.sin(_c.value * math.pi * 6) * widget.amplitude * decay;
        return Transform.translate(offset: Offset(dx, 0), child: child);
      },
      child: widget.child,
    );
  }
}

// ============================================================
// FadeUpOnMount
// ------------------------------------------------------------
// Per-item fade + translateY entrance for use inside virtualized
// builders (ListView.builder, SliverList) where wrapping in
// FadeUpStagger isn't possible because each row mounts on demand.
// Pass a per-row delay (e.g. capped to the first 8 indices) so
// late-rendering rows don't get an artificial gate.
// ============================================================
class FadeUpOnMount extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final Duration duration;
  final double translateY;
  const FadeUpOnMount({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 360),
    this.translateY = 8,
  });

  @override
  State<FadeUpOnMount> createState() => _FadeUpOnMountState();
}

class _FadeUpOnMountState extends State<FadeUpOnMount>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: widget.duration);
    if (widget.delay == Duration.zero) {
      _c.forward();
    } else {
      _t = Timer(widget.delay, () { if (mounted) _c.forward(); });
    }
  }

  @override
  void dispose() {
    _t?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, child) {
        final eased = Curves.easeOutCubic.transform(_c.value);
        return Opacity(
          opacity: eased,
          child: Transform.translate(
            offset: Offset(0, (1 - eased) * widget.translateY),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

// ============================================================
// AnimatedCrossFadeKey
// ------------------------------------------------------------
// Thin helper around AnimatedSwitcher that does a 180ms cross-fade
// when the child's key changes. Used for tab/view-mode switches
// where the layout swaps but should feel fluid, not a flash.
// ============================================================
class AnimatedCrossFadeKey extends StatelessWidget {
  final Widget child;
  final Duration duration;

  const AnimatedCrossFadeKey({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 180),
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: duration,
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (c, anim) => FadeTransition(opacity: anim, child: c),
      child: child,
    );
  }
}
