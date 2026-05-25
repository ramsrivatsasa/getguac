import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

// Default server client — reads the user's session from cookies (set by the
// Next.js SSR auth flow when they sign in via the web app).
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// API client that accepts EITHER:
//   - the standard Next.js cookie-based session (web app, /dashboard, etc.)
//   - OR a Bearer access token in the Authorization header (mobile app + any
//     third-party API user)
//
// Use this in /api/* routes that mobile calls. If the request carries
// "Authorization: Bearer <token>", we mint a Supabase client bound to that
// token (so auth.getUser() returns the right person and RLS still applies).
// Otherwise we fall back to the cookie-based createClient().
export function createApiClient() {
  const headerStore = headers()
  const authHeader = headerStore.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(\S+)$/i)
  if (match) {
    const accessToken = match[1]
    // Anon key client + the user's access token attached to every request.
    // RLS policies key off auth.uid() which the access token carries.
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )
  }
  return createClient()
}
