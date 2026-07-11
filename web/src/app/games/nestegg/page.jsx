import GamePageShell from '../../../components/games/GamePageShell'
import NestEggClimb from '../../../components/games/NestEggClimb'

export const metadata = {
  title: 'Nest Egg Climb — free jumping game: bounce from $0 to $1M retirement',
  description:
    'Play Nest Egg Climb free in your browser: bounce your way up an endless tower of platforms and grow the nest egg from $0 to a $1,000,000 retirement. Springs, moving platforms and crumbling risky bets.',
  alternates: { canonical: '/games/nestegg' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/nestegg"
      headerTitle="🪺 Nest Egg Climb"
      title="Nest Egg Climb"
      blurb="Bounce your way to a $1M retirement"
      how={[
        'Your avocado bounces automatically — your job is to steer it onto the next platform with ← → (or A/D), or by holding the left or right half of the screen on your phone. Every foot of height grows the nest egg.',
        'Green platforms are steady index funds — solid every time. Blue ones drift with the market. The cracked amber ones are risky bets: they hold exactly one bounce, then crumble.',
        'Gold springs are 401(k) matches — free money that launches you far higher than a normal bounce.',
        'The higher you climb the trickier the platforms get. Hit the gold line at $1,000,000 and you’re officially retired; the climb keeps going for the high score. Fall off the bottom and the run ends.',
      ]}
      tips={[
        'The screen wraps left-to-right — walking off one edge to reach a platform on the other side is often the safest route.',
        'Never plan two risky (cracked) platforms in a row: after the first crumbles you need somewhere solid to land.',
        'Springs beat everything — a small detour to a 401(k) match usually gains more height than the “direct” route.',
        'Steer while you rise, not while you fall: adjusting early gives you the whole arc to line up the landing.',
      ]}
    >
      <NestEggClimb />
    </GamePageShell>
  )
}
