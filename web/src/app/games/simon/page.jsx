import GamePageShell from '../../../components/games/GamePageShell'
import GuacSays from '../../../components/games/GuacSays'

export const metadata = {
  title: 'Guac Says — free online Simon memory game',
  description:
    'Play Guac Says free in your browser: watch the four pads light up, replay the sequence, survive as it grows longer and faster every round. No download.',
  alternates: { canonical: '/games/simon' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/simon"
      title="Guac Says"
      blurb="Watch, remember, replay"
      how={[
        'Four pads light up in a sequence — watch it play, then tap the pads back in the same order.',
        'Every round adds one more step to the end of the sequence, and the playback gets faster as it grows. One wrong pad ends the run.',
        'Each completed round pays 100 points times the sequence length, so round 10 alone is worth 1,000.',
      ]}
      tips={[
        'Each pad has its own tone — most players last far longer remembering the melody than the colors.',
        'Chunk the sequence like a phone number: groups of three or four, not one long string.',
        'Only the newest step is new information. Anchor it to the step before it and trust the rest.',
        'Do not hover mid-board; resting your finger on the last pad you pressed keeps your place in the pattern.',
      ]}
    >
      <GuacSays />
    </GamePageShell>
  )
}
