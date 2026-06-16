import MarketingShell from '../../components/MarketingShell'
import PlanCalculators from '../../components/PlanCalculators'
import AdSlot from '../../components/AdSlot'

export const metadata = {
  title: 'Plan & forecast — retirement, college, healthcare calculators',
  description:
    'Free calculators to forecast retirement, healthcare in retirement, a college fund, and an emergency fund. Enter your numbers — no account needed to plan.',
  alternates: { canonical: '/plan' },
}

export default function PlanPage() {
  return (
    <MarketingShell subtitle="plan">
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-14 pb-2 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">🎯 Plan &amp; forecast</span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-[1.08]">
          Forecast the{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">big stuff.</span>
        </h1>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">Retirement, healthcare, college, an emergency fund — enter your numbers and see what it takes. Free.</p>
      </section>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4 pt-4">
        <PlanCalculators />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || ''} minHeight={90} />
      </div>
    </MarketingShell>
  )
}
