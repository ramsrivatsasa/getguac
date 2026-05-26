// POST /api/client-logs
//
// Accepts batched client-side diagnostic events from the web app (and any
// other client that doesn't go through the Supabase JS client directly).
// Each event is forwarded to the existing log_audit RPC so it lands in the
// same audit_log table the mobile DebugLog uses (action='debug_log').
//
// Body: { events: [ { tag, message, meta, level, ts, session_id }, ... ] }
//
// Rationale: lets a global error handler (window.onerror /
// unhandledrejection) post errors without each handler having to know how
// to authenticate against Supabase. We re-use the user's cookie session
// here — RLS still enforces per-user isolation via the SECURITY DEFINER
// log_audit function.

import { createApiClient } from '../../../lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const events = Array.isArray(body?.events) ? body.events : null
  if (!events || events.length === 0) {
    return Response.json({ error: 'No events' }, { status: 400 })
  }
  // Cap to 100 events per request so a runaway loop on the client can't
  // hammer the audit_log table.
  const capped = events.slice(0, 100)

  let written = 0
  const errors = []
  for (const e of capped) {
    try {
      const { error } = await sb.rpc('log_audit', {
        p_action: 'debug_log',
        p_status: e.level || 'info',
        p_detail: {
          tag: e.tag || null,
          message: e.message || '',
          meta: e.meta || null,
          session_id: e.session_id || null,
          app_version: e.app_version || null,
          platform: e.platform || 'web',
          client_ts: e.ts || null,
        },
      })
      if (error) errors.push(error.message)
      else written++
    } catch (err) {
      errors.push(err.message || String(err))
    }
  }
  return Response.json({
    ok: written > 0,
    written,
    skipped: capped.length - written,
    errors: errors.slice(0, 5),
  })
}
