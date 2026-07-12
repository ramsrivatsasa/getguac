// Sign-in route that accepts EITHER a username (email_alias) OR an email.
// Resolves username → email server-side, then runs Supabase signInWithPassword
// using the cookie-based SSR client so session cookies are set on the response.
//
// POST /api/auth/sign-in
//   body: { identifier: 'ram' | 'ram@gmail.com', password: '...' }
//
// Always returns generic "Invalid username or password" on failure to avoid
// leaking which usernames exist.

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { verifyTurnstile } from '../../../../lib/turnstile'
export const runtime = 'nodejs'

const VALID_USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/

// The shared try-before-you-register account (its credentials are published
// on the site). CAPTCHA is mandatory for it — the password being public makes
// it a magnet for bots, and Turnstile keeps automated abuse off the shared
// data. Enforced here server-side so a crafted request can't skip the widget.
const DEMO_EMAIL = 'demo@getguac.app'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const GENERIC_INVALID = { error: 'Invalid username or password' }

export async function POST(request) {
  try {
    // Tight rate limit — credential stuffing target
    const rl = await rateLimit(rateKey(request, 'sign-in'), { limit: 10, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'Too many sign-in attempts. Try again in a minute.' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const identifier = String(body?.identifier || '').trim()
    const password = String(body?.password || '')
    if (!identifier || !password) {
      return Response.json(GENERIC_INVALID, { status: 401 })
    }

    let email = identifier
    // If it doesn't look like an email, treat as username → resolve to email.
    if (!identifier.includes('@')) {
      const username = identifier.toLowerCase()
      if (!VALID_USERNAME_RE.test(username)) {
        return Response.json(GENERIC_INVALID, { status: 401 })
      }
      const sb = admin()
      const { data: profile } = await sb
        .from('profiles')
        .select('id')
        .eq('email_alias', username)
        .maybeSingle()
      if (!profile?.id) return Response.json(GENERIC_INVALID, { status: 401 })

      // Fetch the user's auth email by id
      const { data: userRes, error: userErr } = await sb.auth.admin.getUserById(profile.id)
      if (userErr || !userRes?.user?.email) return Response.json(GENERIC_INVALID, { status: 401 })
      email = userRes.user.email
    }

    // Demo account → require a Turnstile token (skips gracefully in local
    // dev when TURNSTILE_SECRET_KEY isn't configured, same as sign-up).
    if (email.toLowerCase() === DEMO_EMAIL) {
      const remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                    || request.headers.get('x-real-ip')
                    || null
      const turnstile = await verifyTurnstile(body?.turnstile_token, remoteIp)
      if (!turnstile.ok) {
        return Response.json({
          error: 'CAPTCHA verification failed. Please try again.',
          captcha_required: true,
        }, { status: 403 })
      }
    }

    // Sign in via the cookie-bound SSR client — this sets the auth cookies on
    // the response so the user is signed in on subsequent requests.
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      // "Email not confirmed" is a security-meaningful case — show it.
      // Supabase returns code: 'email_not_confirmed' (post-2024 SDK) or
      // message contains that phrase. Surface the email so the client can
      // offer a Resend button.
      const msg = (error.message || '').toLowerCase()
      if (error.code === 'email_not_confirmed' || msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        return Response.json({
          error: `Please confirm your email (${email}) before signing in. Check your inbox for the GetGuac confirmation link.`,
          email_not_confirmed: true,
          email,
        }, { status: 403 })
      }
      return Response.json(GENERIC_INVALID, { status: 401 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[auth/sign-in]', err)
    return Response.json({ error: 'Sign-in failed' }, { status: 500 })
  }
}
