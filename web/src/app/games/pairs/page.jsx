import GamePageShell from '../../../components/games/GamePageShell'
import MoneyMatch from '../../../components/games/MoneyMatch'

export const metadata = {
  title: 'Money Match — free online memory pairs game',
  description:
    'Play Money Match free in your browser: flip two cards, find the pair, clear the board. 4×4 and 6×6 memory boards scored on moves and time — no download.',
  alternates: { canonical: '/games/pairs' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/pairs"
      title="Money Match"
      blurb="Flip two, find the pair"
      how={[
        'Flip any two cards. If they match, they stay face up; if not, they flip back — and it is on you to remember where they were.',
        'Clear the whole board to finish. Your score starts high and shrinks with every move and every second, so precision and pace both matter.',
        'Two boards: a quick 4×4 with 8 pairs, and a serious 6×6 with 18 pairs that is worth far more points.',
      ]}
      tips={[
        'Open new cards in pairs you have never seen rather than re-flipping known ones — every reveal is information.',
        'Say the card positions to yourself ("piggy, bottom-left") — naming beats staring for recall.',
        'On 6×6, work one quadrant at a time; a mental map of 36 squares is really four maps of 9.',
        'The last few pairs should be zero-miss — by then you have seen everything once.',
      ]}
    >
      <MoneyMatch />
    </GamePageShell>
  )
}
