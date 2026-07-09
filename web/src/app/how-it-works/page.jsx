// Public /how-it-works — YouTube walkthrough video in the hero + a manual
// screenshot slideshow (Slides.jsx) below it. Uses the shared MarketingShell
// so the header/logo/menu/footer match every other marketing page. The old
// auto-narrated Presentation is retired (snapshot: web/backups/how-it-works-2026-07-09).

import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import Slides from './Slides'

export const metadata = {
  title: 'How GetGuac works — capture, parse, learn from every receipt',
  description: 'A visual walkthrough: snap or forward a receipt, Guac-AI extracts every detail, duplicates get caught, the Smashlist predicts your next shopping trip, Steals finds a better price, and GuacMoney keeps score of every dollar you keep.',
}

// YouTube id of the walkthrough video. Empty string hides the player.
const HOW_IT_WORKS_YOUTUBE_ID = '-xJ9kULN4Q4'
const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

export default function HowItWorksPage() {
  return (
    <MarketingShell subtitle="how-it-works">
      {/* HERO — the video walkthrough */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          ▶ Watch how it works
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 mt-4 leading-tight" style={DISPLAY}>
          From a receipt to
          <span className="block bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">real clarity about your money.</span>
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Watch the full walkthrough, then flip through the app screen by screen below.
        </p>
        {HOW_IT_WORKS_YOUTUBE_ID && (
          <div className="relative mt-8 overflow-hidden rounded-3xl border border-emerald-900/10 shadow-2xl" style={{ paddingTop: '56.25%' }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${HOW_IT_WORKS_YOUTUBE_ID}`}
              title="How GetGuac works — full walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
      </section>

      {/* SCREENSHOT SLIDESHOW — real app screens, manual navigation */}
      <Slides />

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 text-center">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="btn-primary">Get started free</Link>
          <Link href="/download" className="btn-secondary">Get the app</Link>
        </div>
      </section>
    </MarketingShell>
  )
}
