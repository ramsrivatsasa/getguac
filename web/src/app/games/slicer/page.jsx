import GamePageShell from '../../../components/games/GamePageShell'
import WasteSlicer from '../../../components/games/WasteSlicer'

export const metadata = {
  title: 'Waste Slicer — slice fees and impulse buys mid-air',
  description:
    'Free ninja-slicing arcade game: bank fees, unused subscriptions and impulse buys get tossed up — swipe to slice them. Slice the rent and you lose a life.',
  alternates: { canonical: '/games/slicer' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/slicer"
      headerTitle="🥷 Waste Slicer"
      title="Waste Slicer"
      blurb="Slice the waste, spare the rent"
      how={[
        'Money waste gets tossed into the air — late fees, forgotten subscriptions, impulse buys. Swipe through them (mouse or finger) to slice them in half.',
        'Essentials fly up too: rent, groceries, insurance. Slice one of those and you lose a life — you get three.',
        'Combos count: carve through several wasteful items in a single stroke for multiplied dollars. Missed waste just falls away; it never costs a life.',
      ]}
      tips={[
        'Long horizontal strokes catch whole waves; frantic short flicks are how essentials get sliced by accident.',
        'Track what’s rising, not what’s peaked — planning the stroke before the toss crests is the whole game.',
        'When essentials and waste cross mid-air, wait: they always separate on the way down.',
        'Combo three or more for the multiplier, but never stretch a stroke through a grocery bag to get there.',
      ]}
    >
      <WasteSlicer />
    </GamePageShell>
  )
}
