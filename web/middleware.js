import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/receipts') ||
    pathname.startsWith('/rewards') || pathname.startsWith('/shopping') ||
    pathname.startsWith('/car-miles') || pathname.startsWith('/profile') || pathname.startsWith('/admin')

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Android device → /download redirect ───────────────────────────────
  // First-time Android visitors hitting the homepage get nudged to the
  // download page. We set a cookie so subsequent visits respect their
  // browsing intent. Only fires on the bare `/` path so deep-links work.
  if (pathname === '/') {
    const ua = (request.headers.get('user-agent') || '').toLowerCase()
    const isAndroid = /android/.test(ua) && !/wv\)/.test(ua)  // skip in-app webviews
    const dismissed = request.cookies.get('seen_download')?.value === '1'
    if (isAndroid && !dismissed) {
      const url = request.nextUrl.clone()
      url.pathname = '/download'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

// ⚠️ ALLOWLIST, NOT A CATCH-ALL. Do not widen this back to `/(.*)`.
//
// This middleware returns a response that can carry a refreshed Supabase auth
// cookie. Any response that might Set-Cookie is user-specific, so Next marks it
// `Cache-Control: private, no-store` and Vercel's CDN refuses to cache it —
// which means every request it touches runs a serverless function, even one for
// a page that was PRERENDERED at build time.
//
// Measured 2026-08-03: the old catch-all matcher put all 548 arcade URLs behind
// this. Production served `/games/[slug]` (a build-time `●` page) as
// `source: serverless`, `X-Vercel-Cache: MISS` on every single hit — 212
// req/min sustained, ~81k function invocations per 12h, against 36 real
// visitors. 177 of 194 routes reported `ƒ` for the same reason.
//
// So it now runs ONLY where the code above can actually change the outcome:
// the dashboard redirect, the auth-page redirect, and the `/` Android nudge.
// Everything else — games, articles, marketing, /join — serves from the CDN.
//
// Session refresh is not lost: the browser SDK refreshes tokens client-side,
// and any navigation INTO a guarded route re-enters this middleware.
export const config = {
  matcher: [
    '/',                      // Android → /download nudge
    '/login/:path*',          // isAuthPage
    '/register/:path*',       // isAuthPage
    '/dashboard/:path*',      // isDashboard ↓
    '/receipts/:path*',
    '/rewards/:path*',
    '/shopping/:path*',
    '/car-miles/:path*',
    '/profile/:path*',
    '/admin/:path*',
  ],
}
