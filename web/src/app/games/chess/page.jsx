import GamePageShell from '../../../components/games/GamePageShell'
import GuacChess from '../../../components/games/GuacChess'

export const metadata = {
  title: 'Guac Chess — Savers vs. Spenders',
  description:
    'Free chess against the Spenders with three difficulty levels — full rules, and every captured piece has a price tag. Play a friend in pass-and-play too.',
  alternates: { canonical: '/games/chess' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/chess"
      headerTitle="♟️ Guac Chess"
      title="Guac Chess"
      blurb="Savers vs. Spenders, full rules"
      how={[
        'Full chess, no shortcuts: castling, en passant, promotion, the lot. You play the Savers against the Spender AI — pick from three difficulties, or hand the phone to a friend for pass-and-play.',
        'Every piece carries a price tag, so each capture shows exactly what the exchange was worth. The running total keeps the material count honest.',
        'Tap a piece to see its legal moves, tap the square to move. The AI answers quickly on easy and thinks a few plies deep on hard.',
      ]}
      tips={[
        'Develop knights and bishops before pushing side pawns — the Spenders punish slow openings.',
        'Check the price tags before trading: a bishop for three pawns is usually a losing deal early on.',
        'Castle early. The AI hunts uncastled kings down the middle files.',
        'On hard difficulty, trade pieces when ahead on material — a simplified board converts an edge into a win.',
      ]}
    >
      <GuacChess />
    </GamePageShell>
  )
}
