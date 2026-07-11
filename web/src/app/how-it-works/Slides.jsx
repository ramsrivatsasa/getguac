'use client'
// Manual slideshow for /how-it-works — real app screenshots + feature copy.
// One slide per feature, images built from the validated raw captures in
// marketing-assets/screens by scripts/make-howitworks-slides.mjs (webp in
// public/marketing/slides/v2). Navigation: ‹ › buttons, arrow keys, swipe.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

const SLIDES = [
  {
    key: 'receipts',
    tag: 'CAPTURE',
    title: 'Snap or email any receipt',
    body: 'Photograph a paper receipt, forward an email receipt, or drop in a PDF. Long grocery receipts and faded ink included.',
  },
  {
    key: 'items',
    tag: 'GUAC-AI',
    title: 'Guac-AI reads every line',
    body: 'In seconds the AI pulls the store, date, total, and every item — no typing, no spreadsheets, no sorting.',
  },
  {
    key: 'dashboard',
    tag: 'SEE CLEARLY',
    title: 'See where it all went',
    body: 'Your GuacScore, spending anomalies, saved searches, and fresh Steals — the whole money picture on one screen.',
  },
  {
    key: 'guacwizard',
    tag: 'KEEP MORE',
    title: 'GuacWizard finds bank bites',
    body: 'Reads your statements and surfaces avoidable interest, fees, and penalties — plain-spoken, never a guilt trip.',
  },
  {
    key: 'bank',
    tag: 'KEEP MORE',
    title: 'Every statement, every fee',
    body: 'Drop in a bank or card statement and GetGuac tallies every fee and interest charge they slipped in.',
  },
  {
    key: 'steals',
    tag: 'KEEP MORE',
    title: 'Steals — a better price',
    body: 'On the things you rebuy, Steals scouts for a cheaper price so you pay less for the very same item next time.',
  },
  {
    key: 'shopping',
    tag: 'PLAN AHEAD',
    title: 'A Smashlist that builds itself',
    body: 'Your shopping list grows from what you actually buy — with restock heads-ups and store comparisons built in.',
  },
  {
    key: 'stash',
    tag: 'SEE CLEARLY',
    title: 'Your Stash, all in one place',
    body: 'Every product you have ever bought, how often you rebuy it, and the best store to grab it next time.',
  },
  {
    key: 'bites',
    tag: 'PLAN AHEAD',
    title: 'Bites remembers every dish',
    body: 'Every restaurant dish you have tried — like it or pass on it, then send the winners straight to a reorder list.',
  },
  {
    key: 'returns',
    tag: 'KEEP MORE',
    title: 'Returns & refunds, tracked',
    body: 'A countdown on every return window and price-drop deadline, with 25+ store policies built in.',
  },
  {
    key: 'reports',
    tag: 'WATCH IT GROW',
    title: 'Tax-ready reports',
    body: 'Clean breakdowns for business and charity, subscriptions spotted automatically, CSV export whenever you need it.',
  },
  {
    key: 'guacanomics',
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
      {/* Full-bleed panel — plain light green, same tone as the footer. */}
      <div
        className="relative w-full border-y border-emerald-900/10 bg-[#FCFDFA]"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid md:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
          {/* Copy */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center" style={DISPLAY}>{i + 1}</span>
              <span className="text-emerald-700 font-extrabold text-xs tracking-[0.14em]">{s.tag}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#15281C] mb-4" style={DISPLAY}>{s.title}</h2>
            <p className="text-base sm:text-lg leading-relaxed text-[#56655B] max-w-lg">{s.body}</p>
          </div>
          {/* Real app screenshot in a browser-style card */}
          <div className="rounded-2xl border border-emerald-900/10 bg-white shadow-[0_30px_60px_-24px_rgba(20,40,28,0.35)] overflow-hidden">
            <div className="flex items-center gap-1.5 px-3.5 h-7 bg-[#F2F5F0] border-b border-emerald-900/10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
            </div>
            <img
              key={s.key}
              src={`/marketing/slides/v2/${s.key}-web.webp`}
              alt={s.title}
              width={1200}
              height={750}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="w-full block"
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
