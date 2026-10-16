'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isGoogleAdsPage, startGoogleAds } from '../lib/google-ads-browser.mjs'

// Mounted only by the public homepage/marketing shell/registration form.
// Never mount this in root or DashboardLayout.
export default function GoogleAdsTag() {
  const pathname = usePathname()
  useEffect(() => {
    try { startGoogleAds() } catch { /* Never block a public page. */ }
    return () => {
      // A loaded third-party library cannot be unloaded by removing its script.
      // Leaving the measured public funnel gets a fresh document, so the
      // private app never inherits advertising listeners through SPA navigation.
      if (window.__ggAdsReady && !isGoogleAdsPage(window.location.pathname)) window.location.replace(window.location.href)
    }
  }, [pathname])
  return null
}
