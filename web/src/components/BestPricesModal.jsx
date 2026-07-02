'use client'
import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  X, Search, ExternalLink, ShoppingCart, Globe, Crown, Wand2, Bookmark
} from 'lucide-react'
import GuacMascot from './GuacMascot'
import { getStashItems } from '../lib/db'
import { useAddSavedSearch } from '../hooks/useSavedSearches'
import { detectCategory } from '../lib/searchSpecs'
import { bestDealUrl } from '../lib/storeSearch'
async function fetchBestPrices({ item_name, sku, category, stashItems }) {
  const res = await fetch('/api/best-prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_name, sku, category, stashItems }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Search failed')
  return data
}

// Modal that shows live web-scanned prices for a product.
// Usage: <BestPricesModal open={...} onClose={...} item={{ item_name, sku }} />
export default function BestPricesModal({ open, onClose, item }) {
  // Pull a compact slice of the user's stash to feed Guac-Search's fuzzy matcher
  const { data: stashRows = [] } = useQuery({
    queryKey: ['stash'],
    queryFn: getStashItems,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })
  const stashItems = stashRows.slice(0, 200).map(r => ({
    item_name: r.item_name, sku: r.sku, category: r.category,
  }))

  const search = useMutation({
    mutationFn: fetchBestPrices,
    onError: err => toast.error(err.message),
  })

  const addSteal = useAddSavedSearch()
  function handleAddToSteals() {
    if (!item?.item_name) return
    addSteal.mutate(
      { label: item.item_name, query: item.item_name, category: detectCategory(item.item_name) || null, specs: {} },
      { onSuccess: () => toast.success('Added to Steals'), onError: e => toast.error(e.message) },
    )
  }

  // Fire (and re-fire) whenever the modal opens for a different item.
  // Reset is critical — without it the stale .data sticks around between items.
  const itemKey = item ? `${item.item_name || ''}|${item.sku || ''}` : ''
  useEffect(() => {
    if (!open || !item?.item_name) return
    search.reset()
    search.mutate({ item_name: item.item_name, sku: item.sku, category: item.category, stashItems })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemKey])

  if (!open) return null

  const results = search.data?.results || []
  const sources = search.data?.sources || []
  const best = results[0]

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-guac-line bg-gradient-to-r from-emerald-50 to-lime-50 flex items-start gap-3">
          <GuacMascot expression="rich" size={52} />
          <div className="flex-1 min-w-0">
            <h3 className="gg-h2">Finding your Steals</h3>
            <p className="text-xs text-guac-700/80 truncate">{item?.item_name}{item?.sku ? ` · SKU ${item.sku}` : ''}</p>
          </div>
          <button onClick={handleAddToSteals} disabled={addSteal.isPending}
            title="Save this product to your Steals saved searches"
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 border border-guac-line2 text-guac-700 text-xs font-bold hover:bg-white transition-colors disabled:opacity-50">
            <Bookmark size={13} /> Add to Steals
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:bg-white/60 rounded-full shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {search.isPending && (
            <div className="flex flex-col items-center gap-3 py-12">
              <GuacMascot expression="rich" size={100} className="animate-bounce" />
              <p className="text-sm text-gray-700 font-bold">Finding your Steals…</p>
              <p className="text-[11px] text-gray-400">Checking Walmart, Amazon, Target, Costco, Home Depot, and more.</p>
            </div>
          )}

          {search.isError && !search.isPending && (
            <div className="text-center py-8">
              <p className="text-rose-600 font-semibold mb-2">Search failed</p>
              <p className="text-sm text-gray-500">{search.error?.message}</p>
            </div>
          )}

          {!search.isPending && search.data && results.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8">
              <GuacMascot expression="surprised" size={120} />
              <p className="text-gray-700 font-semibold">No Steals found</p>
              <p className="text-xs text-gray-500">Try a different name or add more brand details.</p>
            </div>
          )}

          {!search.isPending && search.data?.enhancement && (
            search.data.enhancement.enhanced !== search.data.enhancement.original ||
            search.data.enhancement.applied_aliases?.length > 0 ||
            search.data.enhancement.matched_stash
          ) && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-guac-50 border border-guac-line2 text-xs flex items-start gap-2">
              <Wand2 size={14} className="text-guac-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-guac-700">Guac-Search refined your query</p>
                <p className="text-guac-700/90 mt-0.5 leading-snug">
                  <span className="line-through text-gray-400">{search.data.enhancement.original}</span>
                  {' → '}
                  <span className="font-semibold">{search.data.enhancement.enhanced}</span>
                </p>
                {search.data.enhancement.matched_stash && (
                  <p className="text-[10px] text-guac-600 mt-1">
                    Matched your stash: <span className="font-semibold">{search.data.enhancement.matched_stash.item_name}</span>
                  </p>
                )}
                {search.data.enhancement.category && (
                  <p className="text-[10px] text-guac-600 mt-0.5">Category: {search.data.enhancement.category}</p>
                )}
              </div>
            </div>
          )}

          {!search.isPending && results.length > 0 && search.data?.mode === 'estimated' && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <p className="font-bold text-amber-800">💡 Estimated prices</p>
              <p className="text-amber-700/90 mt-0.5 leading-snug">
                We couldn&apos;t verify live web prices for this item, so these are typical retail prices from Guac-AI&apos;s memory. They may be stale by a few months — use them as a ballpark, not gospel.
              </p>
            </div>
          )}

          {!search.isPending && results.length > 0 && (
            <div className="space-y-2">
              {best && (
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300 p-3 mb-3 flex items-center gap-3 shadow-sm">
                  <Crown size={20} className="text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Best price</p>
                    <p className="font-bold text-amber-900">{best.store}</p>
                  </div>
                  <p className="text-2xl font-extrabold text-guac-700 tabular-nums">${best.price.toFixed(2)}</p>
                </div>
              )}
              {results.map((r, i) => {
                const isBest = i === 0
                return (
                  <div key={`${r.store}-${i}`} className={`rounded-xl border p-3 flex items-center gap-3 ${isBest ? 'border-guac-line2 bg-guac-50/40' : 'border-gray-100 hover:bg-guac-row'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${isBest ? 'bg-guac-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <ShoppingCart size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{r.store}</p>
                      {r.matched_name && r.matched_name.toLowerCase() !== (item?.item_name || '').toLowerCase() && (
                        <p className="text-[10px] text-gray-500 truncate">→ {r.matched_name}</p>
                      )}
                      {r.notes && <p className="text-[11px] text-amber-700 mt-0.5">{r.notes}</p>}
                      {!r.available && <p className="text-[11px] text-rose-500 mt-0.5">Out of stock</p>}
                    </div>
                    <p className={`text-lg font-bold tabular-nums ${isBest ? 'text-guac-700' : 'text-gray-700'}`}>${r.price.toFixed(2)}</p>
                    <a
                      href={bestDealUrl({ ...r, title: r.matched_name || item?.item_name })}
                      target="_blank" rel="noreferrer"
                      title={r.url ? 'Open product page' : `Search ${r.store} for this product`}
                      className="w-8 h-8 rounded-full bg-guac-100 text-guac-700 hover:bg-guac-100 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm shrink-0">
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )
              })}
              {sources.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                    <Globe size={10} /> Sources used by Guac-AI
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer"
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:text-guac-700 hover:bg-guac-50 truncate max-w-[180px]">
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end items-center">
          <button onClick={onClose} className="btn-secondary text-xs py-1.5">Close</button>
        </div>
      </div>
    </div>
  )
}
