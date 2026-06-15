'use client'
// Public GetGuac Marketplace — browse deals with NO account.
//
// Phase 1 (live): "Deals" tab — search any product or store and see best
// prices across major US retailers, powered by /api/best-prices (anonymous,
// IP-rate-limited, shared 7-day cache). Searches are saved to a first-party
// cookie so a logged-out visitor keeps their criteria across visits.
//
// Phase 2/3 (previewed as tabs): "Stores" (store + coupons directory) and
// "Sell" (list items from your receipts, FB-Marketplace style).

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, ExternalLink, Star, Tag, Store, Boxes, X, Sparkles, Bookmark, ArrowRight, Heart, Globe, Loader2, Ticket } from 'lucide-react'
import { bestDealUrl } from '../lib/storeSearch'
import { getSavedSearches, saveSearch, removeSearch, getSavedStores, toggleSavedStore } from '../lib/marketplaceSearches'
import { STORE_CATALOG, STORE_CATEGORIES } from '../lib/storeCatalog'
import SellTab from './SellTab'
import AdSlot from './AdSlot'

const TABS = [
  { key: 'deals',  label: 'Deals',  icon: Tag,   live: true  },
  { key: 'stores', label: 'Stores', icon: Store, live: true  },
  { key: 'sell',   label: 'Sell',   icon: Boxes, live: true  },
]

function discountPct(price, original) {
  if (!original || !price || original <= price) return 0
  return Math.round(((original - price) / original) * 100)
}

