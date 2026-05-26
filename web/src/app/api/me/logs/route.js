// GET /api/me/logs?limit=200
//
// Returns the signed-in user's most recent debug_log entries from
// audit_log, newest first. The mobile app uploads via the existing
// log_audit RPC with action='debug_log' (avoids a dedicated table +
// migration). Each row's `detail` jsonb holds tag/message/meta/session_id/
// app_version/platform/client_ts.

import { createApiClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10), 1), 1000)

  const { data, error } = await sb
    .from('audit_log')
    .select('id, created_at, status, detail')
    .eq('user_id', user.id)
    .eq('action', 'debug_log')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Flatten audit_log shape back into the mobile event shape and group by
  // session so the response is easy to skim.
  const events = (data || []).map(r => ({
    id: r.id,
    server_ts: r.created_at,
    client_ts: r.detail?.client_ts ?? null,
    session_id: r.detail?.session_id ?? null,
    platform: r.detail?.platform ?? null,
    app_version: r.detail?.app_version ?? null,
    level: r.status ?? 'info',
    tag: r.detail?.tag ?? null,
    message: r.detail?.message ?? null,
    meta: r.detail?.meta ?? null,
  }))

  const bySession = {}
  for (const ev of events) {
    const s = ev.session_id || '(none)'
    if (!bySession[s]) bySession[s] = []
    bySession[s].push(ev)
  }
  return Response.json({
    ok: true,
    count: events.length,
    user_id: user.id,
    sessions: bySession,
  })
}
