import GamePageShell from '../../../components/games/GamePageShell'
import WordSearch from '../../../components/games/WordSearch'

export const metadata = {
  title: 'Money Word Search — free online word search puzzle',
  description:
    'Play Money Word Search free in your browser: ten money words hide in a 10×10 grid, in all eight directions. Drag to find them all and beat the clock.',
  alternates: { canonical: '/games/wordsearch' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/wordsearch"
      title="Money Word Search"
      blurb="Ten money words, eight directions"
      how={[
        'Ten money words are hidden in the 10×10 letter grid — across, down, diagonal, and any of them can run backwards.',
        'Press on the first letter and drag along the word; the selection snaps to a straight line. Release on the last letter to lock it in.',
        'Each word pays 20 points per letter, and clearing the whole list fast earns a time bonus of up to 600.',
      ]}
      tips={[
        'Scan for the rare letters first — a stray X, K or V is usually the corner of a hidden word.',
        'Check the word list for shared endings (-ET, -ND): find one and you often find its neighbour crossing it.',
        'Sweep the grid in rows for horizontal words, then in columns — switching scan direction resets your eyes.',
        'Backwards words hide best along the right and bottom edges; read those lines in reverse on purpose.',
      ]}
    >
      <WordSearch />
    </GamePageShell>
  )
}
