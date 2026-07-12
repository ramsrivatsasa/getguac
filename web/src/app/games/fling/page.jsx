import GamePageShell from '../../../components/games/GamePageShell'
import GuacFling from '../../../components/games/GuacFling'

export const metadata = {
  title: 'Guac Fling — free slingshot physics game, no download',
  description:
    'Play Guac Fling free in your browser: drag the slingshot, launch avocados and demolish towers of fee blocks to squash every money-waster. Glass, wood and stone physics — no download.',
  alternates: { canonical: '/games/fling' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/fling"
      title="Guac Fling"
      blurb="Slingshot avocados, topple the fee towers"
      how={[
        'Drag the avocado back in the slingshot — the dotted arc previews your shot — and release to fire. The further you pull, the harder it flies.',
        'Towers are built from glass (shatters at a touch), wood (takes a solid hit) and stone (needs real pace). Knock blocks out and everything above them comes crashing down.',
        'Squash every money-waster (💸) to clear the level: hit them directly, drop blocks on them, or make them fall from a height. You get four avocados per level, and unused ones pay a 500-point bonus.',
      ]}
      tips={[
        'Aim for the load-bearing blocks — collapsing a tower does far more damage than chipping at the top.',
        'A flat, fast shot punches through wood; a high lob drops blocks (and wasters) from lethal heights.',
        'Glass is worth less but breaks free — send one avocado through a glass floor and let gravity finish the job.',
        'Later loops of the five levels toughen every block, so the bird-saving habit pays compound interest.',
      ]}
    >
      <GuacFling />
    </GamePageShell>
  )
}
