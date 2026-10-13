import { NextResponse } from 'next/server'
import { createApiClient } from '../../../lib/supabase/server'
import { cachedGroceryItems } from '../../../lib/grocery-discovery.mjs'
import { visibleReceipt } from '../../../lib/receipt-visibility.mjs'
import { compareGroceryBasket } from '../../../lib/grocery-basket-plan.mjs'

export async function GET() {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const basket = user.user_metadata?.grocery_basket || { itemIds: [], monthlyBudget: null }
  const postalCode = user.user_metadata?.postal_code || user.user_metadata?.find10_postal_code || null
  let quotes = {}
  const today = new Date(), from = new Date(today); from.setUTCDate(from.getUTCDate() - 29)
  const spending = await sb.from('receipts').select('id,total_amount,is_return,source,receipt_items(id),email_messages(email_classification)').eq('user_id', user.id).eq('category', 'grub').gte('date', from.toISOString().slice(0,10)).lte('date', today.toISOString().slice(0,10))
  const recordedSpending = spending.error ? null : (spending.data || []).filter(visibleReceipt).reduce((sum, receipt) => sum + (receipt.is_return ? -1 : 1) * Math.abs(Number(receipt.total_amount) || 0), 0)
  if (basket.itemIds.length && user.user_metadata?.country_code === 'US' && user.user_metadata?.preferred_currency === 'USD') {
    const { data, error } = await sb.from('shopping_list').select('id,item_name,comments').eq('user_id', user.id).eq('list_name', 'Grub & Grab').in('id', basket.itemIds)
    if (!error) quotes = await cachedGroceryItems(sb, data || [], postalCode)
  }
  return NextResponse.json({ basket, location: postalCode, quotes, recordedSpending, spendingFrom: from.toISOString().slice(0,10), spendingThrough: today.toISOString().slice(0,10), researchEnabled: user.user_metadata?.grocery_research_enabled === true })
}

export async function POST(request) {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.itemIds) || body.itemIds.length > 40 || body.itemIds.some(id => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) || (body.monthlyBudget !== null && (!Number.isFinite(body.monthlyBudget) || body.monthlyBudget < 0 || body.monthlyBudget > 1000000))) return NextResponse.json({ error: 'Choose up to 40 basket items and a valid monthly budget.' }, { status: 400 })
  const itemIds = [...new Set(body.itemIds)]
  const costs = body.extraCosts && typeof body.extraCosts === 'object' && !Array.isArray(body.extraCosts) ? Object.entries(body.extraCosts) : []
  if (costs.length > 8 || costs.some(([id, value]) => !/^[a-z0-9.-]{1,100}$/i.test(id) || !['string', 'number'].includes(typeof value) || value !== '' && (!String(value).trim() || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10000))) return NextResponse.json({ error: 'Enter valid extra store costs.' }, { status: 400 })
  let items = []
  if (itemIds.length) {
    const { data, error } = await sb.from('shopping_list').select('id,item_name,comments,qty,price').eq('user_id', user.id).in('id', itemIds).eq('list_name', 'Grub & Grab').eq('approved', true).eq('sent_to_store', false)
    if (error) return NextResponse.json({ error: 'Basket items could not be checked.' }, { status: 503 })
    if (data.length !== itemIds.length) return NextResponse.json({ error: 'Some items changed. Refresh your shopping list before saving.' }, { status: 409 })
    items = data
  }
  const previousChoice = user.user_metadata?.grocery_basket?.choice || null
  const selectedStore = body.selectedStore || previousChoice?.storeId
  let choice = previousChoice ? { ...previousChoice, needsRefresh: true } : null
  if (selectedStore) {
    if (user.user_metadata?.country_code !== 'US' || user.user_metadata?.preferred_currency !== 'USD') return NextResponse.json({ error: 'This comparison supports United States / USD.' }, { status: 409 })
    const quotes = await cachedGroceryItems(sb, items, user.user_metadata?.postal_code || user.user_metadata?.find10_postal_code)
    const lines = items.map(item => ({ id: item.id, qty: Number(item.qty || 1), specKey: `${item.item_name} ${item.comments || ''}`.slice(0,200).toLowerCase(), baselineUnitCents: item.price == null || item.price === '' ? null : Math.round(Number(item.price)*100) }))
    const offers = items.flatMap(item => (quotes[item.id]?.quotes || []).map(offer => ({ ...offer, lineId: item.id })))
    const stores = costs.map(([id, value]) => ({ id, extraCostsConfirmed: value !== '', extraCostsCents: value === '' ? null : Math.round(Number(value)*100) }))
    let result
    try { result = compareGroceryBasket(lines, offers, stores).singleStores.find(store => store.storeId === selectedStore) } catch {}
    if (!result?.complete || !result.costsKnown || !(result.estimatedSavingsCents > 0)) {
      if (body.selectedStore) return NextResponse.json({ error: 'This store needs complete matching local prices and confirmed extra costs before saving a savings choice.' }, { status: 409 })
    } else choice = { storeId: selectedStore, totalCents: result.totalCents, estimatedSavingsCents: result.estimatedSavingsCents, checkedAt: new Date().toISOString(), basis: 'One basket estimate; not monthly or receipt-verified savings.' }
  }
  const basket = { itemIds, monthlyBudget: body.monthlyBudget, extraCosts: Object.fromEntries(costs), choice, savedAt: new Date().toISOString() }
  // Update only this metadata key; Supabase merges it with existing profile and plan keys.
  const { error } = await sb.auth.updateUser({ data: { grocery_basket: basket } })
  return error ? NextResponse.json({ error: 'Basket could not be saved.' }, { status: 503 }) : NextResponse.json({ basket })
}
export async function PATCH(request) {
  const sb = await createApiClient(); const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (typeof body.researchEnabled !== 'boolean') return NextResponse.json({ error: 'Choose a refresh preference.' }, { status: 400 })
  const { error } = await sb.auth.updateUser({ data: { grocery_research_enabled: body.researchEnabled } })
  return error ? NextResponse.json({ error: 'Refresh preference could not be saved.' }, { status: 503 }) : NextResponse.json({ ok: true })
}
