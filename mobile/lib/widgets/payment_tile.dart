import 'package:flutter/material.dart';
import '../theme/gg_design.dart';

/// Standard stat tile — gradient-filled icon chip on the left, then
/// label / big bold value / optional delta subtext on the right.
/// Mirrors the web PaymentTile (web/src/components/PaymentTile.jsx)
/// so the dashboard feels identical across web and mobile.
///
/// Decorative backdrop: an 🥑 avocado watermark + optional theme
/// emoji are positioned in the tile corners at low opacity. Web
/// also draws an SVG geometric pattern; mobile skips that to keep
/// the widget tree light. The avocado + theme emoji alone are
/// enough to carry the brand-imprint feel.
class PaymentTile extends StatelessWidget {
  /// Primary glyph rendered inside the gradient chip.
  final String emoji;

  /// Optional theme-relevant emoji painted faintly in a tile corner
  /// (e.g. 💵 for Total Spent, 🛍️ for Purchases). Pair with one of
  /// the kAvocadoPos* / kThemePos* presets below for variety.
  final String? themeEmoji;

  /// Gradient applied to the chip background.
  final LinearGradient chipGradient;

  /// Caption above the value ("Total Spent", "Tax Paid", ...).
  final String label;

  /// Big number ("$6,116.78", "92", ...).
  final String value;

  /// Optional subtext line below the value — used for the
  /// period-over-period delta ("↑ 12% vs prior"). Color is
  /// determined by [deltaGoodWhen].
  final String? deltaLabel;
  final String? deltaArrow;   // '↑' | '↓' | '→' | null
  final DeltaGoodWhen deltaGoodWhen;

  final VoidCallback? onTap;

  /// Avocado watermark position. Bespoke per-tile so no two tiles
  /// share the same composition.
  final WatermarkPos? avocadoPos;
  final WatermarkPos? themePos;

  const PaymentTile({
    super.key,
    required this.emoji,
    required this.chipGradient,
    required this.label,
    required this.value,
    this.themeEmoji,
    this.deltaLabel,
    this.deltaArrow,
    this.deltaGoodWhen = DeltaGoodWhen.neutral,
    this.onTap,
    this.avocadoPos,
    this.themePos,
  });

  Color _deltaColor() {
    final arrow = deltaArrow;
    if (arrow == null || arrow == '→') return Colors.black45;
    if (deltaGoodWhen == DeltaGoodWhen.neutral) return Colors.black45;
    final goingUp = arrow == '↑';
    final good = (deltaGoodWhen == DeltaGoodWhen.up && goingUp) ||
                 (deltaGoodWhen == DeltaGoodWhen.down && !goingUp);
    return good ? const Color(0xFF15803d) : const Color(0xFFb91c1c);
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 220,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFe5e7eb)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
        ),
        child: Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            if (avocadoPos != null) _watermark('🥑', avocadoPos!),
            if (themeEmoji != null && themePos != null) _watermark(themeEmoji!, themePos!),
            Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  gradient: chipGradient,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 6, offset: const Offset(0, 2))],
                ),
                child: Center(child: Text(emoji, style: const TextStyle(fontSize: 22))),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(label,
                      style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600, fontVariations: ggWght(FontWeight.w600)),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(value,
                      style: ggAmount(size: 18, weight: FontWeight.w900, color: const Color(0xFF111827)),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    if (deltaLabel != null && deltaLabel != '—') ...[
                      const SizedBox(height: 2),
                      Text('$deltaLabel vs prior',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700), color: _deltaColor()),
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _watermark(String glyph, WatermarkPos pos) {
    return Positioned(
      top: pos.top, right: pos.right, bottom: pos.bottom, left: pos.left,
      child: IgnorePointer(
        child: Opacity(
          opacity: pos.opacity,
          child: Transform.rotate(
            angle: pos.rotateRad,
            child: Text(glyph, style: TextStyle(fontSize: pos.size, height: 1)),
          ),
        ),
      ),
    );
  }
}

enum DeltaGoodWhen { neutral, up, down }

class WatermarkPos {
  final double? top, right, bottom, left;
  final double size;
  final double rotateRad;
  final double opacity;
  const WatermarkPos({
    this.top, this.right, this.bottom, this.left,
    this.size = 20,
    this.rotateRad = 0,
    this.opacity = 0.15,
  });
}

// ── Standard tile-config presets — mirror the eight web tiles ─────────
// Use these so the gradients, labels, watermark positions match the
// web exactly. Tone keys correspond to web's TONE map.

