import { createApiClient } from '../../../../lib/supabase/server'
import { agentAdmin } from '../../../../lib/background-agents/server'
import { NEWS_TOPICS } from '../../../../lib/background-agents/policy.mjs'
export async function POST(request) {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (body?.kind !== 'news' || !NEWS_TOPICS.includes(body.topic) || ![-1,0,1].includes(body.vote)) return Response.json({ error: 'Invalid feedback' }, { status: 400 })
  const admin = agentAdmin()
  const result = body.vote === 0
    ? await admin.from('agent_feedback').delete().eq('user_id', user.id).eq('kind', 'news').eq('topic', body.topic)
    : await admin.from('agent_feedback').upsert({ user_id: user.id, kind: 'news', topic: body.topic, vote: body.vote, updated_at: new Date().toISOString() })
  if (result.error) return Response.json({ error: 'Could not save preference' }, { status: 503 })
  return Response.json({ ok: true })
}
