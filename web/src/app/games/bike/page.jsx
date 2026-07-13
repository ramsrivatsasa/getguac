import GamePageShell from '../../../components/games/GamePageShell'
import GuacHillClimb from '../../../components/games/GuacHillClimb'

export const metadata = {
  title: 'Guac Bike Racing — free hill bike racing game',
  description:
    'Play Guac Bike Racing free: wheelie the avocado motorbike over rolling hills, grab cash and fuel, and stick your landings. Gas and brake tilt you in mid-air. No download.',
  alternates: { canonical: '/games/bike' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/bike"
      title="Guac Bike Racing"
      blurb="Wheelie over the hills, grab the cash"
      how={[
        'Press gas to roll forward and brake to slow or reverse. The bike hugs the terrain — build speed on the downhills to launch off the crests.',
        'In the air, gas leans the bike back for a wheelie and brake tips it forward, so you can rotate to a clean, wheels-first landing. Land on your head and the run is over.',
        'Collect the gold $ coins for cash and top up at the red fuel cans. Score is your cash plus the distance you covered.',
      ]}
      tips={[
        'A bike flips easier than a car — feather the gas on steep climbs so you don’t loop out backwards.',
        'Tap the opposite pedal in the air to level the bike before you touch down.',
        'Momentum is everything: keep the throttle smooth and let the downhills carry you.',
      ]}
    >
      <GuacHillClimb vehicle="bike" gameId="bike" bestKey="gg-bike-best-v1" title="Guac Bike Racing" />
    </GamePageShell>
  )
}
