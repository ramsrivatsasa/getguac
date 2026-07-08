import 'package:flutter/material.dart';
import '../theme/gg_design.dart';

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

  // Top-right value chip — coin + amount. Lives at the top of the
  // card so it's the first thing the eye lands on, paired with the
  // title rather than buried in the utility row.
  final num? value;
  final String valueLabel;   // '', 'pts', '$', etc. (prefix or suffix)
  final bool valueIsPrefix;  // true → "$ 42", false → "42 $"
  // Purchase-frequency label rendered directly below the value chip
  // (e.g. "Every 2 weeks", "Monthly"). Generated centrally via
  // stash_engine.dart#formatPurchaseFrequency so both web + mobile
  // produce identical wording for the same input. Optional — when
  // omitted, the slot collapses and the title can use the full
  // vertical run.
  final String? frequency;

  // Compact rating chips — tap to set, long-press for the picker.
  // `rating` is the user's PERSONAL rating (0–5; 0 = unrated). Render
  // as a single ★N pill; long-press opens a 5-star bottom sheet for
  // adjustment. `communityRating` is the AGGREGATE (e.g. avg across
  // all the user's buys of this item or — eventually — across other
  // users); rendered as a second pill with optional social count.
  final int rating;
  final void Function(int)? onRate;
  final double? communityRating;
  final num? communityRatingCount;

  // Bottom-left engagement — heart toggle. When `loveCount` is set,
  // the heart shows "♥ N" using the central formatLikeCount helper
  // so web + mobile word counts identically. `likedByMe` controls
  // whether the heart renders filled.
  final bool saved;
  final VoidCallback? onToggleSave;
  final num? loveCount;       // total users who liked (null = hide count)
  final bool likedByMe;       // fill the heart with pink when true
  final VoidCallback? onToggleLove;

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
    this.frequency,
    this.rating = 0,
    this.onRate,
    this.communityRating,
    this.communityRatingCount,
    this.saved = false,
    this.onToggleSave,
    this.loveCount,
    this.likedByMe = false,
    this.onToggleLove,
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
            // Right column: title-row (title + amount chip) → subtitle →
            // utility row (on-hand pill + rating chips + menu).
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
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: urgencyFg, fontVariations: ggWght(FontWeight.w900))),
                  ]),
                ),
              ),
              // Title row: title left-flex, amount chip top-right
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Text(title,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF0f172a), height: 1.2, fontVariations: ggWght(FontWeight.w800)),
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                )),
                if (value != null) ...[
                  const SizedBox(width: 8),
                  // Column so the frequency label can sit directly
                  // under the value chip, right-aligned with it.
                  Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      Container(
                        width: 20, height: 20,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            colors: [Color(0xFFfbbf24), Color(0xFFf59e0b)],
                            begin: Alignment.topLeft, end: Alignment.bottomRight,
                          ),
                        ),
                        child: const Icon(Icons.star, size: 12, color: Colors.white),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        valueIsPrefix ? '$valueLabel${_fmt(value!)}' : '${_fmt(value!)}$valueLabel',
                        style: ggAmount(size: 14, weight: FontWeight.w900, color: const Color(0xFF0f172a)),
                      ),
                    ]),
                    if (frequency != null && frequency!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(frequency!,
                        style: TextStyle(fontSize: 10, color: const Color(0xFF64748b), fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700)),
                      ),
                    ],
                  ]),
                ],
              ]),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(subtitle!,
                  style: TextStyle(fontSize: 11.5, color: const Color(0xFF64748b), fontWeight: FontWeight.w500, height: 1.3, fontVariations: ggWght(FontWeight.w500)),
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                ),
              ],
              // Utility row: on-hand pill (left) + rating chips + menu
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
                        style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w900, fontVariations: ggWght(FontWeight.w900))),
                    ),
                    const SizedBox(width: 5),
                    Flexible(child: Text(storeName!,
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: const Color(0xFF334155), fontVariations: ggWght(FontWeight.w800)),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    )),
                  ]),
                )),
                const Spacer(),
                // Personal rating chip — single star + number. Tap or
                // long-press opens a 5-star bottom-sheet picker.
                if (onRate != null) _RatingChip(
                  value: rating > 0 ? rating.toDouble() : null,
                  tone: const Color(0xFFf59e0b),
                  emptyLabel: 'Rate',
                  onTap: () => _openRatingPicker(context, current: rating),
                  isPersonal: true,
                ),
                // Community / aggregate rating chip — non-tappable.
                // Only renders when communityRating is set.
                if (communityRating != null) ...[
                  const SizedBox(width: 6),
                  _RatingChip(
                    value: communityRating,
                    tone: const Color(0xFF6366f1),
                    countSuffix: communityRatingCount,
                    isPersonal: false,
                  ),
                ],
                // Love chip — heart icon + count of users who liked
                // this product. Renders when loveCount is set OR
                // onToggleLove is wired. Falls back to a plain heart
                // for surfaces that just want save/unsave (no count).
                if (onToggleLove != null || loveCount != null) ...[
                  const SizedBox(width: 6),
                  InkResponse(
                    onTap: onToggleLove,
                    radius: 18,
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(
                        likedByMe ? Icons.favorite : Icons.favorite_border,
                        size: 16,
                        color: likedByMe ? const Color(0xFFec4899) : const Color(0xFF94a3b8),
                      ),
                      if (loveCount != null && loveCount! > 0) ...[
                        const SizedBox(width: 3),
                        Text(_fmt(loveCount!),
                          style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w800,
                            color: const Color(0xFF64748b),
                            fontVariations: ggWght(FontWeight.w800),
                          ),
                        ),
                      ],
                    ]),
                  ),
                ] else if (onToggleSave != null) ...[
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
                  // Bigger icon + a padded hit area (was size 18 / radius 14 —
                  // too small to tap reliably) and a darker tone so it reads.
                  InkResponse(
                    onTap: onMenu,
                    radius: 24,
                    child: const Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(Icons.more_vert, size: 22, color: Color(0xFF475569)),
                    ),
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

  /// Modal 5-star picker — opens from the personal-rating chip. The
  /// user taps the star they want and the sheet closes. The selected
  /// rating is dispatched via `onRate`. Long-press on the chip is
  /// wired to this same picker so users discover it either way.
  void _openRatingPicker(BuildContext context, {required int current}) {
    if (onRate == null) return;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _RatingPickerSheet(
        title: title,
        current: current,
        onPick: (n) {
          Navigator.of(ctx).pop();
          onRate!(n);
        },
      ),
    );
  }
}

