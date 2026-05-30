'use client'
// Discover strip — Fetch-style quest tiles + Shop-by-category grid.
//
// Renders above the existing dashboard content so we keep the user's
// financial-snapshot widgets but give them an opening surface that
// actually looks like an engagement product. Quests double as a quiet
// onboarding nudge for users who haven't connected a store / saved a
// Steal / hit a Smash day yet.

import QuestTile from './QuestTile'
import CategoryTile from './CategoryTile'

// Quest catalog. Each quest is small enough that a brand-new user can
// hit them in their first session. GuacMoney rewards are intentionally
// small ($25 / $50) so they don't dilute the real saved-dollar value
// of GuacMoney from cheapest-store routing.
const QUESTS = [
  {
    id: 'connect-store',
    emoji: '🔗',
    tint: '#dbeafe',
    title: 'Connect a store',
    subtitle: 'Auto-import receipts',
    rewardLabel: '🥑 $5',
    href: '/profile?tab=connections',
  },
  {
    id: 'save-steals',
    emoji: '💖',
    tint: '#fce7f3',
    title: 'Save 5 Steals',
    subtitle: 'Get notified when prices drop',
    rewardLabel: '🥑 $2',
    href: '/steals',
  },
  {
    id: 'smash-days',
    emoji: '🔥',
    tint: '#fed7aa',
    title: 'Hit 3 Smash days',
    subtitle: 'Log a receipt 3 days in a row',
    rewardLabel: '🥑 $3',
    href: '/receipts',
  },
  {
    id: 'first-receipt',
    emoji: '📸',
    tint: '#dcfce7',
    title: 'Snap your first receipt',
    subtitle: 'Start your stash',
    rewardLabel: '🥑 $5',
    href: '/receipts',
  },
]

// Top-of-mind categories the user can drill into. Mirrors the
// Fetch "Shop by category" tile grid. Slugs match lib/categories.js
// so a tile click goes to /stash?category=<slug>.
const CATEGORIES = [
  { slug: 'grocery',    label: 'Grocery',     emoji: '🥦' },
  { slug: 'beverages',  label: 'Beverages',   emoji: '🧃' },
  { slug: 'health',     label: 'Health',      emoji: '💊' },
  { slug: 'household',  label: 'Household',   emoji: '🧴' },
  { slug: 'pet',        label: 'Pet',         emoji: '🐶' },
  { slug: 'restaurant', label: 'Restaurants', emoji: '🍴' },
]

export default function DiscoverStrip({ navigate }) {
  // navigate is the parent-supplied router.push so we don't pull
  // useRouter here. Falls back to a plain location change if missing.
  const go = (href) => {
    if (typeof navigate === 'function') return navigate(href)
    if (typeof window !== 'undefined') window.location.href = href
  }

  return (
    <section className="space-y-4">
      {/* Quest strip */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-extrabold text-gray-900">Start earning</h2>
          <span className="text-xs text-gray-500">Quick GuacMoney wins 🥑</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUESTS.map(q => (
            <QuestTile
              key={q.id}
              emoji={q.emoji}
              tint={q.tint}
              title={q.title}
              subtitle={q.subtitle}
              rewardLabel={q.rewardLabel}
              onClick={() => go(q.href)}
            />
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-extrabold text-gray-900">Shop by category</h2>
          <a href="/stash" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">See all</a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(c => (
            <CategoryTile key={c.slug} slug={c.slug} label={c.label} emoji={c.emoji} />
          ))}
        </div>
      </div>
    </section>
  )
}
