import MarketingShell from '../../components/MarketingShell'
import { ARCADE_ADS_ENABLED } from '../../lib/arcadeAds'
import GamesHub from '../../components/games/GamesHub'

export const metadata = {
  title: 'Guac Arcade — 15 free games: maze muncher, asteroids, darts & more',
  description:
    'Free browser games from GetGuac: a coin-chomping maze classic, asteroids, darts, brick-breaker, invaders, tower stacking, daily word puzzles and more. No download, phone-friendly — and playing earns GuacMoney.',
  alternates: { canonical: '/games' },
}

// MSN-Play-style portal: regular site header, sidebar + rows live in the
// client GamesHub (search/category filtering + localStorage continue row).
export default function GamesPage() {
  // ads follow the arcade kill-switch, not the shell default -- see
  // lib/arcadeAds and the `ads` prop comment in MarketingShell.
  return (
    <MarketingShell subtitle="money's wingman" ads={ARCADE_ADS_ENABLED}>
      <GamesHub />
    </MarketingShell>
  )
}
