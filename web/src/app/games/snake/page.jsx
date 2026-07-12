import GamePageShell from '../../../components/games/GamePageShell'
import CoinSnake from '../../../components/games/CoinSnake'

export const metadata = {
  title: 'Coin Snake — play the classic snake game free online',
  description:
    'Play Coin Snake free in your browser: the classic snake game with coins, diamond bonuses and rising speed. Arrows, WASD or swipe — no download.',
  alternates: { canonical: '/games/snake' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/snake"
      title="Coin Snake"
      blurb="Eat coins, grow long, don't bite yourself"
      how={[
        'Steer the snake with the arrow keys, WASD, or swipes on touch. Every coin (🪙) is +10 points and one more segment of snake.',
        'Every fifth coin drops a diamond (💎) worth +50 — but it fades after a few seconds, so decide fast whether the detour is worth it.',
        'The walls are solid and so is your tail. The longer you grow, the faster the snake moves — the endgame is a game of patience and tight corners.',
      ]}
      tips={[
        'Hug the edges and spiral inward — open-field wandering is how long snakes trap themselves.',
        'Never chase a diamond across your own body line; +50 is not worth the run.',
        'Queue your turns early: the snake takes one turn per tile, so double-tapping a corner wastes the second input.',
        'Late game, follow your own tail — the safest square on the board is the one your tail is about to leave.',
      ]}
    >
      <CoinSnake />
    </GamePageShell>
  )
}
