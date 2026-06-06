'use client'
// Full-screen scan animation that pops while a receipt is parsing.
//
// Visual: a centered search/scan Lottie (a magnifying glass sweeping a
// report with a $ coin + sparkles) beside the maracas-avocado mascot,
// over a soft white-glass backdrop, plus an animated rounded speech
// bubble that cycles a Guac-AI status report ("Looking for the store…",
// "Tallying line items…", "Saving to your Stash 🥑") so the wait feels
// like progress. Multi-receipt batches show a "{count} receipts" badge.
//
// The bubble is ABSOLUTELY positioned over the mascot, so however long
// the status line gets it never nudges the mascot sideways. It pops in,
// floats gently, and each new line fades up — "the mascot is talking".
//
// Mounts at the very top of the z-stack — beats toasts, modals, FABs.
// Self-hides instantly when `count` drops to 0.

import { useEffect, useState } from 'react'
import LottieAnimation from './LottieAnimation'
import searchScanLottie from '../lottie/search-scan.json'
import GuacMascotAnimated from './GuacMascotAnimated'

const TICKER = [
  'Looking for the store name…',
  'Reading the date and total…',
  'Tallying line items…',
  'Categorising your purchases…',
  'Saving to your Stash 🥑',
]

export default function ReceiptScanAnimation({ count = 0 }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!count) return
    const id = setInterval(() => setTick((t) => (t + 1) % TICKER.length), 1600)
    return () => clearInterval(id)
  }, [count])

  if (!count) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {/* Soft frosted-glass backdrop — readable + light. */}
      <div className="absolute inset-0 bg-white/75 backdrop-blur-md" />

      {/* Scoped keyframes for the speech bubble. Motion is modelled on the
          talk.json the user shared: a bouncy scale-up entrance (the json's
          bubble overshoots to ~120% before settling) + three typing dots
          that pop in sequentially (the json's staggered dot reveal), looped
          here as a live "typing…" indicator. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ggBubblePop  { 0%{transform:scale(.6);opacity:0} 55%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes ggBubbleBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes ggTextIn     { 0%{transform:translateY(6px);opacity:0} 100%{transform:translateY(0);opacity:1} }
        @keyframes ggDot        { 0%,70%,100%{transform:translateY(0) scale(.85);opacity:.45} 35%{transform:translateY(-5px) scale(1.25);opacity:1} }
        .gg-bubble       { animation: ggBubblePop .42s cubic-bezier(.34,1.56,.64,1) both; }
        .gg-bubble-bob   { animation: ggBubbleBob 3s ease-in-out infinite; }
        .gg-bubble-text  { animation: ggTextIn .32s ease both; }
        .gg-dot          { animation: ggDot 1.15s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gg-bubble, .gg-bubble-bob, .gg-bubble-text, .gg-dot { animation: none !important; }
        }
      `}} />

      <div className="relative flex items-center justify-center gap-8 pointer-events-auto">
        {/* Search/scan Lottie — magnifier sweeping the report */}
        <LottieAnimation data={searchScanLottie} size={190} loop label="Scanning your receipt" fallback="🔍" />

        {/* Mascot anchor. Fixed footprint (= mascot size) so nothing here
            shifts when the status line grows — the bubble is absolutely
            positioned out of flow. */}
        <div className="relative shrink-0">
          {/* Maracas avocado. overflow-visible so the maracas swing past the
              SVG edge without being clipped. Mirror lives only on this span. */}
          <span className="inline-block overflow-visible px-3" style={{ transform: 'scaleX(-1)' }}>
            <GuacMascotAnimated animation="maracas" size={160} className="overflow-visible" />
          </span>

          {/* Animated rounded speech bubble, floating above the mascot. Anchored
              near the mascot's top centre and grows rightward — out of flow, so
              a longer line never moves the mascot. */}
          <div className="gg-bubble absolute bottom-full left-1/2 -translate-x-1/3 mb-3 pointer-events-none">
            <div className="gg-bubble-bob whitespace-nowrap rounded-full bg-white shadow-xl ring-1 ring-emerald-50 px-5 py-2.5 flex items-center gap-2.5">
              {/* Typing dots — talk.json's sequential dot pop, looped */}
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="gg-dot w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                <span className="gg-dot w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                <span className="gg-dot w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
              </span>
              <span key={tick} className="gg-bubble-text text-base font-extrabold text-emerald-900">
                {TICKER[tick]}
              </span>
              {count > 1 && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  {count} receipts
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
