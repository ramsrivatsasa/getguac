import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import BubbleBudget from '../../../components/games/BubbleBudget'

export const metadata = {
  title: 'Bubble Budget — pop wasteful spending',
  description:
    'Free arcade game: wasteful expenses float up in bubbles — pop the late fees and impulse buys, protect the rent and groceries. Three avocados, no mercy.',
  alternates: { canonical: '/games/bubbles' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🫧 Bubble Budget">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-xl px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <BubbleBudget />
      </div>
    </MarketingShell>
  )
}
