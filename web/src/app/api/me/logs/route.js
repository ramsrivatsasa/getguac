// GET /api/me/logs?limit=200
//
// Returns the signed-in user's most recent client_logs rows, newest first.
// Used to triage mobile bugs (biometric not firing, credential storage,
// app-lock flow) by reading the diagnostic events the mobile app uploaded
// after a failure. Authenticated only — RLS enforces per-user isolation.

import { createApiClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10), 1), 1000)

  const { data, error } = await sb
    .from('client_logs')
    .select('id, created_at, client_ts, session_id, platform, app_version, level, tag, message, meta')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Group by session for readability when you're staring at the response in
  // the browser. Newest session first.
  const bySession = {}
  for (const row of data || []) {
    const s = row.session_id || '(none)'
    if (!bySession[s]) bySession[s] = []
    bySession[s].push(row)
  }
  return Response.json({
    ok: true,
    count: data?.length || 0,
    user_id: user.id,
    sessions: bySession,
  })
}
