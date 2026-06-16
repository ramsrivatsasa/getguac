import MarketingShell from '../../components/MarketingShell'
import ResourcesBrowser from '../../components/ResourcesBrowser'

export const metadata = {
  title: 'Resources — money guides, articles & tools',
  description:
    'Free guides, articles, and tools to take control of your money: budgeting, emergency funds, retirement, refund rights, calculators, and trusted .gov guides.',
  alternates: { canonical: '/resources' },
}

export default function ResourcesPage() {
  return (
    <MarketingShell subtitle="resources" hideSearch>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">📚 Resources</span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-[1.08]">
          Take control of{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">your money.</span>
        </h1>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">Free tools, articles, and trusted guides — budgeting, saving, planning, and knowing your rights.</p>
      </section>

      <ResourcesBrowser />
    </MarketingShell>
  )
}
