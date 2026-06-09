// SerpApi Google Shopping client — shared by /api/best-prices and the
// cache-warming cron. Returns enriched product results (photos, ratings,
// review counts, sale prices, store names). Server-only (reads SERPAPI_KEY).

export async function serpApiShopping(query) {
  const key = process.env.SERPAPI_KEY
  if (!key) return []
  const url = `https://serpapi.com/search.json?engine=google_shopping&gl=us&hl=en&num=40&q=${encodeURIComponent(query)}&api_key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`SerpApi ${res.status}`)
  const json = await res.json()
  // SerpApi splits results across shopping_results AND inline_shopping_results
  // — merge both so we don't end up with just 1–2 items.
  const items = [
    ...(Array.isArray(json.shopping_results) ? json.shopping_results : []),
    ...(Array.isArray(json.inline_shopping_results) ? json.inline_shopping_results : []),
  ]
  const seen = new Set()
  return items.map(it => {
    const price = Number(it.extracted_price) || 0
    const orig = Number(it.old_price_extracted ?? it.extracted_old_price) || 0
    const link = String(it.link || '')
    const productLink = String(it.product_link || '')
    return {
      store: String(it.source || it.seller || '').trim(),
      price,
      original_price: orig > price ? orig : 0,
      // url = a DIRECT merchant link (→ "View deal"); google_url = the exact
      // Google product page (→ "View on Google") when no merchant link exists.
      url: link && !/\bgoogle\.[a-z.]+\//i.test(link) ? link : '',
      google_url: productLink,
      image: String(it.thumbnail || ''),
      title: String(it.title || ''),
      rating: Math.min(5, Math.max(0, Number(it.rating) || 0)),
      review_count: Math.max(0, Math.round(Number(it.reviews) || 0)),
      specs: Array.isArray(it.extensions) ? it.extensions.join(' · ') : String(it.extensions || ''),
      available: true,
      notes: String(it.delivery || '').trim(),
      matched_name: String(it.title || ''),
    }
  }).filter(r => r.store && r.price > 0)
    .sort((a, b) => a.price - b.price)
    .filter(r => {                     // dedup overlapping titles across the two arrays
      const k = (r.title || '').toLowerCase().trim()
      if (!k) return true
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, 30)
}

/** Build the /api/best-prices-shaped payload for a query (or null if no hits). */
export async function buildSerpPayload(query, enhancement = null) {
  const results = await serpApiShopping(query)
  if (!results.length) return null
  return {
    query,
    broadened_query: null,
    mode: 'serpapi',
    results,
    sources: [],
    enhancement: enhancement || {
      original: query, enhanced: query, applied_aliases: [], category: null, matched_stash: null,
    },
    _model: 'serpapi:google_shopping',
  }
}
