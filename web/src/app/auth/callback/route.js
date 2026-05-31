// OAuth callback — exchanges the auth-code for a session cookie, then
// (for first-time OAuth users) provisions the profile row with an
// auto-generated username derived from the OAuth email.
//
// Used by every OAuth provider Supabase supports. Google is the only
// one wired today; Apple / Microsoft etc. will land on the same route.
//
// Flow for an existing user:
//   1. Tap Continue with Google → consent → redirect ?code=xxx here
//   2. exchangeCodeForSession sets the session cookie
//   3. Profile row already exists → redirect to ?next=/dashboard
//
// Flow for a first-time Google user (no profile row yet):
//   1-2 same as above.
//   3. Check if a profiles row exists for auth.users.id. If not:
//      a. Read first_name, last_name from google's name fields
//      b. Generate a candidate username from the email prefix
//         ("alex@gmail.com" → "alex"). If taken, append digits.
//      c. Insert the profile row (the auth trigger may already have
//         created it — UPSERT-style so we don't error on race).
//      d. Best-effort provision the Migadu mailbox via the existing
//         finish-signup endpoint — failures are non-fatal; the
//         user can claim a username from /profile later.
//   4. Redirect to /dashboard.

import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createApiClient } from '../../../lib/supabase/server'

export const runtime = 'nodejs'

const RESERVED_USERNAMES = new Set([
  'admin', 'root', 'support', 'help', 'info', 'staff', 'noreply',
  'no-reply', 'postmaster', 'abuse', 'mailer-daemon', 'getguac', 'guac',
])

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Slug the local-part of an email into a candidate username:
// strips dots, plus-tags, anything non-alphanumeric, lowercases.
function usernameFromEmail(email) {
  const local = String(email || '').split('@')[0] || 'user'
  const tagless = local.split('+')[0]
  const slug = tagless
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24)
  return slug || 'user'
}

async function pickAvailableUsername(sb, baseSlug) {
  // Try the slug as-is first, then slug2, slug3, ... up to slug999.
  // 999 collisions on a per-prefix basis is more than enough; we'll
  // burn one ms per check via the unique index.
  if (RESERVED_USERNAMES.has(baseSlug)) baseSlug = `${baseSlug}1`
  let candidate = baseSlug
  for (let n = 0; n < 999; n++) {
    const { data } = await sb
      .from('profiles')
      .select('id')
      .eq('email_alias', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${baseSlug}${n + 2}`
  }
  // Fallback — extremely unlikely; append a 6-char random suffix.
  return `${baseSlug}${Math.random().toString(36).slice(2, 8)}`
}

function splitName(fullName) {
  if (!fullName) return { first: '', last: '' }
  const parts = String(fullName).trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/dashboard'
  const errorParam = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  // Google can bounce us back here with ?error=access_denied if the user
  // cancels the consent screen. Send them back to /login with a toast hint.
  if (errorParam) {
    const back = new URL('/login', url.origin)
    back.searchParams.set('oauth_error', errorDescription || errorParam)
    return NextResponse.redirect(back)
  }

  if (!code) {
    const back = new URL('/login', url.origin)
    back.searchParams.set('oauth_error', 'Missing auth code')
    return NextResponse.redirect(back)
  }

  const sb = createApiClient()
  const { error: exchErr } = await sb.auth.exchangeCodeForSession(code)
  if (exchErr) {
    const back = new URL('/login', url.origin)
    back.searchParams.set('oauth_error', exchErr.message)
    return NextResponse.redirect(back)
  }

  // First-time OAuth user provisioning — best-effort. If anything in
  // this block fails, the user still lands on the dashboard with a
  // working session, just missing the profile row. /profile prompts
  // them to claim a username in that case.
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const adminSb = admin()
      const { data: existing } = await adminSb
        .from('profiles')
        .select('id, email_alias, first_name')
        .eq('id', user.id)
        .maybeSingle()

      if (!existing || !existing.email_alias) {
        const meta = user.user_metadata || {}
        const { first, last } = splitName(meta.full_name || meta.name)
        const base = usernameFromEmail(user.email)
        const username = await pickAvailableUsername(adminSb, base)

        // UPSERT so a race with the auth trigger doesn't error. The
        // profiles primary key is the auth.users.id.
        //
        // NOTE: profiles table does NOT have an avatar_url column today
        // (no migration creates it). Surfacing the Google profile photo
        // is a future enhancement that needs a schema migration first;
        // for now we only persist what the table actually has.
        const upsertPayload = {
          id: user.id,
          email_alias: username,
          first_name: existing?.first_name || first || meta.given_name || null,
          last_name: last || meta.family_name || null,
        }
        const { error: upsertErr } = await adminSb
          .from('profiles')
          .upsert(upsertPayload, { onConflict: 'id' })
        if (upsertErr) {
          console.error('[auth/callback] profile upsert failed:', upsertErr)
        }

        // Best-effort Migadu mailbox provisioning. Mirrors the path
        // the email-signup flow takes via /api/auth/finish-signup;
        // if the mailbox provisioner isn't configured (no Migadu
        // creds in env) this just no-ops.
        try {
          await fetch(new URL('/api/auth/finish-signup', url.origin), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Forward the user's bearer for the API to verify.
              cookie: request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ username }),
          }).catch(() => {})
        } catch {}
      }
    }
  } catch (err) {
    console.error('[auth/callback] profile-provision non-fatal:', err)
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
