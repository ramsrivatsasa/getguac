import GamePageShell from '../../../components/games/GamePageShell'
import GuacCrush from '../../../components/games/GuacCrush'

export const metadata = {
  title: 'Guac Crush — free online match-3 puzzle game',
  description:
    'Play Guac Crush free in your browser: swap neighbours, match three or more, and chain cascades for multiplied points. 25 moves, no download.',
  alternates: { canonical: '/games/crush' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/crush"
      title="Guac Crush"
      blurb="Swap, match three, chain the cascades"
      how={[
        'Swap two neighbouring tiles — tap one then the other, or just swipe a tile toward its neighbour. The swap only sticks if it lines up three or more of a kind.',
        'Matched tiles clear, everything above falls, and fresh tiles drop in from the top. If the falling tiles line up again, the cascade chains — and every link multiplies the payout.',
        'You get 25 moves. Runs of four pay a bonus, runs of five pay a big one, and if the board ever has no valid swap it reshuffles for free.',
      ]}
      tips={[
        'Work from the bottom of the board — low matches disturb more tiles and trigger far more accidental cascades.',
        'Scan for three-in-an-L before you move; one swap that finishes two lines clears both.',
        'A 4-tile run you can make now usually beats a 5-tile run you might set up in three moves.',
        'With five moves left, stop building and start cashing — points on the board beat potential.',
      ]}
    >
      <GuacCrush />
    </GamePageShell>
  )
}
