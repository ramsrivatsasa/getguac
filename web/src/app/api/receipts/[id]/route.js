import { createApiClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(_request, { params }) {
  const { id } = await params
  if (!id) return Response.json({ error: 'Receipt id required' }, { status: 400 })

  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let { data, error } = await sb
    .from('receipts')
    .select('*, receipt_items(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  // Keep the core receipt usable on installations where receipt_items has
  // not received the current relationship/RLS policy yet.
  if (error && /receipt_items|permission denied/i.test(error.message || '')) {
    const fallback = await sb.from('receipts').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
    data = fallback.data ? { ...fallback.data, receipt_items: [] } : null
    error = fallback.error
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Receipt not found' }, { status: 404 })

  const [policiesResult, locationResult] = await Promise.all([
    sb.from('receipt_refund_policies').select('*').eq('receipt_id', id),
    data.store_location_id
      ? sb.from('store_locations').select('*').eq('id', data.store_location_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const receipt = {
    ...data,
    receipt_refund_policies: policiesResult.error ? [] : (policiesResult.data || []),
    store_locations: locationResult.error ? null : (locationResult.data || null),
  }
  return Response.json({ receipt }, { headers: { 'Cache-Control': 'no-store' } })
}
