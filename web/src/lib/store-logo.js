// Resolve a store name to a brand logo URL. Used by the Stash card,
// Buy Again card, StoreList rows, and the public share-landing tiles
// so merchants are anchored by a real wordmark/logo instead of a
// generic category emoji.
//
// Strategy:
//   1. A small curated map handles the top-N US grocers + big-box
//      stores deterministically — same domain regardless of what
//      flavor of the name appears on the receipt ("Costco Wholesale"
//      vs "COSTCO #218" both → costco.com).
//   2. Anything outside the curated set falls back to Clearbit's
//      free /logo.png lookup using a best-effort guess of the
//      domain (lowercased name + ".com"). Clearbit returns a
//      transparent PNG and 404s when it doesn't know the brand —
//      the calling component should treat a load error as "fall
//      back to emoji."
//   3. If we can't even guess a domain, returns null so the caller
//      keeps the emoji avatar.
//
// Cost: Clearbit's logo API is free for low volume (no auth, no
// key). At scale we'd want to cache + serve from our own CDN, but
// for now this is the cheapest way to get retailer wordmarks
// rendering on every card without curating SVGs by hand.

// Curated domain map — covers the highest-traffic US grocers and
// big-box stores. Keys are normalized (lowercased, alpha+digits
// only) so receipt-name variants collapse to one entry.
const KNOWN_DOMAINS = {
  costco:        'costco.com',
  costcowholesale: 'costco.com',
  walmart:       'walmart.com',
  target:        'target.com',
  wholefoods:    'wholefoodsmarket.com',
  kroger:        'kroger.com',
  traderjoes:    'traderjoes.com',
  aldi:          'aldi.us',
  publix:        'publix.com',
  safeway:       'safeway.com',
  albertsons:    'albertsons.com',
  heb:           'heb.com',
  meijer:        'meijer.com',
  wegmans:       'wegmans.com',
  sams:          'samsclub.com',
  samsclub:      'samsclub.com',
  bjs:           'bjs.com',
  cvs:           'cvs.com',
  walgreens:     'walgreens.com',
  riteaid:       'riteaid.com',
  homedepot:     'homedepot.com',
  lowes:         'lowes.com',
  bestbuy:       'bestbuy.com',
  microcenter:   'microcenter.com',
  amazon:        'amazon.com',
  ebay:          'ebay.com',
  doordash:      'doordash.com',
  ubereats:      'ubereats.com',
  instacart:     'instacart.com',
  starbucks:     'starbucks.com',
  dunkin:        'dunkindonuts.com',
  mcdonalds:     'mcdonalds.com',
  chipotle:      'chipotle.com',
  netflix:       'netflix.com',
  spotify:       'spotify.com',
}

function normalizeKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

// Best-effort domain guess for stores we don't have an entry for.
// Strips obvious suffixes ("Wholesale", "Pharmacy", "Inc", store
// numbers) before slapping ".com" on the end. Worst case Clearbit
// 404s and the caller falls back to emoji.
function guessDomain(name) {
  const cleaned = String(name || '')
    .toLowerCase()
    .replace(/\b(wholesale|pharmacy|supermarket|grocery|store|inc|llc|corp|co|the)\b/g, '')
    .replace(/#\s*\d+/g, '')        // strip "#218"
    .replace(/[^a-z0-9]+/g, '')     // collapse to alpha+digits
    .replace(/\d+$/, '')            // trailing digits
    .trim()
  if (!cleaned || cleaned.length < 3) return null
  return `${cleaned}.com`
}

// Return a logo URL for the given store name. Returns null when we
// can't guess anything — caller should render its emoji avatar.
//
// Provider note: we used Clearbit's /logo.png endpoint originally,
// but HubSpot acquired Clearbit and retired the free tier in 2024.
// Google's favicon-fetch endpoint is the most reliable replacement
// (free, 200s for any real domain, served from Google's CDN). The
// image is smaller than a Clearbit wordmark — typically 32-64px
// square — but it renders consistently and there's no rate limit.
export function logoUrlForStore(storeName) {
  if (!storeName) return null
  const key = normalizeKey(storeName)
  if (!key) return null
  const domain = KNOWN_DOMAINS[key] || guessDomain(storeName)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}
