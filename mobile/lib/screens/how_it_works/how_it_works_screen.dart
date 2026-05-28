// "How GetGuac Works" — mobile guided tour, with Guac-AI's voice.
//
// Mirrors the spirit of the web /how-it-works page but adapted to a
// portrait, scroll-first surface. Each section is a card: emoji, title,
// subtitle, 2-3 bullet points, and a line in Guac-AI's voice (italic,
// first-person, never preachy). Tapping the GuacMascot at the top
// scrolls back to the hero.
//
// Voice rules (kept consistent with the web narration):
//   - first person ("I'll catch your duplicates", "I read every line")
//   - specific, never vague ("± 1¢ tolerance" not "smart matching")
//   - warm, no shame, no jargon
//   - end with confidence, not a sales pitch

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/guac_mascot.dart';

const _kEmerald700 = Color(0xFF15803d);
const _kEmerald800 = Color(0xFF166534);
const _kEmerald900 = Color(0xFF064e3b);
const _kEmerald50  = Color(0xFFf0fdf4);

class HowItWorksScreen extends StatelessWidget {
  const HowItWorksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kEmerald50,
      appBar: AppBar(
        title: const Text('How GetGuac Works'),
        backgroundColor: Colors.white,
        foregroundColor: _kEmerald900,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          const _Hero(),
          const SizedBox(height: 20),
          ..._chapters.map((c) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: _ChapterCard(chapter: c),
          )),
          const SizedBox(height: 8),
          const _ClosingCard(),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// HERO
// ──────────────────────────────────────────────────────────────────────────

class _Hero extends StatelessWidget {
  const _Hero();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF84cc16), Color(0xFF15803d), Color(0xFF064e3b)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 6)),
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: const [
          GuacMascot(size: 56),
          SizedBox(width: 12),
          Expanded(child: Text(
            "Hey, I'm Guac-AI.",
            style: TextStyle(
              color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          )),
        ]),
        const SizedBox(height: 14),
        const Text(
          "Your money's wingman.",
          style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, height: 1.1),
        ),
        const SizedBox(height: 10),
        const Text(
          "Snap a receipt, forward an order email, or just let me watch your statements — and I turn the chaos into receipts you can actually search, score, and learn from. No spreadsheets. No shoeboxes. No \"where did all my money go this month?\"",
          style: TextStyle(color: Colors.white, fontSize: 14, height: 1.45),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(999),
          ),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.swipe_down_rounded, color: Colors.white, size: 16),
            SizedBox(width: 6),
            Text('Scroll for the whole flow',
              style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800)),
          ]),
        ),
      ]),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CHAPTER CARDS
// ──────────────────────────────────────────────────────────────────────────

class _Chapter {
  final int step;
  final String emoji;
  final String title;
  final String subtitle;
  final List<_Bullet> bullets;
  final String voice;     // First-person Guac-AI line, italic at the bottom.
  final Color accent;     // Color band on the left of the card.
  const _Chapter({
    required this.step,
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.bullets,
    required this.voice,
    required this.accent,
  });
}

class _Bullet {
  final String label;
  final String body;
  const _Bullet(this.label, this.body);
}

