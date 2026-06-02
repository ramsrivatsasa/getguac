import 'package:flutter/material.dart';

/// Fetch-style item card — pale tinted background, big thumbnail
/// on the left, title + subtitle + store badge in the middle, and
/// a top-right urgency pill (e.g. "533 left") with a bottom row
/// of heart + social count + value coin. Mirrors the design the
/// user shared and the existing web ItemRowCard.
///
/// Required: title.
/// Optional everything else — degrades gracefully when surfaces
/// don't have a particular field (e.g. Stash items have no
/// urgency/social/value data so those slots disappear).

class FetchCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? imageEmoji;
  final String? imageUrl;
  final Color tint;
  // Top-right urgency pill — pink "533 left", amber "Ending soon", etc.
  final String? urgency;
  final Color urgencyBg;
  final Color urgencyFg;
  // Store badge — pill rendering the brand/store name (e.g. "Walmart").
  final String? storeName;
  final Color? storeColor;
  final String? storeEmoji;
  // Bottom-right value chip — coin + amount.
  final num? value;
  final String valueLabel;       // 'pts', '$', etc.
  // Bottom-left engagement — heart (toggleable) + small social count
  // (faces avatar isn't doable without images so we render initials).
  final String? socialCount;
  final bool saved;
  final VoidCallback? onToggleSave;
  final VoidCallback? onTap;
  final VoidCallback? onShare;
  // Trailing ⋮ menu — shown after the share button when set. Used by
  // Stash to open the per-item action sheet (rate / on-hand / etc).
  final VoidCallback? onMenu;
  // Inline 5-star rating row rendered between subtitle and bottom
  // engagement row. `rating` is the current value (0–5, 0 = unrated);
  // tap a star to call `onRate(n)`. Self-hides when onRate is null.
  final int rating;
  final void Function(int)? onRate;

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
    this.socialCount,
    this.saved = false,
    this.onToggleSave,
    this.onTap,
    this.onShare,
    this.onMenu,
    this.rating = 0,
    this.onRate,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          decoration: BoxDecoration(
            color: tint,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
          ),
          padding: const EdgeInsets.fromLTRB(10, 10, 12, 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            // Top row — image + content + urgency
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Image tile
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 3)],
                ),
                alignment: Alignment.center,
                child: imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(imageUrl!,
                        width: 56, height: 56, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Text(imageEmoji ?? '📦', style: const TextStyle(fontSize: 26)),
                      ),
                    )
                  : Text(imageEmoji ?? '📦', style: const TextStyle(fontSize: 26)),
              ),
              const SizedBox(width: 12),
              // Title + subtitle + store badge
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                if (urgency != null) Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: urgencyBg, borderRadius: BorderRadius.circular(8)),
                  child: Text(urgency!, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: urgencyFg)),
                ),
                Text(title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF111827), height: 1.15),
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!,
                    style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600),
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (storeName != null) ...[
                  const SizedBox(height: 5),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: storeColor ?? const Color(0xFF0071ce),  // Walmart blue default
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      if (storeEmoji != null) ...[
                        Text(storeEmoji!, style: const TextStyle(fontSize: 10)),
                        const SizedBox(width: 3),
                      ],
                      Text(storeName!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white)),
                    ]),
                  ),
                ],
              ])),
            ]),
            if (onRate != null) ...[
              const SizedBox(height: 6),
              Row(children: [
                for (var n = 1; n <= 5; n++)
                  InkWell(
                    onTap: () => onRate!(n),
                    borderRadius: BorderRadius.circular(14),
                    child: Padding(
                      padding: const EdgeInsets.all(2),
                      child: Icon(
                        n <= rating ? Icons.star : Icons.star_outline,
                        size: 16,
                        color: n <= rating ? const Color(0xFFf59e0b) : Colors.black26,
                      ),
                    ),
                  ),
                const SizedBox(width: 6),
                Text(
                  rating == 0 ? 'Worth it?' : '$rating/5',
                  style: TextStyle(
                    fontSize: 10, fontWeight: FontWeight.w800,
                    color: rating == 0 ? Colors.black45 : const Color(0xFFb45309),
                  ),
                ),
              ]),
            ],
            // Divider so the engagement row reads as a section break
            const SizedBox(height: 8),
            // Bottom row — heart, social, share, value coin
            Row(children: [
              if (onToggleSave != null) ...[
                InkWell(
                  onTap: onToggleSave,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      saved ? Icons.favorite : Icons.favorite_border,
                      size: 18,
                      color: saved ? const Color(0xFFec4899) : Colors.black54,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              if (socialCount != null) Text(socialCount!,
                style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
              const Spacer(),
              if (onShare != null) ...[
                InkWell(
                  onTap: onShare,
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.share_outlined, size: 16, color: Colors.black45),
                  ),
                ),
                const SizedBox(width: 4),
              ],
              if (onMenu != null) ...[
                InkWell(
                  onTap: onMenu,
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.more_horiz, size: 18, color: Colors.black45),
                  ),
                ),
                const SizedBox(width: 4),
              ],
              if (value != null) Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFfde68a)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Text('🪙', style: TextStyle(fontSize: 11)),
                  const SizedBox(width: 3),
                  Text(_fmt(value!),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF78350f))),
                  if (valueLabel.isNotEmpty) ...[
                    const SizedBox(width: 2),
                    Text(valueLabel,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFb45309))),
                  ],
                ]),
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  static String _fmt(num n) {
    final v = n.abs();
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(v % 1000 == 0 ? 0 : 1)}k';
    if (v == v.roundToDouble()) return v.toInt().toString();
    return v.toStringAsFixed(2);
  }
}
