import GamePageShell from '../../../components/games/GamePageShell'
import GuacNitroRun from '../../../components/games/GuacNitroRun'

export const metadata = {
  title: 'Guac Nitro Run — free lane-dodging street racing game',
  description:
    'Play Guac Nitro Run free: race the avocado car down an endless highway, swerve between three lanes to dodge traffic, grab the cash and survive as the speed climbs. No download.',
  alternates: { canonical: '/games/nitro' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/nitro"
      title="Guac Nitro Run"
      blurb="Dodge the traffic, grab the cash"
      how={[
        'Your car races down an endless three-lane highway. Steer left and right with the arrow keys, A and D, a swipe, or the on-screen buttons to slot into an open lane.',
        'Weave around the slower traffic ahead of you and scoop up the gold $ coins for cash. The road speeds up the longer you survive, so the gaps get tighter.',
        'One crash ends the run. Your score is the cash you banked plus the distance you covered.',
      ]}
      tips={[
        'Look two cars ahead, not one — at high speed you need time to pick your lane.',
        'Don’t chase every coin; a coin in a blocked lane isn’t worth a crash.',
        'The middle lane keeps both escape routes open when the traffic gets thick.',
      ]}
    >
      <GuacNitroRun />
    </GamePageShell>
  )
}
