'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Store, Phone, Globe, MapPin, ChevronRight, ChevronDown, Search, Trash2, AlertTriangle, Shield, Clock, ExternalLink, Link2 } from 'lucide-react'
import { getStores, getReceipts, deleteStore, getAllStoreDefaultPolicies, getRewards } from '../../../lib/db'
import { normalizeStoreName, storeGroupKey, displayStoreName } from '../../../lib/store-name-normalize'
import { useConfirm } from '../../../components/ConfirmDialog'
import LottieAnimation from '../../../components/LottieAnimation'
import emptyListLottie from '../../../lottie/empty-list.json'
import thinkingLottie from '../../../lottie/thinking.json'
import MascotLoading from '../../../components/MascotLoading'
import FeatureHeader from '../../../components/FeatureHeader'
import { StoreLogo } from '../../../components/StoreLogo'
import { usePromotions, useUpdatePromotion } from '../../../hooks/usePromotions'
import PromotionCard from '../../../components/PromotionCard'
import { currentPromotions } from '../../../lib/promotion-presentation.mjs'
// Placeholder reward_no shape the server mints before a real member #
// is known ("GG-" + 8 base36 chars). Mirrors PLACEHOLDER_REWARD_RE in
// lib/save-receipt.js — we only surface REAL numbers on this page.
const PLACEHOLDER_REWARD_RE = /^GG-[A-Z0-9]{8}$/
function isPlaceholderReward(n) { return !n || PLACEHOLDER_REWARD_RE.test(String(n)) }

function normalizePhone(p) {
  if (!p) return ''
  return String(p).replace(/\D+/g, '')
}

function normalizeName(n) {
  return (n || '').trim().toLowerCase()
}

function normalizeAddr(a) {
  return (a || '').trim().toLowerCase()
}

// Group stores into duplicate clusters keyed by phone OR address OR name.
function findDuplicateClusters(stores) {
  const groups = new Map()
  for (const s of stores) {
    const keys = []
    const name = normalizeName(s.store_name)
    const phone = normalizePhone(s.phone_no)
    const addr = normalizeAddr(s.address)
    if (name) keys.push(`name:${name}`)
    if (phone.length >= 7) keys.push(`phone:${phone}`)
    if (addr) keys.push(`addr:${addr}`)
    for (const k of keys) {
      if (!groups.has(k)) groups.set(k, new Set())
      groups.get(k).add(s.id)
    }
  }
  // Union-find: merge any clusters that share a store
  const parent = new Map()
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
  for (const s of stores) parent.set(s.id, s.id)
  for (const ids of groups.values()) {
    const arr = [...ids]
    for (let i = 1; i < arr.length; i++) {
      const a = find(arr[0]); const b = find(arr[i])
      if (a !== b) parent.set(a, b)
    }
  }
  const cluster = new Map()
  for (const s of stores) {
    const root = find(s.id)
    if (!cluster.has(root)) cluster.set(root, [])
    cluster.get(root).push(s)
  }
  return [...cluster.values()].filter(g => g.length > 1)
}

