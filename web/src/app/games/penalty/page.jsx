import GamePageShell from '../../../components/games/GamePageShell'
import PenaltyShootout from '../../../components/games/PenaltyShootout'

export const metadata = {
  title: 'Penalty Shootout — free online soccer penalty game',
  description:
    'Play Penalty Shootout free in your browser: lock the sweeping crosshair, stop the power bar and beat the diving keeper. Ten penalties, hot-run bonuses, no download.',
  alternates: { canonical: '/games/penalty' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/penalty"
      title="Penalty Shootout"
      blurb="Pick your corner, beat the keeper"
      how={[
        'Every penalty is two taps. The first tap locks the crosshair as it sweeps across the goalmouth — that is where your shot goes. The second tap stops the rising-and-falling power bar.',
        'The keeper decides as you strike: soft shots give him time to read your corner, hard shots force a guess. But push the power past 90 and the ball can sail clean over the bar.',
        'You take ten penalties. A goal is 100 plus a corner bonus for placement near the posts and bar — and consecutive goals build a hot-run bonus worth 25 more each.',
      ]}
      tips={[
        'The sweet spot is 70–90 power: too fast for the keeper, still under the bar.',
        'Corners pay double duty — harder for the keeper to reach and worth up to 50 bonus points.',
        'Down-the-middle works exactly when it looks dumbest: after a run of corner shots, the keeper is already diving.',
        'Protect your run: a safe 75-power shot into a corner beats a max-power gamble that ends it at zero.',
      ]}
    >
      <PenaltyShootout />
    </GamePageShell>
  )
}
