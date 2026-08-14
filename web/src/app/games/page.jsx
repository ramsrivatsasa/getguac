import MarketingShell from '../../components/MarketingShell'
import { ARCADE_ADS_ENABLED } from '../../lib/arcadeAds'
import GamesHub from '../../components/games/GamesHub'
import { GAMES, OWN_GAMES } from '../../components/games/gamesList'

export const metadata = {
  title: `Guac Arcade — ${OWN_GAMES.length} GetGuac originals and ${GAMES.length} free games`,
  description:
    'Play GetGuac originals built around spending, saving and real-life goals, plus hundreds of free browser games. No download, phone-friendly, and completed original rounds earn GuacMoney.',
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
