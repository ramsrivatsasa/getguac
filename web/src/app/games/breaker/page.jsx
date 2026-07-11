import GamePageShell from '../../../components/games/GamePageShell'
import DebtBreaker from '../../../components/games/DebtBreaker'

export const metadata = {
  title: 'Debt Breaker — free brick-breaker game: smash the debt wall',
  description:
    'Play Debt Breaker free in your browser: classic paddle-and-ball brick breaking where the wall is your debt — credit cards, car loans, student loans. Smash every brick to go debt-free.',
  alternates: { canonical: '/games/breaker' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/breaker"
      headerTitle="🧱 Debt Breaker"
      title="Debt Breaker"
      blurb="Smash the wall, go debt-free"
      how={[
        'The brick wall is a stack of debts — credit cards up top, car loans, student loans and buy-now-pay-later below. Keep the ball in play with your paddle and every brick you smash pays that balance off.',
        'Move the paddle with your mouse, finger or arrow keys, and launch with a tap or the space bar. Where the ball hits the paddle steers it: the edges send it out wide, the middle sends it straight up.',
        'Some bricks drop power-ups — catch them: ↔️ widens the paddle, 🐢 slows the ball, ✚ splits it into three. Clear the whole wall and the level ends DEBT FREE, then a bigger, faster wall arrives.',
        'Top-row bricks take two hits on later levels. You get three balls.',
      ]}
      tips={[
        'Aim for the sides early: once the ball gets behind the wall it bounces along the top smashing bricks for free.',
        'Multiball is the best power-up — but only chase drops you can reach without abandoning the ball.',
        'The paddle edge is a steering wheel, not a wall: catch the ball off-center on purpose to angle your next shot.',
        'Slow ball + wide paddle together make a practically unmissable setup — stack them when you can.',
      ]}
    >
      <DebtBreaker />
    </GamePageShell>
  )
}
