// Public username availability check for the registration page.
// Same logic as /api/email/check but doesn't require an authenticated session.
//
// GET /api/auth/check-username?username=ram
//   → { username, status: 'available'|'taken'|'reserved'|'invalid' }

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'

const VALID_RE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$/

// Service-role admin client — bypasses RLS so we can check both the profiles
// table and the reserved_email_aliases table from an unauthenticated request.
// Don't EVER return rows from this client — only boolean availability.
function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'check-username-public'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const url = new URL(request.url)
    const raw = url.searchParams.get('username') || ''
    const username = raw.toLowerCase().trim()

    if (!username) return Response.json({ username: '', status: 'invalid' })
    if (!VALID_RE.test(username)) return Response.json({ username, status: 'invalid' })

    const sb = admin()
    const [{ data: reserved }, { data: taken }] = await Promise.all([
      sb.from('reserved_email_aliases').select('alias').eq('alias', username).maybeSingle(),
      sb.from('profiles').select('id').eq('email_alias', username).maybeSingle(),
    ])
    if (reserved) return Response.json({ username, status: 'reserved' })
    if (taken)    return Response.json({ username, status: 'taken' })
    return Response.json({ username, status: 'available' })
  } catch (err) {
    console.error('[auth/check-username]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
