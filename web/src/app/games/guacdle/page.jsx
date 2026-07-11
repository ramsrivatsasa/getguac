import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import Guacdle from '../../../components/games/Guacdle'

export const metadata = {
  title: 'Guacdle — the daily money word game',
  description:
    'A free Wordle-style daily puzzle where every answer is a 5-letter money, receipts or savings word. Six tries, one new word a day, shareable results.',
  alternates: { canonical: '/games/guacdle' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🟩 Guacdle">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-lg px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <Guacdle />
      </div>
    </MarketingShell>
  )
}
