import GamePageShell from '../../../components/games/GamePageShell'
import MoneyMerge from '../../../components/games/MoneyMerge'

export const metadata = {
  title: 'Money Merge — 2048 with compounding dollars',
  description:
    'Free 2048-style puzzle where equal dollar tiles merge and double. Swipe your way from a single $1 to $2,048 and feel compounding work.',
  alternates: { canonical: '/games/merge' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/merge"
      headerTitle="💰 Money Merge"
      title="Money Merge"
      blurb="Slide, merge, compound to $2,048"
      how={[
        'Slide the whole board with the arrow keys or a swipe. When two equal amounts collide they merge and double — $1 and $1 make $2, all the way up to $1,024 + $1,024 = $2,048.',
        'A new small tile drops after every move, so the board fills as you play. When no move can merge anything, the run ends.',
        'Hit the $2,048 tile and you’ve felt exactly how compounding works: nothing for ages, then everything at once.',
      ]}
      tips={[
        'Anchor your biggest tile in a corner and never slide it off — every move should feed that corner.',
        'Restrict yourself to two or three directions; the fourth is how anchors get dislodged and chains break.',
        'Build a snake: descending values along a row so each merge cascades into the next one.',
        'Merge small tiles even when it feels pointless — a clogged board with no $4s is how runs die.',
      ]}
    >
      <MoneyMerge />
    </GamePageShell>
  )
}
