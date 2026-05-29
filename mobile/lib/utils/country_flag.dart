// Map a 2-letter ISO country code → flag emoji. Mirrors the web
// `lib/countryFlag.js`. Used to render a small flag chip in the
// mobile dashboard header so US users see 🇺🇸 and Indian users
// see 🇮🇳 — lightweight precursor to real i18n.
//
// The flag emoji is built from the country code's two letters mapped
// to their Regional Indicator Symbol equivalents (U+1F1E6 + offset).
// Every valid 2-letter ISO code renders correctly without a lookup
// table on systems with emoji support.

import 'dart:ui' as ui;

/// Returns the flag emoji for an ISO-3166 alpha-2 code (case-insensitive),
/// or null when the input isn't a valid 2-letter code.
String? flagForCountry(String? code) {
  if (code == null || code.length != 2) return null;
  final upper = code.toUpperCase();
  if (!RegExp(r'^[A-Z]{2}$').hasMatch(upper)) return null;
  // Regional Indicator Symbol Letter A = U+1F1E6 (127462). The offset
  // from ASCII 'A' (65) is 127397.
  const base = 127397;
  final c1 = String.fromCharCode(base + upper.codeUnitAt(0));
  final c2 = String.fromCharCode(base + upper.codeUnitAt(1));
  return c1 + c2;
}

/// Country-name lookup for the codes we expect to see often. Falls back
/// to the code itself (uppercased) for anything else.
const _names = <String, String>{
  'US': 'United States',
  'IN': 'India',
  'CA': 'Canada',
  'GB': 'United Kingdom',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'JP': 'Japan',
  'CN': 'China',
  'MX': 'Mexico',
  'BR': 'Brazil',
  'SG': 'Singapore',
};

String countryName(String? code) {
  if (code == null || code.isEmpty) return '';
  return _names[code.toUpperCase()] ?? code.toUpperCase();
}

/// Best-effort device country detection. Reads the platform locale set
/// by the OS (Settings → Language & Region on iOS, similar on Android).
/// Returns null when no locale country is available.
String? detectDeviceCountry() {
  final locale = ui.PlatformDispatcher.instance.locale;
  return locale.countryCode;
}
