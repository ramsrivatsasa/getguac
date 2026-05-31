// Mobile mirror of the web /preview/discover sample. Static mock data,
// no DB queries — purely so we can evaluate whether the Fetch-style
// Discover layout fits on mobile before changing any production screen.
//
// Visual maps 1:1 to the web preview:
//   1. Header strip (Discover + Play chip + GuacMoney chip)
//   2. Search bar with saved-Steals heart counter
//   3. Big emerald hero with Get Started CTA + 3 peeking tiles
//   4. 3-up quest carousel
//   5. For-you section header + 3-up ProductCard row

import 'package:flutter/material.dart';

const _kBrand = Color(0xFF15803d);
const _kBrandDk = Color(0xFF064e3b);

class DiscoverPreviewScreen extends StatelessWidget {
  const DiscoverPreviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      appBar: AppBar(
        title: const Text('Discover (preview)'),
        backgroundColor: Colors.white,
        foregroundColor: _kBrandDk,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // Disclaimer banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFfef3c7),
                border: Border.all(color: const Color(0xFFfde68a)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Preview only — static mock data, no impact on the live app.',
                style: TextStyle(fontSize: 12, color: Color(0xFF78350f)),
              ),
            ),
            const SizedBox(height: 16),

            // 1. Header strip
            Row(children: [
              const Text('Discover',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Color(0xFF111827))),
              const Spacer(),
              _Chip(
                background: Colors.white,
                border: const Color(0xFFe5e7eb),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.videogame_asset, size: 14, color: Color(0xFF7c3aed)),
                  const SizedBox(width: 6),
                  const Text('Play', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                ]),
              ),
              const SizedBox(width: 8),
              _Chip(
                background: const Color(0xFFfef3c7),
                border: const Color(0xFFfde68a),
                child: const Text('🥑 \$100',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF78350f))),
              ),
            ]),
            const SizedBox(height: 14),

            // 2. Search bar
            Row(children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFe5e7eb)),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Row(children: [
                    Icon(Icons.search, size: 16, color: _kBrand),
                    SizedBox(width: 8),
                    Text('Find your next save…',
                      style: TextStyle(fontSize: 14, color: Color(0xFF9ca3af))),
                  ]),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFfecaca), width: 2),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.favorite, size: 14, color: Color(0xFFef4444)),
                  SizedBox(width: 6),
                  Text('0', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFef4444))),
                ]),
              ),
            ]),
            const SizedBox(height: 16),

            // 3. Emerald hero with Get Started + 3 peeking tiles
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [Color(0xFF10b981), Color(0xFF059669), Color(0xFF047857)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
              ),
              child: Column(children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
                  child: Row(children: [
                    const Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Start earning',
                          style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1)),
                        SizedBox(height: 4),
                        Text('Quick GuacMoney wins 🥑',
                          style: TextStyle(fontSize: 13, color: Color(0xFFd1fae5))),
                      ]),
                    ),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF047857),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 2,
                      ),
                      child: const Text('Get started', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                    ),
                  ]),
                ),
                // Peeking tiles row — half-height so they slot under the quest cards
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
                  child: Row(children: [
                    Expanded(child: _PeekingTile(bg: Color(0xFFfce7f3), emoji: '💖')),
                    SizedBox(width: 12),
                    Expanded(child: _PeekingTile(bg: Color(0xFFfed7aa), emoji: '🔥')),
                    SizedBox(width: 12),
                    Expanded(child: _PeekingTile(bg: Color(0xFFdcfce7), emoji: '📸')),
                  ].cast<Widget>()),
                ),
              ]),
            ),

            // 4. Quest carousel — sits on top of the peeking tiles (negative top margin)
            Transform.translate(
              offset: const Offset(0, -36),
              child: const Row(children: [
                Expanded(child: _QuestCard(reward: 5, title: 'Connect a store', subtitle: 'Auto-import receipts', progress: 0)),
                SizedBox(width: 10),
                Expanded(child: _QuestCard(reward: 2, title: 'Save 5 Steals', subtitle: 'Heart 5 deals', progress: 0.2)),
                SizedBox(width: 10),
                Expanded(child: _QuestCard(reward: 3, title: 'Hit 3 Smash days', subtitle: '3 receipts in a row', progress: 0.66)),
              ]),
            ),

            // 5. For you section
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: const [
              Text('For you',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF111827))),
              Spacer(),
              Text('See more',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: _kBrand)),
            ]),
            const SizedBox(height: 10),
            const Row(children: [
              Expanded(child: _ProductCard(tint: Color(0xFFfef3c7), emoji: '☕', title: 'Costco K-Cups', subtitle: 'last bought 18d ago', guacMoney: 4, saved: true, social: '12k')),
              SizedBox(width: 10),
              Expanded(child: _ProductCard(tint: Color(0xFFdbeafe), emoji: '🧴', title: 'Charmin Ultra Soft', subtitle: 'due for restock', guacMoney: 2, saved: false, social: '48k')),
              SizedBox(width: 10),
              Expanded(child: _ProductCard(tint: Color(0xFFfce7f3), emoji: '🍷', title: "Trader Joe's Cab", subtitle: 'usually \$7', guacMoney: 3, saved: false, social: '2.1k')),
            ]),

            const SizedBox(height: 24),

            // 6. Popular at Costco — vertical list of horizontal row cards
            //    matching the Fetch "Popular at Walmart" pattern.
            const Row(children: [
              Icon(Icons.arrow_back, size: 18, color: Color(0xFF374151)),
              SizedBox(width: 8),
              Text('Popular at Costco',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF111827))),
            ]),
            const SizedBox(height: 10),
            const _RowCard(tint: Color(0xFFe0f2fe), emoji: '🥨', urgency: 'Buy 2', urgencyTone: 'violet',
              title: 'Smartfood Popcorn', subtitle: 'Select varieties', social: '67k', progress: 0.3, guacMoney: 15),
            const SizedBox(height: 10),
            const _RowCard(tint: Color(0xFFfef3c7), emoji: '🪒', urgency: '533 left', urgencyTone: 'rose',
              title: 'Bic Soleil 3 Razors at Costco', subtitle: '4 count', social: '22k', guacMoney: 10, brandBadge: '🏪'),
            const SizedBox(height: 10),
            const _RowCard(tint: Color(0xFFd1fae5), emoji: '💊',
              title: 'Bactine First Aid Essentials', subtitle: 'Select varieties', social: '48k', guacMoney: 10),
            const SizedBox(height: 10),
            const _RowCard(tint: Color(0xFFfef9c3), emoji: '🥚',
              title: "Eggland's Best Eggs", subtitle: 'Dozen large', social: '165k', guacMoney: 0.6),
          ]),
        ),
      ),
    );
  }
}

