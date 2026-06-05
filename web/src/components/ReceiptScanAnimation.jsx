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
import talkLottie from '../lottie/talk.json'
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

        {/* Mascot anchor. Fixed footprint (= mascot size) so nothing here
            ever shifts when the status text grows — the bubble below is
            absolutely positioned and grows symmetrically from centre. */}
        <div className="relative shrink-0">
          {/* Maracas avocado (mirrored). overflow-visible so the maracas can
              swing past the SVG edge without being clipped. Mirroring lives
              ONLY on this span — the bubble is a sibling so its text stays
              the right way round. */}
          <span className="inline-block overflow-visible px-3" style={{ transform: 'scaleX(-1)' }}>
            <GuacMascotAnimated animation="maracas" size={150} className="overflow-visible" />
          </span>

          {/* Talking speech bubble, overlaid ON TOP of the mascot and centred
              on it. Absolute + left-1/2/-translate-x-1/2 means the status text
              expands evenly around centre, so a longer line never nudges the
              mascot sideways. */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 flex flex-col items-center pointer-events-none">
            <LottieAnimation data={talkLottie} size={64} loop label="Guac is working" fallback="💬" />
            <div className="-mt-1 whitespace-nowrap max-w-[280px] rounded-2xl bg-white shadow-xl px-4 py-2 flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-900">{TICKER[tick]}</span>
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
