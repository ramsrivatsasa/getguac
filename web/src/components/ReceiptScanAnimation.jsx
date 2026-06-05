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

      <div className="relative flex flex-col items-center pointer-events-auto">
        {/* Search/scan Lottie — a magnifying glass sweeping a receipt-like
            report with sparkles, shown while we parse. Sits above the
            receipt strip + the rotating Guac-AI parsing report below. */}
        <LottieAnimation data={searchScanLottie} size={190} loop label="Scanning your receipt" fallback="🔍" />

        {/* Rotating ticker copy */}
        <div className="mt-5 pl-2 pr-4 py-1 rounded-full bg-white/95 shadow-md border border-emerald-100 flex items-center gap-2">
          {/* maracas avocado shaking next to the status text (finalized variant) */}
          <GuacMascotAnimated animation="maracas" size={42} />
          <span className="text-sm font-bold text-emerald-900">{TICKER[tick]}</span>
          {count > 1 && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
              {count} receipts
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
