import { createApiClient } from '../../../../lib/supabase/server'
import { agentAdmin } from '../../../../lib/background-agents/server'
import { MAJOR_CATALOG_KEY, majorPromotionConfig, scanMajorPromotions } from '../../../../lib/major-promotion-agent.mjs'
export const maxDuration = 30
async function adminSession() {
  const sb = await createApiClient(); const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  const profile = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (profile.error || !profile.data?.is_admin) return { error: Response.json({ error: 'Admin only' }, { status: 403 }) }
  return { user, sb }
}
export async function GET() {
  const session = await adminSession(); if (session.error) return session.error
  return Response.json({ config: majorPromotionConfig(session.user.user_metadata?.major_promotion_scan), result: session.user.user_metadata?.major_promotion_scan_result || null })
}
export async function POST(request) {
  const session = await adminSession(); if (session.error) return session.error
  const body = await request.json().catch(() => ({}))
  if (body.action === 'scan') {
    try { return Response.json({ result: await scanMajorPromotions(agentAdmin(), session.user.id, { ...session.user.user_metadata, major_promotion_scan_result: null }) }) } catch { return Response.json({ error: 'Scan could not complete. Existing captured offers are retained.' }, { status: 503 }) }
  }
  if (body.action !== 'save') return Response.json({ error: 'Invalid action.' }, { status: 400 })
  const config = majorPromotionConfig(body.config)
  if (Array.isArray(body.config?.urls) && body.config.urls.some(url => String(url).trim() && !config.urls.includes(String(url).trim()))) return Response.json({ error: 'Use at most six approved official merchant URLs.' }, { status: 400 })
  if (config.enabled && !config.urls.length) return Response.json({ error: 'Choose approved merchant source pages before enabling scans.' }, { status: 400 })
  const { error } = await session.sb.auth.updateUser({ data: { major_promotion_scan: config } })
  if (error) return Response.json({ error: 'Scan settings could not be saved.' }, { status: 503 })
  if (!config.enabled || !config.autoPublish) {
    const clear = await agentAdmin().from('shopping_cache').upsert({ cache_key: MAJOR_CATALOG_KEY, payload: { offers: [], checkedAt: new Date().toISOString() }, updated_at: new Date().toISOString() }, { onConflict: 'cache_key' })
    if (clear.error) return Response.json({ error: 'Checks are disabled, but published offers could not be cleared. Retry saving controls.' }, { status: 503 })
  }
  return Response.json({ config })
}
