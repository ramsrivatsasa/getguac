// GET /api/me/logs?limit=200&kind=debug|error_report|both (default: both)
//
// Returns the signed-in user's most recent diagnostic rows from audit_log.
// Two row types are produced by the mobile + web apps:
//   action='debug_log'    — every event from DebugLog (ring buffer uploads)
//   action='error_report' — user-submitted reports via Profile -> Report a
//                           problem and the batch failure dialog
//
// Response groups debug events by session_id, and lists error reports
// separately at the top so they're easy to skim during triage.

import { createApiClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10), 1), 1000)
  const kind = url.searchParams.get('kind') || 'both'

  const wantsDebug = kind === 'debug' || kind === 'both'
  const wantsReports = kind === 'error_report' || kind === 'both'

  // Pull both in parallel. Reports stay small (handful per session) so we
  // don't bother capping them separately.
  const [debugRes, reportRes] = await Promise.all([
    wantsDebug
      ? sb.from('audit_log')
          .select('id, created_at, status, detail')
          .eq('user_id', user.id)
          .eq('action', 'debug_log')
          .order('created_at', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
    wantsReports
      ? sb.from('audit_log')
          .select('id, created_at, status, detail')
          .eq('user_id', user.id)
          .eq('action', 'error_report')
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (debugRes.error) return Response.json({ error: debugRes.error.message }, { status: 500 })
  if (reportRes.error) return Response.json({ error: reportRes.error.message }, { status: 500 })

  // Error reports rendered first — these are the "did the user actually
  // hit Send?" rows the developer is usually looking for.
  const reports = (reportRes.data || []).map(r => ({
    id: r.id,
    server_ts: r.created_at,
    subject: r.detail?.subject ?? null,
    description: r.detail?.description ?? null,
    context: r.detail?.context ?? null,
    platform: r.detail?.platform ?? null,
    app_version: r.detail?.app_version ?? null,
    session_id: r.detail?.session_id ?? null,
    recent_events_count: Array.isArray(r.detail?.recent_events)
      ? r.detail.recent_events.length
      : 0,
    // Inline the recent_events so you can see the full context without a
    // second query — they're already capped at 50 per report on the client.
    recent_events: r.detail?.recent_events ?? [],
  }))

  // Flatten debug events into the mobile event shape and group by session.
  const events = (debugRes.data || []).map(r => ({
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
    user_id: user.id,
    reports_count: reports.length,
    events_count: events.length,
    reports,
    sessions: bySession,
  })
}
