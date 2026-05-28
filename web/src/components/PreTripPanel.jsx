'use client'
import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, ChevronRight, X, MapPin } from 'lucide-react'
import { getShoppingList } from '../lib/db'
import { groupPredictionsByStore } from '../lib/prediction-feedback'
import { displayStoreName } from '../lib/store-name-normalize'

// Pre-trip "you usually buy" panel for the /receipts surface.
// Surfaces pending Smashlist predictions grouped by store BEFORE the
// user captures a receipt — so if they're about to walk into Costco,
// they can glance at "you usually buy 4 things here" without leaving
// the receipts page. Session-dismissable.
//
// Reads through the same central helpers as /shopping → Errand Plan
// (groupPredictionsByStore in lib/prediction-feedback.js). One source
// of truth for "what does this user usually buy at each store?".

const DISMISS_KEY = 'getguac.pretrip-panel.dismissed.v1'

export default function PreTripPanel() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY)) setDismissed(true)
    } catch {}
  }, [])

  const { data: items = [] } = useQuery({
    queryKey: ['shopping'],
    queryFn: getShoppingList,
    staleTime: 5 * 60_000,
  })

  // Predicted + not-yet-approved rows are the "usually buy" set.
  const pending = useMemo(
    () => items.filter(it => it.predicted && !it.approved),
    [items],
  )
  const grouped = useMemo(() => groupPredictionsByStore(pending), [pending])

  if (dismissed || pending.length === 0) return null

  function dismiss() {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  // Compact summary line + per-store mini-cards. Limit to 3 stores
  // visible inline; the rest fold into a "+N more" link to /shopping.
  const visibleGroups = grouped.slice(0, 3)
  const hiddenCount = grouped.length - visibleGroups.length

  return (
    <div className="card border-l-4 border-emerald-300 bg-emerald-50/30 py-3 px-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <ShoppingCart size={16} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">
              Heading out? You usually buy {pending.length} item{pending.length === 1 ? '' : 's'}
              {grouped.length > 1 && <> across {grouped.length} store{grouped.length === 1 ? '' : 's'}</>}
            </p>
            <p className="text-[11px] text-emerald-800/80">
              Glance before you walk in — combine the trip if it makes sense.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/shopping"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-colors"
          >
            Plan
            <ChevronRight size={12} />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="w-8 h-8 rounded-lg text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors"
            aria-label="Hide until next session"
            title="Hide until next session"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
        {visibleGroups.map(group => {
          const storeName = group.items[0]?.store?.store_name
          const display = storeName ? displayStoreName(storeName) : 'NO STORE TAGGED'
          return (
            <div key={group.storeId || 'nostore'} className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin size={11} className="text-emerald-700" />
                <p className="font-bold text-emerald-900 text-xs truncate">{display}</p>
                <span className="text-[10px] text-emerald-700/70 shrink-0">·{group.itemCount}</span>
              </div>
              <p className="text-[11px] text-gray-600 truncate">
                {group.items.slice(0, 3).map(i => i.item_name).join(' · ')}
                {group.items.length > 3 && <span className="text-gray-400"> · +{group.items.length - 3}</span>}
              </p>
            </div>
          )
        })}
        {hiddenCount > 0 && (
          <Link
            href="/shopping"
            className="rounded-lg bg-emerald-100/50 border border-dashed border-emerald-200 px-3 py-2 flex items-center justify-center text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            +{hiddenCount} more store{hiddenCount === 1 ? '' : 's'} →
          </Link>
        )}
      </div>
    </div>
  )
}
