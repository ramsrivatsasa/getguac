import GamePageShell from '../../../components/games/GamePageShell'
import BudgetTetris from '../../../components/games/BudgetTetris'

export const metadata = {
  title: 'Budget Tetris — stack your expenses, free puzzle game',
  description:
    'Play Budget Tetris free: your expenses fall as blocks sized by price. Slide them into columns, fill a row to bank the savings, and stay under the budget line. Uses your real receipts or a demo. No download.',
  alternates: { canonical: '/games/budget' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/budget"
      title="Budget Tetris"
      blurb="Fill a row, bank the savings"
      how={[
        'Your expenses drop into the board as blocks. The pricier the purchase, the taller the block — a $6 coffee is one cell, a $90 buy is a full stack.',
        'Tap or drag to choose a column (or use the arrow keys and the on-screen ◀ ▼ ▶ buttons). Fill a complete horizontal row across all six columns and it clears, banking the total as savings.',
        'Keep the stacks below the dashed budget line at the top. Let a column pile past it and the month is over. Signed in, the blocks are your real expenses; signed out, it plays a demo.',
      ]}
      tips={[
        'Spread the tall, pricey blocks across columns — stacking them in one place buries you fast.',
        'Leave one column open to drop a tall block into, then finish rows around it.',
        'Use ▼ to hard-drop when you already know the column — it speeds the round and raises your level.',
      ]}
    >
      <BudgetTetris />
    </GamePageShell>
  )
}
