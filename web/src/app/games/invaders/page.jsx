import GamePageShell from '../../../components/games/GamePageShell'
import ExpenseInvaders from '../../../components/games/ExpenseInvaders'

export const metadata = {
  title: 'Expense Invaders — blast your spending, free arcade game',
  description:
    'Play Expense Invaders free: your top spending categories descend as armored invaders sized by how much you spent. Move, auto-fire, clear the board. Plays with your real receipts or a demo. No download.',
  alternates: { canonical: '/games/invaders' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/invaders"
      title="Expense Invaders"
      blurb="Blast the biggest overspend"
      how={[
        'Every row of invaders is one of your spending categories. The more you spent in a category, the more armor its invaders carry — so your biggest overspend takes the most hits to clear.',
        'Move your avocado cannon by sliding your finger or mouse (or use the arrow keys / A and D). Firing is automatic, so focus on lining up shots and working down the toughest rows.',
        'Clear the whole board to "clear" that month of spending and advance to a faster wave. If the expenses march all the way down to your wallet at the bottom, the run ends.',
      ]}
      tips={[
        'Kill the armored rows first — they accelerate the whole formation as they thin out.',
        'The invaders speed up as fewer remain, so keep your cannon centered for the final stretch.',
        'Signed in, the rows are your actual top categories; signed out, it is a demo. Either way your real data never changes.',
      ]}
    >
      <ExpenseInvaders />
    </GamePageShell>
  )
}
