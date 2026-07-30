import MarketingShell from '../../components/MarketingShell'
import CouponsPageClient from '../../components/CouponsPageClient'

export const metadata = {
  title: 'Coupons & promo codes for top stores',
  description:
    'Live coupons and promo codes for Walmart, Target, Amazon, Best Buy, Home Depot, CVS and more — pulled fresh from the web. Free, no account needed.',
  alternates: { canonical: '/coupons' },
  // Thin auto-generated listing (live API results) — kept out of the index so it
  // doesn't drag site-quality signals. follow:true preserves link equity.
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Coupons & promo codes — GetGuac',
    description: 'Live coupons for the biggest US stores, all in one place.',
    url: '/coupons',
  },
}

export default function CouponsPage() {
  // No <AdSlot/> on this page and it is noindexed, so the loader earned
  // nothing here -- see the `ads` prop comment in MarketingShell.
  return (
    <MarketingShell subtitle="coupons" ads={false}>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 sm:pt-9 pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          🎟️ Coupons & promo codes
        </span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-[1.08]">
          Today’s coupons for{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">the biggest stores.</span>
        </h1>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">
          Fresh promo codes and deals for Walmart, Target, Amazon, Best Buy, Home Depot and more — pulled live from the web. No account needed.
        </p>
      </section>

      <CouponsPageClient />
    </MarketingShell>
  )
}
