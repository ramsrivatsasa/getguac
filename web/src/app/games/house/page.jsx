import GamePageShell from '../../../components/games/GamePageShell'
import DreamHouseStack from '../../../components/games/DreamHouseStack'

export const metadata = {
  title: 'Dream House Stack — free tower-stacking game: build your dream home',
  description:
    'Play Dream House Stack free in your browser: drop swinging floors dead-center to stack your dream house. Overhang gets sliced off, perfect drops win width back — 20 floors builds the house.',
  alternates: { canonical: '/games/house' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/house"
      headerTitle="🏡 Dream House Stack"
      title="Dream House Stack"
      blurb="Drop the floors dead-center"
      how={[
        'A floor of your future house swings from the crane. Tap, click or press space to drop it onto the stack below.',
        'Anything that hangs over the edge is sliced off and tumbles away — so every sloppy drop makes your next floor narrower. Land one dead-center (a Perfect) and you win a little width back.',
        'Stack 20 floors and the dream house is officially built — roof and all. Keep going for the penthouse and the roof garden; the crane swings faster the higher you build.',
        'Miss the stack completely and the build is over.',
      ]}
      tips={[
        'Watch the dashed guide lines, not the swinging block — when they line up with the stack edges, drop.',
        'The crane speeds up as you build, but its rhythm stays regular: count the swing like a metronome and release on the beat.',
        'Chasing Perfects is worth it — the width you win back compounds over the next ten floors.',
        'If the stack gets narrow, aim for the center and accept small slices; a thin stable tower beats a gamble.',
      ]}
    >
      <DreamHouseStack />
    </GamePageShell>
  )
}
