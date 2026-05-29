// Reusable store-logo avatar. Prefers a real brand favicon resolved
// from `logoUrlForStore`; falls back to the per-list emoji + tone
// color when the image 404s or no domain can be inferred. Same
// behavior as the web `<StoreLogo>` component.

import 'package:flutter/material.dart';
import '../utils/store_logo_url.dart';

class StoreLogo extends StatelessWidget {
  final String? storeName;
  final String fallbackEmoji;
  final double size;
  final Color emojiBg;
  final Color emojiFg;
  final double borderRadius;

  const StoreLogo({
    super.key,
    required this.storeName,
    this.fallbackEmoji = '🛒',
    this.size = 40,
    this.emojiBg = const Color(0xFF10b981),
    this.emojiFg = Colors.white,
    this.borderRadius = 14,
  });

  @override
  Widget build(BuildContext context) {
    final url = logoUrlForStore(storeName);
    if (url == null) return _fallback();
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Container(
        width: size,
        height: size,
        color: Colors.white,
        padding: const EdgeInsets.all(4),
        child: Image.network(
          url,
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _fallback(),
          // Skip placeholder shimmer on small avatars — image is
          // tiny enough that the load is near-instant on most
          // connections.
          loadingBuilder: (ctx, child, progress) =>
            progress == null ? child : _placeholder(),
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: const Color(0xFFf3f4f6),
      borderRadius: BorderRadius.circular(borderRadius),
    ),
  );

  Widget _fallback() => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: emojiBg,
      borderRadius: BorderRadius.circular(borderRadius),
      boxShadow: const [
        BoxShadow(color: Color(0x1A000000), blurRadius: 6, offset: Offset(0, 2)),
      ],
    ),
    child: Center(
      child: Text(
        fallbackEmoji,
        style: TextStyle(fontSize: size * 0.5, color: emojiFg),
      ),
    ),
  );
}
