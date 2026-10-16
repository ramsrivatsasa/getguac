import { createApiClient } from '../../../../lib/supabase/server'
import { saveReceipt } from '../../../../lib/save-receipt'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { recordImportEvent } from '../../../../lib/import-events'
import { RETAILERS, importReviewedOrders } from '../../../../lib/retailer-import.mjs'
import { retailerAvailableInCountry } from '../../../../lib/retailer-region.mjs'

export const runtime = 'nodejs'
export const maxDuration = 60

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
  if (!retailerAvailableInCountry(retailerId, user.user_metadata?.country_code)) {
    return Response.json({ error: 'This retailer is unavailable in your account region' }, { status: 403 })
  }
  const orders = Array.isArray(body?.orders) ? body.orders : []
  if (orders.length > 50) return Response.json({ error: 'Import at most 50 reviewed orders per batch' }, { status: 400 })
  if (!orders.length) return Response.json({ error: 'No reviewed orders supplied' }, { status: 400 })

  const result = await importReviewedOrders(sb, user.id, retailerId, orders, saveReceipt)
  const { imported, updated, skipped, failed, receipt_ids: receiptIds } = result

  const { data: existing } = await sb.from('user_connections').select('receipts_seen').eq('user_id', user.id).eq('retailer_id', retailerId).maybeSingle()
  await sb.from('user_connections').upsert({ user_id: user.id, retailer_id: retailerId, status: 'verified', verified_at: new Date().toISOString(), receipts_seen: Number(existing?.receipts_seen || 0) + imported }, { onConflict: 'user_id,retailer_id' })
  await recordImportEvent(sb, user.id, {
    source: 'connection', retailer_id: retailerId,
    status: failed === orders.length ? 'failed' : (skipped > 0 || failed > 0 ? 'partial' : 'succeeded'),
    attempted_count: orders.length, imported_count: imported,
    updated_count: updated, skipped_count: skipped + failed, receipt_ids: receiptIds,
    metadata: { failed_count: failed, errors: result.errors },
  })
  return Response.json(result)
}
