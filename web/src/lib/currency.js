// Currency SYMBOL only.
//
// 🔴 SCOPE — this changes the symbol in front of a number and nothing else.
// No conversion, no exchange rates, no VAT/tax logic, no tax-authority
// anything. A receipt scanned in Italy for €47.30 is stored as 47.30 and
// shown as €47.30, because the number never was dollars. Nothing needs
// converting because nothing is being converted.
//
// ⚠️ CSV EXPORT DELIBERATELY HAS NO SYMBOL. lib/tax-summary.js writes raw
// numbers, which is correct — a file going to an accountant or into tax
// software must not carry "$" in a numeric column. Do not "fix" that.
//
// ── HOW THIS AVOIDS A HYDRATION MISMATCH ──────────────────────────────────
// A first attempt read navigator.language directly inside render. That put
// '$' in the server HTML and '€' in the client HTML, and React threw #418,
// #423 and #425 on every non-US locale — verified against production, which
// had zero. React then discards the server markup and re-renders, which is
// exactly what the page-speed work earlier was trying to avoid.
//
// The rule that keeps this safe: `cur()` returns the SAME value on the server
// and on the client's FIRST render. It only changes after mount, via
// useCurrencySymbol(), which is a state update React expects.
//
// 🔒 Never call detectCurrency() directly inside a render path.

const REGION_TO_CURRENCY = {
  US: 'USD', PR: 'USD', GU: 'USD', VI: 'USD',
  GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  IN: 'INR', JP: 'JPY', CN: 'CNY', KR: 'KRW',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP',
  AE: 'AED', SA: 'SAR', IL: 'ILS', TR: 'TRY',
  SG: 'SGD', HK: 'HKD', MY: 'MYR', TH: 'THB', PH: 'PHP', ID: 'IDR', VN: 'VND',
  RU: 'RUB', UA: 'UAH',
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR',
  DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR',
  LU: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR',
  ES: 'EUR', HR: 'EUR',
}

// Unlisted codes render as "PLN " etc. Ugly, never wrong — and wrong is the
// only unacceptable outcome for a number someone is trying to trust.
const SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', INR: '₹',
  CAD: 'CA$', AUD: 'A$', NZD: 'NZ$', HKD: 'HK$', SGD: 'S$',
  KRW: '₩', ILS: '₪', TRY: '₺', RUB: '₽', UAH: '₴', VND: '₫',
  BRL: 'R$', MXN: 'MX$', ZAR: 'R', NGN: '₦', PHP: '₱', THB: '฿',
  CHF: 'CHF ', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ', PLN: 'zł ', CZK: 'Kč ',
}

export const DEFAULT_CURRENCY = 'USD'
export const DEFAULT_SYMBOL = '$'

export function currencyForRegion(region) {
  if (!region) return DEFAULT_CURRENCY
  return REGION_TO_CURRENCY[String(region).toUpperCase()] || DEFAULT_CURRENCY
}

export function symbolFor(code = DEFAULT_CURRENCY) {
  return SYMBOLS[code] || `${code} `
}

// Read the viewer's region from the browser. CLIENT ONLY, and never during
// the first render — see the hydration note above.
export function detectCurrency() {
  try {
    if (typeof navigator === 'undefined') return DEFAULT_CURRENCY
    const tag = navigator.language || (navigator.languages || [])[0]
    if (!tag) return DEFAULT_CURRENCY
    let region
    try { region = new Intl.Locale(tag).region } catch { region = tag.split('-')[1] }
    return currencyForRegion(region)
  } catch {
    return DEFAULT_CURRENCY
  }
}
