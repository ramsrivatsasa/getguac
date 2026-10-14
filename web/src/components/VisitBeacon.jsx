'use client'
// The client half of the first-party visitor counter — see
// supabase/migration_083_site_visits.sql and app/api/visit/route.js.
//
// Sends the pathname, a fixed event type and referrer origin. No query strings,
// form contents or browser identifier. Daily visitor hashes are server-derived.
//
// Fires once per route change because the App Router navigates client-side —
// a single load-time ping would only ever count the landing page, which is the
// one number an ad funnel most needs to be right.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackSiteEvent } from '../lib/track-site-event'

export default function VisitBeacon() {
  const pathname = usePathname()
  const lastSent = useRef(null)

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return
    lastSent.current = pathname

    // The native shell renders these pages in a WebView and has its own
    // analytics; counting here would double every mobile session.
    if (document.cookie.split('; ').some((c) => c === 'guac_embedded=1')) return

    trackSiteEvent('page_view', pathname)
  }, [pathname])

  return null
}
