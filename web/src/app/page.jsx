import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import {
  Sparkles, Wand2, Star, Gift, ShoppingCart, Tag, Shield, ArrowRight, Package, BadgeDollarSign, Banknote, Brain, Trophy, Smile, PieChart
} from 'lucide-react'
import GuacMascot from '../components/GuacMascot'

export default async function Home() {
  // Logged-in users skip the landing page
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-gray-800 font-sans">
      {/* NAV */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-emerald-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-xl">🥑</div>
            <div className="leading-none">
              <div className="text-lg font-black tracking-tight text-emerald-900">GetGuac</div>
              <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">your money's wingman</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <a href="#brain"    className="hidden md:inline text-sm font-semibold text-gray-600 hover:text-emerald-800 px-3 py-1.5 rounded-full">The brain</a>
            <Link href="/how-email-works" className="hidden md:inline text-sm font-semibold text-gray-600 hover:text-emerald-800 px-3 py-1.5 rounded-full">How email works</Link>
            <Link href="/security" className="hidden md:inline text-sm font-semibold text-gray-600 hover:text-emerald-800 px-3 py-1.5 rounded-full">Security</Link>
            <Link href="/download" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-full">
              📱 Download
            </Link>
            <Link href="/login" className="btn-secondary">Sign in</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16">
        <div className="grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-3 space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} /> Guac-AI · personal finance assistant
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 leading-[1.05]">
              Meet your money's<br />
              <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">smartest sidekick.</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
              GetGuac is your <span className="font-bold text-emerald-700">Guac-AI</span> finance brain — it reads your receipts and bank statements,
              scores every purchase, sniffs out hidden fees, and tells you exactly where your money
              gets eaten. <span className="font-semibold">Smash your spend. Keep your guac.</span>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn-primary text-base px-6 py-3">
                <span className="text-lg">🥑</span> Meet your sidekick <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn-secondary text-base px-6 py-3">
                I'm already in
              </Link>
              <Link href="/download" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-base shadow transition-colors">
                📱 Get the Android app
              </Link>
            </div>
            <div className="flex items-center gap-5 text-xs text-gray-500 pt-3">
              <span className="inline-flex items-center gap-1"><Shield size={12} className="text-emerald-500" /> Private. Yours. RLS-locked.</span>
              <span className="inline-flex items-center gap-1"><Tag size={12} className="text-emerald-500" /> Free. No card. No catch.</span>
            </div>
          </div>

          <div className="lg:col-span-2 relative flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-200/50 to-emerald-200/50 rounded-full blur-3xl" />
            <div className="relative">
              <GuacMascot expression="rich" size={260} />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { stat: '0–100',     label: 'GuacScore rating' },
            { stat: 'Guac-AI',  label: 'Reads receipts + statements' },
            { stat: '🦷',        label: 'Tracks every bank bite' },
            { stat: '🧙‍♂️',     label: 'GuacWizard insights' },
          ].map(b => (
            <div key={b.label} className="bg-white border border-emerald-100 rounded-2xl p-3 text-center shadow-sm">
              <p className="text-xl font-extrabold text-emerald-700">{b.stat}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-0.5">{b.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* THE BRAIN — what Guac-AI actually does */}
      <section id="brain" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-2 flex-wrap">
            <Brain size={28} className="text-emerald-600" /> The brain behind the guac
          </h2>
          <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
            Most apps just track. Guac-AI <span className="italic">thinks</span>. It tags, scores,
            spots patterns, and nudges you — like a CFO that lives in your pocket and never sends a bill.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {BRAIN_CARDS.map(c => (
            <div key={c.title} className={`rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all bg-gradient-to-br ${c.bg}`}>
              <div className={`w-14 h-14 rounded-2xl ${c.accent} text-white shadow-md flex items-center justify-center mb-4`}>
                <c.icon size={26} />
              </div>
              <h3 className="font-extrabold text-lg text-gray-900">{c.title}</h3>
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{c.body}</p>
              {c.tag && (
                <span className={`inline-block mt-3 text-[10px] font-bold uppercase tracking-wider ${c.tagColor} px-2 py-0.5 rounded-full`}>
                  {c.tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS — original simple 3-step + link to email deep dive */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How GetGuac works</h2>
          <p className="text-gray-500 mt-2">Three taps from receipt to insight.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { n: '1', emoji: '📷', title: 'Drop or snap',   body: 'Drag a PDF, email forward, or snap a photo. Guac-AI handles the rest.' },
            { n: '2', emoji: '🧾', title: 'Auto-organized', body: 'Items, categories, store locations, refund policies — all extracted and saved.' },
            { n: '3', emoji: '💎', title: 'Rate & learn',   body: 'Worth It? rating + Guacanomics charts surface what you actually need.' },
          ].map(s => (
            <div key={s.n} className="card relative overflow-hidden">
              <span className="absolute -right-3 -top-3 text-7xl font-black text-emerald-50 select-none">{s.n}</span>
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-md flex items-center justify-center text-2xl">{s.emoji}</div>
                <h3 className="font-bold text-lg mt-3 text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/how-email-works" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900">
            Plus — every account gets a free @getguac.app email · See how it works <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* PRIVACY STRIP */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-6 sm:p-8">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 ring-2 ring-emerald-200 flex items-center justify-center shrink-0">
              <Shield size={28} className="text-emerald-700" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-900">Your guac. Your rules.</h3>
              <p className="text-sm sm:text-base text-emerald-950/80 mt-2 leading-relaxed">
                Inbox sync is an opt-in service — toggle it off in Profile and we stop syncing your mail.
                Receipt auto-parse is limited to your <span className="font-mono">+g</span> address. Everything else just sits in your in-app Inbox.
                Row-level security at the database means even our own engineers can&apos;t snoop on other users. One-click account + data wipe any time.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Link href="/security" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900">
                  What we can &amp; can&apos;t see <ArrowRight size={14} />
                </Link>
                <Link href="/how-email-works" className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900">
                  How the email flow works <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUPERPOWERS GRID */}
      <section id="powers" className="bg-white border-y border-emerald-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Guac-AI superpowers</h2>
            <p className="text-gray-500 mt-2">Twelve tools, one avocado. Each one a little smarter than your bank.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POWERS.map(f => (
              <div key={f.title} className={`relative rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all bg-gradient-to-br ${f.bg}`}>
                <div className={`w-11 h-11 rounded-2xl ${f.accent} text-white shadow-md flex items-center justify-center mb-3`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-snug">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="flex justify-center mb-4">
          <GuacMascot expression="celebrating" size={140} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to <span className="bg-gradient-to-br from-emerald-500 to-lime-600 bg-clip-text text-transparent">put a brain on your money?</span>
        </h2>
        <p className="text-gray-500 mt-3 max-w-md mx-auto">
          Free, private, and on your side. No fees, no card, no spam — just your guac, sharper every day.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link href="/register" className="btn-primary text-base px-6 py-3">
            <span className="text-lg">🥑</span> Hire your sidekick <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn-secondary text-base px-6 py-3">Sign in</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-emerald-100 bg-white/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-base">🥑</span>
            <span className="font-bold text-emerald-900">GetGuac</span>
            <span>— your money's wingman</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <a href="#brain" className="hover:text-emerald-800">The brain</a>
            <Link href="/how-email-works" className="hover:text-emerald-800">How email works</Link>
            <Link href="/security" className="hover:text-emerald-800">Security</Link>
            <Link href="/login" className="hover:text-emerald-800">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Three big "brain" cards — the headline AI features
const BRAIN_CARDS = [
  {
    icon: Trophy,
    title: 'GuacScore',
    body: 'A 0–100 grade for every dollar you spent. Weighted by amount, rated by your own taste, dinged by fees. Beat your high score.',
    accent: 'bg-gradient-to-br from-emerald-400 to-green-700',
    bg: 'from-emerald-50 to-lime-50',
    tag: 'Your spending IQ',
    tagColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    icon: Wand2,
    title: 'GuacWizard',
    body: 'Bank statements in, insights out. Interest, fees, regret-spend, hidden subscriptions — all surfaced with a "do this next" nudge.',
    accent: 'bg-gradient-to-br from-violet-400 to-purple-700',
    bg: 'from-violet-50 to-fuchsia-50',
    tag: 'AI insights',
    tagColor: 'bg-violet-100 text-violet-800',
  },
  {
    icon: BadgeDollarSign,
    title: 'Bank Bite Tracker',
    body: 'Every interest charge, every overdraft, every annual fee — itemized per card, scored against your spend. Watch it go to zero.',
    accent: 'bg-gradient-to-br from-rose-400 to-red-700',
    bg: 'from-rose-50 to-orange-50',
    tag: 'Hidden cost killer',
    tagColor: 'bg-rose-100 text-rose-800',
  },
]

// 12 "superpowers" — the broader product surface
const POWERS = [
  { icon: Sparkles,         title: 'Guacanomics',        body: 'Spend trends, top stores, category mix, regret-spend — beautiful live charts, no spreadsheet wrangling.',
    accent: 'bg-amber-500',    bg: 'from-amber-50 to-yellow-50' },
  { icon: Banknote,         title: 'Bank statements',    body: 'Drop a credit-card PDF. Guac-AI extracts transactions, APRs, payments, and surfaces fees in seconds.',
    accent: 'bg-sky-500',      bg: 'from-sky-50 to-emerald-50' },
  { icon: Star,             title: 'Worth-It rating',    body: 'Five-star verdict per receipt and per item. Train Guac-AI on what “worth it” means to you.',
    accent: 'bg-rose-500',     bg: 'from-rose-50 to-pink-50' },
  { icon: Package,          title: 'Stash catalog',      body: 'Every product you’ve ever bought, grouped + searchable. Predicts when you’ll run out.',
    accent: 'bg-indigo-500',   bg: 'from-indigo-50 to-violet-50' },
  { icon: BadgeDollarSign,  title: 'Steals hunter',      body: 'AI-powered price hunt across the web for anything you’ve bought before — or anything you want to.',
    accent: 'bg-pink-500',     bg: 'from-pink-50 to-rose-50' },
  { icon: ShoppingCart,     title: 'Smashlists',         body: 'Pantry, Cravings, Snack Stack, Grub & Grab. One tap re-orders from your own past wins.',
    accent: 'bg-lime-500',     bg: 'from-lime-50 to-emerald-50' },
  { icon: Gift,             title: 'Rewards radar',      body: 'Points, loyalty numbers, expiry dates — auto-pulled from receipts and surfaced before they lapse.',
    accent: 'bg-fuchsia-500',  bg: 'from-fuchsia-50 to-pink-50' },
  { icon: PieChart,         title: 'Category brain',     body: '12 smart presets (Grub, Tech, Fix-It, Wellness…) plus your own custom tags, learned over time.',
    accent: 'bg-emerald-500',  bg: 'from-emerald-50 to-green-50' },
  { icon: Smile,            title: 'Returns radar',      body: 'Refund policy parsed per item. Days remaining shown clearly. One click marks it returned.',
    accent: 'bg-red-500',      bg: 'from-red-50 to-rose-50' },
  { icon: Tag,              title: 'Car miles + tags',   body: 'Auto-calc distance between any two addresses. Tag trips for taxes (Business / Commute / Client).',
    accent: 'bg-violet-500',   bg: 'from-violet-50 to-purple-50' },
  { icon: Shield,           title: 'Private by default', body: 'Row-level security on every table. Your data stays yours — export or wipe with a click.',
    accent: 'bg-teal-500',     bg: 'from-teal-50 to-cyan-50' },
  { icon: Sparkles,         title: 'Mobile + web + AI',  body: 'Native Android app, full web app, and a Guac-AI brain that travels with you wherever you sign in.',
    accent: 'bg-orange-500',   bg: 'from-orange-50 to-amber-50' },
]