class _RowCard extends StatelessWidget {
  final Color tint;
  final String emoji;
  final String? urgency;
  final String urgencyTone;
  final String title;
  final String subtitle;
  final String social;
  final double? progress;
  final double guacMoney;
  final String? brandBadge;
  const _RowCard({
    required this.tint, required this.emoji, this.urgency, this.urgencyTone = 'violet',
    required this.title, required this.subtitle, required this.social, this.progress,
    required this.guacMoney, this.brandBadge,
  });
  @override
  Widget build(BuildContext context) {
    final urgencyBg = urgencyTone == 'rose' ? const Color(0xFFfee2e2) : const Color(0xFFede9fe);
    final urgencyFg = urgencyTone == 'rose' ? const Color(0xFFb91c1c) : const Color(0xFF6d28d9);
    final urgencyBorder = urgencyTone == 'rose' ? const Color(0xFFfecaca) : const Color(0xFFddd6fe);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFf3f4f6)),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Row(children: [
        // Left thumbnail
        Stack(clipBehavior: Clip.none, children: [
          Container(
            width: 110, height: 110,
            decoration: BoxDecoration(
              color: tint,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(18), bottomLeft: Radius.circular(18)),
            ),
            alignment: Alignment.center,
            child: Text(emoji, style: const TextStyle(fontSize: 48)),
          ),
          if (brandBadge != null)
            Positioned(
              right: -10, bottom: -8,
              child: Container(
                width: 34, height: 34,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563eb),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 4, offset: Offset(0, 1))],
                ),
                alignment: Alignment.center,
                child: Text(brandBadge!, style: const TextStyle(fontSize: 14, color: Colors.white)),
              ),
            ),
        ]),
        // Right content
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              if (urgency != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: urgencyBg, borderRadius: BorderRadius.circular(999), border: Border.all(color: urgencyBorder)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    if (urgencyTone == 'rose') const Text('⚡', style: TextStyle(fontSize: 10)),
                    if (urgencyTone == 'rose') const SizedBox(width: 2),
                    Text(urgency!.toUpperCase(),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: urgencyFg, letterSpacing: 0.5)),
                  ]),
                ),
              const SizedBox(height: 4),
              Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF111827), height: 1.1)),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF6b7280))),
              const SizedBox(height: 8),
              Row(children: [
                Container(
                  width: 26, height: 26,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFe5e7eb)),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Icon(Icons.favorite_border, size: 13, color: Color(0xFF9ca3af)),
                ),
                const SizedBox(width: 6),
                Text(social,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF6b7280))),
                if (progress != null) ...[
                  const SizedBox(width: 8),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 5,
                        backgroundColor: const Color(0xFFf3f4f6),
                        color: const Color(0xFF10b981),
                      ),
                    ),
                  ),
                ] else
                  const Spacer(),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFFd1fae5), borderRadius: BorderRadius.circular(999)),
                  child: Text(
                    guacMoney < 1 ? '🥑 \$${guacMoney.toStringAsFixed(2)}' : '🥑 \$${guacMoney.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF065f46)),
                  ),
                ),
              ]),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _Chip extends StatelessWidget {
  final Widget child;
  final Color background;
  final Color border;
  const _Chip({required this.child, required this.background, required this.border});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(999),
      ),
      child: child,
    );
  }
}

