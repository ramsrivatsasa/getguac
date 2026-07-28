'use client'
// The client half of the first-party visitor counter — see
// supabase/migration_083_site_visits.sql and app/api/visit/route.js.
//
// Sends nothing but the pathname. No id, no fingerprint, no query string: the
// visitor hash is derived server-side precisely so that no identifier ever
// reaches the browser.
//
// Fires once per route change because the App Router navigates client-side —
// a single load-time ping would only ever count the landing page, which is the
// one number an ad funnel most needs to be right.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitBeacon() {
  const pathname = usePathname()
  const lastSent = useRef(null)

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return
    lastSent.current = pathname

    // The native shell renders these pages in a WebView and has its own
    // analytics; counting here would double every mobile session.
    if (document.cookie.split('; ').some((c) => c === 'guac_embedded=1')) return

    const body = JSON.stringify({ path: pathname })
    try {
      // sendBeacon survives the page being closed mid-request, which a plain
      // fetch does not — it is the difference between counting a bounce and
      // losing it.
      if (navigator.sendBeacon?.(('/api/visit'), new Blob([body], { type: 'application/json' }))) return
    } catch { /* fall through to fetch */ }

    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* a missed count is not worth a console error */ })
  }, [pathname])

  return null
}
