import { runNewsAgent } from './news.js'
import { runFinancialAgent } from './financial.js'
import { runShoppingAgent } from './shopping.js'
import { retryDelay } from './policy.mjs'
import { runConfiguredMajorPromotions } from '../major-promotion-agent.mjs'

export async function runAgentBatch(sb, { budgetMs = 35000, maxJobs = 8, sourceClient = sb } = {}) {
  const deadlineAt = Date.now() + budgetMs
  const summary = { succeeded: 0, partial: 0, blocked: 0, failed: 0, lostLease: 0 }
  for (let count = 0; count < maxJobs && Date.now() < deadlineAt - 10000; count++) {
    const { data: jobs, error } = await sb.rpc('agent_claim', { p_limit: 1 })
    if (error) throw new Error('Guac AI queue is unavailable. Apply migration 099.')
    const job = jobs?.[0]
    if (!job) break
    let result = null, status = 'succeeded', message = null
    try {
      if (job.kind === 'inbox') throw new Error('Inbox agent retired; use the existing email pipeline')
      if (job.kind === 'news') {
        // Independent bounded source checks share the existing global lease.
        // A slow news fetch must not continually starve due offer checks.
        const [news, promotions] = await Promise.allSettled([
          runNewsAgent({ sb: sourceClient }), runConfiguredMajorPromotions(sourceClient),
        ])
        if (news.status === 'rejected') throw news.reason
        result = news.value
        result.majorPromotions = promotions.status === 'fulfilled' ? promotions.value : { status: 'unavailable', checked: 0 }
      }
      else if (job.kind === 'shopping') result = await runShoppingAgent({ sb: sourceClient, userId: job.user_id })
      else result = await runFinancialAgent({ sb: sourceClient, userId: job.user_id, kind: job.kind })
      if (job.kind === 'news' && !result.items?.length) throw new Error('No current news sources available')
      status = result.status || (result.partial ? 'partial' : 'succeeded')
      if (status !== 'succeeded') message = 'Some upstream sources are unavailable; the last available data is retained.'
    } catch {
      status = 'failed'
      message = 'Refresh failed. Check source availability and schema; Guac AI will retry.'
    }
    const { data: finished, error: finishError } = await sb.rpc('agent_finish', {
      p_scope: job.scope_key, p_token: job.lease_token, p_status: status,
      p_result: result, p_error: message, p_delay: retryDelay(job.kind, job.attempts, status),
    })
    if (finishError) throw new Error('Could not persist Guac AI completion; lease recovery will retry.')
    if (!finished) summary.lostLease++
    else summary[status]++
  }
  return summary
}
