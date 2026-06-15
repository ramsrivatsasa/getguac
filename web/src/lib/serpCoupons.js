// SerpApi Google (organic) client for store coupons. Server-only (SERPAPI_KEY).
//
// We deliberately return REAL Google results (coupon-aggregator pages with
// their titles + snippets + links) rather than asking an AI to invent coupon
// codes — codes are the single most-hallucinated thing an LLM produces, and a
// fake code at checkout is worse than no code. The snippet usually contains
// the live headline offer ("20% off + free shipping · 14 codes"), and the link
// goes to the real coupon page (RetailMeNot, Coupons.com, etc.).

// Known coupon/deal aggregators — used to rank the most relevant results first.
const COUPON_DOMAINS = [
  'retailmenot.com', 'coupons.com', 'slickdeals.net', 'dealnews.com', 'offers.com',
  'couponcabin.com', 'bradsdeals.com', 'groupon.com', 'wethrift.com', 'simplycodes.com',
  'knoji.com', 'couponfollow.com', 'dontpayfull.com', 'joinhoney.com', 'capitaloneshopping.com',
]

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

export async function serpApiCoupons(store) {
  const key = process.env.SERPAPI_KEY
  if (!key) return []
  const q = `${store} coupons promo codes`
  const url = `https://serpapi.com/search.json?engine=google&gl=us&hl=en&num=20&q=${encodeURIComponent(q)}&api_key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`SerpApi ${res.status}`)
  const json = await res.json()
  const organic = Array.isArray(json.organic_results) ? json.organic_results : []

  const seen = new Set()
  const mapped = organic
    .map((it) => {
      const link = String(it.link || '')
      const host = hostOf(link)
      return {
        title: String(it.title || '').trim(),
        snippet: String(it.snippet || '').trim(),
        url: link,
        source: host,
        date: String(it.date || '').trim(),
        isAggregator: COUPON_DOMAINS.includes(host),
      }
    })
    .filter((c) => c.url && c.title)
    .filter((c) => { if (seen.has(c.url)) return false; seen.add(c.url); return true })

  // Aggregators first (they actually list codes), preserving Google's order within each group.
  mapped.sort((a, b) => Number(b.isAggregator) - Number(a.isAggregator))
  return mapped.slice(0, 12)
}
