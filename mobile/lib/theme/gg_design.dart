import 'package:flutter/material.dart';

/// Shared "new design" tokens — the clean, airy avocado look from the
/// redesigned getguac.app home page, ported to the native app.
///
/// This is the ONE place the new palette + type system lives so screens stay
/// in sync. Screens should pull colour/surface/shape/typography from here
/// instead of hard-coding values, so the look stays consistent across the app.

// ── Palette (matches web home page) ───────────────────────────────────────
/// Primary brand green — lime-600. Buttons, links, active accents.
const ggLime      = Color(0xFF65A30D);
/// Deeper lime-700 — pressed / emphasis.
const ggLimeDk    = Color(0xFF4D7C0F);
/// lime-500 pop — secondary accent.
const ggAccent    = Color(0xFF84CC16);

/// Headings / primary text — deep forest green.
const ggInk       = Color(0xFF15281C);
/// Body dark.
const ggInk2      = Color(0xFF1A2E22);
/// Secondary text.
const ggMuted     = Color(0xFF56655B);
/// Tertiary / captions.
const ggFaint     = Color(0xFF8A988E);

/// Page canvas — pure white, like the home page.
const ggBg        = Color(0xFFFFFFFF);
/// Soft green-tinted surface — app bar, tinted sections, page backdrop.
const ggBgTint    = Color(0xFFF7FAF2);
/// Light lime chip / badge background.
const ggChipBg    = Color(0xFFF0F7E8);

/// Hairline card border — rgba(20,83,45,0.10).
const ggBorder       = Color(0x1A14532D);
/// Slightly stronger lime border for emphasised cards.
const ggBorderLime   = Color(0x2965A30D);
/// Very soft ambient card shadow.
const ggShadow       = Color(0x14141A14);

// ── Reusable surface helpers ──────────────────────────────────────────────
/// Clean white card: hairline green border + a whisper of shadow. The
/// home page look — separation without heavy Material elevation.
BoxDecoration ggCard({double radius = 20, Color? color, bool lime = false}) {
  return BoxDecoration(
    color: color ?? Colors.white,
    borderRadius: BorderRadius.circular(radius),
    border: Border.all(color: lime ? ggBorderLime : ggBorder),
    boxShadow: const [
      BoxShadow(color: ggShadow, blurRadius: 16, offset: Offset(0, 6)),
    ],
  );
}

/// Pill-shaped filled-button style in the brand lime — the home page CTA.
ButtonStyle ggPillButton({Color bg = ggLime, EdgeInsetsGeometry? padding}) {
  return FilledButton.styleFrom(
    backgroundColor: bg,
    foregroundColor: Colors.white,
    elevation: 0,
    padding: padding ?? const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
    shape: const StadiumBorder(),
    textStyle: TextStyle(
      fontWeight: FontWeight.w700, fontSize: 15, fontVariations: ggWght(FontWeight.w700)),
  );
}

/// Small lime pill/chip decoration (badges, eyebrow labels).
BoxDecoration ggChip() => BoxDecoration(
  color: ggChipBg,
  borderRadius: BorderRadius.circular(999),
  border: Border.all(color: ggBorderLime),
);

// ── Typography (matches the website) ──────────────────────────────────────
// One type system for the whole app: Plus Jakarta Sans for body, Bricolage
// Grotesque for headings + dollar amounts (never mono on amounts). main.dart
// wires [ggTextTheme] into ThemeData so EVERY screen inherits this — the single
// source of truth. Screens should use these helpers instead of ad-hoc
// TextStyle(fontFamily: ...) so fonts stay consistent across the board.

/// Bundled font families (declared in pubspec.yaml → flutter/fonts). Both are
/// VARIABLE fonts exposing a `wght` axis. IMPORTANT: Flutter does NOT reliably
/// move a variable font's `wght` axis from [TextStyle.fontWeight] alone — the
/// axis stays at the file's default instance (~400), so headings render thin no
/// matter what `fontWeight:` you pass. The weight only applies when you also set
/// [TextStyle.fontVariations] with a `wght` axis. So every helper below pairs
/// `fontWeight` with a matching `FontVariation('wght', …)` via [ggWght]; that is
/// what actually makes Bricolage 800 look like 800. Do the same at any ad-hoc
/// call site (or just use these helpers). No runtime download — the fonts are
/// bundled. (The old google_fonts path fetched from fonts.gstatic.com at runtime
/// and silently fell back to the system font when unreachable — which hid the
/// whole type system.)
const kDisplayFont = 'Bricolage Grotesque';
const kBodyFont    = 'Plus Jakarta Sans';

/// The `wght`-axis variation for a [FontWeight], so variable fonts actually
/// render at that weight. FontWeight.w800 → wght 800, w500 → 500, etc.
List<FontVariation> ggWght(FontWeight weight) =>
    [FontVariation('wght', weight.value.toDouble())];

/// Website heading / display font — Bricolage Grotesque.
TextStyle ggHeading({
  required double size,
  FontWeight weight = FontWeight.w800,
  Color color = ggInk,
  double letterSpacing = -0.5,
  double height = 1.08,
}) =>
    TextStyle(
      fontFamily: kDisplayFont,
      fontSize: size, fontWeight: weight, fontVariations: ggWght(weight),
      color: color, letterSpacing: letterSpacing, height: height,
    );

/// Dollar-amount font — Bricolage (never monospace), per the typography spec.
TextStyle ggAmount({
  double size = 18,
  FontWeight weight = FontWeight.w800,
  Color color = ggInk,
}) =>
    TextStyle(
      fontFamily: kDisplayFont,
      fontSize: size, fontWeight: weight, fontVariations: ggWght(weight),
      color: color, letterSpacing: -0.3,
    );

/// Website body font — Plus Jakarta Sans.
TextStyle ggBody({
  double size = 14,
  FontWeight weight = FontWeight.w500,
  Color color = ggMuted,
  double height = 1.45,
}) =>
    TextStyle(
      fontFamily: kBodyFont,
      fontSize: size, fontWeight: weight, fontVariations: ggWght(weight),
      color: color, height: height,
    );

/// The app-wide [TextTheme]: Jakarta body + Bricolage display/headline/title.
/// Wired into ThemeData.textTheme so all inherited text picks up the website
/// fonts without per-screen `fontFamily` overrides.
TextTheme ggTextTheme() {
  // Standard Material text theme, re-fonted to the bundled Jakarta for body.
  final body = Typography.blackMountainView.apply(fontFamily: kBodyFont);
  // Bricolage headings: pair fontWeight with a matching wght variation so the
  // variable font actually renders bold (see [ggWght]). Body styles are left
  // WITHOUT fontVariations on purpose — hundreds of ad-hoc `TextStyle` overrides
  // set fontWeight without variations, and a base variation would win the merge
  // and pin them all to one weight.
  TextStyle head(TextStyle? s, FontWeight w) =>
      (s ?? const TextStyle()).copyWith(
        fontFamily: kDisplayFont, fontWeight: w,
        fontVariations: ggWght(w), letterSpacing: -0.5);
  return body.copyWith(
    displayLarge:   head(body.displayLarge,   FontWeight.w800),
    displayMedium:  head(body.displayMedium,  FontWeight.w800),
    displaySmall:   head(body.displaySmall,   FontWeight.w800),
    headlineLarge:  head(body.headlineLarge,  FontWeight.w800),
    headlineMedium: head(body.headlineMedium, FontWeight.w800),
    headlineSmall:  head(body.headlineSmall,  FontWeight.w700),
    titleLarge:     head(body.titleLarge,     FontWeight.w700),
  );
}
