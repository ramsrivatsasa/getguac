'use client'
// Landing "Watch how GetGuac works" card. Clicking it opens the captioned
// product-tour video in an on-page modal/lightbox (NOT a full browser window
// or a navigation away). Shows all the feature options as chips.
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, X } from 'lucide-react'

const TAGS = [
  'Snap receipts', 'AI reads every line', 'GuacScore', 'Spending anomalies',
  'Bank bites', 'Steals', 'Returns', 'Smashlist', 'GuacWizard', 'Reports',
]

export default function WatchVideoCard() {
  const [open, setOpen] = useState(false)

  // Close on Escape; lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full text-left rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-600 p-1 shadow-xl hover:shadow-2xl hover:scale-[1.005] transition-all"
      >
        <div className="rounded-[1.4rem] bg-white/5 backdrop-blur-sm p-6 sm:p-10 flex items-center gap-6 flex-wrap">
          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-lime-400 text-emerald-900 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="ml-1.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-[260px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
              <Sparkles size={11} /> Product tour · plays here · ~1 min
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-3 leading-tight">
              Watch how GetGuac works
            </h2>
            <p className="text-emerald-50/90 mt-2 max-w-2xl text-sm sm:text-base">
              Snap a receipt → Guac-AI reads every line → GetGuac scores it, catches anomalies,
              hunts bank bites, and finds you a better price. The whole flow, in a minute.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden sm:flex items-center text-white/80 group-hover:text-white group-hover:translate-x-1 transition text-sm font-bold">
            Play <ArrowRight size={18} className="ml-2" />
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 anim-fadeup"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center"
          >
            <X size={22} />
          </button>
          <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src="/how-it-works.mp4"
              controls
              autoPlay
              playsInline
              className="max-h-[82vh] w-auto max-w-full rounded-2xl shadow-2xl bg-black ring-1 ring-white/10"
            />
            <Link
              href="/demo"
              className="mt-4 text-sm font-semibold text-emerald-200 hover:text-white"
            >
              Explore every feature with screenshots →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