const _radDeg = 0.017453292519943295;

const kPaymentTileGradients = {
  'red':     LinearGradient(colors: [Color(0xFFef4444), Color(0xFFe11d48)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
  'orange':  LinearGradient(colors: [Color(0xFFf97316), Color(0xFFd97706)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
  'amber':   LinearGradient(colors: [Color(0xFFfbbf24), Color(0xFFf97316)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
  'yellow':  LinearGradient(colors: [Color(0xFFfacc15), Color(0xFFf59e0b)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
  'lime':    LinearGradient(colors: [Color(0xFF84cc16), Color(0xFF059669)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
  'emerald': LinearGradient(colors: [Color(0xFF10b981), Color(0xFF0d9488)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
  'teal':    LinearGradient(colors: [Color(0xFF14b8a6), Color(0xFF059669)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
  'green':   LinearGradient(colors: [Color(0xFF22c55e), Color(0xFF059669)],   begin: Alignment.topLeft, end: Alignment.bottomRight),
};

class PaymentTilePreset {
  final String emoji;
  final String tone;
  final String label;
  final String themeEmoji;
  final WatermarkPos avocadoPos;
  final WatermarkPos themePos;
  const PaymentTilePreset({
    required this.emoji,
    required this.tone,
    required this.label,
    required this.themeEmoji,
    required this.avocadoPos,
    required this.themePos,
  });
}

final kPaymentTilePresets = <String, PaymentTilePreset>{
  'transactions': PaymentTilePreset(
    emoji: '🧾', tone: 'red', label: 'Transactions',
    themeEmoji: '📝',
    avocadoPos: WatermarkPos(top: -4, right: 4, size: 32, rotateRad: -18 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(bottom: 4, left: 60, size: 20, rotateRad: 8 * _radDeg, opacity: 0.28),
  ),
  'totalSpent': PaymentTilePreset(
    emoji: '💸', tone: 'orange', label: 'Total Spent',
    themeEmoji: '💵',
    avocadoPos: WatermarkPos(top: -4, left: 64, size: 30, rotateRad: 14 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(top: 2, right: 4, size: 22, rotateRad: -10 * _radDeg, opacity: 0.28),
  ),
  'taxPaid': PaymentTilePreset(
    emoji: '📈', tone: 'amber', label: 'Tax Paid',
    themeEmoji: '🧮',
    avocadoPos: WatermarkPos(bottom: -4, left: 64, size: 30, rotateRad: -12 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(top: 2, right: 6, size: 20, rotateRad: 6 * _radDeg, opacity: 0.28),
  ),
  'purchases': PaymentTilePreset(
    emoji: '🛒', tone: 'yellow', label: 'Purchases',
    themeEmoji: '🛍️',
    avocadoPos: WatermarkPos(top: -4, left: 58, size: 32, rotateRad: 20 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(top: 2, right: 4, size: 20, rotateRad: -8 * _radDeg, opacity: 0.28),
  ),
  'payments': PaymentTilePreset(
    emoji: '💳', tone: 'lime', label: 'Payments',
    themeEmoji: '💹',
    avocadoPos: WatermarkPos(bottom: -4, right: 6, size: 32, rotateRad: -15 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(top: 2, left: 66, size: 20, rotateRad: 10 * _radDeg, opacity: 0.28),
  ),
  'interestPaid': PaymentTilePreset(
    emoji: '📊', tone: 'emerald', label: 'Interest Paid',
    themeEmoji: '📉',
    avocadoPos: WatermarkPos(bottom: -4, right: 4, size: 30, rotateRad: 18 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(top: 2, right: 4, size: 20, rotateRad: 4 * _radDeg, opacity: 0.28),
  ),
  'feesPaid': PaymentTilePreset(
    emoji: '💰', tone: 'teal', label: 'Fees Paid',
    themeEmoji: '🪙',
    avocadoPos: WatermarkPos(top: -4, left: 60, size: 32, rotateRad: -6 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(top: 2, right: 4, size: 20, rotateRad: 12 * _radDeg, opacity: 0.28),
  ),
  'bankFees': PaymentTilePreset(
    emoji: '🏦', tone: 'green', label: 'Bank Fees',
    themeEmoji: '🏧',
    avocadoPos: WatermarkPos(bottom: -4, left: 66, size: 32, rotateRad: -25 * _radDeg, opacity: 0.22),
    themePos:   WatermarkPos(bottom: 2, right: 4, size: 20, rotateRad: 8 * _radDeg, opacity: 0.28),
  ),
};
