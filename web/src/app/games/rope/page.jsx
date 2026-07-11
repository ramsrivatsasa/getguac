import GamePageShell from '../../../components/games/GamePageShell'
import GuacDrop from '../../../components/games/GuacDrop'

export const metadata = {
  title: 'Guac Drop — cut the ropes, land the savings',
  description:
    'Free physics puzzle: your paycheck avocado hangs by ropes. Cut them in the right order, swing past the impulse-buy traps and drop it into the savings jar.',
  alternates: { canonical: '/games/rope' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/rope"
      headerTitle="🪢 Guac Drop"
      title="Guac Drop"
      blurb="Cut the ropes, catch the swing"
      how={[
        'Your paycheck avocado hangs from ropes over a savings jar. Swipe or click a rope to cut it — the avocado swings and falls under real physics.',
        'The trick is order and timing: cut one rope to start a swing, then cut the rest at the top of the arc to sling the avocado where you want it.',
        'Twelve levels of traps and angles stand between the paycheck and the jar. Sparkles along the way are worth grabbing, but the jar is what counts.',
      ]}
      tips={[
        'Watch the swing twice before cutting the final rope — the release point is a beat earlier than it looks.',
        'A short pendulum swings faster: cutting the higher rope first often gives you a more controllable arc.',
        'If a level looks impossible, the answer is almost always “let it swing one more time”.',
        'Free-falling straight down is rarely right; nearly every level wants sideways momentum first.',
      ]}
    >
      <GuacDrop />
    </GamePageShell>
  )
}
