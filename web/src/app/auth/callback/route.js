// OAuth callback — exchanges the auth-code for a session cookie.
//
// Used by every OAuth provider Supabase supports. Google is the only
// one wired today; Apple / Microsoft etc. will land on the same route.
//
// Flow:
//   1. User taps "Continue with Google" → signInWithOAuth() opens the
//      Google consent screen with redirect_to=https://getguac.app/auth/callback
//   2. Google redirects here with ?code=xxx (PKCE auth-code flow)
//   3. We call supabase.auth.exchangeCodeForSession(code), which sets the
//      session cookie on this response
//   4. Redirect to ?next= (or /dashboard) so the dashboard layout finds the
//      session and lets the user through

import { NextResponse } from 'next/server'
import { createApiClient } from '../../../lib/supabase/server'

export const runtime = 'nodejs'

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
  const { error } = await sb.auth.exchangeCodeForSession(code)
  if (error) {
    const back = new URL('/login', url.origin)
    back.searchParams.set('oauth_error', error.message)
    return NextResponse.redirect(back)
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
