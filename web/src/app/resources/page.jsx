import Link from 'next/link'
import { ExternalLink, CalendarDays, TrendingUp, ShoppingBag, Ticket, Receipt, Shield } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import AdSlot from '../../components/AdSlot'

export const metadata = {
  title: 'Resources — money guides & tools',
  description:
    'Free guides and tools to take control of your money: budgeting, emergency funds, retirement, refund rights, and GetGuac’s own planning tools.',
  alternates: { canonical: '/resources' },
}

// GetGuac's own tools (internal). Signed-in members land right in them.
const TOOLS = [
  { href: '/bills', icon: CalendarDays, title: 'Bills calendar', desc: 'See every recurring bill laid out on the days it’s due.' },
  { href: '/plan', icon: TrendingUp, title: 'Plan & forecast', desc: 'Project retirement, college, healthcare and an emergency fund.' },
  { href: '/marketplace', icon: ShoppingBag, title: 'Marketplace', desc: 'Compare live prices across major retailers in one search.' },
  { href: '/coupons', icon: Ticket, title: 'Coupons', desc: 'Live promo codes for the biggest stores, all in one place.' },
  { href: '/validate', icon: Receipt, title: 'Worth It?', desc: 'Rate purchases and spot the regret spending fast.' },
  { href: '/security', icon: Shield, title: 'Your data & security', desc: 'How GetGuac keeps your money data private and locked down.' },
]

// Authoritative, non-commercial money guides (stable .gov sources).
const GUIDES = [
  { title: 'Build a budget that sticks', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/budgeting/', desc: 'A simple, proven way to plan where your money goes each month.' },
  { title: 'Start an emergency fund', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/', desc: 'How much to set aside, and how to get there without feeling it.' },
  { title: 'Saving & investing for retirement', source: 'investor.gov (SEC)', url: 'https://www.investor.gov/financial-tools-calculators', desc: 'Compound-interest calculators and the basics of long-term saving.' },
  { title: 'Your refund & return rights', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/articles/disputing-credit-card-charges', desc: 'What you’re owed when something’s wrong — and how to dispute it.' },
  { title: 'Spot & cancel sneaky subscriptions', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/', desc: 'Find recurring charges you forgot about and shut them down.' },
  { title: 'Understand credit, interest & fees', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/', desc: 'How interest and fees quietly add up — and how to dodge them.' },
]

export default function ResourcesPage() {
  return (
    <MarketingShell subtitle="resources">
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">📚 Resources</span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-[1.08]">
          Take control of{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">your money.</span>
        </h1>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">Free tools and trusted guides — budgeting, saving, planning, and knowing your rights.</p>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-10">
        <section>
          <h2 className="text-lg font-black text-gray-900 mb-3">GetGuac tools</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((t) => {
              const Icon = t.icon
              return (
                <Link key={t.href} href={t.href} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 p-4 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2"><Icon size={18} /></div>
                  <h3 className="font-bold text-gray-900">{t.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{t.desc}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || ''} minHeight={90} />

        <section>
          <h2 className="text-lg font-black text-gray-900 mb-1">Money guides</h2>
          <p className="text-xs text-gray-400 mb-3">Trusted, non-commercial sources (no affiliate links).</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GUIDES.map((g) => (
              <a key={g.title} href={g.url} target="_blank" rel="noreferrer" className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 p-4 transition-all flex flex-col">
                <h3 className="font-bold text-gray-900 leading-snug">{g.title}</h3>
                <p className="text-sm text-gray-500 mt-1 flex-1">{g.desc}</p>
                <p className="text-[11px] font-semibold text-emerald-700 mt-2 inline-flex items-center gap-1">{g.source} <ExternalLink size={11} /></p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </MarketingShell>
  )
}
