'use client'
// Centralized item card — React implementation of the cross-platform
// contract documented at `test-fixtures/item-card-scenarios.json`.
// Visually equivalent to mobile `FetchCard` (Flutter) — same prop
// names, same defaults, same compact layout. Both implementations
// must produce identical output for the same props.
//
// Used by Stash (production), Steals, Buy Again, etc. The Node
// renderer at `web/scripts/render-item-card-scenarios.mjs` produces
// a contract PDF that's the visual reference for both implementations.

import { useState, useCallback } from 'react'
import { Star, Heart, Share2, MoreHorizontal, Bolt } from 'lucide-react'

function fmt(n) {
  const v = Math.abs(Number(n))
  if (v >= 1000) {
    const k = v / 1000
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`
  }
  return v === Math.round(v) ? `${Math.round(v)}` : v.toFixed(2)
}

/**
 * Centralized item card. All props are optional except `title`.
 * See test-fixtures/item-card-scenarios.json for the prop contract.
 */
export default function ItemRowCard({
  title,
  subtitle,
  imageEmoji,
  imageUrl,
  tint = '#fef9c3',
  urgency,
  urgencyBg = '#fecdd3',
  urgencyFg = '#9f1239',
  storeName,
  storeColor = '#6b7280',
  storeEmoji,
  value,
  valueLabel = '',
  valueIsPrefix = false,
  rating = 0,
  onRate,
  communityRating,
  communityRatingCount,
  saved = false,
  onToggleSave,
  onTap,
  onShare,
  onMenu,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const valueText = value != null
    ? (valueIsPrefix ? `${valueLabel}${fmt(value)}` : `${fmt(value)}${valueLabel}`)
    : ''
  const isUrgencyBolt = urgency && urgency.toLowerCase().includes('left')

  const openPicker = useCallback(() => { if (onRate) setPickerOpen(true) }, [onRate])
  const pickRating = useCallback((n) => {
    setPickerOpen(false)
    onRate?.(n)
  }, [onRate])

  return (
    <div
      onClick={onTap}
      className={`relative flex gap-3 bg-white rounded-2xl p-2.5 pr-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${onTap ? 'cursor-pointer' : ''}`}
    >
      {/* Tinted image tile — visual anchor */}
      <div
        className="w-[72px] h-[72px] rounded-xl flex items-center justify-center text-[36px] shrink-0"
        style={{ background: tint }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" width={68} height={68}
            className="w-[68px] h-[68px] rounded-[10px] object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <span>{imageEmoji || '📦'}</span>
        )}
      </div>

      {/* Right column: title-row, subtitle, utility row */}
      <div className="flex-1 min-w-0 pt-0.5">
        {urgency && (
          <div
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black mb-1"
            style={{ background: urgencyBg, color: urgencyFg }}
          >
            {isUrgencyBolt && <Bolt size={10} style={{ marginRight: 1 }} />}
            {urgency}
          </div>
        )}

        {/* Title row — title left-flex, value chip top-right */}
        <div className="flex items-start gap-2">
          <h3 className="flex-1 min-w-0 text-[14px] font-extrabold text-gray-900 leading-tight line-clamp-2">
            {title}
          </h3>
          {value != null && (
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white flex items-center justify-center">
                <Star size={11} fill="currentColor" />
              </span>
              <span className="text-[14px] font-black text-gray-900">{valueText}</span>
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-[11.5px] text-gray-500 font-medium leading-snug mt-0.5 line-clamp-2">
            {subtitle}
          </p>
        )}

        {/* Utility row — on-hand pill (left), rating chips, save/share/menu (right) */}
        <div className="flex items-center gap-1 mt-1.5">
          {storeName && (
            <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-2xl pl-0.5 pr-2 py-0.5 max-w-[60%] min-w-0">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                style={{ background: storeColor }}
              >
                {storeEmoji || '·'}
              </span>
              <span className="text-[10.5px] font-extrabold text-gray-700 truncate">{storeName}</span>
            </div>
          )}
          <span className="flex-1" />

          {/* Personal rating chip — tap or long-press opens the picker */}
          {onRate && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openPicker() }}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-2xl text-[11px] font-black border ${
                rating > 0
                  ? 'bg-amber-100/60 border-amber-300 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
              title={rating > 0 ? 'Tap to change rating' : 'Tap to rate'}
            >
              <Star size={12} fill={rating > 0 ? 'currentColor' : 'none'} />
              <span>{rating > 0 ? rating : 'Rate'}</span>
            </button>
          )}

          {/* Community / aggregate rating chip — read-only */}
          {communityRating != null && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-2xl text-[11px] font-black border bg-indigo-50 border-indigo-200 text-indigo-600 ml-1"
              title="Aggregate rating across your buys (will read across users when data lands)"
            >
              <Star size={12} fill="currentColor" />
              <span>
                {communityRating === Math.round(communityRating)
                  ? communityRating
                  : communityRating.toFixed(1)}
                {communityRatingCount != null && ` · ${fmt(communityRatingCount)}`}
              </span>
            </span>
          )}

          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSave() }}
              className="ml-1 text-gray-400 hover:text-pink-500 transition-colors"
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <Heart size={16} fill={saved ? '#ec4899' : 'none'} color={saved ? '#ec4899' : 'currentColor'} />
            </button>
          )}
          {onShare && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onShare() }}
              className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Share"
            >
              <Share2 size={15} />
            </button>
          )}
          {onMenu && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMenu() }}
              className="ml-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="More"
            >
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Rating picker modal — opens on Rate-chip click. Same UX as
          the mobile bottom sheet but a centered dialog on web. */}
      {pickerOpen && (
        <RatingPickerDialog
          itemTitle={title}
          current={rating}
          onPick={pickRating}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

const PICKER_LABELS = {
  5: '⭐ Essential — worth every penny',
  4: '✅ Important — would buy again',
  3: '🙂 OK — nothing special',
  2: '🍿 Splurge — could have skipped',
  1: '🙈 Regret — pure waste',
}

function RatingPickerDialog({ itemTitle, current, onPick, onClose }) {
  const [hover, setHover] = useState(current || 0)
  const shown = hover
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-black">How worth it?</h3>
        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{itemTitle}</p>
        <div className="flex items-center justify-between mt-5 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onPick(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(current || 0)}
              className="p-1.5 transition-transform hover:scale-110"
            >
              <Star
                size={44}
                fill={n <= shown ? '#f59e0b' : 'none'}
                color={n <= shown ? '#f59e0b' : '#cbd5e1'}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        <p className="text-xs italic text-gray-500 text-center min-h-[18px]">
          {PICKER_LABELS[shown] || 'Hover or tap a star to rate this item'}
        </p>
      </div>
    </div>
  )
}
