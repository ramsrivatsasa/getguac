// LOCAL-ONLY sign-in shortcut, used by the marketing screenshot scripts.
//
// WHY THIS EXISTS
// ---------------
// /api/auth/sign-in deliberately makes the word-sum challenge MANDATORY for the
// shared demo account (its password is published on the site, so it is a bot
// magnet). That guard is correct and stays. But it also means no capture script
// can sign in, which is why the paired web-/phone- screenshots under
// public/home/goals could not be refreshed and pages ended up borrowing
// unrelated screens.
//
// This route signs the demo user in through Supabase directly and lets the SSR
// client write the same session cookies a normal login would, so /receipts,
// /bills and the rest render exactly as a real user sees them.
//
// WHY IT IS NOT A PRODUCTION HOLE
// -------------------------------
// Three independent gates, ALL of which must pass, and any single one is enough
// to kill it:
//   1. NODE_ENV must not be 'production' — Vercel builds (production AND
//      preview) run with NODE_ENV=production, so this 404s on every deploy.
//   2. The Host header must be localhost / 127.0.0.1 / [::1]. A tunnelled or
//      LAN request carries a different host and gets 404.
//   3. GG_DEV_SIGNIN must be set to '1' in the environment. It is not in
//      .env.local — pass it on the dev-server command line for the capture run
//      and it is gone the moment that server stops.
//
// It returns a bare 404 (not 403) when gated, so the route is indistinguishable
// from a nonexistent path.
//
//   GG_DEV_SIGNIN=1 GG_DIST_DIR=.next-claude npx next dev -p 3001
//   http://localhost:3001/dev-signin?next=/receipts
//
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '../../lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

// Same credentials the login page already publishes for the demo account.
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'

const notFound = () => new NextResponse('Not found', { status: 404 })

// Exported so /dev-login can gate its own render with the identical rules —
// one definition, so the page can never be reachable where the route is not.
export function devSignInAllowed() {
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.GG_DEV_SIGNIN !== '1') return false
  const host = (headers().get('host') || '').split(':')[0]
  return LOCAL_HOSTS.has(host)
}

// POST is what the /dev-login form uses, so the password stays out of the URL.
export async function POST(request) {
  if (!devSignInAllowed()) return notFound()
  // Parsed from the raw body rather than request.formData(): formData() throws
  // on a urlencoded body here and the failure is invisible — it just falls back
  // to the defaults, so `next` was silently ignored and every sign-in landed on
  // /dashboard. URLSearchParams handles what an HTML form actually posts.
  const body = new URLSearchParams(await request.text().catch(() => ''))
  return signIn(new URL(request.url), {
    email: body.get('email'),
    password: body.get('password'),
    next: body.get('next'),
  })
}

export async function GET(request) {
  if (!devSignInAllowed()) return notFound()
  const url = new URL(request.url)
  return signIn(url, {
    email: url.searchParams.get('email'),
    password: url.searchParams.get('password'),
    next: url.searchParams.get('next'),
  })
}

async function signIn(url, params) {
  const email = params.email || DEMO_EMAIL
  const password = params.password || DEMO_PASSWORD

  // Only relative paths — never bounce to another origin.
  const requested = params.next || '/dashboard'
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data?.session) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'sign-in returned no session' },
      { status: 401 },
    )
  }

  // The SSR client wrote the auth cookies while handling signInWithPassword;
  // redirecting now lands on the target page already authenticated.
  return NextResponse.redirect(new URL(next, url.origin), { status: 303 })
}
