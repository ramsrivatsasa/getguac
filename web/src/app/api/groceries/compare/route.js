import { NextResponse } from 'next/server'
import { createApiClient } from '../../../../lib/supabase/server'
import { cachedGroceryItems, discoverGroceryItem } from '../../../../lib/grocery-discovery.mjs'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const maxDuration = 45
export async function POST(request) {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.user_metadata?.country_code !== 'US' || user.user_metadata?.preferred_currency !== 'USD') return NextResponse.json({ error: 'Save United States and USD in your profile before comparing these grocery sources.' }, { status: 409 })
  const rl = await rateLimit(rateKey(request, `grocery-compare:${user.id}`), { limit: 5, windowMs: 60000 })
  if (!rl.ok) return NextResponse.json({ error: 'Please wait before another basket comparison.' }, { status: 429 })
  const ids = user.user_metadata?.grocery_basket?.itemIds || []
  if (!ids.length) return NextResponse.json({ error: 'Save your grocery basket first.' }, { status: 400 })
  const { data: items, error } = await sb.from('shopping_list').select('id,item_name,comments,qty,price').eq('user_id', user.id).eq('approved', true).eq('sent_to_store', false).eq('list_name', 'Grub & Grab').in('id', ids)
  if (error) return NextResponse.json({ error: 'Basket could not be loaded.' }, { status: 503 })
  const postalCode = user.user_metadata?.postal_code || user.user_metadata?.find10_postal_code
  const previous = await cachedGroceryItems(sb, items, postalCode)
  const stale = items.filter(item => item.comments?.trim() && !previous[item.id])
  const batch = stale.slice(0, 2)
  const results = await Promise.allSettled(batch.map(item => discoverGroceryItem(item, { postalCode })))
  const quotes = { ...previous }
  for (const item of items.filter(item => !item.comments?.trim())) quotes[item.id] = { status: 'needs_specification', quotes: [] }
  results.forEach((result, index) => { const item = batch[index]; quotes[item.id] = result.status === 'fulfilled' ? result.value : { itemId: item.id, status: 'unavailable', quotes: [], checkedAt: new Date().toISOString() } })
  const { error: enableError } = await sb.auth.updateUser({ data: { grocery_research_enabled: true } })
  if (enableError) return NextResponse.json({ error: 'Background refresh preference could not be saved.' }, { status: 503 })
  return NextResponse.json({ quotes, remaining: Math.max(0, stale.length - batch.length), message: results.some(r => r.status === 'rejected' || r.value.status === 'unavailable') ? 'Some merchant pages did not provide a usable current price. No savings have been counted for those items.' : 'Matching merchant listings checked. Local availability and extra costs must be confirmed before counting savings.' })
}
