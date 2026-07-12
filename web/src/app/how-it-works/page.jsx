// Public /how-it-works — interactive animated tour (tour.html, the standalone
// deck) embedded in the hero + the /tour illustrated slide deck below it
// (Presentation in embedded+compact mode: one slide at a time, ‹ › nav,
// optional narration). Uses the shared MarketingShell so the header/logo/
// menu/footer match every other marketing page. The old screenshot slideshow
// (Slides.jsx) is retired from this page as of 2026-07-11.

import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import Presentation from './Presentation'

export const metadata = {
  title: 'How GetGuac works — capture, parse, learn from every receipt',
  description: 'A visual walkthrough: snap or forward a receipt, Guac-AI extracts every detail, duplicates get caught, the Smashlist predicts your next shopping trip, Steals finds a better price, and GuacMoney keeps score of every dollar you keep.',
}

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

export default function HowItWorksPage() {
  return (
    <MarketingShell subtitle="how-it-works">
      {/* HERO — the interactive animated tour (served from public/tour.html) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 leading-tight" style={DISPLAY}>
          From a receipt to
          <span className="block bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">real clarity about your money.</span>
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Step through the animated tour — press play and it narrates itself — then flip through the full feature deck slide by slide below.
        </p>
      </section>

      {/* Full-bleed tour embed — full viewport width and near-full height so it
          renders exactly like the fullscreen /tour.html experience. The
          "open fullscreen" link lives INSIDE the deck (shown only when framed). */}
      <section className="w-full">
        {/* Height matched to the slideshow band below (~650px) so the two
            full-bleed sections read as equal siblings. */}
        <div className="relative w-full overflow-hidden border-y border-emerald-900/10" style={{ height: 'min(650px, 80vh)' }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src="/tour.html"
            title="The GetGuac tour — interactive animated walkthrough"
            loading="lazy"
          />
        </div>
      </section>

      {/* SLIDE DECK — the /tour illustrated slides, one at a time with ‹ ›
          nav and optional play/narration (same deck getguac.app/tour shows). */}
      <Presentation embedded compact />

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 text-center">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="btn-primary">Get started free</Link>
          <Link href="/login?demo=1" className="btn-secondary">🔎 Try the demo first</Link>
          <Link href="/download" className="btn-secondary">Get the app</Link>
        </div>
      </section>
    </MarketingShell>
  )
}
