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
import { verifyChallenge } from '../../../../lib/demo-challenge'
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

    // Demo account → arithmetic challenge instead of Turnstile.
    //
    // 🔴 WHY THE SWAP (measured 2026-08-02 on /login?demo=1):
    // Turnstile pulled 0.5–1.3 MB and took ~2.2s on a fast connection and
    // ~6.0s on a mid-tier Android over 4G, with the submit button disabled
    // the entire time. Most visitors here arrive from a paid Facebook click.
    // The demo credentials are PUBLISHED ON /join, so there is no secret to
    // protect — the gate only needs to stop trivial scripted hammering.
    //
    // 🔒 REGISTRATION KEEPS TURNSTILE. Do not copy this to sign-up: that is
    // where bot defence actually matters (fake accounts, mailbox
    // provisioning, Migadu quota), and a word-sum will not carry it.
    if (email.toLowerCase() === DEMO_EMAIL) {
      const challenge = verifyChallenge(body?.demo_token, body?.demo_answer, body?.website)
      if (!challenge.ok) {
        return Response.json({
          error: challenge.reason === 'wrong-answer'
            ? 'That answer was not right. Try the new one.'
            : 'Check expired — please try again.',
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
