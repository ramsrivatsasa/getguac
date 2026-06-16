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
// Usage: <AdSlot slot="2468013579" format="auto" className="my-6" />
// Each placement should have its own AdSense slot id (create them in AdSense).

import { useEffect, useRef } from 'react'

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5959691671441705'

export default function AdSlot({ slot = '', format = 'auto', className = '', minHeight = 100, label = 'Advertisement' }) {
  const pushed = useRef(false)

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return
    try {
      // eslint-disable-next-line no-multi-assign
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch { /* adsbygoogle not ready / blocked — leave the box empty */ }
  }, [slot])

  // Placeholder mode — keeps positions visible until AdSense is live.
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

  return (
    <div className={className}>
      <p className="text-[9px] uppercase tracking-[0.2em] text-gray-300 text-center mb-1">{label}</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
