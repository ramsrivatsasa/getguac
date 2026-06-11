'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Search, BadgeDollarSign, ShoppingCart, Clock, Gift, RefreshCw,
  Sliders, Bookmark, Trash2, Star, ExternalLink, ShoppingBag, Globe, X, ChevronDown,
} from 'lucide-react'
import { getStashItems, getReceipts, getRewards } from '../../../lib/db'
import { predictReplenishItems, expiringRewards } from '../../../lib/userProfile'
import { SEARCH_SPECS, SEARCH_CATEGORY_KEYS, detectCategory, buildRefinedQuery, specSummary } from '../../../lib/searchSpecs'
import { useSavedSearches, useAddSavedSearch, useDeleteSavedSearch } from '../../../hooks/useSavedSearches'
import { touchSavedSearch } from '../../../lib/savedSearches'
import { bestDealUrl } from '../../../lib/storeSearch'
import { getStealsFeed, markStealsChecked } from '../../../lib/steals'
import FeatureHeader from '../../../components/FeatureHeader'
import { StoreLogo } from '../../../components/StoreLogo'
import { displayStoreName } from '../../../lib/store-name-normalize'

async function fetchBestPrices({ item_name, stashItems, force }) {
  const res = await fetch('/api/best-prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_name, stashItems, force }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Search failed')
  return data
}

