'use client'
import { useState, useMemo, useEffect, Fragment, useCallback, useRef, memo } from 'react'
import useCurrencySymbol from '../../../hooks/useCurrencySymbol'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Search, ShoppingCart, ExternalLink, Star, Store as StoreIcon, ChevronLeft, ChevronDown, ChevronRight, BadgeDollarSign, LayoutGrid, List, Layers
} from 'lucide-react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getStashItems, addToShoppingList, setStashProductCategory, setStashProductRating } from '../../../lib/db'
import { guacImpactChip } from '../../../lib/guacImpact'
import { fetchInventoryMap, setOnHand, inventoryKey, lowStockVerdict } from '../../../lib/inventory'
import { selectStashView, formatPurchaseFrequency } from '../../../lib/stashEngine'
import { imageCacheKey } from '../../../lib/productImage'
import { fetchLikeStats, toggleLike, formatLikeCount } from '../../../lib/productLikes'
import { CATEGORIES, CATEGORY_BY_SLUG, categoryClass } from '../../../lib/categories'
import CategoryPicker, { CategoryCreatePill } from '../../../components/CategoryPicker'
import GuacMascot from '../../../components/GuacMascot'
import FeatureHeader from '../../../components/FeatureHeader'
import { StoreList } from '../../../components/StoreList'
import BestPricesModal from '../../../components/BestPricesModal'
import { StoreLogo } from '../../../components/StoreLogo'
import { ShareItemButton } from '../../../components/ShareItemButton'
import ItemRowCard from '../../../components/ItemRowCard'
import { FadeUpStagger, ShimmerBox } from '../../../components/animated'
import LottieAnimation from '../../../components/LottieAnimation'
import emptyListLottie from '../../../lottie/empty-list.json'

const TIMEFRAMES = [
  { key: 'all',   label: 'All time' },
  { key: 'week',  label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'year',  label: 'This year' },
]

// Cutoff date (YYYY-MM-DD) for a timeframe; '' = no limit (all time).
function timeframeCutoff(tf) {
  const d = new Date()
  if (tf === 'week') d.setDate(d.getDate() - 7)
  else if (tf === 'month') d.setMonth(d.getMonth() - 1)
  else if (tf === 'year') d.setFullYear(d.getFullYear() - 1)
  else return ''
  return d.toISOString().slice(0, 10)
}

const SORTS = [
  { key: 'recent',     label: 'Most recent' },
  { key: 'most_bought', label: 'Most bought' },
  { key: 'top_spend',   label: 'Highest spend' },
  { key: 'multi_store', label: 'Multi-store first' },
  { key: 'a_z',         label: 'A → Z' },
]

