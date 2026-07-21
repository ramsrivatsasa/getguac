import GamePageShell from '../../../components/games/GamePageShell'
import FruitSlice from '../../../components/games/FruitSlice'

export const metadata = {
  title: 'Fruit Slice — play the classic fruit slicer free online',
  description:
    'Play Fruit Slice free in your browser: fruit flies up and you swipe the blade to slice it, chain combos and dodge the bombs. Phone-friendly, no download.',
  alternates: { canonical: '/games/fruit' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/fruit"
      title="Fruit Slice"
      blurb="Swipe to slice, chain combos, dodge the bombs"
      how={[
        { icon: '👆', title: 'One-touch controls', text: 'Tap, swipe or drag — every game is playable with one finger. Slash across the fruit to slice it clean in two.' },
        { icon: '🔥', title: 'Build combos', text: 'Quick chains multiply your score. Slice three or more in one swipe for a combo — missing resets the streak.' },
        { icon: '🏆', title: 'Beat your best', text: 'Scores post to the weekly leaderboard. Dodge the bombs, grab the golden avocado, and take a top slot.' },
      ]}
      tips={[
        'Long horizontal swipes across the top of the arcs catch the most fruit in one combo.',
        'Bombs look like dark spheres with a lit fuse — flick around them, never through them.',
        'Do not chase a single fruit into a cluster of bombs; a missed fruit only costs one life, a bomb costs the game.',
        'Let a lone fruit fall if the only path to it crosses a bomb — patience keeps your run alive.',
      ]}
    >
      <FruitSlice />
    </GamePageShell>
  )
}
