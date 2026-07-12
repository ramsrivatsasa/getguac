import GamePageShell from '../../../components/games/GamePageShell'
import GuacSolitaire from '../../../components/games/GuacSolitaire'

export const metadata = {
  title: 'Guac Solitaire — play Klondike solitaire free online',
  description:
    'Play Klondike solitaire free in your browser: tap-to-move cards, draw-1 stock, undo, auto-finish and classic scoring on the green felt. No download.',
  alternates: { canonical: '/games/solitaire' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/solitaire"
      title="Guac Solitaire"
      blurb="Klondike on the green felt"
      how={[
        'Klondike rules: build the four foundations up from Ace to King in suit, using seven tableau columns that stack downward in alternating colors.',
        'Everything is tap-to-move: tap the stock to deal a card, tap any face-up card and it flies to its best legal home — foundations first, then the tableau. Tapping a card mid-run brings the whole run with it.',
        'Foundations pay 10 points, uncovering a face-down card pays 5, and recycling the empty stock costs 20. Undo is free. When the stock is done and every card is face up, the ✨ Auto-finish button clears the rest.',
      ]}
      tips={[
        'Uncover the long columns first — the left columns hide fewer cards and free themselves.',
        'Do not rush cards to the foundations; a 3 you banked early is a 3 you cannot build a red 2 onto later.',
        'Empty columns are for Kings only — clear one with a King in hand or it sits idle.',
        'Finishing fast matters: the win bonus shrinks with every second on the clock.',
      ]}
    >
      <GuacSolitaire />
    </GamePageShell>
  )
}
