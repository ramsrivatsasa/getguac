import 'package:flutter/material.dart';

/// Horizontal gradient pill — icon/emoji on the left, title +
/// subtitle stacked in the middle, ← arrow on the right. Used in
/// horizontal-scroll rows on both the Dashboard and the Profile
/// screen so the "drill-in shortcuts" feel consistent across the
/// app. Extracted from the original `_Pill` in profile_screen.dart
/// so both surfaces share one widget.
class FeaturePill extends StatelessWidget {
  final List<Color> gradient;
  final IconData? icon;
  final String? emoji;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const FeaturePill({
    super.key,
    required this.gradient,
    this.icon,
    this.emoji,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(40),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradient),
          borderRadius: BorderRadius.circular(40),
          boxShadow: [BoxShadow(color: gradient.last.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (emoji != null) Text(emoji!, style: const TextStyle(fontSize: 22)),
          if (icon != null) Icon(icon, size: 22, color: Colors.white),
          const SizedBox(width: 8),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14, height: 1.0)),
              const SizedBox(height: 2),
              Text(subtitle,
                style: TextStyle(color: Colors.white.withValues(alpha: 0.92), fontSize: 10, height: 1.0),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ],
          )),
          const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
        ]),
      ),
    );
  }
}
