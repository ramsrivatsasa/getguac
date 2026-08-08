// Public /features page — organized around the product arc (See clearly →
// Keep more → Watch it grow), with Monarch-grade feature blocks. Benefit-first,
// calm, never preachy. Server-rendered.
import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import {
  ScanLine, Mail, Brain, FolderTree, BarChart3, Gauge, Sparkles, RefreshCw,
  Undo2, Tag, ShoppingCart, Target, ShieldCheck, Eye, Wallet, TrendingUp,
} from 'lucide-react'

export const metadata = {
  title: 'Features: Scan, Score & Save Money',
  description:
    'See where your money goes, catch hidden fees and subscriptions, never miss a refund, find better prices, and watch your savings grow. Everything GetGuac does — free.',
  alternates: { canonical: '/features' },
}

const ACCENTS = {
  emerald: { tag: 'bg-emerald-100 text-emerald-800', bar: 'border-emerald-500', icon: 'bg-emerald-100 text-emerald-700', ring: 'hover:border-emerald-200' },
  amber: { tag: 'bg-amber-100 text-amber-800', bar: 'border-amber-500', icon: 'bg-amber-100 text-amber-700', ring: 'hover:border-amber-200' },
  violet: { tag: 'bg-violet-100 text-violet-800', bar: 'border-violet-500', icon: 'bg-violet-100 text-violet-700', ring: 'hover:border-violet-200' },
}

// Real screens, the same set /how-it-works and the homepage use. /features
// listed fourteen capabilities as icon tiles and showed not one of them
// working, which made the most concrete page on the site the most abstract.
// Each arc now opens with the screen you would actually be looking at.
//
// Paired web + phone deliberately: GetGuac is used on both, the mobile app is
// the thing being downloaded, and one flat browser shot implies otherwise.
const SECTIONS = [
  {
    arc: 'See clearly', accent: 'emerald', icon: Eye,
    blurb: 'Capture everything automatically, and finally see where your money goes.',
    shot: {
      web: '/home/goals/web-receipts.webp',
      phone: '/home/goals/phone-guac-ai.webp',
      alt: 'The GetGuac receipts list with every line item read out of a photographed receipt',
      caption: 'Every receipt, read and filed — the store, the date, the total and each item.',
    },
    features: [
      { icon: ScanLine, title: 'Snap or email any receipt', body: 'Photograph a paper receipt, forward an email receipt, or drop in a PDF. Long grocery receipts and faded ink included.' },
      { icon: Mail, title: 'Your free @getguac.app inbox', body: 'Every account gets a permanent address. Forward receipts to you+g@getguac.app and they file themselves — and it shields your real email from spam.' },
      { icon: Brain, title: 'Guac-AI reads every line', body: 'In seconds, the AI pulls the store, date, total, and every item — no typing, no spreadsheets, no sorting.' },
      { icon: FolderTree, title: 'Auto-categorize & de-dupe', body: 'Spending sorts itself into clean categories, and duplicate receipts collapse into a single clean row.' },
      { icon: BarChart3, title: 'See where it all went', body: 'A dashboard of your top stores plus a spending-flow report you can zoom from a full year to a single category.' },
    ],
  },
  {
    arc: 'Keep more', accent: 'amber', icon: Wallet,
    blurb: 'Catch the waste, claw back the refunds, and pay less for the same things.',
    shot: {
      web: '/home/goals/web-returns.webp',
      phone: '/home/goals/phone-worth-it.webp',
      alt: 'The GetGuac returns screen counting down the return window on a recent purchase',
      caption: 'Return windows, price drops and repeat charges, each with the deadline attached.',
    },
    features: [
      { icon: Gauge, title: 'GuacScore & Worth-It', body: 'Rate a purchase in a tap; a single 0–100 score shows how well you’re spending and sharpens as the regrets drop away.' },
      { icon: Sparkles, title: 'GuacWizard finds bank bites', body: 'Reads your statements and surfaces avoidable interest, fees, and penalties — plain-spoken, never a guilt trip.' },
      { icon: RefreshCw, title: 'Recurring & subscriptions', body: 'Every repeating charge in one place, with what’s due next — so you can cancel the ones you forgot you’re paying for.' },
      { icon: Undo2, title: 'Returns & refunds, tracked', body: 'A countdown on every return window and price-drop deadline, with 25+ store policies built in. Never leave money behind.' },
      { icon: Tag, title: 'Steals — a better price', body: 'On the things you rebuy, Steals scouts for a cheaper price so you pay less for the very same item next time.' },
      { icon: ShoppingCart, title: 'Shareable shopping lists', body: 'A list that builds itself from what you actually buy — shareable with family in a single tap.' },
    ],
  },
  {
    arc: 'Watch it grow', accent: 'violet', icon: TrendingUp,
    blurb: 'Turn the money you save into the things that actually matter to you.',
    shot: {
      web: '/marketing/slides/v2/reports-web.webp',
      phone: '/home/goals/phone-guacmoney.webp',
      alt: 'A GetGuac spending report next to the GuacMoney total on the mobile app',
      caption: 'The money you kept, counted — and the trends behind it.',
    },
    features: [
      { icon: Target, title: 'Savings that add up', body: 'GuacMoney tracks the real money you keep — refunds claimed, better prices found, regrets skipped — and watches it grow toward what matters.' },
      { icon: TrendingUp, title: 'Reports & Guacanomics', body: 'Clean, tax-ready breakdowns for business and charity, and the trends that turn receipts into real insight.' },
      { icon: ShieldCheck, title: 'Private by design', body: 'No bank login required, row-level security on every record, and we never sell your data. Your guac stays in your bowl.' },
    ],
  },
]

