'use client'
// Google Ads engine — a single reusable ad slot.
//
// Two modes, switched by env (no code change to go live):
//   • NEXT_PUBLIC_ADSENSE_CLIENT set (e.g. "ca-pub-1234567890123456")
//     → renders a real Google AdSense unit and pushes it to adsbygoogle.
//   • not set (default today) → renders a tasteful "Ad" placeholder so the
//     ad positions are visible and the layout is final; real ads drop in
//     the moment the publisher id is configured (and the script in layout.jsx
//     loads automatically).
//
// Fill handling: AdSense stamps the <ins> with data-ad-status="filled" or
// "unfilled" once it decides. Until a unit actually fills we keep the slot
// fully collapsed — no reserved blank box, no orphan "Advertisement" label.
// This is what happens before the site is approved, when there's no ad
// inventory, or when an ad blocker swallows the request. The label only
// appears once a real ad is on screen.
//
// Usage: <AdSlot slot="2468013579" format="auto" className="my-6" />
// Each placement should have its own AdSense slot id (create them in AdSense).

import { useEffect, useRef, useState } from 'react'
import { usePremium } from '../lib/usePremium'

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5959691671441705'

// tier 1 = shown to everyone (including premium). tier 2 = removed for premium
// subscribers (the ad-free perk they pay for via in-app purchase).
export default function AdSlot({ slot = '', format = 'auto', className = '', minHeight = 100, label = 'Advertisement', tier = 1 }) {
  const pushed = useRef(false)
  const insRef = useRef(null)
  // null = AdSense hasn't decided yet · 'filled' = ad on screen · 'unfilled' = collapse
  const [status, setStatus] = useState(null)
  // true when running inside the GetGuac app's WebView (the /embed handover
  // drops a `guac_embedded` cookie). AdSense is browser-only — serving it in an
  // app WebView violates AdSense policy (ban risk), so we suppress every slot
  // there; the native shell shows an AdMob banner in its place.
  const [embedded, setEmbedded] = useState(false)
  const premium = usePremium()
  const hideForPremium = tier === 2 && premium

  useEffect(() => {
    // Inside the native app's WebView → never request an AdSense ad (policy).
    if (typeof document !== 'undefined' &&
        document.cookie.split('; ').some((c) => c === 'guac_embedded=1')) {
      setEmbedded(true)
      return
    }
    if (!CLIENT || !slot || pushed.current || hideForPremium) return
    try {
      // eslint-disable-next-line no-multi-assign
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch { /* adsbygoogle not ready / blocked */ }

    const ins = insRef.current
    if (!ins) return
    const read = () => {
      const s = ins.getAttribute('data-ad-status')
      if (s === 'filled') setStatus('filled')
      else if (s === 'unfilled') setStatus('unfilled')
    }
    // AdSense sets data-ad-status asynchronously once it resolves the request.
    const obs = new MutationObserver(read)
    obs.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
    read()
    // Fallback: if it never resolves (script blocked, not yet approved, no
    // inventory) and the unit has no height, collapse so we don't leave a
    // blank reserved box under the label.
    const t = setTimeout(() => {
      const s = ins.getAttribute('data-ad-status')
      if (s === 'unfilled' || (!s && ins.offsetHeight < 10)) setStatus('unfilled')
    }, 4000)
    return () => { obs.disconnect(); clearTimeout(t) }
  }, [slot, hideForPremium])

  // Tier-2 ad + premium subscriber, or inside the app WebView → render nothing.
  if (hideForPremium || embedded) return null

  // Placeholder mode — keeps positions visible until a publisher id is set.
  if (!CLIENT || !slot) {
    return (
      <div
        className={`relative rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 flex flex-col items-center justify-center gap-1 text-gray-300 ${className}`}
        style={{ minHeight }}
        aria-hidden="true"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Ad</span>
        <span className="text-[9px] tracking-wide">your ad could be here</span>
      </div>
    )
  }

  // No ad served → render nothing visible (but keep the <ins> mounted so
  // AdSense can still report a late fill).
  const filled = status === 'filled'
  return (
    <div className={className} style={status === 'unfilled' ? { display: 'none' } : undefined}>
      {filled && (
        <p className="text-[9px] uppercase tracking-[0.2em] text-gray-300 text-center mb-1">{label}</p>
      )}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: filled ? minHeight : 0 }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
