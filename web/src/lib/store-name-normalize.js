// Store-name normalization engine.
//
// Receipts come in with the merchant's name written many different ways:
//   "Amazon"  /  "Amazon.com"  /  "AMAZON.COM, INC."  /  "Amazon Prime"
//   "The Home Depot"  /  "Home Depot"  /  "HOMEDEPOT.COM"
//   "Lowe's"  /  "LOWES"  /  "Lowe's Home Improvement"
// If we treat each variant as a different merchant, the stores table fills
// up with near-duplicates and "Spending by Store" charts split a single
// merchant's spend across 5 columns.
//
// Two functions:
//   normalizeStoreName(s)  — comparison key. Lowercase, strip URL/entity
//                            suffixes + punctuation. Two names produce the
//                            same key iff they're the same merchant.
//   canonicalStoreName(s)  — display name. Maps a normalized key to a
//                            pretty form ("amazon" -> "Amazon"). Falls back
//                            to the trimmed original when no alias is known.

// Common-merchant alias table. Key = normalized form, value = display form.
// Add liberally — false positives are very unlikely with these specific brands.
const ALIASES = {
  'amazon':                  'Amazon',
  'amazon prime':            'Amazon',
  'amazon marketplace':      'Amazon',
  'amazon mktplace':         'Amazon',
  'amazon mktp':             'Amazon',
  'amazon services':         'Amazon',
  'amzn mktp':               'Amazon',
  'amzn':                    'Amazon',
  'home depot':              'The Home Depot',
  'homedepot':               'The Home Depot',
  'lowes':                   "Lowe's",
  'lowes home improvement':  "Lowe's",
  'walmart':                 'Walmart',
  'wal mart':                'Walmart',
  'wm supercenter':          'Walmart',
  'target':                  'Target',
  'costco':                  'Costco',
  'costco wholesale':        'Costco',
  'costco whse':             'Costco',
  'costco gas':              'Costco',
  'costco gasoline':         'Costco',
  'costco fuel':             'Costco',
  'costco pharmacy':         'Costco',
  'costco wholesale corp':   'Costco',
  'bjs':                     "BJ's Wholesale",
  'bjs wholesale':           "BJ's Wholesale",
  'bjs wholesale club':      "BJ's Wholesale",
  'sams club':               "Sam's Club",
  'starbucks':               'Starbucks',
  'starbucks coffee':        'Starbucks',
  'taco bell':               'Taco Bell',
  'mcdonalds':               "McDonald's",
  'chipotle':                'Chipotle',
  'chipotle mexican grill':  'Chipotle',
  'cvs':                     'CVS Pharmacy',
  'cvs pharmacy':            'CVS Pharmacy',
  'walgreens':               'Walgreens',
  'usps':                    'USPS',
  'us postal service':       'USPS',
  'fedex':                   'FedEx',
  'ups':                     'UPS',
  'uber':                    'Uber',
  'uber eats':               'Uber Eats',
  'doordash':                'DoorDash',
  'instacart':               'Instacart',
  'netflix':                 'Netflix',
  'spotify':                 'Spotify',
  'apple':                   'Apple',
  'apple com bill':          'Apple',
  'google':                  'Google',
  'google storage':          'Google',
  'microsoft':               'Microsoft',
  'ionos':                   'IONOS',
  '1and1 ionos':             'IONOS',
  '1 and 1 ionos':           'IONOS',
}

/**
 * Produce a comparison key for a store name. Two names yield the SAME key iff
 * they refer to the same merchant. Used for find-or-insert dedup in the
 * stores table and for the /api/stores/merge cleanup endpoint.
 */
export function normalizeStoreName(raw) {
  if (!raw) return ''
  let s = String(raw).trim().toLowerCase()

  // Strip URL TLD suffixes ("amazon.com" -> "amazon")
  s = s.replace(/\.(com|net|org|co|io|us|app)\b/g, '')

  // Strip business-entity suffixes ("amazon.com, inc." -> "amazon",
  // "acme llc" -> "acme")
  s = s.replace(/[,\s]+(inc|llc|ltd|l\.l\.c|corp|company|corporation|holdings|gmbh|s\.a|ag)\.?\s*$/g, '')

  // Drop apostrophes, periods, commas, quotes — they're inconsistent
  // ("Lowe's" vs "Lowes", "St. John" vs "St John").
  s = s.replace(/[.,'`"]/g, '')

  // Hyphens become spaces ("wal-mart" -> "wal mart" -> alias hit)
  s = s.replace(/[-/_]+/g, ' ')

  // Strip leading "the " ("The Home Depot" -> "home depot")
  s = s.replace(/^the\s+/, '')

  // Strip trailing store-number suffixes ("costco #218" -> "costco",
  // "walmart 1234" -> "walmart"). Common on POS-printed names and bank
  // statement merchant strings. Anchored to the end so we don't strip
  // numbers that are part of the brand (e.g. "7-Eleven" / "7 11").
  s = s.replace(/\s+#?\d{2,}\s*$/g, '')

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim()

  return s
}

/**
 * Bucket key for grouping — used by dashboard charts, /stores rollups,
 * any aggregation that should treat "Costco", "Costco Wholesale", and
 * "COSTCO WHSE" as the same merchant.
 *
 * Differs from normalizeStoreName: this returns the LOWERCASED CANONICAL
 * display name when an alias exists, so all variants that resolve to the
 * same display name collapse into one bucket. Falls back to the normalized
 * form when no alias is known.
 */
export function storeGroupKey(raw) {
  const norm = normalizeStoreName(raw)
  if (!norm) return ''
  if (ALIASES[norm]) return ALIASES[norm].toLowerCase()
  return norm
}

/**
 * Two store names refer to the same merchant?
 * Uses normalizeStoreName() — pure exact match on the normalized key. We
 * don't fuzzy-match yet because a wrong merge (e.g. "Target" vs "Target
 * Optical") is much worse than a missed merge.
 */
export function isSameStore(a, b) {
  const na = normalizeStoreName(a)
  const nb = normalizeStoreName(b)
  return !!na && na === nb
}

/**
 * Best display form for a normalized key. Falls back to the trimmed
 * original when no alias is known. Keeps title-cased forms ("Worldgate
 * Athletic Club") since the AI returns those already capitalised correctly.
 */
export function canonicalStoreName(raw) {
  const key = normalizeStoreName(raw)
  if (ALIASES[key]) return ALIASES[key]
  return (raw || '').trim()
}
