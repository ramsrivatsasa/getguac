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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