// Money formatter — thousands separators + 2 decimals, matching the
// mockup's Bricolage money figures (paired with `.gg-num` for the font).
// Same convention as DashboardClient's `money` helper.
const moneyWith = (sym) => (n) => `${sym}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const money0With = (sym) => (n) => `${sym}${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const TONE_TINT = {
  emerald:  { from: 'from-emerald-50',  to: 'to-green-100',   ring: 'ring-guac-100',  text: 'text-guac-ink', accent: 'bg-guac-600' },
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

// Soft solid tint (hex) per category color — powers the mockup's
// 52×52 rounded emoji tile on the savings grid card. Keyed by the
// same `color` field on CATEGORIES so a category's tile matches its
// chip. Falls back to a neutral green wash.
const TINT_HEX = {
  emerald: '#E7F5E1', orange: '#FCEEDD', sky: '#E2EFFB', indigo: '#E8E6FB',
  amber: '#FBF1DA', lime: '#EDF7D6', fuchsia: '#FBE6F4', rose: '#FCE4E7',
  red: '#FBE3E1', violet: '#EEE7FB', pink: '#FBE6EE', slate: '#E9EDF1',
  gray: '#ECF0EA',
}

export default function StashPage() {
  const __cur = useCurrencySymbol()
  const money0 = useMemo(() => money0With(__cur), [__cur])
  const money = useMemo(() => moneyWith(__cur), [__cur])
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [sort, setSort] = useState('recent')
  const [timeframe, setTimeframe] = useState('all')
  const [view, setView] = useState('grid')  // 'grid' | 'list' | 'accordion'
  const [expanded, setExpanded] = useState(null)
  const [stealsItem, setStealsItem] = useState(null)
  // Horizontal-scroll ref for the category pill row. Same pattern as
  // the dashboard's AllPaymentsScroll — arrow buttons paginate by
  // roughly two chips per click, scrollbar is hidden via no-scrollbar.
  const catScrollRef = useRef(null)
  const scrollCats = (dir) => {
    const el = catScrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 260, behavior: 'smooth' })
  }

  // Resolved product-image URLs keyed by raw item_name. Decorates
  // each card with a real photo (cauliflower → cauliflower photo) so
  // the user doesn't see a generic emoji for every item. Falls back
  // to the category emoji when no image is found.
  const [productImages, setProductImages] = useState({})
  // Like-stats map keyed by item cache key — { totalLikes, likedByMe }.
  // Populated on Stash load via /api/.../product-likes batch RPC.
  // Optimistically updated on heart-click so the count + heart fill
  // bounce immediately rather than after the network round-trip.
  const [likeStats, setLikeStats] = useState(new Map())

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['stash'],
    queryFn: getStashItems,
    staleTime: 1000 * 60,
  })

  // Per-user inventory (on-hand counts). Decorated onto each Stash
  // item below so the card knows how many to render in the stepper +
  // whether to fire the "running low" badge.
  // Same shape-collision defense as useBankStatementMap (see commit
  // fe2db61): if a future hook ever subscribes to ['stash-inventory']
  // returning something other than a Map, the select fallback here
  // prevents the `.get()`-on-non-Map crash that took down /receipts.
  const { data: inventoryMap = new Map() } = useQuery({
    queryKey: ['stash-inventory'],
    queryFn: fetchInventoryMap,
    staleTime: 1000 * 60,
    select: (raw) => raw instanceof Map ? raw
      : Array.isArray(raw) ? new Map(raw.map(r => [r.item_key, r]))
      : new Map(),
  })

  // Aggregate by product (sku-or-name, case-insensitive) across ALL stores.
  // Each product knows every store that carries it, with that store's best/last price.
  const items = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
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
          first_date: '',  // earliest purchase — powers cadence label
          last_date: '',
          last_price: 0,
          last_receipt_id: '',
          last_store: '',
          rating_sum: 0,
          rating_count: 0,
          warranty_info: null,
          best_return_window: null,   // { expiry_date, days_left }
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
      if (dt && (!e.first_date || dt < e.first_date)) e.first_date = dt
      if (!e.last_date || dt > e.last_date) {
        e.last_date = dt
        e.last_price = p
        e.last_receipt_id = r.receipts?.id || ''
        e.last_store = storeName
      }
      if (r.rating != null) { e.rating_sum += r.rating; e.rating_count += 1 }
      // Warranty: first non-null wins (newest receipt). Cap the
      // string length so a multi-sentence policy doesn't blow up
      // the card layout.
      if (!e.warranty_info && r.warranty_info) {
        e.warranty_info = String(r.warranty_info).slice(0, 120)
      }
      // Return window: pick the most-eligible-policy on the parent
      // receipt that's still in window (expiry > today). Keep the
      // most distant expiry so the chip reads as "you've got til X"
      // rather than "you've got til the soonest-expiring policy".
      const policies = r.receipts?.receipt_refund_policies || []
      for (const pol of policies) {
        if (pol.eligible === false) continue
        if (!pol.expiry_date || pol.expiry_date <= todayIso) continue
        if (!e.best_return_window || pol.expiry_date > e.best_return_window.expiry_date) {
          e.best_return_window = {
            expiry_date: pol.expiry_date,
            days_left: Math.ceil((new Date(pol.expiry_date) - new Date(todayIso)) / 86400_000),
          }
        }
      }

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
    const list = [...m.values()].map(e => {
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
    // Top-spender flag — products in the top 10% by total_spend get
    // the "Top spender" highlight. Threshold based on the list so the
    // signal is meaningful regardless of household size.
    const sortedSpend = [...list].sort((a, b) => b.total_spend - a.total_spend)
    const cutoff = Math.max(1, Math.floor(sortedSpend.length * 0.1))
    const topSet = new Set(sortedSpend.slice(0, cutoff).map(e => e.key))
    for (const e of list) e.is_top_spender = topSet.has(e.key)

    // Decorate with on-hand qty + low-stock verdict. The verdict
    // wants an avg-days-between-buys and avg-qty-per-buy estimate;
    // we derive both from the receipt history we already have
    // aggregated above. Items with too little history (1-2 buys)
    // get on-hand only, no verdict.
    for (const e of list) {
      const invRow = inventoryMap.get(inventoryKey(e.item_name))
      e.on_hand_qty = invRow?.on_hand_qty ?? null
      if (e.times >= 3 && e.total_qty > 0) {
        // Crude cadence estimate: the receipt history span / number
        // of buys. Better than nothing without re-running the full
        // predictor here.
        const span = (e.stores_list || []).reduce((acc, s) => {
          if (!s.last_date) return acc
          // We only have last_date per store, not full timeseries — so
          // use 30d × (times - 1) / times as a stand-in cadence when
          // we can't compute properly. The verdict consumer treats
          // null cadence as "no badge", so falsy is fine.
          return acc
        }, null)
        const avgCadence = e.times >= 5 ? Math.max(7, 30 * (e.times - 1) / e.times) : null
        const avgQty = e.total_qty / e.times
        e.low_stock = lowStockVerdict({
          onHand: e.on_hand_qty,
          avgCadenceDays: avgCadence,
          avgQtyPerBuy: avgQty,
        })
      } else {
        e.low_stock = e.on_hand_qty === 0
          ? { state: 'out', daysLeft: 0, label: 'Out of stock' }
          : null
      }
    }

    return list
  }, [rows, inventoryMap])

  const catCounts = useMemo(() => {
    const c = new Map()
    for (const it of items) c.set(it.category, (c.get(it.category) || 0) + 1)
    return c
  }, [items])

  const multiStoreCount = items.filter(it => it.store_count > 1).length

  // Best-store savings math (drives the hero banner + the two new
  // status chips). An item is "overpaying" when it's multi-store, has
  // a resolved cheapest store (`best`), and the user's most-recent
  // price beats-able by that store's min_price. Everything below is
  // derived from the already-aggregated `items` — no new queries.
  const overpaying = useMemo(
    () => items.filter(it => it.store_count > 1 && it.best && Number(it.last_price) > Number(it.best.min_price)),
    [items]
  )
  const overCount = overpaying.length
  const saveTotal = useMemo(
    () => overpaying.reduce((sum, it) => sum + (Number(it.last_price) - Number(it.best.min_price)), 0),
    [overpaying]
  )
  // "Best price" = you already bought it at (or below) the cheapest
  // store you know of. Requires a resolved `best` so the claim holds.
  const bestPriceCount = useMemo(
    () => items.filter(it => it.best && Number(it.last_price) <= Number(it.best.min_price)).length,
    [items]
  )

  // Central engine rules — see web/src/lib/stashEngine.js#selectStashView:
  //   1. Search is GLOBAL — when a query is typed, ignore the category
  //      filter so users can find any item without picking the right pill.
  //   2. Accordion-by-category only fires when activeCat='all' AND no
  //      search query (handled below in the render block).
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    const hasSearch = s.length > 0
    let list = items
    // Apply category / status filter ONLY when no active search.
    if (!hasSearch) {
      if (activeCat === '_multi') list = list.filter(it => it.store_count > 1)
      else if (activeCat === '_overpaying') list = list.filter(it => it.store_count > 1 && it.best && Number(it.last_price) > Number(it.best.min_price))
      else if (activeCat === '_bestprice') list = list.filter(it => it.best && Number(it.last_price) <= Number(it.best.min_price))
      else if (activeCat !== 'all') list = list.filter(it => it.category === activeCat)
    }
    if (hasSearch) list = list.filter(it =>
      (it.item_name || '').toLowerCase().includes(s) ||
      (it.sku || '').toLowerCase().includes(s) ||
      (it.model || '').toLowerCase().includes(s) ||
      [...it.stores.values()].some(st => (st.name || '').toLowerCase().includes(s))
    )
    // Timeframe filter — keep products with a purchase in the window.
    if (timeframe !== 'all') {
      const cutoff = timeframeCutoff(timeframe)
      if (cutoff) list = list.filter(it => (it.last_date || '') >= cutoff)
    }
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
  }, [items, search, activeCat, sort, timeframe])

  // Accordion mode only applies when "All" is active + no search.
  // In any other case, fall back to the flat grid/list rendering.
  const hasSearch = search.trim().length > 0
  const accordionMode = view === 'accordion' && activeCat === 'all' && !hasSearch
  const accordionGroups = useMemo(() => {
    if (!accordionMode) return null
    const groups = new Map()
    for (const it of filtered) {
      const k = it.category || '__uncategorized__'
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k).push(it)
    }
    return groups
  }, [accordionMode, filtered])

  // Batch-resolve product images via /api/product-image-batch.
  // Fires when the unique item-name set changes. Results piled into
  // state so each card can render a real photo when available.
  useEffect(() => {
    if (filtered.length === 0) return
    let cancelled = false
    const names = [...new Set(filtered.map(it => it.item_name).filter(Boolean))].slice(0, 80)
    fetch('/api/product-image-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled || !json?.byName) return
        setProductImages(prev => ({ ...prev, ...json.byName }))
      })
      .catch(() => {/* degrade to emoji fallback */})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, filtered[0]?.key])

  // Batch-fetch like stats for the current Stash. Same trigger as
  // the image fetch — re-fires when the visible items change. Each
  // item is keyed by its imageCacheKey (== productLikes item_key)
  // so the stash engine + likes engine share the same normalization.
  useEffect(() => {
    if (filtered.length === 0) return
    let cancelled = false
    const keys = [...new Set(filtered.map(it => imageCacheKey(it.item_name)).filter(Boolean))].slice(0, 100)
    fetchLikeStats(keys)
      .then(m => { if (!cancelled) setLikeStats(m) })
      .catch(() => {/* table may not exist yet (pre-migration) — silent */})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length, filtered[0]?.key])

  // Toggle like with optimistic UI — bump the count + flip the heart
  // before the server confirms so the click feels instant. Rolls
  // back if the server rejects (e.g. user not signed in).
  const handleToggleLove = useCallback(async (itemName) => {
    const key = imageCacheKey(itemName)
    if (!key) return
    const prev = likeStats.get(key) || { totalLikes: 0, likedByMe: false }
    const optimistic = {
      totalLikes: Math.max(0, prev.totalLikes + (prev.likedByMe ? -1 : 1)),
      likedByMe: !prev.likedByMe,
    }
    setLikeStats(m => { const next = new Map(m); next.set(key, optimistic); return next })
    try {
      const real = await toggleLike(key)
      setLikeStats(m => { const next = new Map(m); next.set(key, { totalLikes: real.totalLikes, likedByMe: real.liked }); return next })
    } catch (e) {
      setLikeStats(m => { const next = new Map(m); next.set(key, prev); return next })
      toast.error(e.message || 'Could not save like')
    }
  }, [likeStats])

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
      toast.success(`Added "${it.item_name}" to Shopping List${chosen?.name ? ` (from ${chosen.name})` : ''} 🛒`)
    } catch (e) { toast.error(e.message) }
  }

  function toggleExpand(key) {
    setExpanded(prev => prev === key ? null : key)
  }

  return (
    <div className="space-y-5 max-w-7xl font-sans">
      <FeatureHeader
        expression="standing"
        title="Stash"
        subtitle="Everything you've ever bought — and where to buy it cheapest."
        action={
          <span className="text-sm text-gray-500">
            <span className="font-bold text-guac-700 gg-num">{items.length}</span> products ·{' '}
            <span className="font-bold text-amber-700 gg-num">{multiStoreCount}</span> multi-store
          </span>
        }
      />

      {/* Best-store savings hero — self-hides unless the user is
          overpaying on at least one multi-store item. Headline + save
          total come straight from the `overpaying` set above; the
          white pill jumps the grid to the new "Overpaying" filter so
          the banner and the list stay in sync. */}
      {overCount > 0 && (
        <div
          className="relative overflow-hidden flex items-center gap-5 text-white px-6 py-5 sm:px-7"
          style={{
            background: 'linear-gradient(120deg,#1C7E39,#0F5A2A)',
            borderRadius: '22px',
            boxShadow: '0 24px 44px -28px rgba(15,90,42,.7)',
          }}
        >
          <div
            className="pointer-events-none absolute -top-12 right-28 w-56 h-56"
            style={{ background: 'radial-gradient(circle, rgba(182,242,61,.22), transparent 68%)' }}
          />
          <div className="relative flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold tracking-wide text-lime-100 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-300" />
              BEST-STORE CHECK
            </span>
            <p className="font-display font-extrabold text-white leading-tight text-xl sm:text-2xl">
              You're overpaying on <span className="gg-num">{overCount}</span> item{overCount === 1 ? '' : 's'} — <span className="gg-num">{money0(saveTotal)}</span> in easy savings.
            </p>
            <p className="text-[13px] text-emerald-100/90 mt-1.5">
              Buy each at its cheapest store on your next run and pocket the difference.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSearch(''); setActiveCat('_overpaying') }}
            className="relative shrink-0 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-[13.5px] font-extrabold text-guac-700 shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
          >
            Review {overCount} item{overCount === 1 ? '' : 's'} →
          </button>
        </div>
      )}

      {/* Category chips — single horizontal scroll row with ← →
          arrow buttons (matches the dashboard's AllPaymentsScroll
          pattern). Scrollbar is hidden via no-scrollbar; the arrows
          float on top and are the only scroll affordance. Outer
          group enables hover-only fade-in of the arrows on desktop.
          - `flex-nowrap` keeps every chip in one line
          - `shrink-0` on each chip prevents compression
          - `px-12` reserves space for the arrow buttons so they sit
            outside the scroll area instead of overlapping the first
            and last chip. */}
      <div className="relative group px-12">
        <style jsx>{`
          .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
        <div ref={catScrollRef} className="no-scrollbar overflow-x-auto scroll-smooth pb-1">
          <div className="flex flex-nowrap items-center gap-2 min-w-max">
            {/* Status chips — best-store savings lenses first, then a
                thin divider, then the per-category chips. */}
            <CatChip active={activeCat === 'all'} onClick={() => setActiveCat('all')} emoji="🌈" label="All" count={items.length} status />
            {overCount > 0 && (
              <CatChip
                active={activeCat === '_overpaying'}
                onClick={() => setActiveCat('_overpaying')}
                emoji="⚠"
                label="Overpaying"
                count={overCount}
                tone="amber"
                status
              />
            )}
            {bestPriceCount > 0 && (
              <CatChip
                active={activeCat === '_bestprice'}
                onClick={() => setActiveCat('_bestprice')}
                emoji="✓"
                label="Best price"
                count={bestPriceCount}
                tone="emerald"
                status
              />
            )}
            {multiStoreCount > 0 && (
              <CatChip
                active={activeCat === '_multi'}
                onClick={() => setActiveCat('_multi')}
                emoji="🏬"
                label="Multi-store"
                count={multiStoreCount}
                tone="amber"
                status
              />
            )}
            <span className="shrink-0 w-px h-6 mx-1 bg-guac-line2" aria-hidden="true" />
            {CATEGORIES.map(c => {
              const count = catCounts.get(c.slug) || 0
              if (count === 0 && activeCat !== c.slug) return null
              return (
                <CatChip key={c.slug} active={activeCat === c.slug} onClick={() => setActiveCat(c.slug)} emoji={c.emoji} label={c.label} count={count} tone={c.color} />
              )
            })}
          </div>
        </div>
        <button
          type="button"
          aria-label="Scroll categories left"
          onClick={() => scrollCats(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-guac-row hover:text-guac-700 opacity-70 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Scroll categories right"
          onClick={() => scrollCats(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-guac-row hover:text-guac-700 opacity-70 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Search + sort + view toggle — flatter, 12px-radius toolbar
          matching the mockup (white bg, guac-line2 hairline border,
          no pills). */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-guac-line2 bg-white pl-9 pr-3 py-2.5 text-sm text-guac-ink placeholder:text-gray-400 focus:outline-none focus:border-guac-600 focus:ring-1 focus:ring-guac-100 font-sans"
            placeholder="Search item, SKU, model, or store…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="inline-flex items-center gap-2 bg-white rounded-xl pl-4 pr-2 py-2 border border-guac-line2">
          <span className="text-xs font-semibold text-gray-500">When</span>
          <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="bg-transparent text-sm font-bold text-guac-700 focus:outline-none cursor-pointer font-sans">
            {TIMEFRAMES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className="inline-flex items-center gap-2 bg-white rounded-xl pl-4 pr-2 py-2 border border-guac-line2">
          <span className="text-xs font-semibold text-gray-500">Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-transparent text-sm font-bold text-guac-700 focus:outline-none cursor-pointer font-sans">
            {SORTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className="inline-flex items-center gap-1 bg-white rounded-xl p-1 border border-guac-line2">
          <button onClick={() => setView('grid')} title="Grid view"
            className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-[#E9F5DD] text-guac-700' : 'text-gray-500 hover:text-gray-800'}`}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => setView('list')} title="List view"
            className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-[#E9F5DD] text-guac-700' : 'text-gray-500 hover:text-gray-800'}`}>
            <List size={14} />
          </button>
          <button onClick={() => setView('accordion')} title="Grouped by category"
            className={`p-1.5 rounded-lg transition-all ${view === 'accordion' ? 'bg-[#E9F5DD] text-guac-700' : 'text-gray-500 hover:text-gray-800'}`}>
            <Layers size={14} />
          </button>
        </div>
        <span className="text-xs text-gray-400 gg-num">{filtered.length} shown</span>
      </div>

      {isLoading ? (
        // Shimmer skeletons — give the user a layout hint while
        // the stash query resolves. Six tiles is a reasonable
        // mid-density.
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShimmerBox key={i} className="h-40 w-full" rounded="2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-10 text-center flex flex-col items-center gap-3">
          <LottieAnimation data={emptyListLottie} size={160} fallback="🥑" />
          <p className="text-gray-500 max-w-sm">
            {items.length === 0
              ? <>No items yet. <Link href="/receipts" className="text-guac-700 font-semibold hover:underline">Add your first receipt</Link> to start your stash.</>
              : 'No matches in this category.'}
          </p>
        </div>
      ) : accordionMode ? (
        // Accordion grouping — one collapsible section per category,
        // each containing a mini grid of its items. Only renders when
        // "All" is selected (a specific category's accordion would
        // be a single-section accordion = a flat list, defeating the
        // purpose). Search results are always flat — see the central
        // engine's selectStashView for the full rule set.
        <div className="space-y-2">
          {[...accordionGroups.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .map(([slug, group]) => {
              const cat = CATEGORY_BY_SLUG[slug] || { emoji: '📦', label: slug === '__uncategorized__' ? 'Uncategorized' : slug, color: 'gray' }
              return (
                <CategorySection
                  key={slug}
                  cat={cat}
                  items={group}
                  expandedKey={expanded}
                  onCardToggle={(key) => toggleExpand(key)}
                  onAddToSmashlist={handleAddToSmashlist}
                  onFindDeals={setStealsItem}
                  productImages={productImages}
                />
              )
            })}
        </div>
      ) : view === 'grid' ? (
        // FadeUpStagger gives each product card a 40ms-spaced entrance
        // on initial paint AND on filter/sort change (since changing
        // the filter remounts this branch). Capped at 12 cards so
        // long stashes settle quickly.
        <FadeUpStagger
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 anim-crossfade"
          delayMs={40}
        >
          {filtered.map(it => {
            // Wrapper div is needed because the card is memo'd and
            // doesn't forward className/style — FadeUpStagger applies
            // its animation classes to the immediate child.
            return (
              <div key={it.key}>
                <StashSavingsCard
                  item={it}
                  onAddToSmashlist={() => handleAddToSmashlist(it)}
                  onFindDeals={() => setStealsItem(it)}
                />
              </div>
            )
          })}
        </FadeUpStagger>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="gg-tbl w-full text-sm">
            <thead>
              <tr>{['Category','Item','Stores','Best price','Times','Total spend',''].map(h =>
                <th key={h} className="gg-colhead text-left">{h}</th>
              )}</tr>
            </thead>
            <tbody>
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
                      <td className="px-4 py-3 font-bold text-guac-700 gg-num">
                        {money(it.best?.min_price || it.last_price)}
                        {it.best && it.best.name && <span className="text-[10px] text-gray-400 ml-1 font-normal">at {it.best.name}</span>}
                      </td>
                      <td className="px-4 py-3 gg-num">{it.times}×</td>
                      <td className="px-4 py-3 font-semibold text-rose-700 gg-num">{money(it.total_spend)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleAddToSmashlist(it) }}
                          className="relative w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all inline-flex items-center justify-center ring-2 ring-white">
                          <span className="absolute -top-1 -right-1 text-[9px]">🥑</span>
                          <ShoppingCart size={13} />
                        </button>
                      </td>
                    </tr>
                    {expanded === it.key && (
                      <tr className="bg-guac-50/20">
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

/**
 * StashCard — production wrapper around the centralized ItemRowCard.
 * Maps a Stash `item` (from the aggregator) onto the card's prop
 * contract and surfaces the rich expand panel (multi-store list,
 * deal hunt, shopping list add) under a ⋮-toggleable region.
 *
 * Visual parity with mobile FetchCard: tinted tile + sentence
 * subtitle + value top-right + dual rating chips + on-hand pill.
 */
/**
 * One collapsible accordion section per category, used by the
 * accordion view. Header shows emoji + label + count and toggles
 * the body open/closed. Defaults to expanded for the user's
 * most-active categories.
 */
function CategorySection({ cat, items, expandedKey, onCardToggle, onAddToSmashlist, onFindDeals, productImages }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-guac-row transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{cat.emoji}</span>
          <span className="font-extrabold text-gray-900">{cat.label}</span>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {items.length}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 pt-0">
          {items.map(it => (
            <StashCard
              key={it.key}
              item={it}
              expanded={expandedKey === it.key}
              onToggle={() => onCardToggle(it.key)}
              onAddToSmashlist={(store) => onAddToSmashlist(it, store)}
              onFindDeals={() => onFindDeals(it)}
              imageUrl={productImages[it.item_name]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const StashCard = memo(function StashCard({ item, expanded, onToggle, onAddToSmashlist, onFindDeals, imageUrl, loveCount, likedByMe, onToggleLove }) {
  const __cur = useCurrencySymbol()
  const money = useMemo(() => moneyWith(__cur), [__cur])
  const qc = useQueryClient()
  const cat = CATEGORY_BY_SLUG[item.category] || CATEGORY_BY_SLUG['misc']
  const tone = TONE_TINT[cat.color] || TONE_TINT.gray

  // Bulk-rate mutation — same as the old ProductCard. Cascades the
  // rating across every receipt_item of this product at this store.
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
        : chip?.delta < 0 ? `Noted — ${chip.label}` : 'Rating saved')
      qc.invalidateQueries({ queryKey: ['stash'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: err => toast.error(err.message),
  })

  // Subtitle reads like a sentence — mirrors the mobile FetchCard's
  // single-line metadata format. "Bought ×N · last DATE · $X total".
  const lastDate = item.last_date ? friendlyDate(item.last_date) : ''
  const subtitle = `Bought ×${item.times} · last ${lastDate} · ${money(item.total_spend)} total`

  // On-hand pill — only render when the user has actually counted.
  // The previous "Tap to count" placeholder was confusing visual
  // noise; the ⋮ menu's stepper still lets users set the count.
  const onHand = item.on_hand_qty
  const stockLabel = onHand > 0 ? `${onHand} on hand` : null

  // Personal rating = rounded average across rated rows (matches the
  // old avg_rating semantic). Community rating fires only when there
  // are 2+ rated rows so it adds signal beyond personal.
  const personalRating = item.rating_count > 0 ? Math.round(item.avg_rating) : 0
  const showCommunity = item.rating_count >= 2

  return (
    <div className="flex flex-col gap-2">
      <ItemRowCard
        title={item.item_name}
        subtitle={subtitle}
        imageEmoji={cat.emoji}
        imageUrl={imageUrl}
        tint={tone.tintHex || '#fef9c3'}
        frequency={formatPurchaseFrequency(item.times, item.first_date, item.last_date)}
        urgency={item.low_stock?.state === 'urgent' ? item.low_stock.label
              : item.low_stock?.state === 'out'    ? '🛑 Out'
              : null}
        storeName={stockLabel}
        storeColor={onHand > 0 ? '#15803d' : '#94a3b8'}
        storeEmoji="📦"
        value={item.total_spend}
        valueLabel="$"
        valueIsPrefix={true}
        rating={personalRating}
        onRate={(n) => rerate.mutate(n)}
        communityRating={showCommunity ? item.avg_rating : undefined}
        communityRatingCount={showCommunity ? item.rating_count : undefined}
        loveCount={loveCount}
        likedByMe={likedByMe}
        onToggleLove={onToggleLove}
        onMenu={onToggle}
        onShare={() => onFindDeals?.()}
        onTap={item.last_receipt_id ? () => { window.location.href = `/receipts/${item.last_receipt_id}` } : undefined}
      />
      {expanded && (
        <div className="bg-white rounded-2xl p-3 ring-1 ring-gray-100 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
              {item.store_count > 1 ? `📦 ${item.store_count} stores` : '📦 Your store'}
            </p>
            <div className="flex items-center gap-1.5">
              <ShareItemButton
                item={item}
                buildPayload={() => ({
                  kind: 'item',
                  item_title: item.item_name,
                  category_emoji: cat.emoji,
                  rating: personalRating > 0 ? personalRating : null,
                  best_price_callout: item.store_count > 1 && item.best
                    ? `Cheapest at ${item.best.name} — ${money(item.best.min_price)}`
                    : null,
                  tiles: (item.stores_list || []).map(s => ({
                    store: s.name || 'Store',
                    location: '',
                    title: item.item_name,
                    price: s.min_price || s.last_price || 0,
                    rating: null,
                    review_count: null,
                    sale: false,
                  })),
                })}
                triggerClassName="text-xs font-bold text-guac-700 hover:text-guac-ink"
              />
              <button onClick={() => onFindDeals?.()}
                className="text-xs font-bold text-amber-700 hover:text-amber-900">
                💎 Find deals
              </button>
              <button onClick={() => onAddToSmashlist?.()}
                className="text-xs font-bold text-rose-700 hover:text-rose-900">
                🛒 Shopping List
              </button>
            </div>
          </div>
          <StoreList
            stores={item.stores_list}
            best={item.best}
            onAddToSmashlist={onAddToSmashlist}
          />
        </div>
      )}
    </div>
  )
})

/**
 * StashSavingsCard — the mockup's "best-store savings" grid card.
 * Vertical white card, tinted category-emoji tile, a best-store
 * INSIGHT BAND (green "best price" / amber "save $X" / neutral
 * single-store), and a footer with the last-paid price + a "+ List"
 * repurchase button. A compact star row keeps rating alive. Every
 * value comes from the already-aggregated `item` — no new queries.
 */
const StashSavingsCard = memo(function StashSavingsCard({ item, onAddToSmashlist, onFindDeals }) {
  const __cur = useCurrencySymbol()
  const money = useMemo(() => moneyWith(__cur), [__cur])
  const qc = useQueryClient()
  const cat = CATEGORY_BY_SLUG[item.category] || CATEGORY_BY_SLUG['misc']
  const tintBg = TINT_HEX[cat.color] || TINT_HEX.gray
  const isMulti = item.store_count > 1
  const [hoverRate, setHoverRate] = useState(0)

  // Bulk-rate mutation — cascades the rating across every
  // receipt_item of this product at each store (same as StashCard).
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
        : chip?.delta < 0 ? `Noted — ${chip.label}` : 'Rating saved')
      qc.invalidateQueries({ queryKey: ['stash'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
    },
    onError: err => toast.error(err.message),
  })

  // Best-store insight — three states, all derived from `best`:
  //   • best price: your last price already at/under the cheapest store
  //   • overpaying: a cheaper store exists → show the saveable delta
  //   • single-store: neutral "only store you've bought this at"
  const best = item.best
  const savings = best ? Number(item.last_price) - Number(best.min_price) : 0
  const isBest = isMulti && best && (Number(item.last_price) <= Number(best.min_price) || item.last_store === best.name)
  const isOver = isMulti && best && !isBest && savings > 0

  const lastDate = item.last_date ? friendlyDate(item.last_date) : '—'
  const meta = `Bought ${item.times}× · last ${lastDate}`
  const personalRating = item.rating_count > 0 ? Math.round(item.avg_rating) : 0

  const goReceipt = item.last_receipt_id
    ? () => { window.location.href = `/receipts/${item.last_receipt_id}` }
    : undefined

  return (
    <div
      className={`flex flex-col gap-3 bg-white rounded-[20px] p-4 border transition-shadow ${goReceipt ? 'cursor-pointer hover:shadow-md' : ''}`}
      style={{ borderColor: 'rgba(20,83,45,.09)' }}
      onClick={goReceipt}
    >
      {/* Head: tinted emoji tile + name + meta + multi-store star pill */}
      <div className="flex items-start gap-3">
        <div
          className="w-[52px] h-[52px] rounded-[15px] flex items-center justify-center text-2xl shrink-0"
          style={{ background: tintBg }}
        >
          {cat.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-guac-ink text-[14.5px] leading-snug line-clamp-2">{item.item_name}</p>
          <p className="text-[11.5px] text-gray-400 mt-1">{meta}</p>
        </div>
        {isMulti && (
          <span className="shrink-0 bg-[#F1F6EA] text-[#5E8A46] text-[10px] font-extrabold px-2 py-1 rounded-full">
            {item.store_count}★
          </span>
        )}
      </div>

      {/* Best-store insight band */}
      {isBest ? (
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-[#F2F9EA] text-guac-700 text-[12.5px] leading-snug">
          <span className="shrink-0 font-bold">✓</span>
          <span>Best price — cheapest at <strong className="font-extrabold">{best.name}</strong></span>
        </div>
      ) : isOver ? (
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-[#FBF3E1] text-[#B5730C] text-[12.5px] leading-snug">
          <span className="shrink-0 font-bold">↓</span>
          <span>Save <strong className="font-extrabold gg-num">{money(savings)}</strong> — <strong className="font-extrabold">{best.name}</strong> has it at <span className="gg-num">{money(best.min_price)}</span></span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 text-[12px] leading-snug">
          <span className="shrink-0">🏬</span>
          <span>Only store you've bought this at{item.last_store ? ` — ${item.last_store}` : ''}</span>
        </div>
      )}

      {/* Compact rate row — keeps ratings alive without the full rater.
          stopPropagation so a star tap doesn't open the receipt. */}
      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()} onMouseLeave={() => setHoverRate(0)}>
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mr-1">Worth it?</span>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            disabled={rerate.isPending}
            onClick={() => rerate.mutate(n)}
            onMouseEnter={() => setHoverRate(n)}
            title={`Rate ${n}★`}
            className="p-0.5 hover:scale-125 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Star size={13} className={n <= (hoverRate || personalRating) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => onFindDeals?.()}
          title="Find deals — live web price scan"
          className="ml-auto text-[11px] font-bold text-guac-600 hover:text-guac-700"
        >
          💎 Deals
        </button>
      </div>

      {/* Footer: last-paid price + "+ List" repurchase button */}
      <div
        className="flex items-end justify-between pt-3"
        style={{ borderTop: '1px solid rgba(20,83,45,.07)' }}
      >
        <div>
          <p className="font-display font-extrabold text-guac-ink text-[19px] leading-none gg-num">{money(item.last_price)}</p>
          <p className="text-[11px] text-gray-400 mt-1">you last paid</p>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onAddToSmashlist?.() }}
          className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12.5px] font-bold text-[#2E6B3D] bg-white border transition-colors hover:bg-guac-50"
          style={{ borderColor: 'rgba(20,83,45,.14)' }}
        >
          <span className="text-[15px] leading-none">+</span> List
        </button>
      </div>
    </div>
  )
})

/** Lightweight friendly-date formatter for the sentence subtitle. */
function friendlyDate(iso) {
  if (!iso) return '—'
  const parts = String(iso).split('-')
  if (parts.length < 3) return iso
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const m = parseInt(parts[1], 10) || 1
  const d = parseInt(parts[2], 10) || 1
  const thisYear = new Date().getFullYear().toString()
  const label = `${months[(m - 1) % 12]} ${d}`
  return parts[0] === thisYear ? label : `${label}, ${parts[0]}`
}

const ProductCard = memo(function ProductCard({ item, expanded, onToggle, onAddToSmashlist, onFindDeals }) {
  const __cur = useCurrencySymbol()
  const money0 = useMemo(() => money0With(__cur), [__cur])
  const money = useMemo(() => moneyWith(__cur), [__cur])
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

  // On-hand inventory mutation. Optimistic — bumps the local cache
  // immediately so the +/- stepper feels instant; rolls back on
  // server error.
  const updateOnHand = useMutation({
    mutationFn: async (newQty) => setOnHand(item.item_name, newQty),
    onMutate: async (newQty) => {
      await qc.cancelQueries({ queryKey: ['stash-inventory'] })
      const prev = qc.getQueryData(['stash-inventory'])
      if (prev instanceof Map) {
        const next = new Map(prev)
        next.set(inventoryKey(item.item_name), {
          item_key: inventoryKey(item.item_name),
          on_hand_qty: Math.max(0, Math.min(9999, Number(newQty) || 0)),
          updated_at: new Date().toISOString(),
        })
        qc.setQueryData(['stash-inventory'], next)
      }
      return { prev }
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(['stash-inventory'], ctx.prev)
      toast.error('Could not update on-hand count')
    },
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
    <div className={`relative bg-gradient-to-br ${tone.from} ${tone.to} rounded-2xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-guac-line2 hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 ring-1 ${tone.ring} group`}>
      {/* Color stripe header — explicit rounded-t-2xl now that the
          card no longer overflow-hidden's (so the Share dropdown can
          escape the card boundary). */}
      <div className={`h-1 ${tone.accent} rounded-t-2xl`} />
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
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 font-bold gg-num">
                <Star size={10} fill="currentColor" /> {item.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Audit signals row — only renders the chips that apply.
            Warranty + return-window come from the joined receipt
            data; top-spender is computed from the user's total spend
            distribution; low-stock comes from the inventory crossed
            with cadence. Self-hides when nothing applies. */}
        {(item.warranty_info || item.best_return_window || item.is_top_spender || item.low_stock) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.low_stock && (item.low_stock.state === 'urgent' || item.low_stock.state === 'out') && (
              <span
                title={item.low_stock.label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  item.low_stock.state === 'out'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                {item.low_stock.state === 'out' ? '🛑' : '⚠️'} {item.low_stock.label}
              </span>
            )}
            {item.is_top_spender && (
              <span
                title={`Top 10% by total spend (${money0(item.total_spend)})`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
              >
                💸 Top spender
              </span>
            )}
            {item.best_return_window && (
              <span
                title={`Return window closes ${item.best_return_window.expiry_date}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  item.best_return_window.days_left <= 7
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-sky-100 text-sky-800 border-sky-200'
                }`}
              >
                ↩ Returnable {item.best_return_window.days_left}d
              </span>
            )}
            {item.warranty_info && (
              <span
                title={item.warranty_info}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-guac-100 text-guac-700 border border-guac-line2 max-w-[200px] truncate"
              >
                🛡 Warranty
              </span>
            )}
          </div>
        )}

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

        {/* On-hand inventory stepper — user counts how many are on
            the shelf right now. Combined with cadence/qty signals
            this surfaces "running low" before they stockout. */}
        <OnHandStepper
          value={item.on_hand_qty ?? 0}
          onChange={(n) => updateOnHand.mutate(n)}
          disabled={updateOnHand.isPending}
          subtitle={item.low_stock?.state === 'ok' ? item.low_stock.label
            : item.low_stock?.state === 'soft' ? item.low_stock.label
            : null}
        />

        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">{isMulti ? 'Best' : 'Last'} $</p>
            <p className="font-bold text-guac-700 gg-num">{money(item.best?.min_price || item.last_price)}</p>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Bought</p>
            <p className="font-bold text-amber-700 gg-num">{item.times}×</p>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Total $</p>
            <p className="font-bold text-rose-700 gg-num">{money0(item.total_spend)}</p>
          </div>
        </div>

        {isMulti && item.best && (
          <div className="mt-3 flex items-center gap-2 text-xs bg-amber-100/80 text-amber-900 rounded-xl px-3 py-2 border border-amber-200">
            <BadgeDollarSign size={14} className="text-amber-600 shrink-0" />
            <span>
              Cheapest at <span className="font-bold">{item.best.name}</span>:
              {' '}<span className="font-bold gg-num">{money(item.best.min_price)}</span>
              {item.worst && item.worst.min_price > item.best.min_price && (
                <span className="text-amber-700/70"> · save up to {money(item.worst.min_price - item.best.min_price)}</span>
              )}
            </span>
          </div>
        )}

        <button onClick={onToggle}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-guac-700 hover:text-guac-ink self-start">
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
                <p className="text-[9px] uppercase tracking-wider font-bold text-guac-700 mb-1 px-2">💎 Live web prices</p>
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
              className="w-full text-[11px] font-bold text-guac-700 hover:bg-guac-50 rounded-lg py-1.5 transition-all flex items-center justify-center gap-1.5">
              {webLoading
                ? <>⏳ Scanning the web…</>
                : webPrices ? <>🔄 Refresh web prices</> : <>💎 Hunt web prices</>}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/50 gap-2">
          <Link href={`/receipts/${item.last_receipt_id}`} className="inline-flex items-center gap-1 text-xs text-guac-700 hover:underline font-semibold">
            Last receipt <ExternalLink size={10} />
          </Link>
          <div className="flex items-center gap-1.5">
            {/* Share — mints a /share/<token> URL with the item's
                per-store price tiles baked in, routes through any
                channel. Same reusable component used on the Buy
                Again card so muscle memory transfers. */}
            <ShareItemButton
              item={item}
              buildPayload={() => ({
                kind: 'item',
                item_title: item.item_name,
                category_emoji: cat?.emoji || '🛒',
                rating: item.avg_rating > 0 ? Math.round(item.avg_rating) : null,
                best_price_callout: item.store_count > 1 && item.best
                  ? `Cheapest at ${item.best.name} — ${money(item.best.min_price)}`
                  : null,
                tiles: (item.stores_list || []).map(s => ({
                  store: s.name || 'Store',
                  location: '',
                  title: item.item_name,
                  price: s.min_price || s.last_price || 0,
                  rating: null,
                  review_count: null,
                  sale: false,
                })),
              })}
              triggerClassName="relative w-10 h-10 rounded-full bg-gradient-to-br from-sky-300 to-emerald-500 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center ring-2 ring-white"
            />
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
              title="Add to Shopping List"
              aria-label="Add to Shopping List"
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
            chip.tone === 'emerald' ? 'bg-guac-100 text-guac-700' :
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

// On-hand stepper — minus / qty / plus, with a subtitle line that
// surfaces the predictor-derived "you've got ~N days left" estimate
// when there's enough history to compute one. Touch-friendly button
// sizes for mobile users actually counting shelf inventory.
function OnHandStepper({ value, onChange, disabled, subtitle }) {
  const safe = Math.max(0, Math.min(9999, Number(value) || 0))
  return (
    <div className="mt-3 flex items-center gap-2.5 bg-white/70 rounded-xl px-3 py-2 ring-1 ring-white">
      <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 shrink-0">
        On hand
      </span>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || safe === 0}
          onClick={() => onChange(Math.max(0, safe - 1))}
          className="w-7 h-7 rounded-full bg-guac-100 hover:bg-guac-100 text-guac-700 text-base font-bold leading-none disabled:opacity-40 transition-all active:scale-95"
          aria-label="Decrease on-hand count"
        >−</button>
        <span className={`text-sm font-black gg-num w-7 text-center ${
          safe === 0 ? 'text-rose-700' : safe <= 1 ? 'text-amber-700' : 'text-guac-700'
        }`}>
          {safe}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(safe + 1)}
          className="w-7 h-7 rounded-full bg-guac-100 hover:bg-guac-100 text-guac-700 text-base font-bold leading-none disabled:opacity-40 transition-all active:scale-95"
          aria-label="Increase on-hand count"
        >+</button>
      </div>
      {subtitle && (
        <span className="text-[10px] text-gray-500 ml-auto truncate">{subtitle}</span>
      )}
    </div>
  )
}

function CatChip({ active, onClick, emoji, label, count, tone, status }) {
  // STATUS chips (All / Overpaying / Best price / Multi-store) use the
  // mockup's flatter fill: All → solid dark, Overpaying → amber,
  // Best price → soft green; inactive = white + hairline border. No
  // emoji tile — the glyph sits inline. Category chips keep the
  // original gradient pill look.
  if (status) {
    const activeFill =
      tone === 'amber'   ? 'bg-[#FBF3E1] text-[#B5730C] border border-[rgba(217,119,6,.32)]' :
      tone === 'emerald' ? 'bg-[#E9F5DD] text-guac-700 border border-guac-line2' :
                           'bg-[#14241A] text-white border border-[#14241A]'
    const countCls = active
      ? (tone === 'amber' ? 'bg-[#F1CE8E] text-[#8A560A]' : tone === 'emerald' ? 'bg-white/70 text-guac-700' : 'bg-white/20 text-white')
      : 'bg-gray-100 text-gray-500'
    return (
      <button type="button" onClick={onClick}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-[12.5px] transition-colors ${
          active ? activeFill : 'bg-white text-guac-body border border-guac-line2 hover:border-guac-600'
        }`}>
        <span>{emoji}</span>
        <span>{label}</span>
        <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full gg-num ${countCls}`}>{count}</span>
      </button>
    )
  }
  const grad = TONE_GRADIENT[tone] || 'from-emerald-300 to-lime-400'
  return (
    <button type="button" onClick={onClick}
      className={`group shrink-0 inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 font-semibold text-xs transition-all hover:scale-[1.04] ${
        active
          ? `bg-gradient-to-br ${grad} text-white border-white shadow-lg ring-1 ring-guac-100`
          : 'bg-white text-gray-700 border-gray-200 hover:border-guac-line2 shadow-sm'
      }`}>
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0 ${
        active ? 'bg-white/30 shadow-inner' : `bg-gradient-to-br ${grad} text-white shadow-sm`
      }`}>{emoji}</span>
      <span>{label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full gg-num ${active ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
    </button>
  )
}
