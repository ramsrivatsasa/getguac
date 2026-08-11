import { GameShell } from '../brainKit'
import ValueDuel from './ValueDuel'

export const metadata = {
  title: 'Better Value — a money brain game | GetGuac',
  description: 'Two offers, one is genuinely cheaper. Practise unit price, BOGO and membership math against the tricks shelves actually play.',
}

export default function BetterValuePage() {
  return (
    <GameShell
      eyebrow="Brain game · 6 rounds"
      title="Better Value"
      blurb="Every round shows two real-shaped offers. The bigger box, the sale tag and the multibuy are each set up to look like the answer. Divide before you decide."
    >
      <ValueDuel />
    </GameShell>
  )
}
