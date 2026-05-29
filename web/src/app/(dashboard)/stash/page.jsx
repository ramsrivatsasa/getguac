'use client'
import { useState, useMemo, Fragment, useCallback, memo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Search, ShoppingCart, ExternalLink, Star, Store as StoreIcon, ChevronDown, ChevronRight, BadgeDollarSign, LayoutGrid, List
} from 'lucide-react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getStashItems, addToShoppingList, setStashProductCategory, setStashProductRating } from '../../../lib/db'
import { guacImpactChip } from '../../../lib/guacImpact'
import { CATEGORIES, CATEGORY_BY_SLUG, categoryClass } from '../../../lib/categories'
import CategoryPicker, { CategoryCreatePill } from '../../../components/CategoryPicker'
import GuacMascot from '../../../components/GuacMascot'
import { StoreList } from '../../../components/StoreList'
import BestPricesModal from '../../../components/BestPricesModal'
import { StoreLogo } from '../../../components/StoreLogo'

const SORTS = [
  { key: 'recent',     label: 'Most recent' },
  { key: 'most_bought', label: 'Most bought' },
  { key: 'top_spend',   label: 'Highest spend' },
  { key: 'multi_store', label: 'Multi-store first' },
  { key: 'a_z',         label: 'A → Z' },
]

const TONE_TINT = {
  emerald:  { from: 'from-emerald-50',  to: 'to-green-100',   ring: 'ring-emerald-200',  text: 'text-emerald-900', accent: 'bg-emerald-500' },
  orange:   { from: 'from-orange-50',   to: 'to-amber-100',   ring: 'ring-orange-200',   text: 'text-orange-900',  accent: 'bg-orange-500' },
  sky:      { from: 'from-sky-50',      to: 'to-blue-100',    ring: 'ring-sky-200',      text: 'text-sky-900',     accent: 'bg-sky-500' },
  indigo:   { from: 'from-indigo-50',   to: 'to-violet-100',  ring: 'ring-indigo-200',   text: 'text-indigo-900',  accent: 'bg-indigo-500' },
  amber:    { from: 'from-amber-50',    to: 'to-yellow-100',  ring: 'ring-amber-200',    text: 'text-amber-900',   accent: 'bg-amber-500' },
  lime:     { from: 'from-lime-50',     to: 'to-emerald-100', ring: 'ring-lime-200',     text: 'text-lime-900',    accent: 'bg-lime-500' },
  fuchsia:  { from: 'from-fuchsia-50',  to: 'to-pink-100',    ring: 'ring-fuchsia-200',  text: 'text-fuchsia-900', accent: 'bg-fuchsia-500' },
  rose:     { from: 'from-rose-50',     to: 'to-red-100',     ring: 'ring-rose-200',     text: 'text-rose-900',    accent: 'bg-rose-500' },
  red:      { from: 'from-red-50',      to: 'to-rose-100',    ring: 'ring-red-200',      text: 'text-red-900',     accent: 'bg-red-500' },
  violet:   { from: 'from-violet-50',   to: 'to-purple-100',  ring: 'ring-violet-200',   text: 'text-violet-900',  accent: 'bg-violet-500' },
  pink:     { from: 'from-pink-50',     to: 'to-rose-100',    ring: 'ring-pink-200',     text: 'text-pink-900',    accent: 'bg-pink-500' },
  gray:     { from: 'from-gray-50',     to: 'to-slate-100',   ring: 'ring-gray-200',     text: 'text-gray-900',    accent: 'bg-gray-500' },
}

