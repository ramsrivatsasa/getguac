// POST /api/coupons  { store: string }  →  { store, coupons: [...] }
//
// Returns real Google search results for "<store> coupons promo codes" via
// SerpApi — coupon-aggregator pages with their live offer snippets + links.
// We show these on our own page (no AI-invented codes). Cached cross-user in
// shopping_cache (7-day TTL) under a `coupons::` key so repeat lookups are
// free, and IP-rate-limited so anonymous use can't run up the SerpApi bill.

import { rateLimit, rateKey } from '../../../lib/apiGuard'
import { serpApiCoupons } from '../../../lib/serpCoupons'
import { getCachedSearch, setCachedSearch } from '../../../lib/shoppingCache'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request) {
  const rl = await rateLimit(rateKey(request, 'coupons'), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) {
    return Response.json({ error: `Too many requests. Try again in ${rl.retryAfter}s.` }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const store = String(body?.store || '').trim().slice(0, 80)
  if (!store) return Response.json({ error: 'store required' }, { status: 400 })

  const cacheKey = `coupons::${store}`
  const cached = await getCachedSearch(cacheKey)
  if (cached) return Response.json({ ...cached, _cache: 'hit' })

  if (!process.env.SERPAPI_KEY) {
    return Response.json({ error: 'Coupon search is not configured (SERPAPI_KEY).' }, { status: 503 })
  }

  let coupons = []
  try {
    coupons = await serpApiCoupons(store)
  } catch (e) {
    console.error('[coupons] SerpApi failed:', e?.message)
    return Response.json({ error: 'Coupon search failed. Try again shortly.' }, { status: 502 })
  }

  const payload = { store, coupons }
  // Best-effort cache (needs the service-role key; skips silently if absent).
  setCachedSearch(cacheKey, payload).catch(() => {})
  return Response.json({ ...payload, _cache: 'miss' })
}
