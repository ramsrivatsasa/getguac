import 'package:flutter/material.dart';

/// Fetch-style feature card — square-ish, gradient-filled, with a
/// large emoji/icon up top and a title + subtitle stack below.
/// Designed to live inside a horizontally-scrolling row
/// (HorizontalSection). Each card uses its own gradient so a row of
/// them reads as varied + colourful, mirroring the web dashboard's
/// vibrant accent feel.
class FeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final LinearGradient gradient;
  final String? emoji;
  final IconData? icon;
  final VoidCallback? onTap;
  final double width;

  const FeatureCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.gradient,
    this.emoji,
    this.icon,
    this.onTap,
    this.width = 150,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          width: width,
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
          child: Stack(
            children: [
              // Avocado watermark — same brand-imprint device used on
              // the web PaymentTile, baked into every feature card at
              // low opacity in the top-right corner.
              Positioned(
                top: -6, right: -2,
                child: Opacity(
                  opacity: 0.18,
                  child: Transform.rotate(
                    angle: -0.3,
                    child: const Text('🥑', style: TextStyle(fontSize: 28)),
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: emoji != null
                      ? Text(emoji!, style: const TextStyle(fontSize: 20))
                      : Icon(icon, size: 20, color: Colors.white),
                  ),
                  const SizedBox(height: 32),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(title,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1),
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(subtitle,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white.withValues(alpha: 0.85)),
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Convenience gradients matching the web PaymentTile brand palette.
const kFeatureGradients = {
  'red':     LinearGradient(colors: [Color(0xFFef4444), Color(0xFFe11d48)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'orange':  LinearGradient(colors: [Color(0xFFf97316), Color(0xFFd97706)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'amber':   LinearGradient(colors: [Color(0xFFfbbf24), Color(0xFFf97316)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'yellow':  LinearGradient(colors: [Color(0xFFfacc15), Color(0xFFca8a04)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'lime':    LinearGradient(colors: [Color(0xFF84cc16), Color(0xFF15803d)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'emerald': LinearGradient(colors: [Color(0xFF10b981), Color(0xFF0d9488)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'teal':    LinearGradient(colors: [Color(0xFF14b8a6), Color(0xFF0e7490)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'violet':  LinearGradient(colors: [Color(0xFF8b5cf6), Color(0xFF6d28d9)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
  'rose':    LinearGradient(colors: [Color(0xFFf472b6), Color(0xFFdb2777)]),
  'pink':    LinearGradient(colors: [Color(0xFFec4899), Color(0xFFbe185d)],  begin: Alignment.topLeft, end: Alignment.bottomRight),
};
