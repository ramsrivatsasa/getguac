import GamePageShell from '../../../components/games/GamePageShell'
import SpaceRocks from '../../../components/games/SpaceRocks'

export const metadata = {
  title: 'Space Rocks — free classic asteroids starship game',
  description:
    'Play Space Rocks free in your browser: rotate, thrust and blast the asteroids before they crush your starship. Big rocks split into fast small ones — classic arcade action, no download.',
  alternates: { canonical: '/games/rocks' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/rocks"
      headerTitle="🚀 Space Rocks"
      title="Space Rocks"
      blurb="Rotate, thrust, blast the rocks"
      how={[
        'Your starship sits in a drifting asteroid field. Rotate with ← and →, fire the main thruster with ↑, and shoot with the space bar (WASD works too). On phones, use the on-screen thruster and fire buttons.',
        'Shooting a big rock splits it into two medium rocks, and each medium splits into two small ones. Small rocks are fast — and worth the most: 20 for large, 50 for medium, 100 for small.',
        'The screen wraps on every edge, for you and the rocks alike. Every so often a saucer crosses the field taking pot-shots at you; it’s worth 200 if you can hit it.',
        'Clear the field to start the next wave with more rocks. You have three ships; a fresh ship spawns with a short shield.',
      ]}
      tips={[
        'Drift is your friend: short thruster taps beat holding the burn — momentum carries you and there are no brakes.',
        'Never split a big rock while you’re close to it: the two mediums fly off in random directions, often straight at you.',
        'Use the screen wrap offensively — shots wrap too, so you can hit rocks across the edge.',
        'When the saucer shows up, keep moving sideways; its aim leads slow targets.',
      ]}
    >
      <SpaceRocks />
    </GamePageShell>
  )
}
