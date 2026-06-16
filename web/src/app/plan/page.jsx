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
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🎯 Plan & forecast">
      <div className="pb-16 pt-4">
        <PlanCalculators />
      </div>
    </MarketingShell>
  )
}
