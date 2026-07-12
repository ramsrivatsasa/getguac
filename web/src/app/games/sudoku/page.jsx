import GamePageShell from '../../../components/games/GamePageShell'
import GuacSudoku from '../../../components/games/GuacSudoku'

export const metadata = {
  title: 'Guac Sudoku — free online sudoku with unique puzzles',
  description:
    'Play Guac Sudoku free in your browser: a freshly generated puzzle with a guaranteed unique solution every game. Easy, medium and hard — no download.',
  alternates: { canonical: '/games/sudoku' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/sudoku"
      title="Guac Sudoku"
      blurb="Nine rows, no guessing needed"
      how={[
        'Fill the grid so every row, every column and every 3×3 box contains the digits 1 through 9 exactly once.',
        'Tap a cell, then tap a number on the pad (or use your keyboard). Wrong entries flash red and cost 100 points; the counter keeps score of your mistakes.',
        'Every puzzle is generated fresh with exactly one solution — Easy keeps 40 clues, Medium 32, Hard 26. Faster, cleaner solves score higher.',
      ]}
      tips={[
        'Start with the digits that already appear most on the board — placing the eighth and ninth copy of a number is nearly free.',
        'Scan box by box asking "where can the 7 go in THIS box?" — one-box logic solves most of Easy and Medium.',
        'Selecting a cell highlights its row, column and box; selecting a filled number lights up its twins. Use both constantly.',
        'On Hard, hunt for cells with a single candidate before anything clever — nakeds singles hide in plain sight.',
      ]}
    >
      <GuacSudoku />
    </GamePageShell>
  )
}
