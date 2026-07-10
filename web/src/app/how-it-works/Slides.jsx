'use client'
// Manual slideshow for /how-it-works — real app screenshots + feature copy.
// Replaces the auto-narrated Presentation: no SpeechSynthesis, no auto-scroll,
// just ‹ › navigation (buttons, arrow keys, swipe). Screenshots live in
// public/marketing/slides (webp, generated from the Play-store framed set).

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

const SLIDES = [
  {
    img: '/marketing/slides/01-receipts.webp',
    tag: 'CAPTURE',
    title: 'Snap or email any receipt',
    body: 'Photograph a paper receipt, forward an email receipt, or drop in a PDF. Long grocery receipts and faded ink included.',
  },
  {
    img: '/marketing/slides/02-items.webp',
    tag: 'GUAC-AI',
    title: 'Guac-AI reads every line',
    body: 'In seconds the AI pulls the store, date, total, and every item — no typing, no spreadsheets, no sorting.',
  },
  {
    img: '/marketing/slides/03-dashboard.webp',
    tag: 'SEE CLEARLY',
    title: 'See where it all went',
    body: 'A dashboard of your top stores plus a spending-flow report you can zoom from a full year to a single category.',
  },
  {
    img: '/marketing/slides/08-guacwizard.webp',
    tag: 'KEEP MORE',
    title: 'GuacWizard finds bank bites',
    body: 'Reads your statements and surfaces avoidable interest, fees, and penalties — plain-spoken, never a guilt trip.',
  },
  {
    img: '/marketing/slides/04-steals.webp',
    tag: 'KEEP MORE',
    title: 'Steals — a better price',
    body: 'On the things you rebuy, Steals scouts for a cheaper price so you pay less for the very same item next time.',
  },
  {
    img: '/marketing/slides/05-shopping.webp',
    tag: 'PLAN AHEAD',
    title: 'A Smashlist that builds itself',
    body: 'Your shopping list grows from what you actually buy — shareable with family in a single tap.',
  },
  {
    img: '/marketing/slides/06-returns.webp',
    tag: 'KEEP MORE',
    title: 'Returns & refunds, tracked',
    body: 'A countdown on every return window and price-drop deadline, with 25+ store policies built in.',
  },
  {
    img: '/marketing/slides/07-reports.webp',
    tag: 'WATCH IT GROW',
    title: 'Tax-ready reports',
    body: 'Clean breakdowns for business and charity, ready whenever you need them.',
  },
  {
    img: '/marketing/slides/06-guacanomics.webp',
    tag: 'WATCH IT GROW',
    title: 'Guacanomics',
    body: 'The trends that turn a pile of receipts into real insight about your money.',
  },
]

export default function Slides() {
  const [i, setI] = useState(0)
  const touchX = useRef(null)
  const n = SLIDES.length
  const go = useCallback((d) => setI((p) => (p + d + n) % n), [n])

  // Arrow-key navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const s = SLIDES[i]
  return (
    <section className="pb-14">
      {/* Full-bleed panel — the tinted background stretches across the whole
          viewport (border-y instead of a rounded card); content stays centered. */}
      <div
        className="w-full border-y border-emerald-900/10 bg-[#F7FAF2]"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          {/* Copy */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center" style={DISPLAY}>{i + 1}</span>
              <span className="text-emerald-700 font-extrabold text-xs tracking-[0.14em]">{s.tag}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#15281C] mb-4" style={DISPLAY}>{s.title}</h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#56655B] max-w-lg">{s.body}</p>
          </div>
          {/* Real app screenshot */}
          <div className="flex justify-center">
            <img
              key={s.img}
              src={s.img}
              alt={s.title}
              width={270}
              height={480}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="w-[230px] sm:w-[270px] rounded-[26px] border border-emerald-900/10 shadow-[0_30px_60px_-24px_rgba(20,40,28,0.35)]"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#14532D] text-white px-3 py-2">
            <button aria-label="Previous slide" onClick={() => go(-1)} className="p-2 rounded-full hover:bg-white/15 transition"><ChevronLeft size={18} /></button>
            <span className="text-sm font-bold tabular-nums px-1">{i + 1} / {n}</span>
            <button aria-label="Next slide" onClick={() => go(1)} className="p-2 rounded-full hover:bg-white/15 transition"><ChevronRight size={18} /></button>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {SLIDES.map((_, d) => (
              <button
                key={d}
                aria-label={`Go to slide ${d + 1}`}
                onClick={() => setI(d)}
                className={`h-2 rounded-full transition-all ${d === i ? 'w-6 bg-emerald-600' : 'w-2 bg-emerald-900/20 hover:bg-emerald-900/35'}`}
              />
            ))}
          </div>
        </div>
      </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/features" className="text-emerald-700 font-bold hover:text-emerald-800">See everything GetGuac does →</Link>
      </div>
    </section>
  )
}
