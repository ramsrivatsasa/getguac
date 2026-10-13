import { createApiClient } from '../../../lib/supabase/server'
import { visibleReceipt } from '../../../lib/receipt-visibility.mjs'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const LIST_COLUMNS =
  'id, user_id, store_name, store_id, store_location_id, date, total_amount, tax_paid, tip_amount, ' +
  'reward_no, receipt_link, extra_page_urls, business_purchase, rating, validation_tags, category, ' +
  'from_statement, statement_source, statement_import_id, reconciled, reconciled_with, ' +
  'is_return, source, email_messages(email_classification), receipt_items(item_name)'

export async function GET(request) {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(request.url)
  let query = sb.from('receipts').select(LIST_COLUMNS).order('date', { ascending: false })
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const storeId = url.searchParams.get('storeId')
  const storeLocationId = url.searchParams.get('storeLocationId')
  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)
  if (storeId) query = query.eq('store_id', storeId)
  if (storeLocationId) query = query.eq('store_location_id', storeLocationId)

  let { data, error } = await query
  // Older deployments can have receipt_items RLS without relationship-read
  // permission. The receipt list must still load; item search simply remains
  // unavailable until that policy is applied.
  if (error && /receipt_items|permission denied/i.test(error.message || '')) {
    let fallback = sb.from('receipts').select(LIST_COLUMNS.replace(', receipt_items(item_name)', '')).order('date', { ascending: false })
    if (dateFrom) fallback = fallback.gte('date', dateFrom)
    if (dateTo) fallback = fallback.lte('date', dateTo)
    if (storeId) fallback = fallback.eq('store_id', storeId)
    if (storeLocationId) fallback = fallback.eq('store_location_id', storeLocationId)
    const result = await fallback
    data = (result.data || []).map(receipt => ({ ...receipt, receipt_items: [], receiptItemsUnavailable: true }))
    error = result.error
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ receipts: (data || []).filter(visibleReceipt) }, { headers: { 'Cache-Control': 'no-store' } })
}
