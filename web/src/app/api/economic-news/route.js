import { NextResponse } from 'next/server'
import { createApiClient } from '../../../lib/supabase/server'
import { readNewsSnapshot, runNewsAgent } from '../../../lib/background-agents/news'
import { personalizeNews } from '../../../lib/background-agents/policy.mjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  let snapshot = null, sb = null
  try { sb = await createApiClient(); snapshot = await readNewsSnapshot(sb) } catch {}
  let result = snapshot || await runNewsAgent({})
  if (sb) {
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data, error } = await sb.from('agent_feedback').select('kind,topic,vote')
          .eq('user_id', user.id).eq('kind', 'news').abortSignal(AbortSignal.timeout(2000))
        if (!error) result = personalizeNews(result, data || [])
      }
    } catch { /* Public facts remain available if preference storage is unavailable. */ }
  }
  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' } })
}
