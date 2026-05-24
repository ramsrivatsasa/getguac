// Guac-Search — local query enhancement for the Steals deal finder.
// Runs entirely in your app (no external API). Expands abbreviations, resolves
// brand aliases, classifies the category, and emits a clean, search-friendly
// query that an external price-scanner (Gemini grounding, SerpAPI, etc) can use.

// ───────────────────────────────────────────────────────────────
// Alias dictionary — maps short / abbreviated / nickname terms to their full
// search-friendly form. Add freely; case-insensitive.
// ───────────────────────────────────────────────────────────────
const ALIASES = [
  // Home Depot bucket-lid family (the "Homer Lid" case)
  // OCR often mangles "Homer" → "Host" / "HOST" — handle both.
  { match: /\bho(s|m)er\s*lid\b/i,       expand: 'Home Depot Homer 5-gallon bucket lid orange' },
  { match: /\bho(s|m)er\s*bucket\b/i,    expand: 'Home Depot Homer 5-gallon bucket orange' },
  { match: /\bho(s|m)er\s*\d+\s*gal\b/i, expand: 'Home Depot Homer 5-gallon bucket' },
  { match: /\bhost\s*5\s*gal\b/i,        expand: 'Home Depot Homer 5-gallon bucket' },

  // Common retailer nicknames
  { match: /\bhd\b/i,                    expand: 'Home Depot' },
  { match: /\bbj's?\b/i,                 expand: 'BJ\'s Wholesale Club' },
  { match: /\bsam's?\b/i,                expand: 'Sam\'s Club' },
  { match: /\btj\s*max(x)?\b/i,          expand: 'T.J. Maxx' },
  { match: /\bcvs\b/i,                   expand: 'CVS Pharmacy' },
  { match: /\bwf\b/i,                    expand: 'Whole Foods' },
  { match: /\btj\b/i,                    expand: 'Trader Joe\'s' },

  // Categories often written in shorthand on receipts
  { match: /\b75lm\s*flashli\b/i,        expand: 'Defiant 75-lumen flashlight 2-pack' },
  { match: /\bbegplant\b/i,              expand: 'Burpee eggplant 4-pack live plant' },
  { match: /\bveggie\s+4\.5\b/i,         expand: '4.5-inch vegetable starter plant' },
  { match: /\blavender\s*4\.5\b/i,       expand: 'lavender 4.5-inch live plant' },

  // Brand / SKU normalizers
  { match: /\bgalaxy\s+s\d+\b/i,         expand: 'Samsung Galaxy phone' },
  { match: /\biphone\s*\d+\s*pro?\b/i,   expand: 'Apple iPhone' },
  { match: /\bnetgear\s+orbi\b/i,        expand: 'NETGEAR Orbi WiFi mesh router' },
]

// Words that add noise to a price search (forwarded-email artifacts, etc.)
const STOP_PHRASES = [
  /\b(eReceipt|electronic\s+receipt|order\s+confirmation|invoice)\b/gi,
  /\b(authorized?|authorization|auth\s*code)\b/gi,
  /\b(SUBTOTAL|TOTAL|TAX)\b/gi,
  /XXXXXXXX\d{4}/gi,
]

// Item-category keywords used to bias the search. The first match wins.
const CATEGORY_HINTS = [
  { test: /\b(lid|bucket|paint|tool|drill|nail|screw|home\s*depot|lowe)/i, category: 'hardware / home improvement', stores: ['Home Depot','Lowe\'s','Ace Hardware','Walmart','Amazon'] },
  { test: /\b(burrito|taco|pizza|sandwich|fries|burger|coffee)/i,         category: 'restaurant / food',         stores: ['restaurant',] },
  { test: /\b(grocery|bread|milk|cheese|fruit|vegetable|produce)/i,       category: 'grocery',                   stores: ['Walmart','Target','Kroger','Wegmans','Costco','Whole Foods','Trader Joe\'s'] },
  { test: /\b(shirt|pants|jacket|shoe|dress|boots?)/i,                   category: 'apparel',                   stores: ['Target','Walmart','Amazon','Macy\'s','Old Navy','Gap'] },
  { test: /\b(iphone|samsung|galaxy|laptop|monitor|tv|camera|headphone|airpod)/i, category: 'electronics',       stores: ['Best Buy','Amazon','Walmart','Target','Costco'] },
  { test: /\b(makeup|lipstick|foundation|perfume|skincare|moisturizer)/i, category: 'beauty',                    stores: ['Sephora','Ulta','Target','Amazon'] },
  { test: /\b(plant|flower|garden|seed|soil|mulch)/i,                    category: 'garden',                    stores: ['Home Depot','Lowe\'s','Walmart','Costco'] },
]

// Quick string fuzziness — token overlap ratio (no deps).
function fuzzyScore(a, b) {
  const tokens = s => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length >= 2))
  const A = tokens(a), B = tokens(b)
  if (A.size === 0 || B.size === 0) return 0
  let hits = 0
  for (const t of A) if (B.has(t)) hits++
  return hits / Math.max(A.size, B.size)
}

/**
 * Enhance a raw user query for price searching.
 *  - Expands aliases ("Homer Lid" → "Home Depot Homer 5-gallon bucket lid")
 *  - Strips receipt-artifact noise
 *  - Picks a category + suggests relevant retailers
 *  - Optionally fuzzy-matches the user's own Stash to recover the canonical product name
 *
 * Returns { enhanced, original, category, suggestedStores, matchedStashItem, appliedAliases }
 */
export function enhanceSearchQuery(raw, { stashItems = [] } = {}) {
  const original = String(raw || '').trim()
  if (!original) return { enhanced: '', original: '', category: null, suggestedStores: [], matchedStashItem: null, appliedAliases: [] }

  let q = original

  // 1. Apply alias expansions (in declaration order)
  const applied = []
  for (const a of ALIASES) {
    if (a.match.test(q)) {
      q = q.replace(a.match, a.expand)
      applied.push(a.expand)
    }
  }

  // 2. Strip noisy stop phrases
  for (const sp of STOP_PHRASES) q = q.replace(sp, ' ')
  q = q.replace(/\s+/g, ' ').trim()

  // 3. Fuzzy-match the user's own Stash to recover canonical name if input was a
  //    nickname / abbreviation that doesn't appear in the alias dictionary.
  let matchedStashItem = null
  if (stashItems.length > 0) {
    let bestScore = 0
    for (const it of stashItems) {
      const score = fuzzyScore(original, `${it.item_name || ''} ${it.sku || ''}`)
      if (score > bestScore) { bestScore = score; matchedStashItem = it }
    }
    if (bestScore < 0.34) matchedStashItem = null
    // If we matched in stash and the original was abbreviated, prefer the stash item's canonical name
    if (matchedStashItem && fuzzyScore(q, matchedStashItem.item_name) < 0.6) {
      q = `${matchedStashItem.item_name}${matchedStashItem.sku ? ` SKU ${matchedStashItem.sku}` : ''}`
    }
  }

  // 4. Category + suggested stores
  let category = null
  let suggestedStores = []
  for (const c of CATEGORY_HINTS) {
    if (c.test.test(q) || c.test.test(original)) {
      category = c.category
      suggestedStores = c.stores
      break
    }
  }

  return {
    enhanced: q,
    original,
    category,
    suggestedStores,
    matchedStashItem,
    appliedAliases: applied,
  }
}