const _chapters = <_Chapter>[
  _Chapter(
    step: 1,
    emoji: '📸',
    title: 'Get a receipt to me',
    subtitle: 'Three ways in. Pick whichever fits the moment.',
    bullets: [
      _Bullet('Camera', 'Tap the camera icon on the Receipts tab. One shot, you keep moving.'),
      _Bullet('Email', 'Forward any e-receipt to your free you@getguac.app inbox. I file it within 10 minutes.'),
      _Bullet('Statement', "Drop a credit-card or bank statement PDF on the web — every line becomes a receipt row."),
    ],
    voice: "Crumpled, faded, folded — bring me the worst your wallet has. I've seen ten thousand of them. I'll figure it out.",
    accent: Color(0xFF22c55e),
  ),
  _Chapter(
    step: 2,
    emoji: '✨',
    title: 'I read every line',
    subtitle: '5–15 seconds. Gemini does the heavy lifting.',
    bullets: [
      _Bullet('Store, date, total', 'Plus tax, payment method, and the last 4 of the card. Even handwritten totals.'),
      _Bullet('Every item', 'Every SKU, qty, and price becomes searchable. "How much on coffee this year?" is a one-tap answer.'),
      _Bullet('Refund policies', "If it's printed, I capture it. If it isn't, I fall back to curated defaults for 25+ major stores."),
    ],
    voice: "Don't worry about glare or skew or that one corner of the receipt that got wet. I prefer it that way — keeps me honest.",
    accent: Color(0xFFca8a04),
  ),
  _Chapter(
    step: 3,
    emoji: '🕵️',
    title: 'I catch duplicates',
    subtitle: 'Capture-time + nightly sweep. Both safety nets.',
    bullets: [
      _Bullet('Same receipt, twice', "Two camera shots of the same dinner won't both land in the table."),
      _Bullet('Camera + email', 'You snap the box, Amazon emails you the order — I notice the match.'),
      _Bullet('Smart normalize', '"GLORY DAYS GRILL" == "Glory Days Grill" == "Glory Days Grill, Inc." == one row. ±1¢ tolerance, so rounding never blocks it.'),
    ],
    voice: "I'd rather merge two real receipts than let one duplicate clutter your year. If I get it wrong, the dedup sweep on the web fixes it in one tap.",
    accent: Color(0xFFf59e0b),
  ),
  _Chapter(
    step: 4,
    emoji: '🏷️',
    title: 'I categorize on the fly',
    subtitle: 'Rules + AI + what you taught me last time.',
    bullets: [
      _Bullet('25 built-in categories', 'Grub, Eats, Drinks, Cloud, Bills, Bank Fees, Pharmacy, Personal Care, Household, and on.'),
      _Bullet('Per-store learning', "Correct IONOS to 'Cloud' three times and I never bother you about IONOS again."),
      _Bullet('Per-item smarts', "A Coke line in a grocery run still gets routed to 'Drinks' even though the receipt is 'Grub'."),
    ],
    voice: "Categorization isn't a chore you do once and forget. It's a conversation. Every time you correct me, I get sharper — only for your account, never shared.",
    accent: Color(0xFF0ea5e9),
  ),
  _Chapter(
    step: 5,
    emoji: '📊',
    title: 'I show you the picture',
    subtitle: 'Dashboard, Reports, and the chart that gets quoted at dinner.',
    bullets: [
      _Bullet('Top stores by dollar', 'Amazon / Amazon Mktp / AMAZON.COM, INC all collapse into one bar. The way they should.'),
      _Bullet('Period slices', '1M, 3M, 6M, 1Y, all-time. Tax separated for business filing.'),
      _Bullet('Repeat purchases', 'Things you buy again and again. Price drift over time. The shampoo that went up 40%.'),
    ],
    voice: "The dashboard is where you finally see the pattern. The pattern you suspected. The pattern that explains last month.",
    accent: Color(0xFF6366f1),
  ),
  _Chapter(
    step: 6,
    emoji: '👍',
    title: 'Worth it?',
    subtitle: 'The hardest question in personal finance, made easy.',
    bullets: [
      _Bullet('5-star Worth-It rating', '2 seconds per receipt. 5 = buy again. 1 = regret it.'),
      _Bullet('GuacScore', 'One number for how well you spend. Climbs as low-rated stuff drops off.'),
      _Bullet('Bank Bite watcher', "Interest, fees, penalties — I tell you which ones were avoidable. No shame, just numbers."),
    ],
    voice: "Most apps tell you what you spent. I'll tell you what you wish you hadn't.",
    accent: Color(0xFFf43f5e),
  ),
  _Chapter(
    step: 7,
    emoji: '🔐',
    title: 'Your data is yours',
    subtitle: 'Row-level security, biometric unlock, one-tap delete.',
    bullets: [
      _Bullet('RLS in Postgres', 'Every row is gated by your auth.uid() in the database itself. Even if app code is bypassed, the DB still refuses.'),
      _Bullet('Biometric unlock', "Fingerprint or Face ID on every cold start. Credentials sit in Keystore/Keychain, never plain-text."),
      _Bullet('Delete anything, any time', 'One receipt, one email, one category, or the entire account. Gone in seconds. No backups of deleted accounts.'),
    ],
    voice: "I'm here to help you spend smarter — not to hoard your data. The Delete Account button works. I checked.",
    accent: Color(0xFF10b981),
  ),
];

class _ChapterCard extends StatelessWidget {
  final _Chapter chapter;
  const _ChapterCard({required this.chapter});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: IntrinsicHeight(
          child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // Left accent stripe + step number
            Container(
              width: 56,
              color: chapter.accent,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(chapter.emoji, style: const TextStyle(fontSize: 28)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text('${chapter.step}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                  ),
                ],
              ),
            ),
            // Body
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(chapter.title,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: _kEmerald900, height: 1.15)),
                  const SizedBox(height: 3),
                  Text(chapter.subtitle,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6b7280))),
                  const SizedBox(height: 10),
                  ...chapter.bullets.map((b) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(fontSize: 13, color: Color(0xFF374151), height: 1.35),
                        children: [
                          const TextSpan(text: '• ', style: TextStyle(fontWeight: FontWeight.w900, color: _kEmerald700)),
                          TextSpan(text: '${b.label}. ',
                            style: const TextStyle(fontWeight: FontWeight.w800, color: _kEmerald900)),
                          TextSpan(text: b.body),
                        ],
                      ),
                    ),
                  )),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                    decoration: BoxDecoration(
                      color: chapter.accent.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: chapter.accent.withValues(alpha: 0.18)),
                    ),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const GuacMascot(size: 22),
                      const SizedBox(width: 8),
                      Expanded(child: Text(
                        chapter.voice,
                        style: TextStyle(
                          fontSize: 12.5, fontStyle: FontStyle.italic, height: 1.35,
                          color: _kEmerald800,
                        ),
                      )),
                    ]),
                  ),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CLOSING
// ──────────────────────────────────────────────────────────────────────────

class _ClosingCard extends StatelessWidget {
  const _ClosingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [Color(0xFF064e3b), Color(0xFF15803d)],
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: const [
          GuacMascot(size: 36),
          SizedBox(width: 10),
          Expanded(child: Text(
            "That's the whole flow.",
            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
          )),
        ]),
        const SizedBox(height: 12),
        const Text(
          "Capture → I read → duplicates collapse → categories assign → dashboard shows you the picture → you decide what was worth it → I keep your data safe.\n\nTap the camera on the Receipts tab when you're ready. I'll take it from there.",
          style: TextStyle(color: Colors.white, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(
            child: FilledButton.icon(
              onPressed: () => context.go('/receipts'),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: _kEmerald900,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              icon: const Icon(Icons.camera_alt, size: 18),
              label: const Text("Let's snap one", style: TextStyle(fontWeight: FontWeight.w900)),
            ),
          ),
        ]),
      ]),
    );
  }
}
