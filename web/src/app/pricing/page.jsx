// Public /pricing page — GetGuac is free. The page exists mostly to win the
// "free / no subscription" search intent and to remove the price objection.
import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import { Check, Tag } from 'lucide-react'

export const metadata = {
  title: 'Pricing: Free, No Subscription',
  description:
    'GetGuac is free. No subscription, no paywall, no hidden fees. We help you see and save your own money, so the app itself costs you nothing.',
  alternates: { canonical: '/pricing' },
}

const INCLUDED = [
  'Unlimited receipt scanning', 'Bank-statement reading', 'Auto-categorized spending',
  'Your 0–100 GuacScore', 'Hidden-fee & subscription alerts', 'Return & refund deadline tracking',
  'Better-price finds with Steals', 'Shareable shopping lists', 'GuacWizard money guidance',
  'Reports & dashboards', 'Android, iOS & web apps', 'No bank login required',
]

export default function PricingPage() {
  return (
    <MarketingShell subtitle="pricing">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <Tag size={12} /> Simple, honest pricing
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 mt-4 leading-tight">
          It’s free.
          <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2">Really. The whole thing.</span>
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-xl mx-auto">
          No subscription, no paywall, no card to enter. GetGuac helps you keep more of your
          own money — so the app itself costs you nothing.
        </p>
      </section>

      <section className="max-w-md mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-3xl border-2 border-emerald-300 bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="text-sm font-bold uppercase tracking-wider text-emerald-700">Free forever</div>
            <div className="text-6xl font-black text-gray-900 mt-2">$0</div>
            <div className="text-gray-500 mt-1">no card required</div>
          </div>
          <ul className="mt-7 space-y-2.5">
            {INCLUDED.map((i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" /> {i}
              </li>
            ))}
          </ul>
          <Link href="/register" className="btn-primary w-full justify-center mt-7">Get started free</Link>
          <p className="text-center text-xs text-gray-400 mt-3">Your data stays yours. We never sell it.</p>
        </div>
      </section>
    </MarketingShell>
  )
}