export default function StealsPage() {
  const [query, setQuery] = useState('')
  const [manualCategory, setManualCategory] = useState('')
  const [specs, setSpecs] = useState({})
  const [activeQuery, setActiveQuery] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [showRefine, setShowRefine] = useState(false)
  // Client-side refine filters (instant — applied to the returned results).
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sortBy, setSortBy] = useState('price')

  const category = manualCategory || detectCategory(query)
  const spec = category ? SEARCH_SPECS[category] : null

  const { data: rows = [] } = useQuery({ queryKey: ['stash'], queryFn: getStashItems, staleTime: 60_000 })
  const { data: receipts = [] } = useQuery({ queryKey: ['receipts'], queryFn: () => getReceipts({}), staleTime: 60_000 })
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: getRewards, staleTime: 60_000 })
  const { data: saved = [] } = useSavedSearches()
  const addSaved = useAddSavedSearch()
  const delSaved = useDeleteSavedSearch()

  // Persisted Steals feed — what the overnight cron found on saved searches,
  // newest-first. Opening the page stamps checked_at (clearing the badge/push
  // next time); the "N new" pill still shows for THIS visit.
  const { data: feed } = useQuery({ queryKey: ['steals-feed'], queryFn: getStealsFeed, staleTime: 60_000 })
  const stealsFeed = feed?.steals || []
  const unreadSteals = feed?.unread || 0
  const checkedRef = useRef(false)
  useEffect(() => {
    if (!feed || checkedRef.current) return
    checkedRef.current = true
    if (feed.unread > 0) markStealsChecked()   // fire-and-forget; badge clears next load
  }, [feed])

  const stashItems = useMemo(() => rows.slice(0, 200).map(r => ({ item_name: r.item_name, sku: r.sku, category: r.category })), [rows])

  const search = useMutation({ mutationFn: fetchBestPrices, onError: err => toast.error(err.message) })

  const replenish = useMemo(() => predictReplenishItems({ receipts, items: rows }, { now: Date.now(), limit: 6 }), [receipts, rows])
  const expiring  = useMemo(() => expiringRewards(rewards, 30), [rewards])

  const topItems = []
  const seen = new Set()
  for (const r of rows) {
    const key = (r.sku || r.item_name || '').toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    topItems.push({ item_name: r.item_name, sku: r.sku, category: r.category, last_price: parseFloat(r.price || 0) })
    if (topItems.length >= 8) break
  }

  // Apply the instant refine filters + sort to the web results.
  const view = useMemo(() => {
    let rs = (search.data?.results || []).slice()
    if (priceMin) rs = rs.filter(r => r.price >= +priceMin)
    if (priceMax) rs = rs.filter(r => r.price <= +priceMax)
    if (minRating) rs = rs.filter(r => r.rating >= +minRating)
    if (sortBy === 'price-desc') rs.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') rs.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else rs.sort((a, b) => a.price - b.price)
    return rs
  }, [search.data, priceMin, priceMax, minRating, sortBy])

  const hasSearch = search.isPending || search.isError || !!search.data

  function runSearch(refined, force = false) {
    if (!refined) return
    setActiveQuery(refined)
    search.mutate({ item_name: refined, stashItems, force })
  }
  function handleSearch(e) {
    e?.preventDefault?.()
    if (!query.trim()) return
    runSearch(category ? buildRefinedQuery(query, category, specs) : query.trim())
  }
  function onQueryChange(v) {
    if (!manualCategory && detectCategory(v) !== category) setSpecs({})
    setQuery(v)
  }
  function onCategoryChange(val) {
    setManualCategory(val)
    setSpecs({})
  }
  function runSaved(s) {
    setQuery(s.query); setSpecs(s.specs || {}); setManualCategory(s.category || '')
    runSearch(s.query)
    touchSavedSearch(s.id).catch(() => {})
  }
  function handleSave() {
    const refined = category ? buildRefinedQuery(query, category, specs) : (query.trim() || activeQuery)
    if (!refined) return
    addSaved.mutate(
      { label: refined, query: refined, category: category || null, specs },
      { onSuccess: () => toast.success('Search saved'), onError: e => toast.error(e.message) },
    )
  }

  return (
    <div className="space-y-4 max-w-6xl font-sans">
      <FeatureHeader
        theme="steals"
        title="Steals"
        subtitle="Configure what you're after — we scan the live web for the best deals."
        badge="🥑 Guac-AI Powered"
      />

      {/* Search box */}
      <form onSubmit={handleSearch} className="card flex items-center gap-3">
        <Search size={16} className="text-emerald-600 shrink-0" />
        <input
          className="flex-1 bg-transparent text-base focus:outline-none placeholder:text-gray-400 font-sans"
          placeholder="Type any product — e.g. laptop, iPhone, 65 inch TV…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
        <button type="submit" disabled={!query.trim()} className="btn-primary shrink-0 whitespace-nowrap">
          <BadgeDollarSign size={15} /> Find Steals
        </button>
      </form>

      {/* Configure what to search — pick a category and its spec dropdowns
          appear. Works alongside the freeform search bar above. */}
      <div className="card border-emerald-200/70">
        <button type="button" onClick={() => setShowConfig(v => !v)}
          className="w-full flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <Sliders size={13} /> Configure your search
            {category && <span className="text-emerald-600 normal-case tracking-normal">· {SEARCH_SPECS[category]?.label}</span>}
          </span>
          <ChevronDown size={16} className={`text-emerald-700 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
        </button>
        {showConfig && (
          <div className="mt-3">
            {spec && (
              <div className="flex justify-end mb-2">
                <button onClick={handleSave} className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
                  <Bookmark size={12} /> Save search
                </button>
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="input" value={manualCategory} onChange={e => onCategoryChange(e.target.value)}>
                  <option value="">{detectCategory(query) ? `Auto · ${SEARCH_SPECS[detectCategory(query)].label}` : 'Any / auto-detect'}</option>
                  {SEARCH_CATEGORY_KEYS.map(k => <option key={k} value={k}>{SEARCH_SPECS[k].label}</option>)}
                </select>
              </div>
              <SpecDropdowns spec={spec} specs={specs} setSpecs={setSpecs} />
            </div>
            <button onClick={handleSearch} disabled={!query.trim() && !spec} className="btn-primary mt-3">
              <BadgeDollarSign size={15} /> Find Steals
            </button>
          </div>
        )}
      </div>

      {/* Saved searches — click a row to re-run it against the live web. */}
      {saved.length > 0 && (
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
            <Bookmark size={12} /> Saved searches
          </p>
          <div className="divide-y divide-gray-50">
            {saved.map(s => (
              <div key={s.id}
                onClick={() => runSaved(s)}
                className="flex items-center gap-2.5 py-2 -mx-1 px-1 rounded-lg cursor-pointer hover:bg-emerald-50/60 transition-colors">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Search size={13} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{s.label}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {s.category ? (SEARCH_SPECS[s.category]?.label || s.category) : 'Search'}
                    {specSummary(s.category, s.specs) ? ` · ${specSummary(s.category, s.specs)}` : ''}
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); delSaved.mutate(s.id) }}
                  className="w-7 h-7 rounded-full text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results experience (Google-Shopping style) ── */}
      {hasSearch ? (
        <div className="grid lg:grid-cols-[210px_1fr] gap-4">
          {/* Refine sidebar — collapsed on mobile (behind a toggle) so the
              results lead; always shown as a sidebar on desktop. */}
          <aside className="card h-fit lg:sticky lg:top-4 order-first">
            <button type="button" onClick={() => setShowRefine(v => !v)}
              className="lg:hidden w-full flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Sliders size={12} /> Refine &amp; sort
              </span>
              <ChevronDown size={16} className={`text-gray-500 transition-transform ${showRefine ? 'rotate-180' : ''}`} />
            </button>
            <div className={`${showRefine ? 'block' : 'hidden'} lg:block space-y-4`}>
            <p className="hidden lg:flex text-xs font-bold uppercase tracking-wider text-gray-500 items-center gap-1.5">
              <Sliders size={12} /> Refine
            </p>
            {spec && (
              <div className="space-y-2.5 pb-3 border-b border-gray-100">
                <SpecDropdowns spec={spec} specs={specs} setSpecs={setSpecs} />
                <button onClick={handleSearch} disabled={search.isPending}
                  className="btn-primary w-full text-xs py-1.5 justify-center disabled:opacity-50">
                  <BadgeDollarSign size={13} /> Update results
                </button>
              </div>
            )}
            <div>
              <label className="label">Price range</label>
              <div className="flex items-center gap-2">
                <input className="input" inputMode="numeric" placeholder="$ Min" value={priceMin} onChange={e => setPriceMin(e.target.value.replace(/[^\d.]/g, ''))} />
                <input className="input" inputMode="numeric" placeholder="$ Max" value={priceMax} onChange={e => setPriceMax(e.target.value.replace(/[^\d.]/g, ''))} />
              </div>
            </div>
            <div>
              <label className="label">Rating</label>
              <select className="input" value={minRating} onChange={e => setMinRating(e.target.value)}>
                <option value="">Any rating</option>
                <option value="4.5">4.5★ &amp; up</option>
                <option value="4">4★ &amp; up</option>
                <option value="3">3★ &amp; up</option>
              </select>
            </div>
            <div>
              <label className="label">Sort by</label>
              <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="price">Price: low → high</option>
                <option value="price-desc">Price: high → low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
            {(priceMin || priceMax || minRating) && (
              <button onClick={() => { setPriceMin(''); setPriceMax(''); setMinRating('') }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X size={12} /> Clear filters
              </button>
            )}
            </div>
          </aside>

          {/* Results grid */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <p className="text-sm text-gray-600">
                {search.isPending ? 'Searching the web…'
                  : `${view.length} result${view.length === 1 ? '' : 's'} for `}
                {!search.isPending && <span className="font-bold text-gray-800">{activeQuery}</span>}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => activeQuery && runSearch(activeQuery, true)} disabled={search.isPending}
                  className="btn-secondary text-xs py-1.5" title="Re-pull fresh prices (bypass cache)">
                  <RefreshCw size={13} className={search.isPending ? 'animate-spin' : ''} /> Refresh
                </button>
                <button onClick={handleSave} className="btn-secondary text-xs py-1.5">
                  <Bookmark size={13} /> Save search
                </button>
              </div>
            </div>

            {search.isPending && (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="w-7 h-7 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
                <p className="text-sm font-bold text-gray-700">Scanning Walmart, Amazon, Best Buy, Target…</p>
              </div>
            )}

            {search.isError && (
              <div className="card text-center py-10">
                <p className="text-rose-600 font-semibold">Search failed</p>
                <p className="text-sm text-gray-500 mt-1">{search.error?.message}</p>
              </div>
            )}

            {!search.isPending && search.data && view.length === 0 && (
              <div className="card text-center py-10 flex flex-col items-center gap-2">
                <p className="font-semibold text-gray-700">No matches</p>
                <p className="text-xs text-gray-500">Try widening the filters or removing a spec.</p>
              </div>
            )}

            {!search.isPending && view.length > 0 && (
              <>
                {search.data?.mode === 'estimated' && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <p className="font-bold text-amber-800">💡 Estimated prices</p>
                    <p className="text-amber-700/90 mt-0.5">Live prices weren&apos;t available, so these are typical retail prices from Guac-AI&apos;s memory — use as a ballpark.</p>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {view.map((r, i) => <ResultCard key={`${r.store}-${i}`} r={r} best={i === 0 && sortBy === 'price'} />)}
                </div>
                {(search.data?.sources?.length > 0) && (
                  <div className="pt-3 mt-4 border-t border-gray-100">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5 flex items-center gap-1"><Globe size={10} /> Sources</p>
                    <div className="flex flex-wrap gap-1.5">
                      {search.data.sources.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noreferrer"
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-800 truncate max-w-[180px]">{s.title}</a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Fresh Steals — found overnight on your saved searches, newest-first */}
          {stealsFeed.length > 0 && (
            <div className="card border-rose-200/70 bg-gradient-to-br from-rose-50/40 to-amber-50/30">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <BadgeDollarSign size={13} /> Fresh Steals — on your saved searches
                </p>
                {unreadSteals > 0 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-white bg-rose-600 px-2 py-1 rounded-full">{unreadSteals} new</span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {stealsFeed.map(d => {
                  const r = { ...d, price: Number(d.price) || 0, original_price: Number(d.original_price) || 0, rating: Number(d.rating) || 0, review_count: 0 }
                  return <ResultCard key={d.deal_key} r={r} fresh={new Date(d.first_seen_at).getTime() > (feed?.checkedAt || 0)} />
                })}
              </div>
            </div>
          )}

          {/* Local Deals — from your own purchase history & rewards */}
          {(replenish.length > 0 || expiring.length > 0) && (
            <div className="card bg-gradient-to-br from-amber-50/50 to-rose-50/40 border-amber-200/60">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
                <Clock size={12} /> Local Deals — based on your history
              </p>
              {expiring.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1.5 flex items-center gap-1"><Gift size={10} /> Rewards expiring soon</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {expiring.slice(0, 6).map(r => (
                      <Link key={r.id} href={`/rewards/${r.id}`}
                        className="rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all px-3 py-2 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 text-base">🎁</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{r.reward_title || r.reward_no}</p>
                          <p className="text-[10px] text-gray-500 truncate">{displayStoreName(r.store_name)}</p>
                        </div>
                        <p className={`text-[10px] font-bold tabular-nums shrink-0 ${r.expires_in_days <= 7 ? 'text-rose-600' : 'text-amber-700'}`}>
                          {r.expires_in_days === 0 ? 'today' : `${r.expires_in_days}d`}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {replenish.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1"><RefreshCw size={10} /> Likely due for a restock</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {replenish.map(r => (
                      <StealCard key={r.key} item={r}
                        badge={r.tag === 'stale' ? '🔴 Long overdue' : r.tag === 'overdue' ? '🟠 Overdue' : '🟢 Due soon'}
                        subtitle={`${r.times_bought}× · last ${r.days_since_last}d ago`}
                        onFindSteals={() => { setQuery(r.item_name); runSearch(r.item_name) }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {topItems.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">⚡ One-tap from your Stash</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {topItems.map((it, i) => (
                  <StealCard key={i} item={it} compact
                    badge={it.last_price > 0 ? `last $${it.last_price.toFixed(2)}` : 'top spender'}
                    subtitle={it.sku ? `SKU ${it.sku}` : (it.category || 'no SKU')}
                    onFindSteals={() => { setQuery(it.item_name); runSearch(it.item_name) }} />
                ))}
              </div>
            </div>
          )}

          <div className="card bg-gradient-to-br from-emerald-50/60 to-lime-50/40">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart size={14} className="text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">How Steals works</span>
            </div>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Type a product — pin the exact brand &amp; specs if we recognise the category.</li>
              <li>Guac-AI scans the live web — Walmart, Amazon, Best Buy, Target, Costco, and more.</li>
              <li>Compare photos, prices &amp; ratings. Save the search to re-run it anytime.</li>
            </ol>
          </div>
        </>
      )}
    </div>
  )
}

// Spec dropdowns for the active category — reused in the configure card AND
// the results refine sidebar. Returns an array of field blocks.
function SpecDropdowns({ spec, specs, setSpecs }) {
  if (!spec) return null
  return spec.fields.map(f => (
    <div key={f.key}>
      <label className="label">{f.label}</label>
      <select className="input" value={specs[f.key] || ''}
        onChange={e => setSpecs(s => ({ ...s, [f.key]: e.target.value }))}>
        <option value="">Any</option>
        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  ))
}

// Google-Shopping-style product card.
function ResultCard({ r, best, fresh }) {
  // The grounded search's direct URLs are unreliable (often hallucinated or
  // for a different config). So "View deal" always runs a Google Shopping
  // search for the EXACT product — title + specs + store — which reliably
  // surfaces the same item across merchants.
  // Prefer the vendor over Google: direct merchant link → the vendor's own
  // site (known retailers) → Google's item page only for unrecognised stores.
  const dealUrl = bestDealUrl(r)
  return (
    <div className="group h-full rounded-xl border border-gray-100 bg-white p-2.5 hover:shadow-md hover:border-emerald-200 transition-all flex flex-col">
      <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
        {r.original_price > 0 && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[10px] font-extrabold bg-rose-600 text-white px-1.5 py-0.5 rounded">SALE</span>
        )}
        {best && (
          <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-extrabold bg-emerald-600 text-white px-1.5 py-0.5 rounded">BEST</span>
        )}
        {fresh && !best && (
          <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-extrabold bg-rose-600 text-white px-1.5 py-0.5 rounded">NEW</span>
        )}
        <ShoppingBag size={36} className="text-gray-200 absolute" />
        {r.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.image} alt={r.title || r.store} loading="lazy"
            className="relative object-contain w-full h-full"
            onError={e => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>
      <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2rem]">{r.title || r.matched_name || r.store}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-base font-extrabold text-emerald-700 tabular-nums">${r.price.toFixed(2)}</span>
        {r.original_price > 0 && <span className="text-[11px] text-gray-400 line-through tabular-nums">${r.original_price.toFixed(2)}</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
        <StoreLogo storeName={r.store} fallbackEmoji="🏬" size={16} />
        <span className="text-[11px] text-gray-500 truncate">{r.store}</span>
      </div>
      {r.rating > 0 && (
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-amber-600 font-bold">
          <Star size={11} className="fill-amber-400 text-amber-400" /> {r.rating.toFixed(1)}
          {r.review_count > 0 && <span className="text-gray-400 font-normal">({r.review_count.toLocaleString()})</span>}
        </div>
      )}
      {r.specs && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{r.specs}</p>}
      {!r.available && <p className="text-[10px] text-rose-500 mt-0.5">Out of stock</p>}
      <a href={dealUrl} target="_blank" rel="noreferrer"
        className="mt-auto pt-2 inline-flex justify-center items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
        View deal <ExternalLink size={12} />
      </a>
    </div>
  )
}

// Compact "from your data" card used in the pre-search dashboard sections.
function StealCard({ item, badge, subtitle, onFindSteals, compact = false }) {
  return (
    <div className="group relative rounded-2xl border-2 border-amber-100 bg-gradient-to-br from-white via-amber-50/40 to-rose-50/40 p-3 shadow-sm hover:shadow-lg hover:border-amber-300 hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-2.5">
        <StoreLogo storeName={item.store_name} fallbackEmoji="💎" size={40}
          emojiClassName="bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md" />
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-amber-950 leading-tight text-sm line-clamp-2`}>{item.item_name}</p>
          <p className="text-[10px] text-amber-800/70 mt-0.5 truncate">{subtitle}</p>
          {badge && (
            <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">{badge}</span>
          )}
        </div>
      </div>
      <button type="button" onClick={onFindSteals}
        className="mt-3 w-full inline-flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-xs font-bold shadow-sm hover:shadow-md active:scale-95 transition-all">
        <BadgeDollarSign size={13} /> Find Steals
      </button>
    </div>
  )
}
