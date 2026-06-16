import MarketingShell from '../../components/MarketingShell'
import PlanCalculators from '../../components/PlanCalculators'

export const metadata = {
  title: 'Plan & forecast — retirement, college, healthcare calculators',
  description:
    'Free calculators to forecast retirement, healthcare in retirement, a college fund, and an emergency fund. Enter your numbers — no account needed to plan.',
  alternates: { canonical: '/plan' },
}

export default function PlanPage() {
  return (
    <MarketingShell subtitle="plan" hideSearch>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-1 text-center">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 leading-tight">
          Forecast the{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">big stuff.</span>
        </h1>
        <p className="text-gray-600 mt-1.5 text-sm max-w-xl mx-auto">Retirement, healthcare, college, an emergency fund — enter your numbers and see what it takes. Free.</p>
      </section>
      <div className="pb-16 pt-3">
        <PlanCalculators />
      </div>
    </MarketingShell>
  )
}
