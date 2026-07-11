import GamePageShell from '../../../components/games/GamePageShell'
import BubbleBudget from '../../../components/games/BubbleBudget'

export const metadata = {
  title: 'Bubble Pop — the GetGuac bubble shooter',
  description:
    'Free bubble-shooter game: aim, fire, and match 3+ spending bubbles to pop them and bank the dollars. Clear the board before the wall crosses the line.',
  alternates: { canonical: '/games/bubbles' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/bubbles"
      headerTitle="🫧 Bubble Pop"
      title="Bubble Pop"
      blurb="Match three, pop the wall"
      how={[
        'A wall of spending bubbles hangs from the top of the board. Aim the launcher with your mouse or finger, release to fire, and match three or more of the same color to pop them and bank the dollars.',
        'Pop the bubbles holding a cluster to the ceiling and the whole thing falls for bonus cash. Every few shots the wall pushes down a row — if it crosses the dashed line, the game is over.',
        'Clear the whole board to level up: more colors, fewer shots per row. Tap the Next pill to swap your current bubble with the one on deck.',
      ]}
      tips={[
        'Bank shots off the side walls reach pockets a straight shot never could — the dotted guide shows the bounce.',
        'Hunt the hangers: popping the two bubbles holding up a big cluster scores the entire cluster as falls (25 each).',
        'Don’t waste shots when nothing matches — park bubbles on an existing color so the next shot pops both.',
        'Watch the "next row in" counter: with 1 shot left, make it a safe one, not a gamble at the ceiling.',
      ]}
    >
      <BubbleBudget />
    </GamePageShell>
  )
}
