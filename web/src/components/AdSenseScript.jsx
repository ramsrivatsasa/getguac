'use client'
import { useEffect } from 'react'

// The AdSense loader, rendered only where an ad can actually appear.
//
// It used to live in the root layout, which meant Google's script — and its
// cookies, and doubleclick.net alongside it — loaded on every page of the site,
// including /dashboard and the receipts screens. For an app whose pitch is that
// your purchases stay private, an ad network on the page listing your purchases
// is the wrong default, and the privacy policy had claimed for months that no
// such tracker existed anywhere.
//
// Rendering it here instead costs nothing: no page under (dashboard) contains a
// single <AdSlot/>, so no ad revenue moves. The pages that do carry ads —
// articles, marketplace, plan, resources, the arcade — mount this alongside
// them and behave exactly as before.
//
// data-ad-frequency-hint is the minimum gap Google keeps between the arcade's
// fullscreen interstitials. afterInteractive so it never blocks first paint.
// next/script dedupes on `id`, so several AdSlots on one page load it once.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5959691671441705'

// ⚠️ THE IN-APP SKIP IS A PRIVACY PROMISE, NOT A PREFERENCE.
// /privacy §8 says no ad tracker runs on a signed-in page. The mobile WebView
// renders these same public pages to a signed-in user, so Google must not load
// there. That check used to live in MarketingShell as `cookies().get(...)`,
// which is a dynamic API: it made all 548 arcade pages and 27 marketing pages
// impossible to prerender or CDN-cache, so every crawler hit ran a serverless
// render (~82k invocations / 12h, measured 2026-08-03).
//
// Reading the cookie HERE, on the client, keeps the promise and keeps the HTML
// byte-identical for everyone — so the page can be static.
//
// 🔒 Renders null on the server AND on the first client render, then decides
// after mount. Do not "optimise" that into reading the cookie during render:
// that is exactly what caused React #418/#423/#425 in the currency sweep.
export default function AdSenseScript() {
  useEffect(() => {
    const embedded = document.cookie.split('; ').some((c) => c === 'guac_embedded=1')
    if (embedded || !CLIENT || document.getElementById('adsbygoogle-init')) return
    const script = document.createElement('script')
    script.id = 'adsbygoogle-init'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`
    script.dataset.adFrequencyHint = '120s'
    document.head.appendChild(script)
  }, [])

  return null
}
