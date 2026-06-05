'use client'
// Full-screen scan animation that pops while a receipt is parsing.
//
// Visual: a centered search/scan Lottie (a magnifying glass sweeping a
// report with a $ coin + sparkles) over a soft white-glass backdrop,
// plus a rotating Guac-AI status report ("Looking for the store…",
// "Tallying line items…", "Saving to your stash…") so the wait feels
// like progress. Multi-receipt batches show a "{count} receipts" badge.
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
    const id = setInterval(() => setTick((t) => (t + 1) % TICKER.length), 1400)
    return () => clearInterval(id)
  }, [count])

  if (!count) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {/* Soft frosted-glass backdrop — readable + light, not the
          heavy emerald wash that competed with the character. */}
      <div className="absolute inset-0 bg-white/75 backdrop-blur-md" />

      <div className="relative flex items-center justify-center gap-3 pointer-events-auto">
        {/* Search/scan Lottie — magnifier sweeping the report */}
        <LottieAnimation data={searchScanLottie} size={190} loop label="Scanning your receipt" fallback="🔍" />

        {/* Maracas avocado (mirrored). overflow-visible + side padding so the
            FULL mascot shows — the maracas swing past the SVG edge and were
            getting clipped before. */}
        <span className="inline-block shrink-0 overflow-visible px-3" style={{ transform: 'scaleX(-1)' }}>
          <GuacMascotAnimated animation="maracas" size={150} className="overflow-visible" />
        </span>

        {/* Speech bubble — looks like the mascot is announcing the live
            status ("Saving to your Stash…"). Tail points left toward it. */}
        <div className="relative self-start mt-8 max-w-[230px] rounded-2xl bg-white shadow-lg px-5 py-2.5 flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-900">{TICKER[tick]}</span>
          {count > 1 && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
              {count} receipts
            </span>
          )}
          <span className="absolute left-0 top-7 -translate-x-full w-0 h-0 border-[9px] border-transparent border-r-white" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
