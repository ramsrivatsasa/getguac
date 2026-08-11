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
import AdSenseScript from './AdSenseScript'

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5959691671441705'

// tier 1 = shown to everyone (including premium). tier 2 = removed for premium
// subscribers (the ad-free perk they pay for via in-app purchase).
// An unfilled slot collapses by HEIGHT, not display:none. The <ins> stays
// mounted so AdSense can still report a late fill, but display:none gives the
// wrapper zero width — so that late push measures availableWidth=0 and throws
// "TagError: adsbygoogle.push() error: No slot size for availableWidth=0".
// Collapsing the height hides it just as completely while leaving a real width
// to measure. Every ad-bearing page was logging that error, not just /learn.
const COLLAPSED = { height: 0, overflow: 'hidden', margin: 0, padding: 0 }

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
    if (!CLIENT || !slot || hideForPremium) return
    const ins = insRef.current
    if (!ins) return

    let ro = null
    let obs = null
    let t = null

    const read = () => {
      const s = ins.getAttribute('data-ad-status')
      if (s === 'filled') setStatus('filled')
      else if (s === 'unfilled') setStatus('unfilled')
    }

    // Watch for the fill decision. Started only AFTER a successful push — the
    // countdown means "this request has had long enough to resolve", so arming
    // it before the request exists would collapse a slot that was merely late
    // to lay out.
    //
    // React runs effects twice in dev (StrictMode); the `pushed` guard must
    // never short-circuit this part, or the second run leaves no observer and
    // an "unfilled" unit is never collapsed (that used to leave a 280px blank
    // box inside the card).
    const watchFill = () => {
      // AdSense sets data-ad-status asynchronously once it resolves the request.
      obs = new MutationObserver(read)
      obs.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
      read()
      // Fallback: if it never resolves, collapse. A real ad ALWAYS stamps
      // data-ad-status="filled", so anything still undecided after a few seconds
      // is not going to fill — script blocked, site not yet approved, no
      // inventory, or an ad blocker. Note we must NOT keep the slot just because
      // it has height: adsbygoogle expands a responsive <ins> to its reserved
      // size the moment it mounts, so an unapproved site would otherwise be left
      // with a permanent blank box (this was leaving ~250px of dead white space
      // inside every game's start / game-over card).
      t = setTimeout(() => {
        if (ins.getAttribute('data-ad-status') !== 'filled') setStatus('unfilled')
      }, 2500)   // a working unit resolves well inside a second
    }

    // Only request an ad once the <ins> actually has width. adsbygoogle measures
    // the element at push time, so pushing at 0px logs the long-standing
    //   "adsbygoogle.push() error: No slot size for availableWidth=0"
    // and that unit never fills — Google does not retry it. Zero width happens
    // whenever a slot mounts inside something not yet laid out: a collapsed
    // parent, a game's start / game-over card, a not-yet-visible tab.
    // Push at most once per slot.
    const tryPush = () => {
      if (pushed.current) return true
      if (!ins.offsetWidth) return false
      try {
        // eslint-disable-next-line no-multi-assign
        (window.adsbygoogle = window.adsbygoogle || []).push({})
        pushed.current = true
      } catch { /* adsbygoogle not ready / blocked */ }
      return pushed.current
    }

    if (tryPush()) {
      watchFill()
    } else if (typeof ResizeObserver !== 'undefined') {
      // Wait for the first non-zero width, then request.
      ro = new ResizeObserver(() => {
        if (tryPush()) { ro.disconnect(); ro = null; watchFill() }
      })
      ro.observe(ins)
    } else {
      // No ResizeObserver (very old browser) — fall back to the old behaviour
      // rather than never requesting an ad at all.
      pushed.current = true
      try {
        // eslint-disable-next-line no-multi-assign
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch { /* adsbygoogle not ready / blocked */ }
      watchFill()
    }

    return () => {
      if (ro) ro.disconnect()
      if (obs) obs.disconnect()
      if (t) clearTimeout(t)
    }
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
    <div
      className={className}
      style={status === 'unfilled' ? COLLAPSED : undefined}
    >
      {/* The loader lives with the slot, not in the root layout — see
          AdSenseScript. Rendering it here is what keeps Google off every
          signed-in page. Deduped by id, so N slots still load it once. */}
      <AdSenseScript />
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
