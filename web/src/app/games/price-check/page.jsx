import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import PriceCheck from '../../../components/games/PriceCheck'

export const metadata = {
  title: 'Price Check — the higher-or-lower price game',
  description:
    'Free higher-or-lower guessing game with everyday US prices — groceries, gadgets, tickets and bills. How long can your receipt instincts keep the run alive?',
  alternates: { canonical: '/games/price-check' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🏷️ Price Check">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-lg px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <PriceCheck />
      </div>
    </MarketingShell>
  )
}
