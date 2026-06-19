// GET /api/health — lightweight uptime + dependency probe. Returns 200 when the
// app is up and Supabase is reachable, 503 otherwise. Point an uptime monitor
// (or the in-app diagnostics) here to catch dependency outages before users do.
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET() {
  const checks = { app: 'ok', supabase: 'unknown' }
  try {
    const sb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    // Cheap reachability probe — count is HEAD-only, no rows returned.
    const { error } = await sb.from('premium_entitlements').select('user_id', { count: 'exact', head: true })
    checks.supabase = error ? 'down' : 'ok'
  } catch {
    checks.supabase = 'down'
  }
  const healthy = checks.supabase === 'ok'
  return Response.json(
    { status: healthy ? 'ok' : 'degraded', checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