export default function StashPage() {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState('grid')  // 'grid' | 'list'
  const [expanded, setExpanded] = useState(null)
  const [stealsItem, setStealsItem] = useState(null)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['stash'],
    queryFn: getStashItems,
    staleTime: 1000 * 60,
  })

  // Aggregate by product (sku-or-name, case-insensitive) across ALL stores.
  // Each product knows every store that carries it, with that store's best/last price.
  const items = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      const storeId   = r.receipts?.store_id || ''
      const storeName = r.receipts?.store_name || 'Unknown'
      const productKey = (r.sku || r.item_name || '').toLowerCase()
      if (!productKey) continue
      if (!m.has(productKey)) {
        m.set(productKey, {
          key: productKey,
          item_name: r.item_name,
          sku: r.sku,
          model: r.model,
          category: r.category || r.receipts?.category || 'misc',
          times: 0,
          total_qty: 0,
          total_spend: 0,
          last_date: '',
          last_price: 0,
          last_receipt_id: '',
          last_store: '',
          rating_sum: 0,
          rating_count: 0,
          stores: new Map(),   // store_id → { id, name, last_price, last_date, last_receipt_id, count }
        })
      }
      const e = m.get(productKey)
      const q = Number(r.qty || 1)
      const p = parseFloat(r.price || 0)
      e.times += 1
      e.total_qty += q
      e.total_spend += p
      const dt = r.receipts?.date || ''
      if (!e.last_date || dt > e.last_date) {
        e.last_date = dt
        e.last_price = p
        e.last_receipt_id = r.receipts?.id || ''
        e.last_store = storeName
      }
      if (r.rating != null) { e.rating_sum += r.rating; e.rating_count += 1 }

      const storeKey = storeId || storeName
      if (!e.stores.has(storeKey)) {
        e.stores.set(storeKey, { id: storeId, name: storeName, last_price: 0, last_date: '', last_receipt_id: '', count: 0, min_price: Infinity })
      }
      const s = e.stores.get(storeKey)
      s.count += 1
      if (p < s.min_price && p > 0) s.min_price = p
      if (!s.last_date || dt > s.last_date) {
        s.last_date = dt
        s.last_price = p
        s.last_receipt_id = r.receipts?.id || ''
      }
    }
    return [...m.values()].map(e => {
      const storeList = [...e.stores.values()].map(s => ({ ...s, min_price: s.min_price === Infinity ? s.last_price : s.min_price }))
      const sortedByPrice = [...storeList].filter(s => s.min_price > 0).sort((a, b) => a.min_price - b.min_price)
      return {
        ...e,
        avg_rating: e.rating_count ? e.rating_sum / e.rating_count : 0,
        stores_list: storeList.sort((a, b) => (b.last_date || '').localeCompare(a.last_date || '')),
        store_count: storeList.length,
        best: sortedByPrice[0] || null,
        worst: sortedByPrice[sortedByPrice.length - 1] || null,
      }
    })
  }, [rows])

  const catCounts = useMemo(() => {
    const c = new Map()
    for (const it of items) c.set(it.category, (c.get(it.category) || 0) + 1)
    return c
  }, [items])

  const multiStoreCount = items.filter(it => it.store_count > 1).length

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    let list = items
    if (activeCat === '_multi') list = list.filter(it => it.store_count > 1)
    else if (activeCat !== 'all') list = list.filter(it => it.category === activeCat)
    if (s) list = list.filter(it =>
      (it.item_name || '').toLowerCase().includes(s) ||
      (it.sku || '').toLowerCase().includes(s) ||
      (it.model || '').toLowerCase().includes(s) ||
      [...it.stores.values()].some(st => (st.name || '').toLowerCase().includes(s))
    )
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'most_bought':  return b.times - a.times
        case 'top_spend':    return b.total_spend - a.total_spend
        case 'multi_store':  return b.store_count - a.store_count
        case 'a_z':          return (a.item_name || '').localeCompare(b.item_name || '')
        default:             return (b.last_date || '').localeCompare(a.last_date || '')
      }
    })
    return list
  }, [items, search, activeCat, sort])

  async function handleAddToSmashlist(it, store = null) {
    try {
      // `store` may be:
      //   - undefined: pick the user's cheapest historical store
      //   - { id, name, min_price/last_price, web }: explicit pick (from expand panel)
      const chosen = store || it.best
      await addToShoppingList({
        sku: it.sku, item_name: it.item_name,
        qty: 1,
        price: chosen?.min_price ?? chosen?.last_price ?? it.last_price ?? null,
        // store_name_id is a uuid FK to stores; web-only stores have no id, so we
        // still log the name in comments for traceability.
        store_name_id: chosen?.id || null,
        comments: chosen?.web ? `From web: ${chosen.name}${chosen.url ? ` — ${chosen.url}` : ''}` : null,
      })
      toast.success(`Added "${it.item_name}" to Smashlist${chosen?.name ? ` (from ${chosen.name})` : ''} 🛒`)
    } catch (e) { toast.error(e.message) }
  }

  function toggleExpand(key) {
    setExpanded(prev => prev === key ? null : key)
  }

  return (
    <div className="space-y-5 max-w-7xl font-sans">
      <div className="flex items-center gap-3 flex-wrap">
        <GuacMascot expression="sitting" size={60} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="page-title">Stash</h1>
          <p className="text-sm text-gray-500">Everything you&apos;ve ever bought — find the best store for each</p>
        </div>
        <span className="text-sm text-gray-500">
          <span className="font-bold text-emerald-700 tabular-nums">{items.length}</span> products ·{' '}
          <span className="font-bold text-amber-700 tabular-nums">{multiStoreCount}</span> multi-store
        </span>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <CatChip active={activeCat === 'all'} onClick={() => setActiveCat('all')} emoji="🌈" label="All" count={items.length} />
        {multiStoreCount > 0 && (
          <CatChip
            active={activeCat === '_multi'}
            onClick={() => setActiveCat('_multi')}
            emoji="🏬"
            label="Multi-store"
            count={multiStoreCount}
            tone="amber"
          />
        )}
        {CATEGORIES.map(c => {
          const count = catCounts.get(c.slug) || 0
          if (count === 0 && activeCat !== c.slug) return null
          return (
            <CatChip key={c.slug} active={activeCat === c.slug} onClick={() => setActiveCat(c.slug)} emoji={c.emoji} label={c.label} count={count} tone={c.color} />
          )
        })}
      </div>

      {/* Search + sort + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search item, SKU, model, or store…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="inline-flex items-center gap-2 bg-white rounded-full pl-4 pr-2 py-1 border border-emerald-100 shadow-sm">
          <span className="text-xs font-semibold text-gray-500">Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-transparent text-sm font-bold text-emerald-800 focus:outline-none cursor-pointer font-sans">
            {SORTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className="inline-flex bg-emerald-50 rounded-full p-1 gap-1 border border-emerald-100">
          <button onClick={() => setView('grid')} title="Grid view"
            className={`p-1.5 rounded-full transition-all ${view === 'grid' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-700/70 hover:text-emerald-900'}`}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => setView('list')} title="List view"
            className={`p-1.5 rounded-full transition-all ${view === 'list' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-700/70 hover:text-emerald-900'}`}>
            <List size={14} />
          </button>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">{filtered.length} shown</span>
      </div>

      {isLoading ? (
        <div className="card py-12 text-center text-gray-400">Loading stash…</div>
      ) : filtered.length === 0 ? (
        <div className="card py-10 text-center flex flex-col items-center gap-3">
          <GuacMascot expression="relaxing" size={140} />
          <p className="text-gray-500 max-w-sm">
            {items.length === 0
              ? <>No items yet. <Link href="/receipts" className="text-emerald-700 font-semibold hover:underline">Add your first receipt</Link> to start your stash.</>
              : 'No matches in this category.'}
          </p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(it => (
            <ProductCard
              key={it.key}
              item={it}
              expanded={expanded === it.key}
              onToggle={() => toggleExpand(it.key)}
              onAddToSmashlist={(store) => handleAddToSmashlist(it, store)}
              onFindDeals={() => setStealsItem(it)}
            />
          ))}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <tr>{['Category','Item','Stores','Best price','Times','Total spend',''].map(h =>
                <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(it => {
                const cat = CATEGORY_BY_SLUG[it.category] || CATEGORY_BY_SLUG['misc']
                return (
                  <Fragment key={it.key}>
                    <tr className="hover:bg-gradient-to-r hover:from-emerald-50/60 hover:to-lime-50/60 hover:shadow-sm cursor-pointer transition-colors" onClick={() => toggleExpand(it.key)}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${categoryClass(it.category)}`}>
                          {cat.emoji} {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {it.item_name}
                        {it.sku && <span className="ml-2 font-mono text-[10px] text-gray-400">{it.sku}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {it.store_count > 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🏬 {it.store_count} stores
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">{it.last_store}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700 tabular-nums">
                        ${(it.best?.min_price || it.last_price).toFixed(2)}
                        {it.best && it.best.name && <span className="text-[10px] text-gray-400 ml-1 font-normal">at {it.best.name}</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{it.times}×</td>
                      <td className="px-4 py-3 font-semibold text-rose-700 tabular-nums">${it.total_spend.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleAddToSmashlist(it) }}
                          className="relative w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all inline-flex items-center justify-center ring-2 ring-white">
                          <span className="absolute -top-1 -right-1 text-[9px]">🥑</span>
                          <ShoppingCart size={13} />
                        </button>
                      </td>
                    </tr>
                    {expanded === it.key && (
                      <tr className="bg-emerald-50/20">
                        <td colSpan={7} className="px-6 py-3">
                          <StoreList stores={it.stores_list} best={it.best} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <BestPricesModal open={!!stealsItem} onClose={() => setStealsItem(null)} item={stealsItem} />
    </div>
  )
}

const ProductCard = memo(function ProductCard({ item, expanded, onToggle, onAddToSmashlist, onFindDeals }) {
  const qc = useQueryClient()
  const cat = CATEGORY_BY_SLUG[item.category] || CATEGORY_BY_SLUG['misc']
  const tone = TONE_TINT[cat.color] || TONE_TINT.gray
  const isMulti = item.store_count > 1

  // Inline web prices — fetched on demand per card (no auto-fan-out cost)
  const [webPrices, setWebPrices] = useState(null)
  const [webLoading, setWebLoading] = useState(false)
  const huntWebPrices = useCallback(async () => {
    setWebLoading(true)
    try {
      const res = await fetch('/api/best-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: item.item_name, sku: item.sku, category: item.category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setWebPrices(data.results || [])
      toast.success(`Found ${data.results?.length || 0} web prices`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setWebLoading(false)
    }
  }, [item.item_name, item.sku, item.category])

  // Recategorize this product across every store it lives in
  const recategorize = useMutation({
    mutationFn: async (newSlug) => {
      const calls = [...item.stores.values()].map(s =>
        s.id ? setStashProductCategory({ storeId: s.id, sku: item.sku, item_name: item.item_name, category: newSlug }) : null
      ).filter(Boolean)
      return Promise.allSettled(calls)
    },
    onSuccess: () => {
      toast.success('Category updated')
      qc.invalidateQueries({ queryKey: ['stash'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: err => toast.error(err.message),
  })

  // Re-rate this product across every store. One click on a star
  // cascades the rating through every matching receipt_item so the
  // user's GuacScore picks up the signal in a single pass.
  const rerate = useMutation({
    mutationFn: async (rating) => {
      const calls = [...item.stores.values()].map(s =>
        s.id ? setStashProductRating({ storeId: s.id, sku: item.sku, item_name: item.item_name, rating }) : null
      ).filter(Boolean)
      return Promise.allSettled(calls)
    },
    onSuccess: (_data, rating) => {
      const chip = guacImpactChip(rating)
      toast.success(chip?.delta > 0
        ? `Worth it ⭐ — ${chip.label}`
        : chip?.delta < 0
          ? `Noted — ${chip.label}`
          : 'Rating saved')
      qc.invalidateQueries({ queryKey: ['stash'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: err => toast.error(err.message),
  })

  return (
    <div className={`relative bg-gradient-to-br ${tone.from} ${tone.to} rounded-2xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-emerald-300 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ring-1 ${tone.ring} group`}>
      {/* Color stripe header */}
      <div className={`h-1 ${tone.accent}`} />
      <div className="p-3 flex flex-col">
        {/* Header: brand logo (with category-emoji fallback) + name +
            badges all on one row. Real wordmarks land for known
            grocers; unknown stores get the tone-accent emoji chip. */}
        <div className="flex items-start gap-2.5">
          <StoreLogo
            storeName={item.last_store}
            fallbackEmoji={cat.emoji}
            size={40}
            emojiClassName={`${tone.accent} text-white`}
          />
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm leading-tight line-clamp-2 ${tone.text}`}>{item.item_name}</p>
            <div className="text-[10px] text-gray-500 mt-0.5 space-x-2 truncate">
              {item.sku && <span className="font-mono">SKU {item.sku}</span>}
              {item.model && <span className="font-mono">Mdl {item.model}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <CategoryPicker
                value={item.category}
                onChange={(slug) => recategorize.mutate(slug)}
                disabled={recategorize.isPending}
              />
              <CategoryCreatePill onCreated={(slug) => recategorize.mutate(slug)} />
            </div>
            {isMulti && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-amber-800 border border-amber-200 shadow-sm">
                🏬 {item.store_count}
              </span>
            )}
            {item.avg_rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 font-bold tabular-nums">
                <Star size={10} fill="currentColor" /> {item.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Quick-rate row — one tap on a star applies the rating to
            every receipt_item of this product and the user's
            GuacScore picks up the signal. The chip on the right
            shows the directional impact so the user can see how the
            rating moves the score before committing. */}
        <ProductRater
          currentRating={item.avg_rating > 0 ? Math.round(item.avg_rating) : null}
          onRate={(r) => rerate.mutate(r)}
          disabled={rerate.isPending}
        />

        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">{isMulti ? 'Best' : 'Last'} $</p>
            <p className="font-bold text-emerald-700 tabular-nums">${(item.best?.min_price || item.last_price).toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Bought</p>
            <p className="font-bold text-amber-700 tabular-nums">{item.times}×</p>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Total $</p>
            <p className="font-bold text-rose-700 tabular-nums">${item.total_spend.toFixed(0)}</p>
          </div>
        </div>

        {isMulti && item.best && (
          <div className="mt-3 flex items-center gap-2 text-xs bg-amber-100/80 text-amber-900 rounded-xl px-3 py-2 border border-amber-200">
            <BadgeDollarSign size={14} className="text-amber-600 shrink-0" />
            <span>
              Cheapest at <span className="font-bold">{item.best.name}</span>:
              {' '}<span className="font-bold tabular-nums">${item.best.min_price.toFixed(2)}</span>
              {item.worst && item.worst.min_price > item.best.min_price && (
                <span className="text-amber-700/70"> · save up to ${(item.worst.min_price - item.best.min_price).toFixed(2)}</span>
              )}
            </span>
          </div>
        )}

        <button onClick={onToggle}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 self-start">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {item.store_count > 1 ? `Compare ${item.store_count} stores` : `1 store`}
        </button>

        {expanded && (
          <div className="mt-2 bg-white/80 rounded-xl p-2 ring-1 ring-white space-y-2">
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500 mb-1 px-2">📦 Your stores</p>
              <StoreList
                stores={item.stores_list}
                best={item.best}
                onAddToSmashlist={(store) => onAddToSmashlist(store)}
              />
            </div>

            {webPrices && webPrices.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[9px] uppercase tracking-wider font-bold text-emerald-700 mb-1 px-2">💎 Live web prices</p>
                <StoreList
                  stores={webPrices.map(p => ({ id: null, name: p.store, last_price: p.price, min_price: p.price, count: 1, url: p.url, web: true, notes: p.notes }))}
                  best={null}
                  onAddToSmashlist={(store) => onAddToSmashlist(store)}
                />
              </div>
            )}

            <button
              type="button"
              onClick={huntWebPrices}
              disabled={webLoading}
              className="w-full text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg py-1.5 transition-all flex items-center justify-center gap-1.5">
              {webLoading
                ? <>⏳ Scanning the web…</>
                : webPrices ? <>🔄 Refresh web prices</> : <>💎 Hunt web prices</>}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/50 gap-2">
          <Link href={`/receipts/${item.last_receipt_id}`} className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:underline font-semibold">
            Last receipt <ExternalLink size={10} />
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onFindDeals}
              title="Find Steals — live web price scan"
              aria-label="Find Steals"
              className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center ring-2 ring-white">
              <span className="absolute -top-1 -right-1 text-[10px]">💎</span>
              <BadgeDollarSign size={14} className="drop-shadow-sm" />
            </button>
            <button
              type="button"
              onClick={onAddToSmashlist}
              title="Add to Smashlist"
              aria-label="Add to Smashlist"
              className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center ring-2 ring-white hover:ring-amber-200">
              <span className="absolute -top-1 -right-1 text-[10px]">🥑</span>
              <ShoppingCart size={14} className="drop-shadow-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

// StoreList moved to web/src/components/StoreList.jsx so /shopping
// can reuse it too. Re-imported above.

const TONE_GRADIENT = {
  emerald: 'from-emerald-400 to-green-600', orange: 'from-orange-400 to-amber-600',
  sky:     'from-sky-400 to-blue-600',       indigo: 'from-indigo-400 to-violet-600',
  amber:   'from-amber-300 to-orange-500',   lime:   'from-lime-300 to-emerald-500',
  fuchsia: 'from-fuchsia-400 to-pink-600',   rose:   'from-rose-400 to-red-600',
  red:     'from-red-400 to-rose-600',       violet: 'from-violet-400 to-purple-600',
  pink:    'from-pink-300 to-rose-500',      gray:   'from-gray-300 to-gray-500',
}

// Quick rater — five inline stars + a hover preview + the GuacScore
// impact chip on the right. Click a star to commit the rating; the
// useMutation in the parent fans it out across every receipt_item of
// this product. Hovering shows the rating you're about to commit so
// it's clear what 4★ vs 5★ will do BEFORE the click.
function ProductRater({ currentRating, onRate, disabled }) {
  const [hover, setHover] = useState(0)
  const shown = hover || currentRating || 0
  const chip = guacImpactChip(shown || null)
  return (
    <div className="mt-3 flex items-center gap-2 bg-white/70 rounded-xl px-3 py-1.5 ring-1 ring-white">
      <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 shrink-0">Worth it?</span>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onRate(n)}
            onMouseEnter={() => setHover(n)}
            title={`Rate ${n}★`}
            className="p-0.5 hover:scale-125 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Star
              size={14}
              className={n <= shown ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
            />
          </button>
        ))}
      </div>
      {chip && (
        <span
          className={`ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            chip.tone === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
            chip.tone === 'rose'    ? 'bg-rose-100 text-rose-800' :
                                       'bg-gray-100 text-gray-600'
          }`}
        >
          {chip.label}
        </span>
      )}
    </div>
  )
}

function CatChip({ active, onClick, emoji, label, count, tone }) {
  const grad = TONE_GRADIENT[tone] || 'from-emerald-300 to-lime-400'
  return (
    <button type="button" onClick={onClick}
      className={`group inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 font-semibold text-xs transition-all hover:scale-[1.04] ${
        active
          ? `bg-gradient-to-br ${grad} text-white border-white shadow-lg ring-1 ring-emerald-200`
          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 shadow-sm'
      }`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0 ${
        active ? 'bg-white/30 shadow-inner' : `bg-gradient-to-br ${grad} text-white shadow-sm`
      }`}>{emoji}</span>
      <span>{label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${active ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
    </button>
  )
}