class _PeekingTile extends StatelessWidget {
  final Color bg;
  final String emoji;
  const _PeekingTile({required this.bg, required this.emoji});
  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        ),
        alignment: Alignment.center,
        child: Text(emoji, style: const TextStyle(fontSize: 38)),
      ),
    );
  }
}

class _QuestCard extends StatelessWidget {
  final int reward;
  final String title;
  final String subtitle;
  final double progress;
  const _QuestCard({required this.reward, required this.title, required this.subtitle, required this.progress});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFf3f4f6)),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFFd1fae5), borderRadius: BorderRadius.circular(999)),
            child: Text('🥑 \$$reward',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF065f46))),
          ),
          const Spacer(),
          const Icon(Icons.favorite_border, size: 14, color: Color(0xFF9ca3af)),
        ]),
        const SizedBox(height: 6),
        Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF111827), height: 1.15)),
        const SizedBox(height: 2),
        Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF6b7280), height: 1.15)),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 4,
            backgroundColor: const Color(0xFFf3f4f6),
            color: const Color(0xFF10b981),
          ),
        ),
      ]),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Color tint;
  final String emoji;
  final String title;
  final String subtitle;
  final int guacMoney;
  final bool saved;
  final String social;
  const _ProductCard({
    required this.tint, required this.emoji, required this.title, required this.subtitle,
    required this.guacMoney, required this.saved, required this.social,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFf3f4f6)),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 6, offset: Offset(0, 1))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        AspectRatio(
          aspectRatio: 1,
          child: Container(
            decoration: BoxDecoration(
              color: tint,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            alignment: Alignment.center,
            child: Text(emoji, style: const TextStyle(fontSize: 40)),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF111827), height: 1.15),
              maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(subtitle,
              style: const TextStyle(fontSize: 10, color: Color(0xFF6b7280)),
              maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Row(children: [
              Container(
                width: 22, height: 22,
                decoration: BoxDecoration(
                  color: saved ? const Color(0xFFfee2e2) : Colors.white,
                  border: Border.all(color: saved ? const Color(0xFFfecaca) : const Color(0xFFe5e7eb)),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Icon(
                  saved ? Icons.favorite : Icons.favorite_border,
                  size: 11,
                  color: saved ? const Color(0xFFef4444) : const Color(0xFF9ca3af),
                ),
              ),
              const SizedBox(width: 4),
              Text(social, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF6b7280))),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFd1fae5), borderRadius: BorderRadius.circular(999)),
                child: Text('🥑 \$$guacMoney',
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFF065f46))),
              ),
            ]),
          ]),
        ),
      ]),
    );
  }
}
