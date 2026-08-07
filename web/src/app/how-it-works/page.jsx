// Public /how-it-works — one unified, animated 22-moment product story.
// The richer Presentation deck carries the motion and pacing of the original
// tour while pairing each chapter with real GetGuac screens.

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
      {/* HERO */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 leading-tight" style={DISPLAY}>
          From a receipt to
          <span className="block bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">real clarity about your money.</span>
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Press play for one connected story: capture a receipt, understand every purchase, protect money after checkout, and make the next shopping trip smarter.
        </p>
      </section>

      {/* The narrated walkthrough. The hero copy above literally says "press
          play", so the video answers it before the deck does.

          🔑 SHOT VERTICAL (1080x1920) and shown in a phone frame on purpose.
          Letterboxing 9:16 into a 16:9 well leaves the content occupying ~30%
          of the frame width with blurred filler either side; cropping to 16:9
          cuts the title and the status chips. A phone frame reads as deliberate,
          and it is the honest format — most of the footage is phone screens.
          Swap for a 16:9 render if one is ever produced.

          preload="metadata" is load-bearing: it fetches a few KB, not 31.9 MB,
          so a visitor who never presses play pays almost nothing. The file is
          written with +faststart (moov before mdat) so it streams on click
          instead of downloading in full first. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 flex justify-center">
        <figure className="m-0 w-full max-w-[320px]">
          <div className="rounded-[2.2rem] overflow-hidden ring-4 ring-emerald-900/10 shadow-2xl bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src="/getguac-how-it-works.mp4"
              poster="/getguac-how-it-works-poster.jpg"
              controls
              playsInline
              preload="metadata"
              className="block w-full h-auto"
            />
          </div>
          <figcaption className="mt-3 text-center text-xs text-gray-500">
            The full walkthrough · 3 min 47 s
          </figcaption>
        </figure>
      </section>

      {/* Unified animated tour — 22 chapters, real web/mobile screens, fixed
          neural narration, keyboard/swipe navigation and reduced-motion care. */}
      <Presentation embedded compact cinematic />

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 text-center">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="btn-primary">Get Started Free</Link>
          <Link href="/login?demo=1" className="btn-secondary">🔎 Try the demo first</Link>
          <Link href="/download" className="btn-secondary">Get the app</Link>
        </div>
      </section>
    </MarketingShell>
  )
}
