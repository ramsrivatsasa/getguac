import { createApiClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  const db = await createApiClient()
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  const { data: { user } } = await db.auth.getUser(bearer)
  if (!user?.id) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const requested = Number(new URL(request.url).searchParams.get('limit') || 50)
  const limit = Math.max(1, Math.min(100, Number.isFinite(requested) ? requested : 50))
  const { data, error } = await db
    .from('import_events')
    .select('id,source,provider,retailer_id,status,attempted_count,imported_count,updated_count,skipped_count,receipt_ids,confidence_score,error_code,error_message,metadata,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ events: data || [] })
}
