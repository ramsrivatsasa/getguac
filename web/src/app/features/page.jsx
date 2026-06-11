// Public /features page — the full feature catalog, benefit-first and clean.
import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import {
  ScanLine, Brain, FolderTree, Landmark, Gauge, Star, Undo2,
  Tag, ShoppingCart, Sparkles, BarChart3, ShieldCheck,
} from 'lucide-react'

export const metadata = {
  title: 'Features: Scan, Score & Save Money',
  description:
    'Auto-categorized spending, a 0–100 GuacScore, hidden-fee alerts, refund-deadline tracking, shareable shopping lists, and better-price finds. Everything GetGuac does — free.',
  alternates: { canonical: '/features' },
}

const FEATURES = [
  { icon: ScanLine, title: 'Snap or email any receipt', body: 'Photograph a paper receipt, forward an email receipt, or upload a PDF. Long grocery receipts and faded ink are all fair game.' },
  { icon: Brain, title: 'Guac-AI reads every line', body: 'In seconds, the AI pulls the store, date, and each item — no typing, no spreadsheets, no manual sorting.' },
  { icon: FolderTree, title: 'Auto-categorize & de-dupe', body: 'Spending sorts itself into clean categories, and duplicate receipts get caught so nothing is ever double-counted.' },
  { icon: Landmark, title: 'Reads bank statements', body: 'Upload a statement and GetGuac extracts every transaction and fee — so the full picture lives in one place.' },
  { icon: Gauge, title: 'GuacScore', body: 'One simple 0–100 number for how well you’re spending, so you always know where you stand at a glance.' },
  { icon: Star, title: 'Worth-it ratings', body: 'Tap a quick rating on a purchase. As the low-value buys drop off, your score sharpens and so does your spending.' },
  { icon: Undo2, title: 'Returns & refunds tracking', body: 'GetGuac watches your return windows and price-drop deadlines, so you get the money you’re owed before time runs out.' },
  { icon: Tag, title: 'Steals — better prices', body: 'On the things you rebuy, Steals scouts for a cheaper price so you pay less for the same item next time.' },
  { icon: ShoppingCart, title: 'Shareable shopping lists', body: 'Build a list on the fly from what you actually buy, then share it with family in a single tap.' },
  { icon: Sparkles, title: 'GuacWizard advice', body: 'Honest, plain-spoken money guidance — where you’re overpaying and how to save. It guides; it never lectures.' },
  { icon: BarChart3, title: 'Reports & Guacanomics', body: 'Clear dashboards turn your receipts into the trends, categories, and merchant breakdowns that actually matter.' },
  { icon: ShieldCheck, title: 'Private by design', body: 'No bank login required, row-level security on every record, and we never sell your data. Your guac stays in your bowl.' },
]

export default function FeaturesPage() {
  return (
    <MarketingShell subtitle="features">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={12} /> Everything GetGuac does
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 mt-4 leading-tight">
          From a receipt to
          <span className="block bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">real clarity about your money.</span>
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Scan it, score it, and save on it. Here’s every tool that helps you see where your
          money goes and keep more of it — all free.
        </p>
        <div className="mt-7 flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="btn-primary">Get started free</Link>
          <Link href="/tour" className="btn-secondary">Watch the tour</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <f.icon size={22} />
              </div>
              <h3 className="font-bold text-gray-900 mt-4">{f.title}</h3>
              <p className="text-sm text-gray-600 mt-1.5 leading-snug">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-600 p-8 sm:p-12 text-center text-white shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Take control of your money — free.</h2>
          <p className="text-emerald-50/90 mt-3 max-w-2xl mx-auto">
            No subscription, no card, no catch. Snap your first receipt and see where your money really goes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="inline-flex items-center rounded-full bg-lime-400 text-emerald-900 font-black px-7 py-3 hover:bg-lime-300 transition">Get started free</Link>
            <Link href="/download" className="inline-flex items-center rounded-full bg-white/15 text-white font-bold px-7 py-3 hover:bg-white/25 transition">Get the app</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