// 🔴 ASCII ONLY, FLAT SELECTORS, NO COMMENTS INSIDE THIS STRING — React escapes
// the text children of a style element, which is both a hydration mismatch and
// invalid CSS on the server pass. scripts/check-style-blocks.mjs enforces it.
const FEAT_CSS = `
.ft-tour { display: grid; grid-template-columns: 1.05fr .95fr; align-items: center; gap: 42px; margin-bottom: 34px; }
.ft-tour-flip .ft-shot { order: 2; }
.ft-frame { position: relative; padding-bottom: 46px; padding-right: 30px; }
.ft-shot-web { width: 100%; border-radius: 18px; border: 1px solid #E4EDE4; box-shadow: 0 26px 54px -34px rgba(16,40,26,.55); display: block; background: #fff; }
.ft-shot-phone { position: absolute; right: 0; bottom: 0; width: 27%; min-width: 118px; border-radius: 20px; border: 1px solid #E4EDE4; box-shadow: 0 20px 44px -22px rgba(16,40,26,.6); display: block; background: #fff; }
.ft-cap { margin: 14px 0 0; font-size: 13px; color: #65736a; }
@media (max-width: 900px) {
  .ft-tour { grid-template-columns: 1fr; gap: 26px; }
  .ft-tour-flip .ft-shot { order: 0; }
}
`

// The caption sits OUTSIDE .ft-frame. Inside, it shared a stacking context with
// the absolutely-positioned phone, which sits at the frame's bottom-right and
// covered the last third of every caption.
function TourShot({ shot }) {
  return (
    <figure className="ft-shot" style={{ margin: 0 }}>
      <div className="ft-frame">
        <img className="ft-shot-web" src={shot.web} alt={shot.alt} width={1200} height={780} loading="lazy" decoding="async" />
        {/* aria-hidden: the phone is the same product as the screen behind it,
            so a second description would just repeat the first aloud. */}
        <img className="ft-shot-phone" src={shot.phone} alt="" aria-hidden="true" width={360} height={757} loading="lazy" decoding="async" />
      </div>
      <figcaption className="ft-cap">{shot.caption}</figcaption>
    </figure>
  )
}

export default function FeaturesPage() {
  return (
    <MarketingShell subtitle="features">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={12} /> Everything GetGuac does
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 mt-4 leading-tight">
          From a receipt to
          <span className="block bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">real clarity about your money.</span>
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          See clearly, keep more, and watch it grow — every tool that helps you understand
          your spending and keep more of it. All free.
        </p>
        <div className="mt-7 flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="btn-primary">Get Started Free</Link>
          <Link href="/tour" className="btn-secondary">Watch the tour</Link>
        </div>
      </section>

      <style>{FEAT_CSS}</style>

      {/* Arc sections. Each opens with a real screen of the thing it describes,
          then the capabilities underneath it — the /how-it-works pattern, minus
          the animation, because this page is a reference rather than a story.
          Sides alternate so three consecutive sections do not read as one
          repeated block. */}
      {SECTIONS.map((sec, si) => {
        const A = ACCENTS[sec.accent]
        return (
          <section key={sec.arc} className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex items-center gap-3 mb-6">
              <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-extrabold uppercase tracking-wider ${A.tag}`}>
                <sec.icon size={15} /> {sec.arc}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className={si % 2 ? 'ft-tour ft-tour-flip' : 'ft-tour'}>
              <TourShot shot={sec.shot} />
              {/* Blurb only. This carried a list of the feature TITLES, which
                  the cards immediately below then repeated with their bodies —
                  the same six lines twice, one screenful apart. */}
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-800">{sec.blurb}</p>
                <p className="mt-3 text-[15px] leading-6 text-gray-600">
                  {sec.features.length} of the tools that do it are below.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sec.features.map((f) => (
                <div key={f.title} className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all border-t-4 ${A.bar} ${A.ring}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${A.icon}`}>
                    <f.icon size={22} />
                  </div>
                  <h3 className="font-bold text-gray-900 mt-4">{f.title}</h3>
                  <p className="text-sm text-gray-600 mt-1.5 leading-snug">{f.body}</p>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-600 p-8 sm:p-12 text-center text-white shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Stop overpaying. Start saving smarter.</h2>
          <p className="text-emerald-50/90 mt-3 max-w-2xl mx-auto">
            No subscription, no card, no catch. Snap your first receipt and see where your money really goes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="inline-flex items-center rounded-full bg-lime-400 text-emerald-900 font-black px-7 py-3 hover:bg-lime-300 transition">Get Started Free</Link>
            <Link href="/download" className="inline-flex items-center rounded-full bg-white/15 text-white font-bold px-7 py-3 hover:bg-white/25 transition">Get the app</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
