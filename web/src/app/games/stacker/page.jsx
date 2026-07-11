import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import ReceiptStacker from '../../../components/games/ReceiptStacker'

export const metadata = {
  title: 'Receipt Stacker — expense-stacking arcade game',
  description:
    'Free falling-block arcade game where every piece is an expense category. Stack groceries, bills and impulse buys; clear lines to balance the receipt.',
  alternates: { canonical: '/games/stacker' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🧾 Receipt Stacker">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-2xl px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <ReceiptStacker />
      </div>
    </MarketingShell>
  )
}
