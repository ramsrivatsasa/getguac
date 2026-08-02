'use client'
// Meta (Facebook) Pixel — conversion measurement for the web ad funnel.
//
// WHY THIS EXISTS: the App-installs campaigns reported 0 installs against 21
// link clicks, and Play Console showed only ~2 store-listing visitors in the
// same period. With no pixel there was no way to tell a broken destination
// apart from a real drop-off, and Meta's delivery algorithm had nothing to
// optimise toward either. Web conversions are directly measurable in a way
// iOS app installs (SKAdNetwork) are not.
//
// Inert until NEXT_PUBLIC_FB_PIXEL_ID is set in the Vercel environment, so
// merging this changes nothing until you decide to switch it on.
//
// Only fires for real visitors: skipped inside the app's WebView (the native
// shell has its own analytics and double-counts otherwise).

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || ''

export default function MetaPixel() {
  const pathname = usePathname()

  // The App Router does client-side navigation, so the pixel's own initial
  // PageView only ever counts the first page. Fire one per route change.
  useEffect(() => {
    if (!PIXEL_ID) return
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
    window.fbq('track', 'PageView')
  }, [pathname])

  if (!PIXEL_ID) return null
  if (typeof document !== 'undefined' &&
      document.cookie.split('; ').some((c) => c === 'guac_embedded=1')) return null

  // 🔴 lazyOnload, NOT afterInteractive — measured 2026-08-02.
  // fbevents.js (395 KB) + the pixel config (263 KB) are 658 KB, 27% of the
  // whole page payload, and afterInteractive puts them in the hydration path.
  // On a throttled mid-tier Android (what Facebook traffic actually is) /join
  // took 8.5s to DOMContentLoaded and 13.4s to load — against a ~3s abandon
  // threshold. The campaign showed 116 link clicks but only 62 landing page
  // views: 47% of paid clicks bounced before the page rendered.
  //
  // ⚠️ The tradeoff, so nobody "fixes" this back: lazyOnload fires PageView
  // later, so a visitor who leaves almost instantly may not be counted. That
  // is the right trade here — those visitors were already not being counted,
  // because at 8.5s the pixel had not loaded for them either. Getting the page
  // under 3s means MORE people reach the pixel, not fewer.
  // CompleteRegistration is unaffected: it fires on an explicit user action,
  // long after any load strategy has settled, and the server-side CAPI path in
  // lib/meta-capi.js is the authoritative one for signups regardless.
  return (
    <Script id="meta-pixel" strategy="lazyOnload">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');
      `}
    </Script>
  )
}

// Call at the moment a signup actually succeeds — this is the event the ad
// campaign should optimise for. Safe to call when the pixel is off.
export function trackSignup(method = 'unknown') {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'CompleteRegistration', { method })
    }
  } catch { /* never let analytics break a signup */ }
}
