import { agentAdmin, schedulerAuthorized } from '../../../../lib/background-agents/server'
import { runAgentBatch } from '../../../../lib/background-agents/runner'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
async function run(request) {
  if (!schedulerAuthorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const sb = agentAdmin()
    const result = await runAgentBatch(sb, { sourceClient: agentAdmin({ deadlineAt: Date.now() + 35000 }) })
    const { error } = await sb.from('agent_runtime').upsert({ id: 'scheduler', last_tick_at: new Date().toISOString(), summary: result })
    if (error) throw error
    return Response.json(result)
  } catch { return Response.json({ error: 'Guac AI scheduler failed. Check database availability and migration 099.' }, { status: 503 }) }
}
export const GET = run
export const POST = run
