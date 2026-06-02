import 'package:flutter/material.dart';

/// Fetch-style item card — the big image tile carries the category
/// tint, the card itself stays white. Matches the visual rhythm the
/// user shared (Fetch's "Popular at Walmart" feed): a colored image
/// "anchor" on the left, bold title + metadata in the middle, and a
/// quiet utility row at the bottom (rating, value, action menu).
///
/// Required: title.
/// Optional everything else — degrades gracefully when a surface
/// doesn't have a particular field. Stash uses every slot; future
/// "Steals" / "Buy Again" lists will use a subset.

class FetchCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? imageEmoji;
  final String? imageUrl;

  /// Tint applied to the IMAGE tile background (not the card). Card
  /// always renders on white so the colored tile reads as an anchor.
  /// Default mirrors Fetch's pale-yellow Walmart aisle tiles.
  final Color tint;

  // Top-right urgency pill above the title (e.g. "Buy 2", "533 left").
  final String? urgency;
  final Color urgencyBg;
  final Color urgencyFg;

  // Store/category pill below the title.
  final String? storeName;
  final Color? storeColor;
  final String? storeEmoji;

  // Bottom-right value chip — coin + amount.
  final num? value;
  final String valueLabel;   // '', 'pts', '$', etc. (prefix or suffix)
  final bool valueIsPrefix;  // true → "$ 42", false → "42 $"

  // Inline 5-star rating, rendered in the bottom row when onRate is set.
  // `rating` is the current value (0–5; 0 = unrated).
  final int rating;
  final void Function(int)? onRate;

  // Bottom-left engagement — heart toggle (saved/unsaved).
  final bool saved;
  final VoidCallback? onToggleSave;

  // Actions
  final VoidCallback? onTap;
  final VoidCallback? onShare;
  final VoidCallback? onMenu;

  const FetchCard({
    super.key,
    required this.title,
    this.subtitle,
    this.imageEmoji,
    this.imageUrl,
    this.tint = const Color(0xFFfef9c3),       // pale yellow default
    this.urgency,
    this.urgencyBg = const Color(0xFFfecdd3),  // rose-200
    this.urgencyFg = const Color(0xFF9f1239),  // rose-900
    this.storeName,
    this.storeColor,
    this.storeEmoji,
    this.value,
    this.valueLabel = '',
    this.valueIsPrefix = false,
    this.rating = 0,
    this.onRate,
    this.saved = false,
    this.onToggleSave,
    this.onTap,
    this.onShare,
    this.onMenu,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 2)),
            ],
            border: Border.all(color: const Color(0xFFf1f5f9), width: 1),
          ),
          padding: const EdgeInsets.fromLTRB(10, 10, 12, 8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Tinted image tile — visual anchor, big enough to read
            // the emoji but not so big it dominates the row.
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: tint,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: imageUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(imageUrl!,
                      width: 68, height: 68, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Text(imageEmoji ?? '📦', style: const TextStyle(fontSize: 34)),
                    ),
                  )
                : Text(imageEmoji ?? '📦', style: const TextStyle(fontSize: 36)),
            ),
            const SizedBox(width: 12),
            // Right column: badge → title → subtitle → utility row
            // (rating + value + menu). One column avoids the dead
            // space the old vertical separator created when items
            // had no store/category pill to fill the gap.
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              if (urgency != null) Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: urgencyBg,
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    if (urgency!.toLowerCase().contains('left')) ...[
                      Icon(Icons.bolt, size: 10, color: urgencyFg),
                      const SizedBox(width: 1),
                    ],
                    Text(urgency!,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: urgencyFg)),
                  ]),
                ),
              ),
              Text(title,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0f172a), height: 1.2),
                maxLines: 2, overflow: TextOverflow.ellipsis,
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(subtitle!,
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748b), fontWeight: FontWeight.w500, height: 1.3),
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                ),
              ],
              // Utility row tucked right under the subtitle — the
              // store/on-hand pill on the left, rating + value + menu
              // on the right. Single row keeps the card compact.
              const SizedBox(height: 6),
              Row(children: [
                if (storeName != null) Flexible(child: Container(
                  padding: const EdgeInsets.fromLTRB(3, 3, 8, 3),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFe2e8f0)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(
                      width: 16, height: 16,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: storeColor ?? const Color(0xFF6b7280),
                      ),
                      child: Text(storeEmoji ?? '·',
                        style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w900)),
                    ),
                    const SizedBox(width: 5),
                    Flexible(child: Text(storeName!,
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF334155)),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    )),
                  ]),
                )),
                const Spacer(),
                if (onRate != null) ...[
                  for (var n = 1; n <= 5; n++)
                    InkResponse(
                      onTap: () => onRate!(n),
                      radius: 12,
                      child: Icon(
                        n <= rating ? Icons.star : Icons.star_outline,
                        size: 14,
                        color: n <= rating ? const Color(0xFFf59e0b) : const Color(0xFFcbd5e1),
                      ),
                    ),
                ],
                if (value != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    width: 18, height: 18,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [Color(0xFFfbbf24), Color(0xFFf59e0b)],
                        begin: Alignment.topLeft, end: Alignment.bottomRight,
                      ),
                    ),
                    child: const Icon(Icons.star, size: 11, color: Colors.white),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    valueIsPrefix ? '$valueLabel${_fmt(value!)}' : '${_fmt(value!)}$valueLabel',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0f172a)),
                  ),
                ],
                if (onToggleSave != null) ...[
                  const SizedBox(width: 4),
                  InkResponse(
                    onTap: onToggleSave,
                    radius: 14,
                    child: Icon(
                      saved ? Icons.favorite : Icons.favorite_border,
                      size: 16,
                      color: saved ? const Color(0xFFec4899) : const Color(0xFF94a3b8),
                    ),
                  ),
                ],
                if (onShare != null) ...[
                  const SizedBox(width: 4),
                  InkResponse(
                    onTap: onShare,
                    radius: 14,
                    child: const Icon(Icons.share_outlined, size: 15, color: Color(0xFF94a3b8)),
                  ),
                ],
                if (onMenu != null) ...[
                  const SizedBox(width: 2),
                  InkResponse(
                    onTap: onMenu,
                    radius: 14,
                    child: const Icon(Icons.more_horiz, size: 18, color: Color(0xFF94a3b8)),
                  ),
                ],
              ]),
            ])),
          ]),
        ),
      ),
    );
  }

  static String _fmt(num n) {
    final v = n.abs();
    if (v >= 1000) {
      final k = v / 1000;
      return '${k.toStringAsFixed(k == k.roundToDouble() ? 0 : 1)}k';
    }
    if (v == v.roundToDouble()) return v.toInt().toString();
    return v.toStringAsFixed(2);
  }
}
