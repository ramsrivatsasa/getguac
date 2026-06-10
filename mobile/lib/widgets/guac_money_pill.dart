import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/guac_money_service.dart';

/// Fetch-style coin pill showing the GuacMoney balance. The number counts
/// up (animates) each time it builds, so it reads as "increasing". Tap → the
/// GuacMoney screen.
class GuacMoneyPill extends StatelessWidget {
  final int points;
  final bool onDark;     // sitting on the emerald app bar vs a light surface
  final VoidCallback? onTap;
  const GuacMoneyPill({super.key, required this.points, this.onDark = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final textColor = onDark ? Colors.white : const Color(0xFF92400e);
    return InkWell(
      onTap: onTap ?? () => context.push('/guacmoney'),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: onDark ? Colors.white.withValues(alpha: 0.16) : const Color(0xFFfef9c3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: onDark ? Colors.white24 : const Color(0xFFfde047), width: 1),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 18, height: 18,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [Color(0xFFfbbf24), Color(0xFFf59e0b)],
              ),
            ),
            child: const Text('🥑', style: TextStyle(fontSize: 10)),
          ),
          const SizedBox(width: 6),
          TweenAnimationBuilder<int>(
            tween: IntTween(begin: 0, end: points),
            duration: const Duration(milliseconds: 900),
            curve: Curves.easeOutCubic,
            builder: (_, v, __) => Text(
              formatGm(v),
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: textColor, height: 1),
            ),
          ),
        ]),
      ),
    );
  }
}
