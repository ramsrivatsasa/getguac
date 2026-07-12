import GamePageShell from '../../../components/games/GamePageShell'
import FlappyGuac from '../../../components/games/FlappyGuac'

export const metadata = {
  title: 'Flappy Guac — free one-tap flying game online',
  description:
    'Play Flappy Guac free in your browser: tap to flap the winged avocado through the fee pipes. One touch and it is over — gaps tighten as you fly. No download.',
  alternates: { canonical: '/games/flappy' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/flappy"
      title="Flappy Guac"
      blurb="Tap to flap, thread the pipes"
      how={[
        'One control: tap, click or press space to flap. Gravity does everything else, and everything else is trying to kill you.',
        'Thread the gaps between the fee pipes. Every pipe you pass is 10 points — touch a pipe or the ground and the run ends instantly.',
        'The further you fly, the faster the world scrolls and the tighter the gaps squeeze.',
      ]}
      tips={[
        'Small, frequent taps beat big rescue flaps — stay in the middle third of the screen.',
        'Look at the NEXT gap, not the avocado; your eyes should always be one pipe ahead.',
        'Falling is faster than flapping up. Approach each gap from slightly above its center.',
        'Rhythm survives where reflexes panic: settle into a tap cadence and adjust it gently.',
      ]}
    >
      <FlappyGuac />
    </GamePageShell>
  )
}
