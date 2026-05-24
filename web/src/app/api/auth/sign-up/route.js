// Sign-up route that creates an auth user AND claims their chosen username
// (email_alias) atomically. If username is taken or invalid, returns 409/400
// before creating any auth user.
//
// POST /api/auth/sign-up
//   body: { username, email, password, first_name?, last_name?, ... }

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'

const VALID_USERNAME_RE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$/

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  try {
    const rl = rateLimit(rateKey(request, 'sign-up'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'Too many sign-up attempts.' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const username = String(body.username || '').toLowerCase().trim()
    const email    = String(body.email || '').trim()
    const password = String(body.password || '')
    const first_name = body.first_name || null
    const last_name  = body.last_name  || null

    if (!username || !email || !password) {
      return Response.json({ error: 'username, email, and password are required' }, { status: 400 })
    }
    if (!VALID_USERNAME_RE.test(username)) {
      return Response.json({ error: 'Username must be 3–32 chars, lowercase letters/numbers, optional . _ -', status: 'invalid' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const sbAdmin = admin()

    // ── Pre-flight: username availability ──
    const [{ data: reserved }, { data: taken }] = await Promise.all([
      sbAdmin.from('reserved_email_aliases').select('alias').eq('alias', username).maybeSingle(),
      sbAdmin.from('profiles').select('id').eq('email_alias', username).maybeSingle(),
    ])
    if (reserved) return Response.json({ error: 'That username is reserved', status: 'reserved' }, { status: 409 })
    if (taken)    return Response.json({ error: 'That username is already taken', status: 'taken' },  { status: 409 })

    // ── Create the auth user (cookie-bound so session is set immediately) ──
    const sb = createClient()
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          birth_date:        body.birth_date        || null,
          age:               body.age               || null,
          alternative_email: body.alternative_email || null,
          mobile_no:         body.mobile_no         || null,
        },
      },
    })

    if (error) {
      // Common: "User already registered" — surface it
      return Response.json({ error: error.message }, { status: 400 })
    }

    const userId = data?.user?.id
    if (!userId) {
      // Email confirmation flow — user must verify before we can claim username
      return Response.json({
        ok: true,
        needs_email_confirmation: true,
        message: 'Account created — check your email to confirm. Your username will be reserved when you sign in for the first time.',
        pending_username: username,
      })
    }

    // ── Claim the username on the profile row (which the auth trigger creates) ──
    // Use admin so we don't depend on RLS having a profiles INSERT policy that matches.
    const { error: upErr } = await sbAdmin
      .from('profiles')
      .upsert({ id: userId, email_alias: username, alias_set_at: new Date().toISOString(), first_name, last_name }, { onConflict: 'id' })

    if (upErr) {
      console.error('[auth/sign-up] username claim failed:', upErr.message)
      // Don't fail the signup — they can claim it later from /profile
      return Response.json({ ok: true, username_claim_failed: upErr.message })
    }

    return Response.json({ ok: true, username })
  } catch (err) {
    console.error('[auth/sign-up]', err)
    return Response.json({ error: 'Sign-up failed' }, { status: 500 })
  }
}
