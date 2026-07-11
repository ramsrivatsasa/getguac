import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import MoneyMerge from '../../../components/games/MoneyMerge'

export const metadata = {
  title: 'Money Merge — 2048 with compounding dollars',
  description:
    'Free 2048-style puzzle where equal dollar tiles merge and double. Swipe your way from a single $1 to $2,048 and feel compounding work.',
  alternates: { canonical: '/games/merge' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="💰 Money Merge">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-md px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <MoneyMerge />
      </div>
    </MarketingShell>
  )
}
