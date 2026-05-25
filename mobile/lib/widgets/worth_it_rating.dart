// 1-5 star "Worth It?" rating widget. Compact enough for receipt lines,
// pretty enough for the receipt header. Tap a star to set the rating;
// tap the active star again to clear.
import 'package:flutter/material.dart';

class WorthItRating extends StatelessWidget {
  final int? value;            // current rating (1-5 or null)
  final ValueChanged<int?> onChanged;
  final double size;           // star size in logical px
  final bool showLabel;        // show the descriptor underneath
  final EdgeInsets padding;
  const WorthItRating({
    super.key,
    required this.value,
    required this.onChanged,
    this.size = 22,
    this.showLabel = false,
    this.padding = EdgeInsets.zero,
  });

  static const _labels = {
    1: 'Regret',
    2: 'Meh',
    3: 'Fine',
    4: 'Nice',
    5: 'Worth it',
  };

  // Colour scale 1 (rose) → 5 (emerald). Empty stars use a neutral grey.
  static Color _starColor(int idx, int? selected) {
    if (selected == null || idx > selected) return const Color(0xFFd1d5db);
    switch (selected) {
      case 1: return const Color(0xFFdc2626);  // rose
      case 2: return const Color(0xFFea580c);  // orange
      case 3: return const Color(0xFFca8a04);  // amber
      case 4: return const Color(0xFF65a30d);  // lime
      case 5: return const Color(0xFF15803d);  // emerald
    }
    return const Color(0xFF9ca3af);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Row(mainAxisSize: MainAxisSize.min, children: List.generate(5, (i) {
          final star = i + 1;
          final active = value != null && star <= value!;
          return GestureDetector(
            // Tap active star again = clear; otherwise set
            onTap: () => onChanged(value == star ? null : star),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Icon(
                active ? Icons.star : Icons.star_outline,
                size: size,
                color: _starColor(star, value),
              ),
            ),
          );
        })),
        if (showLabel && value != null) ...[
          const SizedBox(height: 2),
          Text(
            _labels[value] ?? '',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: _starColor(value!, value),
            ),
          ),
        ],
      ]),
    );
  }
}
