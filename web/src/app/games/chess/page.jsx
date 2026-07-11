import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import GuacChess from '../../../components/games/GuacChess'

export const metadata = {
  title: 'Guac Chess — Savers vs. Spenders',
  description:
    'Free chess against the Spenders with three difficulty levels — full rules, and every captured piece has a price tag. Play a friend in pass-and-play too.',
  alternates: { canonical: '/games/chess' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="♟️ Guac Chess">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-2xl px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <GuacChess />
      </div>
    </MarketingShell>
  )
}
