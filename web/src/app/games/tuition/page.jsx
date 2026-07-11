import GamePageShell from '../../../components/games/GamePageShell'
import TuitionInvaders from '../../../components/games/TuitionInvaders'

export const metadata = {
  title: 'Tuition Invaders — free invader shooter: defend the college fund',
  description:
    'Play Tuition Invaders free in your browser: waves of tuition bills march down on the college fund — shoot down each semester to graduate debt-free. Bunkers, a scholarship bus and eight semesters of classic action.',
  alternates: { canonical: '/games/tuition' },
}

export default function Page() {
  return (
    <GamePageShell
      href="/games/tuition"
      headerTitle="🎓 Tuition Invaders"
      title="Tuition Invaders"
      blurb="Shoot down the tuition bills"
      how={[
        'Rows of tuition bills — textbooks, fees, the works — march side to side and step closer with every pass. Shoot the whole wave down to pay off the semester before it reaches the college fund.',
        'Move with ← → (or A/D) and fire with space; on phones drag to steer and tap to shoot. The green bunkers soak up shots from both sides until they crumble.',
        'Grad caps at the top are worth 30, books 20, pencils 10 — and the fewer bills remain, the faster the survivors move. Watch for the scholarship bus crossing the top: hitting it is a 100–300 bonus.',
        'Clear eight semesters and you graduate debt-free; the waves keep coming after that for score. Lose your three lives — or let the bills land — and the fund is bust.',
      ]}
      tips={[
        'Clear a full column early on one side — it gives the wave less room, so it marches longer before stepping down.',
        'Don’t hide under a bunker while shooting: your own shots eat it from below. Slide out, fire, slide back.',
        'Save a life-or-death shot for the bottom row: the lowest bill is always the one that ends your run.',
        'The last two invaders move fastest — lead your shots and let them walk into the bullet.',
      ]}
    >
      <TuitionInvaders />
    </GamePageShell>
  )
}
