import GamePageShell from '../../../components/games/GamePageShell'
import FeeSweeper from '../../../components/games/FeeSweeper'

export const metadata = {
  title: 'Fee Sweeper — play minesweeper free online, no download',
  description:
    'Play Fee Sweeper free in your browser: classic minesweeper logic where the mines are hidden fees. Three board sizes, safe first click, flags and chording.',
  alternates: { canonical: '/games/sweeper' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/sweeper"
      title="Fee Sweeper"
      blurb="Read the numbers, flag the fees"
      how={[
        'The board hides fees (💸). Open a square and its number tells you how many fees touch it — including diagonals. Open every square that is not a fee to win.',
        'Right-click (or switch on the 🚩 toggle and tap) to flag a square you know is a fee. The counter tracks how many fees are left unflagged.',
        'Your first click is always safe. Clicking an already-open number whose flags are all placed opens the rest of its neighbours at once — the classic chord move.',
        'Three boards: Easy 9×9 with 10 fees, Medium 12×12 with 24, Hard 16×16 with 44. Faster clears score more.',
      ]}
      tips={[
        'A "1" touching exactly one hidden square is a certain fee — flag it and move on. Most boards fall to that one rule.',
        'The 1-2-1 pattern along a wall means the fees sit under the 1s; 1-2-2-1 means they sit under the 2s.',
        'Chording is where speed comes from — but a misplaced flag turns a chord into a detonation.',
        'Stuck? Work the border of what you know. Guessing in the middle is a coin flip; edges carry information.',
      ]}
    >
      <FeeSweeper />
    </GamePageShell>
  )
}
