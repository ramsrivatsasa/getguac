import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import BubbleBudget from '../../../components/games/BubbleBudget'

export const metadata = {
  title: 'Bubble Pop — the GetGuac bubble shooter',
  description:
    'Free bubble-shooter game: aim, fire, and match 3+ spending bubbles to pop them and bank the dollars. Clear the board before the wall crosses the line.',
  alternates: { canonical: '/games/bubbles' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🫧 Bubble Pop">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-xl px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <BubbleBudget />
      </div>
    </MarketingShell>
  )
}
