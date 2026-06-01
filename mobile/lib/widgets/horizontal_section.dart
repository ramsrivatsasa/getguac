import 'package:flutter/material.dart';

/// Section heading + horizontally-scrolling row of cards. Used on the
/// dashboard to group features (Score & Insights / Shop Smart /
/// Earn / Track) into Fetch-style swipeable rows so the screen
/// becomes a vertical stack of horizontal carousels instead of a
/// dense grid of pills.
class HorizontalSection extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final List<Widget> children;
  final double height;
  final EdgeInsetsGeometry headerPadding;
  final EdgeInsetsGeometry listPadding;

  const HorizontalSection({
    super.key,
    required this.title,
    required this.children,
    this.subtitle,
    this.trailing,
    this.height = 120,
    this.headerPadding = const EdgeInsets.fromLTRB(16, 6, 16, 8),
    this.listPadding = const EdgeInsets.symmetric(horizontal: 16),
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: headerPadding,
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(title,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF111827)),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!,
                        style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
        ),
        SizedBox(
          height: height,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: listPadding,
            itemCount: children.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) => children[i],
          ),
        ),
      ],
    );
  }
}
