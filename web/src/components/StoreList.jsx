// Per-store price + count list, sorted by lowest price first.
//
// Originally lived in /stash; extracted here so /shopping (Buy Again
// cards) can reuse the same visual. Both surfaces want the same shape:
//   - Store name, count, min/last price
//   - "Best" badge on the cheapest entry
//   - Optional add-to-Smashlist button per row
//   - Optional "web" badge + external URL for live web-price hits

import Link from 'next/link'
import { Store as StoreIcon, ShoppingCart } from 'lucide-react'

export function StoreList({ stores, best, onAddToSmashlist }) {
  const sorted = [...stores].sort((a, b) => (a.min_price || 999999) - (b.min_price || 999999))
  return (
    <div className="space-y-1">
      {sorted.map(s => {
        const isBest = best && s.id === best.id && stores.length > 1
        return (
          <div key={`${s.id || s.name}-${s.web ? 'web' : 'own'}`}
            className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-emerald-50/60 transition-colors ${isBest ? 'bg-emerald-100/70 font-semibold' : ''}`}>
            <StoreIcon size={11} className={s.web ? 'text-fuchsia-500' : isBest ? 'text-emerald-700' : 'text-gray-400'} />
            {s.web && s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="text-fuchsia-700 hover:underline truncate">{s.name}</a>
            ) : s.id ? (
              <Link href={`/stores/${s.id}`} className="text-emerald-800 hover:underline truncate">{s.name}</Link>
            ) : (
              <span className="text-gray-700 truncate">{s.name}</span>
            )}
            {s.notes && <span className="text-[9px] text-amber-700 italic truncate max-w-[80px]">{s.notes}</span>}
            <span className="ml-auto text-gray-500 shrink-0">{s.count ? `${s.count}×` : ''}</span>
            <span className={`font-bold tabular-nums w-16 text-right shrink-0 ${s.web ? 'text-fuchsia-700' : 'text-emerald-700'}`}>
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
