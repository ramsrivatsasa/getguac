// Per-store price + count list, sorted by lowest price first.
//
// Originally lived in /stash; extracted here so /shopping (Buy Again
// cards) can reuse the same visual. Both surfaces want the same shape:
//   - Store name, count, min/last price
//   - "Best" badge on the cheapest entry
//   - Optional add-to-Smashlist button per row
//   - Optional "web" badge + external URL for live web-price hits

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Store as StoreIcon, ShoppingCart } from 'lucide-react'
import { logoUrlForStore } from '../lib/store-logo'

export function StoreList({ stores, best, onAddToSmashlist }) {
  const sorted = [...stores].sort((a, b) => (a.min_price || 999999) - (b.min_price || 999999))
  return (
    <div className="space-y-1">
      {sorted.map(s => {
        const isBest = best && s.id === best.id && stores.length > 1
        return (
          <div key={`${s.id || s.name}-${s.web ? 'web' : 'own'}`}
            className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-emerald-50/60 transition-colors ${isBest ? 'bg-emerald-100/70 font-semibold' : ''}`}>
            <StoreMini name={s.name} web={s.web} isBest={isBest} />
            {s.web && s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="text-fuchsia-700 hover:underline truncate">{s.name}</a>
            ) : s.id ? (
              <Link href={`/stores/${s.id}`} className="text-emerald-800 hover:underline truncate">{s.name}</Link>
            ) : (
              <span className="text-gray-700 truncate">{s.name}</span>
            )}
            {s.notes && <span className="text-[9px] text-amber-700 italic truncate max-w-[80px]">{s.notes}</span>}
            <span className={`ml-auto font-bold tabular-nums w-16 text-right shrink-0 ${s.web ? 'text-fuchsia-700' : 'text-emerald-700'}`}>
              ${(s.min_price || s.last_price || 0).toFixed(2)}
            </span>
            {isBest && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 shrink-0">Best</span>}
            {onAddToSmashlist && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAddToSmashlist(s) }}
                title={`Add to Smashlist (from ${s.name})`}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-fuchsia-500 text-white shadow-sm hover:scale-110 active:scale-95 transition-all flex items-center justify-center shrink-0">
                <ShoppingCart size={10} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Tiny store icon — uses the brand logo when we can resolve one,
// otherwise the generic StoreIcon glyph. Kept inline because the
// visual is small enough that the full StoreLogo avatar component
// would be overkill here.
function StoreMini({ name, web, isBest }) {
  const [errored, setErrored] = useState(false)
  const url = logoUrlForStore(name)
  if (url && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={14}
        height={14}
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-3.5 h-3.5 object-contain shrink-0 rounded-sm bg-white"
      />
    )
  }
  return (
    <StoreIcon size={11} className={web ? 'text-fuchsia-500' : isBest ? 'text-emerald-700' : 'text-gray-400'} />
  )
}
