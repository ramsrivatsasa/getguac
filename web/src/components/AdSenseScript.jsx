import Script from 'next/script'

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

export default function AdSenseScript() {
  if (!CLIENT) return null
  return (
    <Script
      id="adsbygoogle-init"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
      data-ad-frequency-hint="120s"
      crossOrigin="anonymous"
    />
  )
}
