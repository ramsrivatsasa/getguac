// One route for every partner (third-party) game.
//
// Our 36 hand-built games each have their own static route — app/games/muncher,
// app/games/fling, … — and Next resolves static segments BEFORE this dynamic
// one, so those pages are unaffected by this file existing. This only ever
// serves slugs that came out of externalGames.json.
//
// `dynamicParams = false` matters: without it, /games/anything-at-all would try
// to render and 404 at runtime instead of being a clean build-time 404, and a
// stale link from a removed partner game would look like a broken page rather
// than a missing one.
import { notFound } from 'next/navigation'
import GamePageShell from '../../../components/games/GamePageShell'
import ExternalGame from '../../../components/games/ExternalGame'
import { EXTERNAL, externalBySlug } from '../../../components/games/gamesList'
import { providerFor } from '../../../lib/gameProviders'

export const dynamicParams = false

// MarketingShell normally checks the native-app cookie, which makes a page
// request-specific and therefore private/no-store. Partner-game pages contain
// no user-specific server data, so force this route static; cookie APIs return
// empty values here and the regular public shell is rendered. Without this,
// `revalidate` below is ignored and every crawler hit invokes a function.
export const dynamic = 'force-static'

// 🔴 THESE TWO CACHE EXPORTS ARE THE ARCADE'S ENTIRE VERCEL BILL. Do not remove them.
//
// Without it, production served every one of these 512 URLs with
// `Cache-Control: private, no-cache, no-store` and `X-Vercel-Cache: MISS` —
// a fresh serverless render on EVERY hit, even though the build reports `●`
// and generates all 702 pages. Measured 2026-08-03 from the Vercel runtime
// logs: 100 of 100 sampled requests were /games/*, 212 req/min sustained,
// 52 distinct slugs inside a 28-second window, 98/98 cache MISS. That is
// ~82k function invocations and 5.6 GB per 12 hours — against 36 real
// visitors and 67 page views that day.
//
// The page is the same bytes for everybody: a partner iframe plus static
// copy from externalGames.json, which only changes when
// scripts/sync-external-games.mjs re-runs. So a day-long shared cache is
// free correctness — a crawler walking the whole catalogue now costs 512
// renders per DAY instead of per pass.
//
// The arcade is noindexed and ARCADE_ADS_ENABLED is off, so none of that
// spend was returning anything.
export const revalidate = 86400

export function generateStaticParams() {
  return EXTERNAL.map((g) => ({ slug: g.href.split('/').pop() }))
}

export function generateMetadata({ params }) {
  const game = externalBySlug(params.slug)
  if (!game) return {}
  return {
    title: `${game.name} — play free in your browser`,
    description: game.desc?.slice(0, 155) || `Play ${game.name} free in your browser at Guac Arcade.`,
    alternates: { canonical: game.href },
    // The whole arcade is noindexed in app/games/layout.jsx while we chase
    // AdSense approval, and these pages especially must stay that way: 80+
    // embedded partner games is exactly the thin-content pattern that got the
    // site rejected. Inherited, not re-declared, so there's one place to flip.
  }
}

export default function Page({ params }) {
  const game = externalBySlug(params.slug)
  if (!game) notFound()

  const provider = providerFor(game.provider)
  // The provider's own instructions text, split into steps for the how-to grid.
  // Sentence-split rather than shown as one blob so it matches the numbered
  // step cards our own games use.
  const how = (game.instructions || '')
    .split(/(?<=[.!?])\s+|\s{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 6)

  return (
    <GamePageShell
      href={game.href}
      title={game.name}
      blurb={game.tag}
      how={how}
    >
      <ExternalGame game={game} />
      <p className="text-[11px] text-center pt-2 pb-1" style={{ color: '#5F6D63' }}>
        Guest game provided by {provider?.label || 'our partner network'}.
      </p>
    </GamePageShell>
  )
}
