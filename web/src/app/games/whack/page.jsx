import GamePageShell from '../../../components/games/GamePageShell'
import WhackAFee from '../../../components/games/WhackAFee'

export const metadata = {
  title: 'Whack-a-Fee — free online whack-a-mole game',
  description:
    'Play Whack-a-Fee free in your browser: hammer the fees popping out of nine holes, chase the golden bonus, and never bonk the piggy bank. 45 frantic seconds.',
  alternates: { canonical: '/games/whack' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/whack"
      title="Whack-a-Fee"
      blurb="Hammer the fees, spare the piggy"
      how={[
        'Fees (💸) pop out of nine holes — tap them before they duck back down. Every fee you flatten is +25.',
        'The golden fee (🤑) is +100 but only surfaces for a blink. The piggy bank (🐷) is your savings: bonk it and you lose 100.',
        'Rounds last 45 seconds and the spawns come faster and faster as the clock runs down.',
      ]}
      tips={[
        'Park your eyes on the center hole and use peripheral vision — chasing each mole with your gaze is too slow.',
        'Commit to the golden fee the frame it appears; hesitate and it is gone.',
        'When the piggy pops up next to a fee, aim deliberately — the −100 mis-tap is where good rounds die.',
        'On touch screens, play with two thumbs and split the board in half.',
      ]}
    >
      <WhackAFee />
    </GamePageShell>
  )
}
