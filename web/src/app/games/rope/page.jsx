import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import GuacDrop from '../../../components/games/GuacDrop'

export const metadata = {
  title: 'Guac Drop — cut the ropes, land the savings',
  description:
    'Free physics puzzle: your paycheck avocado hangs by ropes. Cut them in the right order, swing past the impulse-buy traps and drop it into the savings jar.',
  alternates: { canonical: '/games/rope' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🪢 Guac Drop">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-xl px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <GuacDrop />
      </div>
    </MarketingShell>
  )
}