function DealCard({ r }) {
  const title = r.matched_name || r.title || r.store
  const off = discountPct(r.price, r.original_price)
  const href = bestDealUrl({ ...r, title })
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group text-left bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-emerald-200 hover:-translate-y-0.5 transition-all flex flex-col"
    >
      <div className="relative flex items-center justify-center bg-gray-50" style={{ aspectRatio: '1.1 / 1' }}>
        {off > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
            {off}% off
          </span>
        )}
        {r.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.image} alt={title} className="object-contain max-h-32 max-w-[82%]"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <span className="text-5xl opacity-60">🛒</span>
        )}
        <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={14} />
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{title}</p>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-emerald-700 tabular-nums">
                {r.price > 0 ? `$${Number(r.price).toFixed(2)}` : '—'}
              </span>
              {r.original_price > r.price && (
                <span className="text-xs text-gray-400 line-through tabular-nums">${Number(r.original_price).toFixed(2)}</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate max-w-[140px]">{r.store}</p>
          </div>
          {r.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 shrink-0">
              <Star size={11} fill="currentColor" /> {Number(r.rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function MarketplaceClient({ initialQuery = '', initialTab = 'deals' }) {
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : 'deals')
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [meta, setMeta] = useState(null)        // { enhancement, mode, cache }
  const [saved, setSaved] = useState([])
  const [savedStores, setSavedStores] = useState([])
  const [storeCat, setStoreCat] = useState('All')
  const [coupon, setCoupon] = useState(null) // { store, status:'loading'|'done'|'error', data, error }
  const ranFor = useRef('')

  async function openCoupons(store) {
    setCoupon({ store, status: 'loading', data: null, error: '' })
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: store.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Coupon search failed (${res.status})`)
      setCoupon({ store, status: 'done', data, error: '' })
    } catch (e) {
      setCoupon({ store, status: 'error', data: null, error: e.message })
    }
  }

  useEffect(() => { setSaved(getSavedSearches()); setSavedStores(getSavedStores()) }, [])

  async function runSearch(q) {
    const term = (q ?? query).trim()
    if (!term) return
    setQuery(term)
    setTab('deals')
    setStatus('loading')
    setError('')
    setResults([])
    try {
      const res = await fetch('/api/best-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: term }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Search failed (${res.status})`)
      setResults(Array.isArray(data.results) ? data.results : [])
      setMeta({ enhancement: data.enhancement, mode: data.mode, cache: data._cache })
      setStatus('done')
      setSaved(saveSearch(term))
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  // Auto-run when arriving with ?q=… (home-page search hands off here).
  useEffect(() => {
    const q = (initialQuery || '').trim()
    if (q && ranFor.current !== q) {
      ranFor.current = q
      runSearch(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  function onRemove(q) {
    setSaved(removeSearch(q))
  }

  const ActiveIcon = TABS.find((t) => t.key === tab)?.icon || Tag

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (tab === 'deals') runSearch() }}
        className="relative max-w-2xl mx-auto"
      >
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === 'stores' ? 'Filter stores — e.g. “Target” or “grocery”'
            : tab === 'sell' ? 'Search items for sale…'
            : 'Search any product or store — e.g. “AirPods Pro”'
          }
          className={`w-full pl-12 ${tab === 'deals' ? 'pr-28' : 'pr-5'} py-4 rounded-full border border-emerald-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 text-base`}
          autoComplete="off"
        />
        {tab === 'deals' && (
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary rounded-full px-5 py-2.5"
          >
            Search
          </button>
        )}
      </form>

      {/* Saved searches (cookie — no account) */}
      {tab === 'deals' && saved.length > 0 && (
        <div className="max-w-2xl mx-auto mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <Bookmark size={12} /> Saved:
          </span>
          {saved.map((s) => (
            <span key={s.q} className="group inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-white border border-emerald-100 text-xs font-semibold text-gray-700 shadow-sm">
              <button onClick={() => runSearch(s.q)} className="hover:text-emerald-700">{s.q}</button>
              <button onClick={() => onRemove(s.q)} aria-label={`Remove ${s.q}`} className="w-4 h-4 rounded-full flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50">
                <X size={11} />
              </button>
            </span>
          ))}
          <span className="text-[10px] text-gray-400">saved on this device · no account needed</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 mt-7">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                active ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
              }`}
            >
              <Icon size={15} /> {t.label}
              {!t.live && <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-70">soon</span>}
            </button>
          )
        })}
      </div>

      {/* Top banner ad (placeholder until AdSense is configured). */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP || ''} className="mt-7 max-w-3xl mx-auto" minHeight={90} />

      {/* Tab body */}
      <div className="mt-6 pb-10">
        {tab === 'deals' && (
          <DealsTab status={status} error={error} results={results} meta={meta} query={query} onRetry={() => runSearch()} />
        )}
        {tab === 'stores' && (
          <StoresTab
            query={query}
            category={storeCat}
            setCategory={setStoreCat}
            saved={savedStores}
            onToggle={(slug) => setSavedStores(toggleSavedStore(slug))}
            onFindDeals={(s) => runSearch(s.popular)}
            onCoupons={openCoupons}
          />
        )}
        {tab === 'sell' && <SellTab query={query} />}
      </div>

      {/* Bottom banner ad (placeholder until AdSense is configured). */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || ''} className="mb-12 max-w-3xl mx-auto" minHeight={90} />

      {coupon && <CouponsModal state={coupon} onClose={() => setCoupon(null)} />}
    </div>
  )
}

function DealsTab({ status, error, results, meta, query, onRetry }) {
  if (status === 'idle') {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-5xl mb-3">🥑</div>
        <p className="font-semibold text-gray-700">Search a product or store to see the best prices.</p>
        <p className="text-sm mt-1">Try “AirPods Pro”, “Dyson V8”, or “Nintendo Switch”.</p>
      </div>
    )
  }
  if (status === 'loading') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
            <div className="bg-gray-100" style={{ aspectRatio: '1.1 / 1' }} />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600 font-semibold">{error}</p>
        <button onClick={onRetry} className="btn-secondary mt-3">Try again</button>
      </div>
    )
  }
  if (!results.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-5xl mb-3">🔍</div>
        <p className="font-semibold text-gray-700">No deals found for “{query}”.</p>
        <p className="text-sm mt-1">Try a different name or add a brand/model.</p>
      </div>
    )
  }
  return (
    <>
      {meta?.enhancement && meta.enhancement.enhanced && meta.enhancement.enhanced !== meta.enhancement.original && (
        <p className="text-center text-xs text-emerald-700 mb-4">
          <Sparkles size={12} className="inline -mt-0.5" /> Refined to <span className="font-semibold">{meta.enhancement.enhanced}</span>
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((r, i) => <DealCard key={`${r.store}-${i}`} r={r} />)}
      </div>
      <RegisterCta />
    </>
  )
}

function StoresTab({ query, category, setCategory, saved, onToggle, onFindDeals, onCoupons }) {
  const q = (query || '').trim().toLowerCase()
  const list = STORE_CATALOG.filter((s) => {
    const catOk = category === 'All' || s.category === category
    const qOk = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    return catOk && qOk
  })
  return (
    <>
      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap justify-center mb-6">
        {STORE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              category === c ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-200 hover:text-emerald-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-center text-gray-500 py-10">No stores match “{query}”.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((s) => (
            <StoreCard key={s.slug} s={s} saved={saved.includes(s.slug)} onToggle={() => onToggle(s.slug)} onFindDeals={() => onFindDeals(s)} onCoupons={() => onCoupons(s)} />
          ))}
        </div>
      )}
      <RegisterCta />
    </>
  )
}

function StoreCard({ s, saved, onToggle, onFindDeals, onCoupons }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all flex flex-col">
      <div className="relative flex items-center justify-center" style={{ aspectRatio: '1.7 / 1', backgroundColor: s.color }}>
        <span className="text-3xl drop-shadow-sm">{s.emoji}</span>
        <span className="absolute bottom-1.5 left-2.5 text-white font-black text-sm drop-shadow">{s.name}</span>
        <button
          onClick={onToggle}
          aria-label={saved ? `Unsave ${s.name}` : `Save ${s.name}`}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            saved ? 'bg-white text-rose-500' : 'bg-black/20 text-white hover:bg-white hover:text-rose-500'
          }`}
        >
          <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{s.category}</span>
        <p className="text-[11px] text-gray-500">Log receipts here to earn 🥑 GuacMoney.</p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            onClick={onFindDeals}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Tag size={12} /> Find deals
          </button>
          <button
            onClick={onCoupons}
            title={`Find ${s.name} coupons`}
            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <Ticket size={12} /> Coupons
          </button>
        </div>
      </div>
    </div>
  )
}

function CouponsModal({ state, onClose }) {
  const { store, status, data, error } = state
  const coupons = data?.coupons || []
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(store.name + ' coupons promo codes')}`
  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: store.color }}>
            <span className="drop-shadow-sm">{store.emoji}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1"><Ticket size={12} /> Coupons</div>
            <div className="font-bold text-gray-900 truncate">{store.name}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700 shrink-0"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-500">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-sm font-semibold">Searching Google for {store.name} coupons…</p>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center py-10">
              <p className="text-rose-600 font-semibold">{error}</p>
              <a href={googleUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1 mt-3 text-sm">
                Search on Google <ExternalLink size={13} />
              </a>
            </div>
          )}
          {status === 'done' && coupons.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p className="font-semibold text-gray-700">No coupon pages found.</p>
              <a href={store.dealsUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-1 mt-3 text-sm">
                {store.name} official deals <ExternalLink size={13} />
              </a>
            </div>
          )}
          {status === 'done' && coupons.length > 0 && (
            <div className="space-y-2">
              {coupons.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noreferrer"
                  className="block rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/40 p-3 transition-colors">
                  <div className="flex items-start gap-2">
                    <Ticket size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{c.title}</p>
                      {c.snippet && <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{c.snippet}</p>}
                      <p className="text-[10px] text-emerald-700 font-semibold mt-1 inline-flex items-center gap-1">
                        <Globe size={10} /> {c.source}{c.date ? ` · ${c.date}` : ''}
                      </p>
                    </div>
                    <ExternalLink size={13} className="text-gray-300 shrink-0 mt-0.5" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400 leading-tight">Sourced from the web — verify the code at checkout.</p>
          <a href={store.dealsUrl} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
            Official deals <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}

function RegisterCta() {
  return (
    <div className="mt-10 rounded-3xl bg-gradient-to-br from-emerald-600 to-lime-500 text-white p-6 sm:p-8 text-center shadow-lg">
      <h3 className="text-xl sm:text-2xl font-black">Get price-drop alerts on what you save</h3>
      <p className="text-emerald-50 mt-1.5 max-w-lg mx-auto">
        Create a free account and GetGuac watches these searches for you — pinging you the moment a price drops.
      </p>
      <Link href="/register" className="inline-flex items-center gap-1.5 mt-4 bg-white text-emerald-700 font-bold px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-transform">
        🥑 Get started free <ArrowRight size={16} />
      </Link>
    </div>
  )
}
