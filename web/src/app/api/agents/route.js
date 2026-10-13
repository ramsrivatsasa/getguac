import { createApiClient } from '../../../lib/supabase/server'
import { agentAdmin } from '../../../lib/background-agents/server'
import { AGENT_KINDS, personalizeNews } from '../../../lib/background-agents/policy.mjs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const reads = await Promise.all([
    sb.from('agent_jobs').select('kind,enabled,status,last_error,last_started_at,last_finished_at,next_run_at,requested_version,processed_version').in('kind', AGENT_KINDS),
    sb.from('agent_snapshots').select('kind,result,refreshed_at').in('kind', AGENT_KINDS),
    sb.from('agent_feedback').select('kind,topic,vote'),
    sb.from('agent_runtime').select('last_tick_at').eq('id', 'scheduler').maybeSingle(),
  ])
  if (reads.some(r => r.error)) return Response.json({ error: 'Guac AI is not configured or the database is unavailable.' }, { status: 503 })
  const [jobs, snapshots, feedback, heartbeat] = reads.map(r => r.data)
  const lastTickAt = heartbeat?.last_tick_at || null
  return Response.json({ jobs, snapshots: snapshots.map(s => s.kind === 'news' ? { ...s, result: personalizeNews(s.result, feedback) } : s), feedback,
    scheduler: { lastTickAt, stale: !lastTickAt || Date.now() - Date.parse(lastTickAt) > 20 * 60 * 1000 } }, { headers: { 'Cache-Control': 'private, no-store' } })
}
export async function POST(request) {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!AGENT_KINDS.includes(body?.kind) || !['refresh','pause','resume'].includes(body?.action)) return Response.json({ error: 'Invalid agent action' }, { status: 400 })
  if (body.kind === 'news') return Response.json({ error: 'News is a shared public feed; its schedule is managed centrally.' }, { status: 400 })
  const admin = agentAdmin()
  if (body.action === 'refresh') {
    const { data: job, error: lookupError } = await admin.from('agent_jobs').select('enabled').eq('user_id', user.id).eq('kind', body.kind).maybeSingle()
    if (lookupError) return Response.json({ error: 'Could not check agent status' }, { status: 503 })
    if (job?.enabled === false) return Response.json({ error: 'Resume this agent before refreshing.' }, { status: 409 })
    const { error } = await admin.rpc('agent_enqueue', { p_user: user.id, p_kinds: [body.kind] })
    if (error) return Response.json({ error: 'Could not queue refresh' }, { status: 503 })
  } else {
    const { error } = await admin.from('agent_jobs').update({ enabled: body.action === 'resume', ...(body.action === 'resume' ? { next_run_at: new Date().toISOString() } : {}) }).eq('user_id', user.id).eq('kind', body.kind)
    if (error) return Response.json({ error: 'Could not update agent' }, { status: 503 })
  }
  return Response.json({ ok: true, queued: body.action !== 'pause' })
}
