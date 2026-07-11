import GamePageShell from '../../../components/games/GamePageShell'
import PriceCheck from '../../../components/games/PriceCheck'

export const metadata = {
  title: 'Price Check — the higher-or-lower price game',
  description:
    'Free higher-or-lower guessing game with everyday US prices — groceries, gadgets, tickets and bills. How long can your receipt instincts keep the run alive?',
  alternates: { canonical: '/games/price-check' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/price-check"
      headerTitle="🏷️ Price Check"
      title="Price Check"
      blurb="Higher or lower? Trust your receipts"
      how={[
        'You’re shown an everyday item and a price. Is the typical price higher or lower than the number on screen? Call it right and the run continues; miss and it’s over.',
        'The items are real everyday US stuff — groceries, streaming plans, oil changes, concert tickets — so your own receipts are the study guide.',
        'Runs are scored by length. One wrong call ends it, so every guess past ten is pure nerve.',
      ]}
      tips={[
        'Anchor to what YOU paid last time — your memory of real receipts beats “feels expensive” instincts.',
        'Services and tickets run higher than most people guess; pantry staples run lower.',
        'Beware round numbers: a $19.99 anchor usually means the true price sits just past it.',
        'Long runs die on confidence — when a price looks obviously wrong, slow down and re-read the item.',
      ]}
    >
      <PriceCheck />
    </GamePageShell>
  )
}
