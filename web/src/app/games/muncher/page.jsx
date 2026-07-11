import GamePageShell from '../../../components/games/GamePageShell'
import GuacMuncher from '../../../components/games/GuacMuncher'

export const metadata = {
  title: 'Guac Muncher — free maze coin-chomping arcade game',
  description:
    'Play Guac Muncher free in your browser: chomp every coin in the maze, dodge four ghosts, and grab power coins to bite back. Keyboard or swipe — no download.',
  alternates: { canonical: '/games/muncher' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/muncher"
      headerTitle="🥑 Guac Muncher"
      title="Guac Muncher"
      blurb="Chomp the coins, dodge the ghosts"
      how={[
        'Steer the avocado through the maze and eat every coin to clear the level. Four ghosts patrol the corridors — touch one and you lose a life (you get three).',
        'The four big power coins in the corners flip the chase for a few seconds: the ghosts turn blue and run, and biting one sends its eyes scurrying home for bonus coins — 200, then 400, 600 and 800 for a full combo.',
        'Use the arrow keys or WASD on desktop, or swipe anywhere on the board on your phone. The side tunnels wrap around the maze — ghosts take them slowly, you don’t.',
        'Clear the maze and a fresh one is rebuilt a step faster. How deep can you go?',
      ]}
      tips={[
        'Turns are buffered: press your next direction just before a junction and the muncher corners without losing speed.',
        'Don’t spend power coins early — save them for when two or more ghosts are close, then hunt the combo.',
        'The tunnel is a panic button: ghosts slow down inside it, so it’s the best escape when you’re cornered.',
        'After a level up the ghosts release faster — grab the corner you’re nearest to first.',
      ]}
    >
      <GuacMuncher />
    </GamePageShell>
  )
}
