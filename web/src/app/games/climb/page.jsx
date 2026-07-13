import GamePageShell from '../../../components/games/GamePageShell'
import GuacHillClimb from '../../../components/games/GuacHillClimb'

export const metadata = {
  title: 'Guac Hill Climb — free hill-climb racing game',
  description:
    'Play Guac Hill Climb free: drive the avocado buggy over rolling hills, grab cash and fuel, and go the distance without flipping. Gas and brake tilt you for mid-air landings. No download.',
  alternates: { canonical: '/games/climb' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/climb"
      title="Guac Hill Climb"
      blurb="Climb the hills, grab the cash"
      how={[
        'Press gas to roll forward and brake to slow down or reverse. The buggy follows the terrain — build speed on the downhills to launch off the crests.',
        'In the air, gas leans the buggy back and brake leans it forward, so you can line up a clean, wheels-first landing. Land on your roof and the run is over.',
        'Grab the gold $ coins along the track for cash, and top up at the red fuel cans — run the tank dry and you coast to a stop. Score is your cash plus the distance you covered.',
      ]}
      tips={[
        'Feather the gas on steep climbs — flooring it can spin your wheels and tip you over backwards.',
        'Coming off a big jump, tap the opposite pedal to level out before you land.',
        'Grab every fuel can you can — distance matters more than speed, and a dry tank ends the run.',
      ]}
    >
      <GuacHillClimb />
    </GamePageShell>
  )
}
