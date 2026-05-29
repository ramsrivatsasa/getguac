// Map a 2-letter ISO country code → flag emoji.
//
// Used to render a small flag chip in the dashboard header so US
// users see 🇺🇸 and Indian users see 🇮🇳 — a lightweight precursor
// to real i18n (currency, locale, region-aware store catalog).
//
// The flag emoji is built from the country code's two letters mapped
// to their Regional Indicator Symbol equivalents (U+1F1E6 + offset).
// Every valid 2-letter ISO code renders correctly without a lookup
// table.

export function flagForCountry(code) {
  if (!code || typeof code !== 'string' || code.length !== 2) return null
  const upper = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return null
  // Regional Indicator Symbol Letter A = U+1F1E6 (127462)
  const base = 127397
  return String.fromCodePoint(base + upper.charCodeAt(0)) +
         String.fromCodePoint(base + upper.charCodeAt(1))
}

// Human-readable name for the most common codes we'll see. Falls
// back to the code itself for anything else.
const NAMES = {
  US: 'United States',
  IN: 'India',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  CN: 'China',
  MX: 'Mexico',
  BR: 'Brazil',
  SG: 'Singapore',
}

export function countryName(code) {
  if (!code) return ''
  return NAMES[code.toUpperCase()] || code.toUpperCase()
}
