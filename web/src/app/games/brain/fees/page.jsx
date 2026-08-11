import { GameShell } from '../brainKit'
import FeeHunt from './FeeHunt'

export const metadata = {
  title: 'Fee Hunt — a money brain game | GetGuac',
  description: 'A month of charges, one of them avoidable. Practise separating the cost of living from the cost of timing.',
}

export default function FeeHuntPage() {
  return (
    <GameShell
      eyebrow="Brain game · 5 rounds"
      title="Fee Hunt"
      blurb="You get a month of charges. One did not have to happen; the rest are ordinary life. Finding it is a scanning habit, not a budgeting exercise."
    >
      <FeeHunt />
    </GameShell>
  )
}
