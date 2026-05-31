'use client'
// Horizontal row-style item card. Left thumbnail tile + right content
// block with title / subtitle / heart / social-proof / progress / GuacMoney.
//
// Visual lifted from the /preview/discover "Popular at Costco" rows —
// promoted to a real component so production surfaces (Stash, Steals,
// Smashlist Buy Again, Receipt detail, Activity feed) can all share
// the same shape.
//
// Required props are loose so the same component renders well in every
// context — pass only what the surface knows. Example:
//
//   <ItemRowCard
//     tint="#fef3c7"
//     emoji="🪒"
//     title="Bic Soleil 3 Razors"
//     subtitle="4 count"
//     urgency="533 left"
//     urgencyTone="rose"
//     social="22k"
//     guacMoney={10}
//     brandBadge="🏪"
//     saved={false}
//     onToggleSave={...}
//     onClick={() => router.push('/items/abc')}
//   />

import { Heart } from 'lucide-react'

const URGENCY_TONES = {
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  rose:   'bg-rose-100 text-rose-700 border-rose-200',
  amber:  'bg-amber-100 text-amber-800 border-amber-200',
  emerald:'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function formatCount(n) {
  if (n == null) return ''
  const num = Number(n)
  if (!num || num < 1000) return String(num || 0)
  if (num < 10_000) return `${(num / 1000).toFixed(1)}k`
  if (num < 1_000_000) return `${Math.round(num / 1000)}k`
  return `${(num / 1_000_000).toFixed(1)}M`
}

export default function ItemRowCard({
  thumb,
  tint = '#f3f4f6',
  emoji,
  urgency,
  urgencyTone = 'violet',
  title,
  subtitle,
  social,
  progress,
  guacMoney,
  brandBadge,
  saved = false,
  onToggleSave,
  onClick,
}) {
  const urgencyClass = URGENCY_TONES[urgencyTone] || URGENCY_TONES.violet
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
    >
      {/* Left thumbnail tile */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ backgroundColor: tint, width: 120, height: 120 }}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={title} className="max-h-24 max-w-[80%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <span className="text-5xl" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>{emoji || '🛒'}</span>
        )}
        {brandBadge && (
          <span className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-base border-2 border-white shadow">
            {brandBadge}
          </span>
        )}
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
        <div>
          {urgency && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${urgencyClass} mb-1`}>
              {urgencyTone === 'rose' && <span>⚡</span>}
              {urgency}
            </span>
          )}
          <p className="text-base font-extrabold text-gray-900 leading-tight line-clamp-2">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSave?.() }}
              className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full border transition ${
                saved
                  ? 'border-rose-300 bg-rose-50 text-rose-500'
                  : 'border-gray-200 bg-white text-gray-400 hover:text-rose-500 hover:border-rose-200'
              }`}
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <Heart size={13} fill={saved ? 'currentColor' : 'none'} />
            </button>
            {social != null && (
              <span className="text-[11px] font-semibold text-gray-500 tabular-nums shrink-0">{formatCount(social)}</span>
            )}
            {typeof progress === 'number' && (
              <div className="flex-1 min-w-[40px] max-w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-lime-500" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </div>
          {guacMoney != null && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-extrabold tabular-nums shrink-0">
              🥑 {typeof guacMoney === 'number'
                ? (guacMoney < 1 ? `$${guacMoney.toFixed(2)}` : `$${guacMoney.toFixed(0)}`)
                : guacMoney}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
