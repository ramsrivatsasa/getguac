// Affiliate-link tagging — wraps a retailer URL with the GetGuac
// affiliate tag for that retailer. When no tag is configured, returns
// the URL unchanged (silently). Hook every "Buy again" outbound link
// through this helper.
//
// === SETUP ===
// 1. Sign up for Amazon Associates: https://affiliate-program.amazon.com/
//    Get your tracking ID (e.g. "getguac-20"). Drop into Vercel env as
//    NEXT_PUBLIC_AMAZON_ASSOC_TAG.
// 2. Sign up for Skimlinks: https://skimlinks.com/ (free, instant).
//    They give you a snippet that auto-tags ALL outbound links — no
//    code change needed once it's in <head>. Or use their JS API for
//    explicit tag-on-build. Cheaper to use the snippet.
// 3. For per-retailer direct programs (Walmart, Target, Costco via
//    Rakuten/Awin/Impact), wrap individual URLs through buildLink.
//
// === REVENUE ===
//   Amazon: 1-8% commission per purchase. Auto-tagged on every Smashlist
//   "Buy again" → Amazon link. ~$0.50-$2 / 1000 users / month at our
//   scale; scales linearly once we have MAU.

// Map: retailer-id → builder. Each builder takes the raw URL and
// returns a tagged version. Default behavior is "leave URL alone" so
// missing tags never break the UI.
const TAG_BUILDERS = {
  amazon: (url) => {
    const tag = (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_AMAZON_ASSOC_TAG : '') || ''
    if (!tag) return url
    try {
      const u = new URL(url)
      if (!/amazon\.(com|co\.uk|ca|de|fr|in|com\.au)$/i.test(u.hostname.replace(/^www\./, ''))) return url
      u.searchParams.set('tag', tag)
      return u.toString()
    } catch (_) {
      return url
    }
  },
  // Walmart / Target / Costco etc. — add per-retailer builders as you
  // get accepted into their affiliate networks. Until then, Skimlinks
  // can blanket-cover them via a script-tag injection (see setup).
}

/**
 * Tag a URL with the affiliate code for the given retailer.
 * @param {string} retailerId — 'amazon', 'walmart', etc. (matches RETAILERS catalog)
 * @param {string} url — the outbound product URL
 * @returns {string} tagged URL, or the original if no builder is configured
 */
export function buildLink(retailerId, url) {
  if (!url || typeof url !== 'string') return url
  const builder = TAG_BUILDERS[retailerId?.toLowerCase()]
  if (!builder) return url
  return builder(url)
}

/**
 * Best-effort detection of the retailer from a URL hostname, so
 * generic "Buy again" links can be tagged without knowing the retailer
 * up front.
 */
export function detectRetailer(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    if (host.includes('amazon.')) return 'amazon'
    if (host.includes('walmart.com')) return 'walmart'
    if (host.includes('target.com')) return 'target'
    if (host.includes('costco.com')) return 'costco'
    if (host.includes('instacart.com')) return 'instacart'
    return null
  } catch (_) {
    return null
  }
}

/** Convenience: detect retailer + tag in one call. */
export function tag(url) {
  const id = detectRetailer(url)
  if (!id) return url
  return buildLink(id, url)
}
