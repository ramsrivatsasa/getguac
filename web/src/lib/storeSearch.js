// Map a store name → a search URL on THAT retailer's own site for a product
// query. So "View deal" on a Best Buy result opens Best Buy (not Google),
// Amazon → Amazon, etc. — keeping the user on the merchant the price came from.
//
// This is the best free approximation. For the EXACT product page (a real
// canonical product URL) you need a shopping/product API — the AI-grounded
// search can't supply reliable direct URLs.

const BUILDERS = [
  { test: /best\s*buy/i,       url: q => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}` },
  { test: /amazon/i,           url: q => `https://www.amazon.com/s?k=${q}` },
  { test: /walmart/i,          url: q => `https://www.walmart.com/search?q=${q}` },
  { test: /target/i,           url: q => `https://www.target.com/s?searchTerm=${q}` },
  { test: /costco/i,           url: q => `https://www.costco.com/CatalogSearch?keyword=${q}` },
  { test: /sam'?s\s*club/i,    url: q => `https://www.samsclub.com/s/${q}` },
  { test: /home\s*depot/i,     url: q => `https://www.homedepot.com/s/${q}` },
  { test: /lowe'?s/i,          url: q => `https://www.lowes.com/search?searchTerm=${q}` },
  { test: /newegg/i,           url: q => `https://www.newegg.com/p/pl?d=${q}` },
  { test: /micro\s*center/i,   url: q => `https://www.microcenter.com/search/search_results.aspx?Ntt=${q}` },
  { test: /b\s*&\s*h|bhphoto/i,url: q => `https://www.bhphotovideo.com/c/search?q=${q}` },
  { test: /staples/i,          url: q => `https://www.staples.com/${q}/directory_${q}` },
  { test: /office\s*depot/i,   url: q => `https://www.officedepot.com/catalog/search.do?Ntt=${q}` },
  { test: /dell/i,             url: q => `https://www.dell.com/en-us/search/${q}` },
  { test: /hp\b|hewlett/i,     url: q => `https://www.hp.com/us-en/shop/sitesearch?keyword=${q}` },
  { test: /lenovo/i,           url: q => `https://www.lenovo.com/us/en/search?text=${q}` },
  { test: /apple/i,            url: q => `https://www.apple.com/us/search/${q}` },
  { test: /samsung/i,          url: q => `https://www.samsung.com/us/search/searchMain/?listType=g&searchTerm=${q}` },
  { test: /ebay/i,             url: q => `https://www.ebay.com/sch/i.html?_nkw=${q}` },
  { test: /wayfair/i,          url: q => `https://www.wayfair.com/keyword.php?keyword=${q}` },
]

/**
 * @param {string} store  retailer name from the result
 * @param {string} query  product identity (title + specs)
 * @returns {string} a URL on the retailer's own site, or a last-resort web search
 */
export function storeDealUrl(store, query) {
  const q = encodeURIComponent((query || '').trim())
  for (const b of BUILDERS) if (b.test.test(store || '')) return b.url(q)
  // Unknown retailer — a plain web search for "store + product" almost always
  // lands on the retailer's own product page as the top result.
  return `https://www.google.com/search?q=${encodeURIComponent(`${store || ''} ${query || ''}`.trim())}`
}

// Strip promo / price / badge noise so the vendor search gets a clean PRODUCT
// query. Without this, a title or spec like "22% OFF" gets baked into the
// search URL (e.g. dell.com/.../dell pro 16 plus laptop 22% off) and the
// retailer's search returns "something went wrong" / no results.
export function cleanDealQuery(s) {
  return (s || '')
    .replace(/\b\d+(\.\d+)?\s*%\s*off\b/gi, '')                 // "22% off"
    .replace(/\bsave\s+\$?\d[\d,.]*\s*%?/gi, '')                // "save $100", "save 20%"
    .replace(/\$\s?\d[\d,.]*/g, '')                             // "$1,989.00"
    .replace(/\b(on\s+sale|sale|deals?|today only|limited time|free shipping|clearance|open[\s-]?box|refurbished|was\s+\$?\d[\d,.]*)\b/gi, '')
    .replace(/[·•|]+/g, ' ')                                     // spec separators
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Best click target for a shopping result, preferring the VENDOR over Google:
//   1. a direct merchant product link (when SerpApi supplies one)
//   2. the vendor's OWN site (its product search) for recognised retailers
//   3. Google's exact product page — only when the store isn't a known retailer
//      (so there's no vendor site to send to), else a plain web search.
// The query is the product TITLE only, cleaned of promo/price noise — specs are
// left out because they're usually badge/shipping text that breaks the search.
export function bestDealUrl(r) {
  if (r?.url) return r.url
  const q = cleanDealQuery(r?.title || r?.matched_name || '')
  const vendor = storeDealUrl(r?.store, q)
  const vendorIsKnown = !/\bgoogle\.[a-z.]+\//i.test(vendor)
  if (vendorIsKnown) return vendor
  return r?.google_url || vendor
}
