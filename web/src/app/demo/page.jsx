import Link from 'next/link'
import GenieAvocado from '../../components/GenieAvocado'
import MarketingShell from '../../components/MarketingShell'

// Public marketing showcase — hero video + real-screenshot feature sections.
// Screenshots live in /public/showcase (captured from the live app on the
// John-Doe demo account). The video is the captioned product tour.
export const metadata = {
  title: 'See GetGuac in action — every dollar earns its smash',
  description:
    'Snap a receipt and GetGuac finds the savings you’d miss — cheaper prices, refunds you’re owed, spending anomalies, and the bank bites quietly draining your money.',
}

const FEATURES = [
  { img: '/showcase/receipts.png', title: 'Snap any receipt',
    body: 'Paper, email, or a screenshot — add it in a tap. No manual entry, ever.' },
  { img: '/showcase/items.png', title: 'AI reads every line',
    body: 'Guac-AI pulls the store, date, total, tax, and every line item in seconds.' },
  { img: '/showcase/dashboard.png', title: 'Scored — and anomalies caught', tag: 'Anomalies',
    body: 'Your GuacScore rates how smart your spending is, and spending anomalies flag the overspends the moment they happen — a category spike, a missed recurring charge, a merchant running 4× your usual.' },
  { img: '/showcase/guacwizard.png', title: 'GuacWizard hunts bank bites', tag: 'Bank bites',
    body: 'Hidden fees, interest, and leaks — surfaced and explained in plain language. One wave, and no sneaky charge survives the spell.' },
  { img: '/showcase/steals.png', title: 'Find a cheaper price',
    body: 'Steals scans the live web for a better price before you buy — based on what you actually shop for.' },
  { img: '/showcase/returns.png', title: 'Claw back refunds',
    body: 'Tracks every return window and the refunds you’re actually owed, so money doesn’t slip away.' },
  { img: '/showcase/bites.png', title: 'Rate what you buy',
    body: 'Keep the wins, skip the regrets — every dish and product you’ve tried, one tap to reorder the good ones.' },
  { img: '/showcase/stash.png', title: 'Your whole Stash',
    body: 'Everything you’ve bought, searchable in one place, with the best price per item.' },
  { img: '/showcase/shopping.png', title: 'Your Shopping List, automatic',
    body: 'GetGuac predicts what you’re about to run out of and builds your shopping list for you.' },
  { img: '/showcase/reports.png', title: 'Taxes, sorted',
    body: 'Business and charity spend, categorized and export-ready when tax time comes.' },
]

export default function DemoPage() {
  return (
    <MarketingShell subtitle="demo">
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="uppercase tracking-wider text-xs font-bold text-lime-200">See it in action</p>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 leading-[1.1]">Every dollar<br />earns its smash.</h1>
            <p className="text-emerald-100 mt-5 text-lg leading-relaxed">
              Snap a receipt, and GetGuac finds the savings you’d miss — cheaper prices,
              refunds you’re owed, spending anomalies, and the bank bites quietly draining
              your money.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href="/register" className="px-6 py-3 rounded-full bg-white text-emerald-800 font-bold hover:bg-emerald-50 shadow-lg">Get Started Free</Link>
              <a href="#features" className="px-6 py-3 rounded-full ring-2 ring-white/40 font-bold hover:bg-white/10">Explore features</a>
            </div>
            <p className="text-emerald-200/80 text-xs mt-5">Free · No card · Your data, RLS-locked.</p>
          </div>
          <div className="flex justify-center">
            <div className="rounded-[2.2rem] overflow-hidden ring-4 ring-white/20 shadow-2xl bg-black w-[290px]">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src="/how-it-works.mp4" controls playsInline preload="metadata"
                poster="/showcase/dashboard.png" className="block w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-16 sm:py-20 space-y-16 sm:space-y-24">
        {FEATURES.map((f, i) => (
          <div key={f.title}
            className={`flex flex-col items-center gap-8 sm:gap-14 sm:flex-row ${i % 2 ? 'sm:flex-row-reverse' : ''}`}>
            <div className="flex-1 flex justify-center w-full">
              <div className="rounded-[1.6rem] overflow-hidden ring-1 ring-gray-200 shadow-xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.img} alt={f.title} className="block w-full max-w-[290px]" loading="lazy" />
              </div>
            </div>
            <div className="flex-1">
              {f.tag && (
                <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full px-3 py-1 mb-3">{f.tag}</span>
              )}
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">{f.title}</h2>
              <p className="text-gray-600 mt-3 text-lg leading-relaxed">{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Closing CTA */}
      <section className="bg-gradient-to-br from-lime-50 to-emerald-50 border-t border-emerald-100">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-1"><GenieAvocado size={150} /></div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Ready to GetGuac?</h2>
          <p className="text-gray-600 mt-3 text-lg">Money’s wingman — free, private, and on your side.</p>
          <Link href="/register" className="inline-block mt-7 px-8 py-3.5 rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg">Create your account</Link>
          <p className="mt-6 text-sm text-gray-500">
            Prefer the slideshow? <Link href="/how-it-works" className="text-emerald-700 font-semibold hover:underline">Watch the narrated tour →</Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}
