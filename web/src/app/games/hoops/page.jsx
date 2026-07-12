import GamePageShell from '../../../components/games/GamePageShell'
import HoopShot from '../../../components/games/HoopShot'

export const metadata = {
  title: 'Hoop Shot — free online basketball shooting game',
  description:
    'Play Hoop Shot free in your browser: drag, release and swish. Real rim and backboard bounces, 60 seconds on the clock, and three makes in a row set the ball on fire.',
  alternates: { canonical: '/games/hoops' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/hoops"
      title="Hoop Shot"
      blurb="Drag, release, swish"
      how={[
        'Drag back from the ball — slingshot style, with a dotted preview of the arc — and release to shoot. The shooting spot moves after every ball, so no two shots are the same.',
        'The rim and backboard are real physics: the ball clanks off the iron pegs and banks off the glass. A make is +2; hit nothing but net and the swish pays +3.',
        'You have 60 seconds. Three makes in a row light the ball on fire — every bucket counts double until you miss.',
      ]}
      tips={[
        'High arc beats flat: a steeper drop gives the ball far more rim to fall through.',
        'From deep positions, use the backboard — banked shots are much more forgiving than rainbow swishes.',
        'On fire? Slow down half a beat. A rushed miss costs the ×2 on every ball you had coming.',
        'The rim pegs are honest: shots that look "close" but hit the front iron were short — add a touch more pull.',
      ]}
    >
      <HoopShot />
    </GamePageShell>
  )
}
