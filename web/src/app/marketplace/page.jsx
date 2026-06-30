import MarketingShell from '../../components/MarketingShell'
import MarketplaceClient from '../../components/MarketplaceClient'

export const metadata = {
  title: 'GetGuac Marketplace — find the best price on anything',
  description:
    'Search any product or store and see the best prices across major US retailers. Save your searches with no account. Free.',
  alternates: { canonical: '/marketplace' },
  // Thin auto-generated price-search results — kept out of the index so it doesn't
  // drag site-quality signals. follow:true preserves link equity.
  robots: { index: false, follow: true },
  openGraph: {
    title: 'GetGuac Marketplace',
    description: 'Search any product or store and compare the best prices. No account needed.',
    url: '/marketplace',
  },
}

export default function MarketplacePage({ searchParams }) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q : ''
  const tab = typeof searchParams?.tab === 'string' ? searchParams.tab : 'deals'

  return (
    <MarketingShell subtitle="marketplace" hideSearch>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-7 sm:pt-9 pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          🥑 GetGuac Marketplace
        </span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-[1.08]">
          The best price on anything,
          <br className="hidden sm:block" />{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">in one search.</span>
        </h1>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">
          Compare live prices across Walmart, Amazon, Target, Costco, Best Buy and more — no account required.
        </p>
      </section>

      <MarketplaceClient initialQuery={q} initialTab={tab} />
    </MarketingShell>
  )
}
