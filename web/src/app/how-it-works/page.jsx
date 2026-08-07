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
