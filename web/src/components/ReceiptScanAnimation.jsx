'use client'
// Full-screen scan animation that pops while a receipt is parsing.
//
// Visual: a centered "receipt strip" SVG with a moving scan-line, our
// avocado mascot perched on top with a tiny floating magnifying glass,
// and a rotating status copy ("Looking for the store…", "Tallying line
// items…", "Saving to your stash…") so the wait feels like progress.
//
// Mounts at the very top of the z-stack — beats toasts, modals, FABs.
// Self-hides instantly when `count` drops to 0.

import { useEffect, useState } from 'react'

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
      {/* Dim background so the rest of the UI fades but stays click-
          through (pointer-events-none on the wrapper). */}
      <div className="absolute inset-0 bg-emerald-950/55 backdrop-blur-sm" />

      <div className="relative flex flex-col items-center pointer-events-auto">
        {/* Floating mascot above the receipt */}
        <div className="relative mascot-bob">
          <div className="text-7xl drop-shadow-lg">🥑</div>
          <span className="absolute -right-4 -bottom-2 text-3xl loupe-swing" aria-hidden>🔍</span>
        </div>

        {/* Receipt strip with traveling scan line */}
        <div className="mt-4 relative receipt-pop">
          <svg width="180" height="220" viewBox="0 0 180 220" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            {/* Paper */}
            <defs>
              <linearGradient id="r-paper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff"/>
                <stop offset="100%" stopColor="#f8fafc"/>
              </linearGradient>
            </defs>
            <path d="M10 6 H170 V200 L160 210 L150 200 L140 210 L130 200 L120 210 L110 200 L100 210 L90 200 L80 210 L70 200 L60 210 L50 200 L40 210 L30 200 L20 210 L10 200 Z"
              fill="url(#r-paper)" stroke="#e2e8f0" strokeWidth="1.5"/>
            {/* Header bar */}
            <rect x="30" y="22" width="120" height="10" rx="3" fill="#15803d" opacity="0.9"/>
            {/* Lines */}
            {[48, 64, 80, 96, 112, 128, 144].map((y, i) => (
              <rect key={y} x="22" y={y} width={i % 2 === 0 ? 130 : 100} height="6" rx="2" fill="#e5e7eb"/>
            ))}
            {/* Total bar */}
            <rect x="22" y="166" width="140" height="14" rx="3" fill="#fef3c7"/>
            <rect x="100" y="170" width="50" height="6" rx="2" fill="#d97706"/>
          </svg>
          {/* The scan line — emerald gradient that sweeps top-to-bottom */}
          <div className="absolute inset-x-2 top-2 bottom-3 overflow-hidden rounded-md pointer-events-none">
            <div className="scan-line absolute left-0 right-0 h-1.5 rounded-full bg-gradient-to-r from-transparent via-emerald-400/90 to-transparent shadow-[0_0_18px_4px_rgba(52,211,153,0.6)]" />
          </div>
        </div>

        {/* Rotating ticker copy */}
        <div className="mt-5 px-4 py-2 rounded-full bg-white/95 shadow-md border border-emerald-100 flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-900">{TICKER[tick]}</span>
          {count > 1 && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
              {count} receipts
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        .mascot-bob   { animation: mascot-bob 1.8s ease-in-out infinite; }
        .loupe-swing  { display: inline-block; transform-origin: 60% 40%; animation: loupe-swing 1.4s ease-in-out infinite; }
        .receipt-pop  { animation: receipt-pop 360ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .scan-line    { animation: scan-line 1.6s linear infinite; }

        @keyframes mascot-bob {
          0%, 100% { transform: translateY(0)  rotate(-1deg); }
          50%      { transform: translateY(-8px) rotate(1.5deg); }
        }
        @keyframes loupe-swing {
          0%, 100% { transform: rotate(-12deg); }
          50%      { transform: rotate(18deg); }
        }
        @keyframes receipt-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes scan-line {
          0%   { transform: translateY(-20%); opacity: 0.2; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(220%); opacity: 0.2; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mascot-bob, .loupe-swing, .receipt-pop, .scan-line { animation: none; }
        }
      `}</style>
    </div>
  )
}
