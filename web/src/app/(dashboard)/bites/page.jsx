'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, ThumbsUp, ThumbsDown, ExternalLink, Utensils, ShoppingCart } from 'lucide-react'
import { getBites, setItemValidation, addToShoppingList, SHOPPING_LISTS, SHOPPING_LIST_META } from '../../../lib/db'
import { useShoppingList } from '../../../hooks/useShopping'
import GuacMascot from '../../../components/GuacMascot'

export default function BitesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | liked | disliked | unrated

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['bites'],
    queryFn: getBites,
    staleTime: 1000 * 60,
  })

  // Smashlist counts so we can show per-list chips
  const { data: smashlistItems = [] } = useShoppingList()
  const listCounts = useMemo(() => {
    const m = {}
    for (const n of SHOPPING_LISTS) m[n] = 0
    for (const i of smashlistItems) {
      const n = i.list_name || 'Pantry'
      m[n] = (m[n] || 0) + 1
    }
    return m
  }, [smashlistItems])
  const [reorderTarget, setReorderTarget] = useState('Cravings')  // default destination for one-tap reorders

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    let list = rows
    if (filter === 'liked')    list = list.filter(r => r.rating === 5)
    if (filter === 'disliked') list = list.filter(r => r.rating === 1)
    if (filter === 'unrated')  list = list.filter(r => r.rating == null)
    if (s) list = list.filter(r =>
      (r.item_name || '').toLowerCase().includes(s) ||
      (r.receipts?.store_name || '').toLowerCase().includes(s)
    )
    return list
  }, [rows, search, filter])

  const liked    = rows.filter(r => r.rating === 5).length
  const disliked = rows.filter(r => r.rating === 1).length
  const unrated  = rows.filter(r => r.rating == null).length

  // Group by restaurant
  const byRestaurant = useMemo(() => {
    const m = new Map()
    for (const r of filtered) {
      const store = r.receipts?.store_name || 'Unknown'
      if (!m.has(store)) m.set(store, { store, store_id: r.receipts?.store_id, items: [] })
      m.get(store).items.push(r)
    }
    return [...m.values()].sort((a, b) => b.items.length - a.items.length)
  }, [filtered])

  const rate = useMutation({
    mutationFn: ({ id, rating, comment }) => setItemValidation(id, { rating, validation_tags: [], validation_comment: comment || null }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['bites'] })
      qc.invalidateQueries({ queryKey: ['receipts', vars.receiptId] })
    },
    onError: err => toast.error(err.message),
  })

  async function handleAddToList(dish, listName) {
    try {
      await addToShoppingList({
        item_name: dish.item_name,
        qty: 1,
        price: parseFloat(dish.price || 0) || null,
        store_name_id: dish.receipts?.store_id || null,
        list_name: listName,
      })
      toast.success(`Reorder "${dish.item_name}" added to ${listName} 🛒`)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-5 max-w-7xl font-sans">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="transform -rotate-12 origin-bottom">
          <GuacMascot expression="sitting" size={70} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="page-title">Bites</h1>
          <p className="text-sm text-gray-500">Every dish you&apos;ve tried — like it or pass on it</p>
        </div>
        <span className="text-sm text-gray-500">
          <span className="font-bold text-emerald-700">{rows.length}</span> bites
        </span>
      </div>

      {/* Stats + filter chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FilterChip active={filter === 'all'}      onClick={() => setFilter('all')}      label="All"      value={rows.length} tone="gray" emoji="🌈" />
        <FilterChip active={filter === 'liked'}    onClick={() => setFilter('liked')}    label="Liked"    value={liked}       tone="emerald" emoji="👍" />
        <FilterChip active={filter === 'disliked'} onClick={() => setFilter('disliked')} label="Pass"     value={disliked}    tone="rose" emoji="👎" />
        <FilterChip active={filter === 'unrated'}  onClick={() => setFilter('unrated')}  label="Untried"  value={unrated}     tone="amber" emoji="❓" />
      </div>

      {/* Smashlist destination chips — tap one to set as the default for one-tap reorders */}
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart size={12} className="text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reorder destination</span>
          <span className="text-[10px] text-gray-400">— tap a list, then tap the 🥑 cart on any dish to send it there</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SHOPPING_LISTS.map(name => {
            const meta = SHOPPING_LIST_META[name] || {}
            return (
              <SmashlistChip
                key={name}
                active={reorderTarget === name}
                onClick={() => setReorderTarget(name)}
                emoji={meta.emoji}
                label={name}
                count={listCounts[name] || 0}
                tone={meta.color}
              />
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search dish or restaurant…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Restaurants → dishes */}
      {isLoading ? (
        <div className="card py-12 text-center text-gray-400">Loading bites…</div>
      ) : filtered.length === 0 ? (
        <div className="card py-10 text-center flex flex-col items-center gap-3">
          <GuacMascot expression="relaxing" size={140} />
          <p className="text-gray-500 max-w-md">
            {rows.length === 0 ? (
              <>No restaurant receipts yet. Drop one at <Link href="/receipts" className="text-emerald-700 font-semibold hover:underline">/receipts</Link> — Guac-AI tags it as <span className="font-semibold">🍽️ Eats</span> and items land here.</>
            ) : (
              'Nothing matches the filter.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {byRestaurant.map(({ store, store_id, items }) => (
            <div key={store} className="card p-0 overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils size={14} className="text-amber-600" />
                  {store_id ? (
                    <Link href={`/stores/${store_id}`} className="font-bold text-amber-900 hover:underline">{store}</Link>
                  ) : (
                    <span className="font-bold text-amber-900">{store}</span>
                  )}
                  <span className="text-xs text-amber-700/70">{items.length} dish{items.length === 1 ? '' : 'es'}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map(r => {
                  const liked = r.rating === 5
                  const disliked = r.rating === 1
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/40">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${disliked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {r.item_name}
                        </p>
                        <div className="flex gap-3 text-[11px] text-gray-400 mt-0.5">
                          <span>{r.qty}×</span>
                          <span>${parseFloat(r.price || 0).toFixed(2)}</span>
                          <span>{r.receipts?.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => rate.mutate({ id: r.id, receiptId: r.receipt_id, rating: 5 })}
                          disabled={rate.isPending}
                          title="Liked it"
                          className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-110 active:scale-95 ring-2 ${
                            liked
                              ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white ring-white shadow-lg scale-105'
                              : 'bg-white text-emerald-600 ring-emerald-100 hover:ring-emerald-300'
                          }`}>
                          <ThumbsUp size={15} className="drop-shadow-sm" fill={liked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => rate.mutate({ id: r.id, receiptId: r.receipt_id, rating: 1 })}
                          disabled={rate.isPending}
                          title="Not for me"
                          className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-110 active:scale-95 ring-2 ${
                            disliked
                              ? 'bg-gradient-to-br from-rose-400 to-red-600 text-white ring-white shadow-lg scale-105'
                              : 'bg-white text-rose-600 ring-rose-100 hover:ring-rose-300'
                          }`}>
                          <ThumbsDown size={15} className="drop-shadow-sm" fill={disliked ? 'currentColor' : 'none'} />
                        </button>
                        {/* Reorder → quick-add to current target list, or pick from menu */}
                        <ReorderMenu dish={r} target={reorderTarget} onPick={(list) => handleAddToList(r, list)} />
                        <Link
                          href={`/receipts/${r.receipt_id}`}
                          title="View receipt"
                          className="ml-1 text-gray-400 hover:text-emerald-700">
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CHIP_TONES = {
  gray:    { active: 'from-gray-400 to-gray-600',       text: 'text-gray-700' },
  emerald: { active: 'from-emerald-400 to-green-600',   text: 'text-emerald-800' },
  rose:    { active: 'from-rose-400 to-red-600',        text: 'text-rose-700' },
  amber:   { active: 'from-amber-300 to-orange-500',    text: 'text-amber-800' },
}

// Cart button (one-tap = current target) + small caret to switch lists.
function ReorderMenu({ dish, target, onPick }) {
  const [open, setOpen] = useState(false)
  const meta = SHOPPING_LIST_META[target] || {}
  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => onPick(target)}
        title={`Reorder to ${target}`}
        aria-label={`Reorder to ${target}`}
        className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center ring-2 ring-white">
        <span className="absolute -top-1 -right-1 text-[9px]">{meta.emoji || '🥑'}</span>
        <ShoppingCart size={14} className="drop-shadow-sm" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Choose another list"
        aria-label="Choose another list"
        className="ml-0.5 w-5 h-10 text-gray-400 hover:text-emerald-700 text-[10px]">
        ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-2xl shadow-xl border border-emerald-100 py-2 w-52">
            <p className="px-3 pb-1 text-[10px] uppercase tracking-wider font-bold text-gray-500">Reorder to…</p>
            {SHOPPING_LISTS.map(name => {
              const m = SHOPPING_LIST_META[name] || {}
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onPick(name); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50 ${target === name ? 'bg-emerald-50/60' : ''}`}>
                  <span className="text-base">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{name}</p>
                    <p className="text-[10px] text-gray-400">{m.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const SMASHLIST_TONE = {
  emerald: 'from-emerald-400 to-green-600',
  rose:    'from-rose-400 to-red-600',
  amber:   'from-amber-300 to-orange-500',
  lime:    'from-lime-300 to-emerald-500',
}

function SmashlistChip({ active, onClick, emoji, label, count, tone }) {
  const grad = SMASHLIST_TONE[tone] || SMASHLIST_TONE.emerald
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 font-semibold text-xs transition-all hover:scale-[1.04] ${
        active
          ? `bg-gradient-to-br ${grad} text-white border-white shadow-lg`
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

function FilterChip({ active, onClick, label, value, tone, emoji }) {
  const t = CHIP_TONES[tone] || CHIP_TONES.gray
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-3 border-2 transition-all text-left ${
        active
          ? `bg-gradient-to-br ${t.active} text-white border-white shadow-md`
          : 'bg-white border-gray-100 hover:border-emerald-200 shadow-sm'
      }`}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{emoji}</span>
        <span className={`text-xl font-bold tabular-nums font-sans ${active ? 'text-white' : t.text}`}>{value}</span>
      </div>
      <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 font-sans ${active ? 'text-white/80' : 'text-gray-500'}`}>{label}</p>
    </button>
  )
}
