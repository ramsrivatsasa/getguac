import GamePageShell from '../../../components/games/GamePageShell'
import PennyPong from '../../../components/games/PennyPong'

export const metadata = {
  title: 'Penny Pong — play pong vs the computer free online',
  description:
    'Play Penny Pong free in your browser: the original video game against a computer paddle. First to 7, rising ball speed, rally bonuses — no download.',
  alternates: { canonical: '/games/pong' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/pong"
      title="Penny Pong"
      blurb="First to seven against the machine"
      how={[
        'Move your paddle with the mouse, a finger on touch screens, or the arrow keys. You defend the left side; the computer holds the right.',
        'The penny speeds up with every paddle hit, and where it strikes your paddle sets the return angle — the very edge sends it off at a vicious diagonal.',
        'First to 7 points wins the match. Your final score counts points scored, your longest rally, and a 500-point bonus for taking the match.',
      ]}
      tips={[
        'Catch the ball off-center on purpose — sharp angles are the only shots the machine struggles to chase.',
        'Stay near the middle between hits; committing early to a corner is how the computer aces you.',
        'The machine mirrors slow balls easily. Survive until the rally speeds up, then go for the edge shot.',
        'Long rallies are not wasted time — every rally hit is +10 on your final score.',
      ]}
    >
      <PennyPong />
    </GamePageShell>
  )
}
