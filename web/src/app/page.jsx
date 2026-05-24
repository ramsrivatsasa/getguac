import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import {
  Sparkles, ScanLine, Camera, ReceiptText, Star, Undo2, Gift, Car,
  ShoppingCart, Store, Tag, Shield, ArrowRight, MapPin, Package, Utensils,
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
              <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">smash your spend</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <a href="#features" className="hidden sm:inline text-sm font-semibold text-gray-600 hover:text-emerald-800 px-3 py-1.5 rounded-full">Features</a>
            <a href="#how"      className="hidden sm:inline text-sm font-semibold text-gray-600 hover:text-emerald-800 px-3 py-1.5 rounded-full">How it works</a>
            <Link href="/download" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-full">
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
              <Sparkles size={12} /> Guac-AI receipt smasher
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 leading-[1.05]">
              Smash your spend.<br />
              <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">Keep what counts.</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
              Drop a receipt — photo, PDF, or email forward. Guac-AI extracts every line, tags the store, tracks rewards,
              and tells you which purchases were worth it. Your guac, your call.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn-primary text-base px-6 py-3">
                <span className="text-lg">🥑</span> Start free <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn-secondary text-base px-6 py-3">
                I have an account
              </Link>
              <Link href="/download" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-base shadow transition-colors">
                📱 Download Android app
              </Link>
            </div>
            <div className="flex items-center gap-5 text-xs text-gray-500 pt-3">
              <span className="inline-flex items-center gap-1"><Shield size={12} className="text-emerald-500" /> Private, RLS-protected data</span>
              <span className="inline-flex items-center gap-1"><Tag size={12} className="text-emerald-500" /> No card required</span>
            </div>
          </div>

          <div className="lg:col-span-2 relative flex justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-200/50 to-emerald-200/50 rounded-full blur-3xl" />
            <div className="relative">
              <GuacMascot expression="celebrating" size={260} />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { stat: 'Guac-AI',   label: 'Receipt parser' },
            { stat: 'PDF + 📷', label: 'Drop or snap' },
            { stat: '12+',       label: 'Categories' },
            { stat: '5★',         label: 'Worth-it rating' },
          ].map(b => (
            <div key={b.label} className="bg-white border border-emerald-100 rounded-2xl p-3 text-center shadow-sm">
              <p className="text-xl font-extrabold text-emerald-700">{b.stat}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-0.5">{b.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How GetGuac works</h2>
          <p className="text-gray-500 mt-2">Three taps from receipt to insight.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { n: '1', emoji: '📷', title: 'Drop or snap', body: 'Drag a PDF, email forward, or snap a photo. Guac-AI handles the rest.' },
            { n: '2', emoji: '🧾', title: 'Auto-organized', body: 'Items, categories, store locations, refund policies — all extracted and saved.' },
            { n: '3', emoji: '💎', title: 'Rate & learn', body: 'Worth It? rating + Guacanomics charts surface what you actually need.' },
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
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="bg-white border-y border-emerald-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Everything in one bowl</h2>
            <p className="text-gray-500 mt-2">Receipts, rewards, mileage, returns, restaurants — all chopped, mixed, smashed.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
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
          <GuacMascot expression="happy" size={140} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to <span className="bg-gradient-to-br from-emerald-500 to-lime-600 bg-clip-text text-transparent">smash your spend?</span>
        </h2>
        <p className="text-gray-500 mt-3 max-w-md mx-auto">
          Free, private, and yours. No card. No spam. Just your guac.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link href="/register" className="btn-primary text-base px-6 py-3">
            <span className="text-lg">🥑</span> Get started <ArrowRight size={16} />
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
            <span>— smash your spend</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hover:text-emerald-800">Features</a>
            <a href="#how" className="hover:text-emerald-800">How it works</a>
            <Link href="/login" className="hover:text-emerald-800">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  { icon: ScanLine,    title: 'Guac-AI receipt parser', body: 'PDFs and images become structured data — store, items, SKUs, refund policies, payment.',
    accent: 'bg-emerald-500',  bg: 'from-emerald-50 to-lime-50' },
  { icon: Camera,      title: 'Camera capture',       body: 'Snap a paper receipt with your phone. Same auto-fill pipeline.',
    accent: 'bg-sky-500',      bg: 'from-sky-50 to-emerald-50' },
  { icon: Sparkles,    title: 'Guacanomics',          body: 'Spending trends, top stores, category breakdown, regret-spend — all live charts.',
    accent: 'bg-amber-500',    bg: 'from-amber-50 to-yellow-50' },
  { icon: Star,        title: 'Worth It? rating',     body: 'Five-star rating per receipt and per item. See what you actually needed.',
    accent: 'bg-rose-500',     bg: 'from-rose-50 to-pink-50' },
  { icon: Package,     title: 'Stash catalog',        body: 'Every product you\'ve ever bought, grouped by store. Compare prices across locations.',
    accent: 'bg-indigo-500',   bg: 'from-indigo-50 to-violet-50' },
  { icon: Utensils,    title: 'Bites menu',           body: 'Every dish you\'ve tried — thumbs up keepers, reorder to a Smashlist.',
    accent: 'bg-orange-500',   bg: 'from-orange-50 to-amber-50' },
  { icon: ShoppingCart, title: 'Themed Smashlists',   body: 'Pantry, Cravings, Snack Stack, Grub & Grab. One-tap reorders from past purchases.',
    accent: 'bg-lime-500',     bg: 'from-lime-50 to-emerald-50' },
  { icon: Gift,        title: 'Rewards tracker',      body: 'Loyalty numbers, points, expiry dates — auto-extracted and surfaced before they lapse.',
    accent: 'bg-pink-500',     bg: 'from-pink-50 to-rose-50' },
  { icon: Undo2,       title: 'Returns radar',        body: 'Refund policy parsed per item. Days remaining shown clearly. One click marks returned.',
    accent: 'bg-red-500',      bg: 'from-red-50 to-rose-50' },
  { icon: Car,         title: 'Car miles + tags',     body: 'Auto-calc distance from any two addresses. Tag trips for taxes (Business / Commute / Client).',
    accent: 'bg-violet-500',   bg: 'from-violet-50 to-purple-50' },
  { icon: Store,       title: 'Store directory',      body: 'Multiple locations per chain, duplicate detection, directions + distance from you.',
    accent: 'bg-fuchsia-500',  bg: 'from-fuchsia-50 to-pink-50' },
  { icon: Tag,         title: 'Custom categories',    body: '12 presets (Grub, Tech, Fix-It, Wellness…) plus your own with custom emoji + color.',
    accent: 'bg-emerald-600',  bg: 'from-emerald-50 to-green-50' },
]
