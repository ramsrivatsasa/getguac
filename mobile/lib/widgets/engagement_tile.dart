import 'package:flutter/material.dart';
import '../theme/gg_design.dart';

/// Engagement-strip tile — mirrors the web dashboard's four
/// premium tiles (GuacScore / GuacWizard / GuacMoney / Rewards).
/// Pale per-tone gradient bg + ring, big rounded gradient chip,
/// 3-line content stack (UPPERCASE label · big bold value ·
/// small semibold subtext), 🥑 + theme-emoji watermarks at low
/// opacity for the same brand-imprint feel.

class EngagementTile extends StatelessWidget {
  final String label;            // e.g. "GUACSCORE"
  final String value;            // big bold number / amount
  final String? subtext;         // "saved" / "health score" / etc.
  final IconData? icon;          // chip icon (white over gradient)
  final Widget? iconChild;       // optional custom widget instead of icon
  final LinearGradient bg;       // pale tile background
  final Color ringColor;         // 1px ring matching the bg family
  final LinearGradient chip;     // strong chip gradient
  final Color labelColor;
  final Color valueColor;
  final Color subColor;
  final String? themeEmoji;      // top-right watermark
  final VoidCallback? onTap;
  /// When supplied, replaces the value Text node with the given
  /// widget — used by the dashboard to plug in a CountUp without
  /// every caller having to know about that primitive.
  final Widget? valueOverlay;

  const EngagementTile({
    super.key,
    required this.label,
    required this.value,
    required this.bg,
    required this.ringColor,
    required this.chip,
    required this.labelColor,
    required this.valueColor,
    required this.subColor,
    this.subtext,
    this.icon,
    this.iconChild,
    this.themeEmoji,
    this.onTap,
    this.valueOverlay,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          decoration: BoxDecoration(
            gradient: bg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: ringColor),
          ),
          child: Stack(
            clipBehavior: Clip.hardEdge,
            children: [
              // Brand 🥑 watermark — bottom-right of every tile, low
              // opacity, slightly rotated. Same brand-imprint device
              // the PaymentTile row uses.
              Positioned(
                bottom: -2, right: -2,
                child: Opacity(
                  opacity: 0.18,
                  child: Transform.rotate(
                    angle: -0.3,
                    child: const Text('🥑', style: TextStyle(fontSize: 32)),
                  ),
                ),
              ),
              if (themeEmoji != null)
                Positioned(
                  top: 4, right: 6,
                  child: Opacity(
                    opacity: 0.22,
                    child: Transform.rotate(
                      angle: 0.1,
                      child: Text(themeEmoji!, style: const TextStyle(fontSize: 18)),
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      gradient: chip,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 6, offset: const Offset(0, 2))],
                    ),
                    child: iconChild ?? (icon != null ? Icon(icon, size: 20, color: Colors.white) : null),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(label,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: labelColor, fontVariations: ggWght(FontWeight.w800)),
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        valueOverlay ?? Text(value,
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: valueColor, height: 1.05, fontVariations: ggWght(FontWeight.w900)),
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                        ),
                        if (subtext != null) ...[
                          const SizedBox(height: 2),
                          Text(subtext!,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: subColor, fontVariations: ggWght(FontWeight.w600)),
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Named tone presets so each engagement tile gets its own
/// identity. Mirrors the web palette: GuacScore amber/orange (or
/// grade-tinted), GuacWizard score-band (here: violet baseline /
/// emerald healthy / amber watch / rose urgent), GuacMoney
/// emerald, Rewards rose.
class EngagementTone {
  final LinearGradient bg;
  final Color ring;
  final LinearGradient chip;
  final Color label;
  final Color value;
  final Color sub;
  const EngagementTone({
    required this.bg, required this.ring, required this.chip,
    required this.label, required this.value, required this.sub,
  });
}

const kToneEmerald = EngagementTone(
  bg: LinearGradient(colors: [Color(0xFFecfdf5), Color(0xFFd9f99d)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  ring: Color(0xFFa7f3d0),
  chip: LinearGradient(colors: [Color(0xFF34d399), Color(0xFF65a30d)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  label: Color(0xFF047857), value: Color(0xFF064e3b), sub: Color(0xFF047857),
);
const kToneViolet = EngagementTone(
  bg: LinearGradient(colors: [Color(0xFFf5f3ff), Color(0xFFede9fe)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  ring: Color(0xFFddd6fe),
  chip: LinearGradient(colors: [Color(0xFF8b5cf6), Color(0xFF6d28d9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  label: Color(0xFF6d28d9), value: Color(0xFF4c1d95), sub: Color(0xFF7c3aed),
);
const kToneAmber = EngagementTone(
  bg: LinearGradient(colors: [Color(0xFFfffbeb), Color(0xFFffedd5)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  ring: Color(0xFFfde68a),
  chip: LinearGradient(colors: [Color(0xFFfbbf24), Color(0xFFf97316)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  label: Color(0xFFb45309), value: Color(0xFF7c2d12), sub: Color(0xFFb45309),
);
const kToneRose = EngagementTone(
  bg: LinearGradient(colors: [Color(0xFFfff1f2), Color(0xFFfce7f3)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  ring: Color(0xFFfecdd3),
  chip: LinearGradient(colors: [Color(0xFFf472b6), Color(0xFFdb2777)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  label: Color(0xFFbe123c), value: Color(0xFF881337), sub: Color(0xFFbe123c),
);
const kToneSlate = EngagementTone(
  bg: LinearGradient(colors: [Color(0xFFf8fafc), Color(0xFFf1f5f9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  ring: Color(0xFFe2e8f0),
  chip: LinearGradient(colors: [Color(0xFFcbd5e1), Color(0xFF94a3b8)], begin: Alignment.topLeft, end: Alignment.bottomRight),
  label: Color(0xFF475569), value: Color(0xFF334155), sub: Color(0xFF64748b),
);
