'use client'
// Reusable Product card — used by Stash, Steals, Buy Again, Discover,
// Store-detail "Popular at <store>" strip, and the Personalized Deals
// carousel.
//
// Visual language is intentionally close to Fetch's product card
// (colored gradient thumbnail tile + heart save + social-proof avatars
// + reward chip + urgency badge) but uses GetGuac branding throughout:
//   - Heart icon stays rose
//   - Reward chip is the GuacMoney emerald, not Fetch yellow
//   - Urgency badge is amber "X left" / "Buy 2" copy
//   - Footer reads "<count> saved" with smashlist voice — never "points"
//
// Props are loose so the same component handles every use case:
//   <ProductCard
//     thumb={imgUrl}              // top-of-card product image
//     thumbBg="#fdf2f8"           // pastel tile color (or pulled from item.category)
//     title="Charmin Ultra Soft"
//     subtitle="Select varieties"
//     guacMoney={45}              // emerald chip on the right ($ amount or null)
//     urgencyBadge="Buy 2"        // amber chip above title (or null)
//     socialCount={67_400}        // # of users who saved, drives the small avatar row
//     saved={false}               // heart state
//     onToggleSave={() => ...}
//     onClick={() => ...}         // whole card tap
//   />

import { Heart } from 'lucide-react'

// Default pastel palette for category-tinted thumbs. Keyed against the
// GetGuac category slugs in lib/categories.js so the same product gets
// the same tile color everywhere it appears.
const CATEGORY_TINT = {
  grocery:    '#ecfccb',  // lime-100
  beverages:  '#fef3c7',  // amber-100
  alcohol:    '#fee2e2',  // rose-100
  pet:        '#fce7f3',  // pink-100
  household:  '#dbeafe',  // sky-100
  health:     '#f3e8ff',  // violet-100
  restaurant: '#fef9c3',  // yellow-100
  default:    '#f3f4f6',  // gray-100
}

export function tintForCategory(categorySlug) {
  return CATEGORY_TINT[categorySlug] || CATEGORY_TINT.default
}

function formatCount(n) {
  if (!n || n < 1000) return String(n || 0)
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export default function ProductCard({
  thumb,
  thumbBg,
  category,
  title,
  subtitle,
  guacMoney,
  urgencyBadge,
  socialCount,
  saved,
  onToggleSave,
  onClick,
  compact = false,
}) {
  const tile = thumbBg || tintForCategory(category)
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all w-full"
    >
      {/* Colored thumbnail tile — squarish, padding-only so the product
          image floats on the tint. */}
      <div
        className="relative flex items-center justify-center"
        style={{ backgroundColor: tile, aspectRatio: '1.05 / 1' }}
      >
        {urgencyBadge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
            {urgencyBadge}
          </span>
        )}
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={title}
            className={`object-contain ${compact ? 'max-h-20' : 'max-h-28'} max-w-[80%]`}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <span className="text-4xl opacity-50">🛒</span>
        )}
      </div>

      {/* Footer — heart + social count on the left, GuacMoney chip on
          the right. Two-line title above. */}
      <div className="p-2.5 space-y-1.5">
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-gray-500 truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSave?.() }}
              className={`w-7 h-7 flex items-center justify-center rounded-full border transition ${
                saved
                  ? 'border-rose-300 bg-rose-50 text-rose-500'
                  : 'border-gray-200 bg-white text-gray-400 hover:text-rose-500 hover:border-rose-200'
              }`}
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
            </button>
            {socialCount > 0 && (
              <span className="text-[10px] font-semibold text-gray-500 tabular-nums">
                {formatCount(socialCount)}
              </span>
            )}
          </div>
          {guacMoney != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold tabular-nums">
              🥑 ${typeof guacMoney === 'number' ? guacMoney.toFixed(0) : guacMoney}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
