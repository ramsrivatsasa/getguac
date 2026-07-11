import GamePageShell from '../../../components/games/GamePageShell'
import BullseyeDarts from '../../../components/games/BullseyeDarts'

export const metadata = {
  title: 'Bullseye Darts — free online darts game with real scoring',
  description:
    'Play Bullseye Darts free in your browser: time the swaying crosshair and hit trebles, doubles and the bullseye on a real dartboard. Ten darts a game — no download.',
  alternates: { canonical: '/games/darts' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/darts"
      headerTitle="🎯 Bullseye Darts"
      title="Bullseye Darts"
      blurb="Time the crosshair, hit the treble"
      how={[
        'The crosshair sways across a real dartboard and never stops moving. Tap, click or press space at the right moment to throw — the dart lands where the crosshair is (with a tiny wobble, like a real arm).',
        'Scoring is proper darts: each wedge scores its number, the thin outer ring doubles it, the thin inner ring trebles it, the green outer bull is 25 and the red bullseye is 50.',
        'You get ten darts a game, and the sway speeds up with every throw. A perfect game — ten treble 20s — is 600.',
      ]}
      tips={[
        'Treble 20 (60) beats the bullseye (50) — the pros aim there, and so should you.',
        'Watch the sway pattern for a full loop before your first throw; it repeats more than it looks like it does.',
        'When the crosshair speeds up late in the game, aim at the big 20 wedge instead of the treble band — a fat single beats a miss.',
        'The 1 and 5 sit either side of the 20: overcooking a 20 throw is how 60 becomes 1.',
      ]}
    >
      <BullseyeDarts />
    </GamePageShell>
  )
}
