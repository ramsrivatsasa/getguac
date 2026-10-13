import { NextResponse } from 'next/server'
import { createApiClient } from '../../../../lib/supabase/server'
import { discoverPublicOffers } from '../../../../lib/promotion-discovery.mjs'
import { getCachedSearch, setCachedSearch } from '../../../../lib/shoppingCache'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const maxDuration = 45
const flights = new Map()
export async function POST(request) {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rl = await rateLimit(rateKey(request, `offer-search:${user.id}`), { limit: 5, windowMs: 60000 })
  if (!rl.ok) return NextResponse.json({ error: 'Please wait before another offer search.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  const body = await request.json().catch(() => ({}))
  const query = typeof body.query === 'string' ? body.query.trim().replace(/\s+/g, ' ').slice(0, 120) : ''
  if (query.length < 2) return NextResponse.json({ error: 'Enter a merchant, product or offer to search.' }, { status: 400 })
  const key = 'public-offers-v1:' + query.toLowerCase()
  let result = await getCachedSearch(key)
  if (!result || Date.now() - Date.parse(result.checkedAt || '') > 6 * 3600000) {
    try {
      if (!flights.has(key)) flights.set(key, discoverPublicOffers(query).finally(() => flights.delete(key)))
      result = await flights.get(key)
      await setCachedSearch(key, result)
    } catch {
      return NextResponse.json({ status: 'unavailable', added: 0, message: 'Web offer search is unavailable. Your saved email offers are still available.' })
    }
  }
  let added = 0, duplicates = 0
  for (const offer of result.offers) {
    if (offer.expires_at && Date.parse(offer.expires_at) <= Date.now()) continue
    const existing = await sb.from('promotions').select('id').eq('user_id', user.id).eq('source', 'web').eq('source_ref', offer.source_ref).maybeSingle()
    if (existing.error) return NextResponse.json({ error: 'Saved offers could not be checked.' }, { status: 503 })
    if (existing.data) { duplicates++; continue }
    const { error } = await sb.from('promotions').upsert({ ...offer, user_id: user.id, source: 'web' }, { onConflict: 'user_id,source,source_ref', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: 'Offers could not be saved.' }, { status: 503 })
    added++
  }
  return NextResponse.json({ status: 'complete', added, duplicates, requiringReview: added, unavailableSources: result.unavailableSources, message: added ? `${added} merchant offer${added === 1 ? '' : 's'} added for review.` : 'No new actionable merchant offers found. Saved offers are unchanged.' })
}
