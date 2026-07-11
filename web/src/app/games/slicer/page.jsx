import Link from 'next/link'
import MarketingShell from '../../../components/MarketingShell'
import WasteSlicer from '../../../components/games/WasteSlicer'

export const metadata = {
  title: 'Waste Slicer — slice fees and impulse buys mid-air',
  description:
    'Free ninja-slicing arcade game: bank fees, unused subscriptions and impulse buys get tossed up — swipe to slice them. Slice the rent and you lose a life.',
  alternates: { canonical: '/games/slicer' },
}

export default function Page() {
  return (
    <MarketingShell subtitle="money's wingman" hideSearch headerTitle="🥷 Waste Slicer">
      <div className="pb-16 pt-5">
        <div className="mx-auto max-w-2xl px-4 mb-3">
          <Link href="/games" className="text-sm font-bold no-underline" style={{ color: '#065f46' }}>← All games</Link>
        </div>
        <WasteSlicer />
      </div>
    </MarketingShell>
  )
}