/// Compact star+number rating chip. Used twice on each card —
/// once for the user's personal rating (tap to set, long-press to
/// open the picker), once for the community/aggregate rating (read-
/// only, with optional social count).
class _RatingChip extends StatelessWidget {
  final double? value;       // 0..5, null = unrated
  final Color tone;
  final num? countSuffix;    // optional social count, e.g. 22k
  final String? emptyLabel;  // shown when value is null (e.g. "Rate")
  final VoidCallback? onTap;
  final bool isPersonal;     // tighter rounded outline when tappable
  const _RatingChip({
    required this.value,
    required this.tone,
    this.countSuffix,
    this.emptyLabel,
    this.onTap,
    this.isPersonal = false,
  });

  @override
  Widget build(BuildContext context) {
    final unrated = value == null;
    final display = unrated
      ? (emptyLabel ?? '—')
      : (value! == value!.roundToDouble() ? value!.toInt().toString() : value!.toStringAsFixed(1));
    Widget chip = Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: unrated ? Colors.white : tone.withValues(alpha: 0.12),
        border: Border.all(
          color: unrated ? const Color(0xFFe2e8f0) : tone.withValues(alpha: 0.35),
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(
          unrated ? Icons.star_outline : Icons.star,
          size: 12,
          color: unrated ? const Color(0xFF94a3b8) : tone,
        ),
        const SizedBox(width: 3),
        Text(display,
          style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w900,
            color: unrated ? const Color(0xFF64748b) : tone,
            fontVariations: ggWght(FontWeight.w900),
          ),
        ),
        if (countSuffix != null && !unrated) ...[
          const SizedBox(width: 4),
          Text('· ${_fmtCount(countSuffix!)}',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: tone.withValues(alpha: 0.7), fontVariations: ggWght(FontWeight.w700)),
          ),
        ],
      ]),
    );
    if (onTap != null) {
      chip = InkWell(
        onTap: onTap,
        onLongPress: onTap,
        borderRadius: BorderRadius.circular(14),
        child: chip,
      );
    }
    return chip;
  }

  static String _fmtCount(num n) {
    final v = n.abs();
    if (v >= 1000) {
      final k = v / 1000;
      return '${k.toStringAsFixed(k == k.roundToDouble() ? 0 : 1)}k';
    }
    return v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);
  }
}

class _RatingPickerSheet extends StatefulWidget {
  final String title;
  final int current;
  final void Function(int) onPick;
  const _RatingPickerSheet({required this.title, required this.current, required this.onPick});

  @override
  State<_RatingPickerSheet> createState() => _RatingPickerSheetState();
}

class _RatingPickerSheetState extends State<_RatingPickerSheet> {
  late int _hover = widget.current;

  @override
  Widget build(BuildContext context) {
    return SafeArea(child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: Container(
          width: 40, height: 4,
          decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(2)),
        )),
        const SizedBox(height: 16),
        Text('How worth it?',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, fontVariations: ggWght(FontWeight.w900)),
        ),
        const SizedBox(height: 4),
        Text(widget.title,
          style: const TextStyle(fontSize: 13, color: Color(0xFF64748b)),
          maxLines: 2, overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 20),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          for (var n = 1; n <= 5; n++) InkWell(
            onTap: () => widget.onPick(n),
            onHover: (h) { if (h) setState(() => _hover = n); },
            borderRadius: BorderRadius.circular(24),
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Icon(
                n <= _hover ? Icons.star : Icons.star_outline,
                size: 44,
                color: n <= _hover ? const Color(0xFFf59e0b) : const Color(0xFFcbd5e1),
              ),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        Text(_label(_hover),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748b), fontStyle: FontStyle.italic),
        ),
      ]),
    ));
  }

  static String _label(int n) {
    switch (n) {
      case 5: return '⭐ Essential — worth every penny';
      case 4: return '✅ Important — would buy again';
      case 3: return '🙂 OK — nothing special';
      case 2: return '🍿 Splurge — could have skipped';
      case 1: return '🙈 Regret — pure waste';
      default: return 'Tap a star to rate this item';
    }
  }
}
