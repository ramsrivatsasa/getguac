import MarketingHero from '../../components/MarketingHero'
// Public /pricing page — GetGuac is free. The page exists mostly to win the
// "free / no subscription" search intent and to remove the price objection.
import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import { Check, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react'
import TrustLine from '../../components/TrustLine'
import ConversionBand from '../../components/ConversionBand'

export const metadata = {
  title: 'Pricing: Complete Product Free for a Limited Time',
  description:
    'For a limited time, the complete GetGuac product is available for $0 with no card required.',
  alternates: { canonical: '/pricing' },
}

const INCLUDED = [
  'Budget planning and tracking', 'Savings goals and progress', 'Accounts, assets and debts', 'Receipt scanning', 'Bank-statement reading', 'Auto-categorized spending',
  'Your 0–100 GuacScore', 'Hidden-fee & subscription alerts', 'Return & refund deadline tracking',
  'Better-price finds with Steals', 'Shareable shopping lists', 'GuacWizard money guidance',
  'Reports & dashboards', 'Android, iOS & web apps', 'No bank login required',
]

export default function PricingPage() {
  return (
    <MarketingShell subtitle="pricing" footerFinePrint="$0 for a limited time · No card required · No bank login required · Your data stays yours.">
      <MarketingHero eyebrow="Limited-time offer" title="The complete product." accent="Free for a limited time." description="Use the complete GetGuac product for $0 during this offer. No card is required to start." trustText="Complete product · $0 for a limited time · No card required" imageSrc="/home/story-people/capture-blonde-produce-v1-768.webp" imageAlt="A shopper keeping a purchase record on her phone" />

      <TrustLine className="pt-4" items={[[WalletCards, '$0 for a limited time', 'Complete product'], [LockKeyhole, 'Private by design', 'No bank login required'], [ShieldCheck, 'You stay in control', 'Your data stays yours']]} />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-[.7fr_1.3fr] gap-8 border-y border-slate-200 py-10">
          <div><div className="text-sm font-bold uppercase tracking-wider text-emerald-700">One complete free product—for a limited time</div><div className="text-7xl font-black text-gray-900 mt-2">$0</div><div className="text-gray-500 mt-1">during this limited-time offer</div></div>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {INCLUDED.map((i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" /> {i}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ConversionBand eyebrow="Limited-time offer" title="Use the complete product for $0." description="Start with the full GetGuac experience while this offer is available." finePrint="$0 for a limited time · No card · No bank login required" />
    </MarketingShell>
  )
}
