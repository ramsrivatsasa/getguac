import { createApiClient } from '../../../../lib/supabase/server'
import { saveReceipt } from '../../../../lib/save-receipt'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { recordImportEvent } from '../../../../lib/import-events'

export const runtime = 'nodejs'
export const maxDuration = 60

const RETAILERS = {
  amazon: 'Amazon',
  walmart: 'Walmart',
  costco: 'Costco',
  instacart: 'Instacart',
  home_depot: 'The Home Depot',
}

const cleanOrderId = value => String(value || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120)
const validDate = value => {
  const date = new Date(value || '')
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
}

export async function POST(request) {
  const rl = await rateLimit(rateKey(request, 'retailer-import'), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ error: `Too many imports. Try again in ${rl.retryAfter}s.` }, { status: 429 })
  const sb = await createApiClient()
  // Supabase's getUser() does not consistently pick up a global Authorization
  // header in every server runtime. Passing the mobile token explicitly keeps
  // cookie-based web sessions working while making native imports reliable.
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  const { data: { user } } = await sb.auth.getUser(bearer)
  if (!user?.id) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const retailerId = String(body?.retailer_id || '').toLowerCase()
  if (!RETAILERS[retailerId]) return Response.json({ error: 'Unsupported retailer' }, { status: 400 })
  const orders = Array.isArray(body?.orders) ? body.orders.slice(0, 50) : []
  if (!orders.length) return Response.json({ error: 'No reviewed orders supplied' }, { status: 400 })

  let imported = 0
  let updated = 0
  let skipped = 0
  const receiptIds = []
  for (const order of orders) {
    const orderId = cleanOrderId(order?.order_id)
    if (!orderId) { skipped++; continue }
    const key = `retailer_${retailerId}_${orderId}`.slice(0, 200)
    const { data: prior } = await sb.from('idempotency_keys').select('receipt_id').eq('user_id', user.id).eq('key', key).maybeSingle()
    const total = Number(String(order?.total || 0).replace(/[^0-9.-]/g, ''))
    if (!(total > 0)) { skipped++; continue }
    const items = (Array.isArray(order?.items) ? order.items : []).slice(0, 200).map(item => ({
      item_name: String(item?.name || item?.item_name || 'Retailer item').slice(0, 300),
      qty: Math.max(1, Number(item?.qty || 1)),
      price: Math.max(0, Number(String(item?.price || 0).replace(/[^0-9.-]/g, '')) || 0),
    }))
    if (prior?.receipt_id) {
      // A previous purchase-history import may have created the receipt
      // header before Walmart exposed its line items. Let the canonical save
      // pipeline merge newly extracted items into that same receipt; it only
      // appends when the receipt currently has no items.
      if (!items.length) { skipped++; continue }
      const result = await saveReceipt(sb, user.id, {
        store_name: RETAILERS[retailerId], date: validDate(order?.date), total_amount: total,
        subtotal: total, tax_paid: 0, items,
      }, { source: 'manual', validation_comment: `Updated from ${RETAILERS[retailerId]} order ${orderId}; review totals and tax against the retailer invoice.` })
      updated++
      receiptIds.push(result.receipt_id)
      continue
    }
    const result = await saveReceipt(sb, user.id, {
      store_name: RETAILERS[retailerId], date: validDate(order?.date), total_amount: total,
      subtotal: total, tax_paid: 0, items,
    }, { source: 'manual', validation_comment: `Imported from ${RETAILERS[retailerId]} order ${orderId}; review totals and tax against the retailer invoice.` })
    await sb.from('idempotency_keys').upsert({ user_id: user.id, key, receipt_id: result.receipt_id, merged: result.merged }, { onConflict: 'user_id,key' })
    imported++
    receiptIds.push(result.receipt_id)
  }

  const { data: existing } = await sb.from('user_connections').select('receipts_seen').eq('user_id', user.id).eq('retailer_id', retailerId).maybeSingle()
  await sb.from('user_connections').upsert({ user_id: user.id, retailer_id: retailerId, status: 'verified', verified_at: new Date().toISOString(), receipts_seen: Number(existing?.receipts_seen || 0) + imported }, { onConflict: 'user_id,retailer_id' })
  await recordImportEvent(sb, user.id, {
    source: 'connection', retailer_id: retailerId,
    status: skipped > 0 ? 'partial' : 'succeeded',
    attempted_count: orders.length, imported_count: imported,
    updated_count: updated, skipped_count: skipped, receipt_ids: receiptIds,
  })
  return Response.json({ imported, updated, skipped, receipt_ids: receiptIds })
}
