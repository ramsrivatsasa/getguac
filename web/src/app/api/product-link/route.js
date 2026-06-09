// POST /api/product-link
//
// Resolves a SerpApi shopping product_id to the DIRECT merchant product URL
// (e.g. the actual bestbuy.com / dell.com product page), the way Google
// Shopping click-throughs work. SerpApi's base google_shopping results only
// give the Google product page; the per-product `google_product` engine with
// offers returns each seller's direct link.
//
// Called on demand (when a user clicks "View deal") so it costs one SerpApi
// call only per click, not per search. Resolved links are cached in
// shopping_cache (keyed by product_id + store) so repeat clicks are free.
//
// Body: { product_id: string, store?: string }
// → { url: string }   ("" when nothing resolvable)

import { rateLimit, rateKey } from '../../../lib/apiGuard'
import { getCachedSearch, setCachedSearch } from '../../../lib/shoppingCache'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'product-link'), { limit: 40, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ url: '', error: 'rate limited' }, { status: 429 })

    const key = process.env.SERPAPI_KEY
    if (!key) return Response.json({ url: '' })

    const body = await request.json().catch(() => ({}))
    const productId = String(body?.product_id || '').trim()
    const store = String(body?.store || '').trim()
    if (!productId) return Response.json({ url: '' })

    const cacheKey = `plink:${productId}:${store.toLowerCase()}`
    const cached = await getCachedSearch(cacheKey)
    if (cached?.url) return Response.json({ url: cached.url, cached: true })

    const url = `https://serpapi.com/search.json?engine=google_product&product_id=${encodeURIComponent(productId)}&offers=1&gl=us&hl=en&api_key=${key}`
    const res = await fetch(url)
    if (!res.ok) return Response.json({ url: '' })
    const json = await res.json()
    const sellers = json?.sellers_results?.online_sellers || []

    // Prefer the seller matching the result's store; else the first with a link.
    const byStore = store
      ? sellers.find(s => (s.name || '').toLowerCase().includes(store.toLowerCase()) && (s.direct_link || s.link))
      : null
    const pick = byStore || sellers.find(s => s.direct_link || s.link)
    const direct = String(pick?.direct_link || pick?.link || '')

    if (direct) setCachedSearch(cacheKey, { url: direct })  // fire-and-forget cache
    return Response.json({ url: direct })
  } catch (e) {
    console.error('[product-link]', e)
    return Response.json({ url: '' })
  }
}