export default function StoresPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [offerSearch, setOfferSearch] = useState('')
  const [offerSource, setOfferSource] = useState('')
  const [offerExpiry, setOfferExpiry] = useState('')
  const [offerType, setOfferType] = useState('')
  const [searchingOffers, setSearchingOffers] = useState(false)
  const [offerMessage, setOfferMessage] = useState('')
  const offersPanel = useRef(null)
  const [selected, setSelected] = useState(() => new Set())

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
    staleTime: 1000 * 60 * 5,
  })

  // One bulk fetch of every curated default policy (catch-all rows only).
  // Lookups by normalized store name happen client-side so the per-row chip
  // doesn't need a round-trip per store.
  const { data: policyMap } = useQuery({
    queryKey: ['store-default-policies'],
    queryFn: getAllStoreDefaultPolicies,
    staleTime: 1000 * 60 * 60, // 1 hour — these rarely change
  })

  function policyFor(store) {
    if (!policyMap || !store?.store_name) return null
    const key = normalizeStoreName(store.store_name)
    return key ? policyMap.get(key) || null : null
  }

  // Reward / membership numbers live in the `rewards` table (one row per
  // store chain). Fetch once and index by normalized store name so each
  // row shows its member # without a per-store round-trip.
  const { data: rewards } = useQuery({
    queryKey: ['rewards'],
    queryFn: getRewards,
    staleTime: 1000 * 60 * 5,
  })

  // Key by storeGroupKey (alias-aware) — a rewards row named "COSTCO
  // WHOLESALE" must match a store row named "Costco"; normalizeStoreName
  // alone wouldn't collapse those variants, storeGroupKey does.
  const rewardMap = (() => {
    const m = new Map()
    for (const r of rewards || []) {
      const key = storeGroupKey(r.store_name)
      if (!key) continue
      const prev = m.get(key)
      // Prefer a real number over a placeholder when a store has both rows.
      if (!prev || (isPlaceholderReward(prev.reward_no) && !isPlaceholderReward(r.reward_no))) {
        m.set(key, r)
      }
    }
    return m
  })()

  function rewardFor(store) {
    if (!store?.store_name) return null
    const key = storeGroupKey(store.store_name)
    return key ? rewardMap.get(key) || null : null
  }

  const del = useMutation({
    mutationFn: deleteStore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
    onError: (err) => toast.error(err.message),
  })
  const confirm = useConfirm()
  const { data: promotions = [], isLoading: offersLoading, error: offersError } = usePromotions({ status: 'active,review', q: offerSearch })
  const updatePromotion = useUpdatePromotion()
  const visibleOffers = currentPromotions(promotions, { source: offerSource, expiry: offerExpiry, type: offerType })
  async function searchMerchantOffers() {
    setSearchingOffers(true); setOfferMessage('')
    try {
      const response = await fetch('/api/promotions/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: offerSearch }) })
      const data = await response.json(); if (!response.ok) throw Error(data.error)
      setOfferMessage(data.message); await qc.invalidateQueries({ queryKey: ['promotions'] })
    } catch (e) { setOfferMessage(e.message) } finally { setSearchingOffers(false) }
  }
  const { data: receipts = [], error: activityError, isLoading: activityLoading } = useQuery({ queryKey: ['store-purchase-activity'], queryFn: () => getReceipts(), staleTime: 5 * 60 * 1000 })
  const activity = new Map()
  const unassignedActivity = new Map()
  for (const receipt of receipts) {
    if (receipt.is_return) continue
    const target = receipt.store_id ? activity : unassignedActivity
    const identity = receipt.store_id || storeGroupKey(receipt.store_name)
    if (!identity) continue
    const previous = target.get(identity) || { count: 0, spend: 0, last: '', unassigned: 0 }
    previous.count++; previous.spend += Number(receipt.total_amount) || 0
    if (!receipt.store_id) previous.unassigned++
    if (receipt.date > previous.last) previous.last = receipt.date
    target.set(identity, previous)
  }

  const filtered = stores.filter(s =>
    s.store_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  )

  const duplicateClusters = findDuplicateClusters(stores)
  const dupIds = new Set(duplicateClusters.flatMap(c => c.map(s => s.id)))

  // Group filtered stores by normalized name. Groups of size > 1 render as accordions.
  const grouped = (() => {
    const m = new Map()
    for (const s of filtered) {
      const key = storeGroupKey(s.store_name) || (s.store_name || '').trim().toLowerCase()
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(s)
    }
    return [...m.entries()].map(([key, list]) => ({
      key,
      display: list[0]?.store_name || 'Unnamed',
      stores: list.sort((a, b) => (a.address || '').localeCompare(b.address || '')),
    })).sort((a, b) => a.display.localeCompare(b.display))
  })()

  const [expandedGroups, setExpandedGroups] = useState(() => new Set())
  function toggleGroup(key) {
    setExpandedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id))
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => allSelected ? new Set() : new Set(filtered.map(s => s.id)))
  }
  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!(await confirm({ title: `Delete ${selected.size} store${selected.size === 1 ? '' : 's'}?`, body: 'Their receipts will be kept but unlinked from the store.', confirmText: 'Delete', danger: true }))) return
    const ids = [...selected]
    const results = await Promise.allSettled(ids.map(id => del.mutateAsync(id)))
    const failures = results.filter(r => r.status === 'rejected')
    setSelected(new Set())
    if (failures.length > 0) {
      const msg = failures[0].reason?.message || 'Delete failed'
      toast.error(`${failures.length} failed — ${msg}`)
    } else {
      toast.success(`Deleted ${ids.length}`)
    }
  }

  return (
    <div className="space-y-5 max-w-[1500px]">
      <FeatureHeader
        expression="happy"
        title="Stores"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/connections"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-guac-line2 text-guac-700 text-sm font-bold hover:bg-guac-50 transition-colors"
            >
              <Link2 size={15} /> Connect retailers
            </Link>
            <span className="text-sm text-gray-400">{stores.length} store{stores.length !== 1 ? 's' : ''}</span>
          </div>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search stores…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length > 0 && (
          <button type="button" onClick={toggleAll} className="btn-secondary text-xs py-1.5">
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        )}
        {selected.size > 0 && (
          <button type="button" onClick={handleDeleteSelected} className="btn-danger text-xs py-1.5">
            <Trash2 size={13} /> Delete {selected.size}
          </button>
        )}
      </div>

      {duplicateClusters.length > 0 && (
        <div className="card border-amber-300 bg-amber-50/60">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="gg-h2 text-amber-900">
              {duplicateClusters.length} duplicate group{duplicateClusters.length === 1 ? '' : 's'} detected
            </h3>
            <span className="text-xs text-amber-700 ml-auto">Matched by name, phone, or address</span>
          </div>
          <div className="space-y-4">
            {duplicateClusters.map((group, i) => (
              <div key={i} className="bg-white rounded-lg border border-amber-200 p-3">
                <p className="text-xs text-amber-700 font-medium mb-2">Group {i + 1} — {group.length} stores</p>
                <div className="space-y-2">
                  {group.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{displayStoreName(s.store_name)}</p>
                        <div className="flex gap-3 text-xs text-gray-500">
                          {s.phone_no && <span><Phone size={10} className="inline mr-0.5" />{s.phone_no}</span>}
                          {s.address && <span className="truncate"><MapPin size={10} className="inline mr-0.5" />{s.address}</span>}
                        </div>
                      </div>
                      <Link href={`/stores/${s.id}`} className="btn-ghost text-xs py-1">View</Link>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!(await confirm({ title: `Delete "${s.store_name}"?`, body: 'Receipts pointing to this store will be unlinked but kept.', confirmText: 'Delete', danger: true }))) return
                          try { await del.mutateAsync(s.id); toast.success('Deleted') }
                          catch (e) { toast.error(e.message) }
                        }}
                        className="btn-ghost text-xs py-1 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div>{isLoading ? (
        <MascotLoading label="Loading stores…" />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-3">
          <LottieAnimation data={emptyListLottie} size={160} fallback="🏬" />
          <p>{stores.length === 0 ? 'No stores yet — they are created automatically when you scan receipts.' : 'No results.'}</p>
        </div>
      ) : (
        <div className="card p-0 divide-y divide-guac-line overflow-hidden">
          <div className="hidden lg:grid grid-cols-[28px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,.8fr)_164px] gap-3 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
            <span /><span>Store</span><span>Location & contact</span><span>Purchases</span><span>Return policy</span><span>Actions</span>
          </div>
          {grouped.map(g => {
            const multiple = g.stores.length > 1
            const open = expandedGroups.has(g.key)
            const aggregate = g.stores.reduce((result, store) => {
              const a = activity.get(store.id)
              if (a) { result.count += a.count; result.spend += a.spend; if (a.last > result.last) result.last = a.last }
              return result
            }, { ...(unassignedActivity.get(g.key) || { count: 0, spend: 0, last: '', unassigned: 0 }) })
            function row(store, summary = false) {
              const a = summary || g.stores.length === 1 ? aggregate : activity.get(store.id)
              const allSelected = summary ? g.stores.every(s => selected.has(s.id)) : selected.has(store.id)
              return <div key={store.id} className={`grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3 lg:grid-cols-[28px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,.8fr)_164px] lg:items-center ${allSelected ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                <label className="flex min-h-11 items-center"><input type="checkbox" checked={allSelected} aria-label={`Select ${summary ? g.display + ' locations' : store.store_name}`} onChange={() => summary ? setSelected(previous => { const next = new Set(previous); g.stores.forEach(s => allSelected ? next.delete(s.id) : next.add(s.id)); return next }) : toggleOne(store.id)} /></label>
                <div className="flex min-w-0 items-center gap-2"><StoreLogo storeName={store.store_name} size={28} /><div className="min-w-0"><Link href={`/stores/${store.id}`} className="break-words font-semibold text-violet-700">{summary ? g.display : displayStoreName(store.store_name)}</Link>{summary && <button type="button" aria-expanded={open} onClick={() => toggleGroup(g.key)} className="flex min-h-11 items-center gap-1 text-xs text-slate-500">{g.stores.length} locations <ChevronDown size={13} /></button>}</div></div>
                <div className="col-start-2 min-w-0 break-words text-xs leading-5 text-slate-500 lg:col-start-auto">{summary ? <span>Multiple locations</span> : <><p>{store.address || 'Address not recorded'}</p>{store.phone_no && <p>Phone: {store.phone_no}</p>}</>}<RewardChip reward={rewardFor(store)} /></div>
                <div className="col-start-2 text-xs leading-5 text-slate-600 lg:col-start-auto">{activityLoading ? 'Loading purchases…' : activityError ? 'Activity unavailable' : a?.count ? <><p>{a.count} {a.count === 1 ? "purchase" : "purchases"} · ${a.spend.toFixed(2)}</p><p>Latest {a.last}</p>{a.unassigned > 0 && <span title="These receipts identify the merchant but do not have a saved store/location ID.">{a.unassigned} location not recorded</span>}</> : 'No recorded purchases'}</div>
                <div className="col-start-2 lg:col-start-auto">{policyFor(store) ? <PolicyChip policy={policyFor(store)} /> : <span className="text-xs text-slate-500">Not recorded</span>}</div>
                <div className="col-start-2 flex flex-wrap items-center gap-3 lg:col-start-auto"><Link href={`/stores/${store.id}`} className="flex min-h-11 items-center whitespace-nowrap text-xs font-semibold text-violet-700">View store →</Link><button type="button" className="min-h-11 text-xs font-semibold text-violet-700 underline" onClick={() => { setOfferSearch(summary ? g.display : displayStoreName(store.store_name)); offersPanel.current?.focus(); offersPanel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }) }}>Offers</button></div>
              </div>
            }
            return <div key={g.key}>{row(g.stores[0], multiple)}{multiple && open && <div className="border-t border-violet-100 bg-slate-50">{g.stores.map(store => row(store))}</div>}</div>
          })}
        </div>
      )}</div>
      <aside ref={offersPanel} tabIndex={-1} aria-label="Store promotions and offers" className="space-y-3 2xl:sticky 2xl:top-5">
        <div className="rounded-2xl border border-violet-200 bg-white p-4"><h2 className="font-bold">Promotions & offers</h2><p className="mt-1 text-sm text-slate-500">Choose Offers on a store or search captured promotions below.</p><Link href="/promotions" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-700">Browse and filter offers →</Link></div>
        <label className="block text-sm">Search captured offers<input className="input mt-1" placeholder="Merchant, product or offer" value={offerSearch} onChange={e => setOfferSearch(e.target.value)} /></label><select aria-label="Store offer source" className="input" value={offerSource} onChange={e => setOfferSource(e.target.value)}><option value="">All sources</option><option value="email">Email</option><option value="web">Web</option><option value="ai">Guac AI</option></select><div className="grid grid-cols-2 gap-2"><select aria-label="Store offer expiration" className="input" value={offerExpiry} onChange={e => setOfferExpiry(e.target.value)}><option value="">All current offers</option><option value="dated">Confirmed end date</option><option value="week">Ends within 7 days</option></select><select aria-label="Store discount type" className="input" value={offerType} onChange={e => setOfferType(e.target.value)}><option value="">All discounts</option><option value="percent">Percentage off</option><option value="amount">Amount off</option><option value="free">Free benefits</option></select></div><button type="button" className="btn-secondary" disabled={searchingOffers || offerSearch.trim().length < 2} onClick={searchMerchantOffers}>{searchingOffers ? "Searching…" : "Search merchant websites"}</button>{offerMessage && <p role="status" className="text-sm text-slate-600">{offerMessage}</p>}{offersLoading && <p className="text-sm text-slate-500">Loading captured offers…</p>}{offersError && <p role="alert" className="text-sm text-rose-700">Offers could not load. <button type="button" className="underline" onClick={() => qc.invalidateQueries({ queryKey: ["promotions"] })}>Retry</button></p>}{visibleOffers.slice(0, 4).map(p => <PromotionCard key={p.id} promotion={p} compact onDismiss={id => updatePromotion.mutate({ id, status: 'dismissed' }, { onError: e => toast.error(e.message) })} onKeep={id => updatePromotion.mutate({ id, status: 'active' }, { onSuccess: () => toast.success('Offer kept in Rewards'), onError: e => toast.error(e.message) })}/>)}
        {!offersLoading && !offersError && !visibleOffers.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">Search a store to find matching captured offers. New promotional emails will appear here automatically after review.</div>}
      </aside></div>
    </div>
  )
}

// Compact membership / reward-number chip rendered on each store row.
// Only REAL numbers surface — placeholder "GG-XXXXXXXX" tokens are an
// internal stand-in and stay hidden until a receipt re-parse captures
// the real member # (e.g. Costco "111968768028").
function RewardChip({ reward, className = '' }) {
  if (!reward || isPlaceholderReward(reward.reward_no)) return null
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#F2F4EF] text-guac-faint ${className}`}
      title={`Member / reward number: ${reward.reward_no}`}
    >
      Member: {reward.reward_no}
    </span>
  )
}

// Compact return-policy chip rendered on each row of the stores list.
// Tone reflects friendliness of the policy:
//   emerald = generous (lifetime / 90d+)
//   sky     = standard (30-89d)
//   amber   = tight (<30d, still eligible)
//   gray    = non-returnable (e.g. restaurants, prepared food)
function PolicyChip({ policy, className = '' }) {
  if (!policy) return null
  const days = policy.days
  const eligible = policy.eligible !== false
  const label = !eligible
    ? 'Final sale'
    : days == null
      ? 'Lifetime ∞'
      : `${days}d return`
  const tone = !eligible
    ? 'bg-[#FBEFD2] text-[#92590A]'
    : 'bg-[#E9F5DD] text-[#1F8A3D]'
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-[5px] rounded-full ${tone} ${className}`}
      title={policy.details ? `${policy.details} — click row for full policy + citation` : 'Tap row for full policy + citation'}
    >
      <Clock size={12} /> {label}
    </span>
  )
}
