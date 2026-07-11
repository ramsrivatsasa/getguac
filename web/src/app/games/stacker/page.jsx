import GamePageShell from '../../../components/games/GamePageShell'
import ReceiptStacker from '../../../components/games/ReceiptStacker'

export const metadata = {
  title: 'Receipt Stacker — expense-stacking arcade game',
  description:
    'Free falling-block arcade game where every piece is an expense category. Stack groceries, bills and impulse buys; clear lines to balance the receipt.',
  alternates: { canonical: '/games/stacker' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/stacker"
      headerTitle="🧾 Receipt Stacker"
      title="Receipt Stacker"
      blurb="Stack the expenses, clear the lines"
      how={[
        'Expense pieces fall one at a time — groceries, bills, subscriptions, impulse buys, each a classic shape. Steer with ← →, rotate with ↑, soft-drop with ↓ and slam with space (swipe and tap on phones).',
        'Fill a complete row and it clears — that line of spending is balanced and paid. Clear four at once for the GUAC SMASH banner and maximum dollars.',
        'The stack speeds up as your total grows. Let the expenses reach the top of the receipt and the game is over.',
      ]}
      tips={[
        'Keep one column open on the edge for the long piece — that’s the four-line GUAC SMASH plan.',
        'Flat is fast: bury as few holes as possible; every hole is a line you can’t clear later.',
        'Use soft drop for placement and hard drop only when you’re certain — speed points aren’t worth a jammed stack.',
        'When the fall speed ramps up, play the sides first; mid-board decisions eat your reaction time.',
      ]}
    >
      <ReceiptStacker />
    </GamePageShell>
  )
}
