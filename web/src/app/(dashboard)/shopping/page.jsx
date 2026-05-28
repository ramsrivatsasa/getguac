'use client'
import { useState, useMemo } from 'react'
import { useShoppingList, useUpsertShoppingItem, useDeleteShoppingItem } from '../../../hooks/useShopping'
import { SHOPPING_LISTS, SHOPPING_LIST_META } from '../../../lib/db'
import toast from 'react-hot-toast'
import { Trash2, CheckCircle, Circle, X, Sparkles, Wand2, Zap, Store as StoreIcon, MapPin, Star, Share2, ShoppingCart } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { groupPredictionsByStore } from '../../../lib/prediction-feedback'
import { displayStoreName } from '../../../lib/store-name-normalize'

const EMPTY = { sku: '', item_name: '', order_date: '', qty: '1', price: '', store_name_id: '', comments: '', frequency: 'Monthly', list_name: 'Pantry', approved: false, sent_to_store: false }

// Urgency math for a Buy Again row. Returns null when the item lacks
// the predicted_* columns (a hand-curated row that slipped in won't
// have them). When set:
//   ratio        — daysSince / avgCadence
//   isOverdue    — ratio >= 1.0 (past typical reorder point)
//   isUrgent     — ratio >= 1.2 (gets the ⭐ Restock badge)
//   runsOutISO   — predicted_last_purchase + avgCadence (YYYY-MM-DD)
//   daysToRunOut — signed; negative = past, positive = future
function urgencyForItem(item) {
  const cadence = Number(item.predicted_avg_cadence_days || 0)
  const lastIso = item.predicted_last_purchase_date
  if (!cadence || !lastIso) return null
  const lastMs = new Date(lastIso + 'T00:00:00Z').getTime()
  const todayMs = Date.now()
  const daysSince = Math.floor((todayMs - lastMs) / 86400000)
  const ratio = daysSince / cadence
  const runsOutMs = lastMs + cadence * 86400000
  const daysToRunOut = Math.round((runsOutMs - todayMs) / 86400000)
  return {
    ratio,
    runsOutISO: new Date(runsOutMs).toISOString().slice(0, 10),
    daysToRunOut,
    isOverdue: ratio >= 1.0,
    isUrgent: ratio >= 1.2,
  }
}

// Human-friendly "runs out" label. Negative days = already past.
function formatRunsOut(daysToRunOut, isoDate) {
  if (daysToRunOut == null) return ''
  if (daysToRunOut < 0) return `out ${-daysToRunOut}d ago`
  if (daysToRunOut === 0) return 'today'
  if (daysToRunOut === 1) return 'tomorrow'
  if (daysToRunOut < 7) return `in ${daysToRunOut}d`
  const d = new Date(isoDate + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const LIST_TONE = {
  emerald: 'from-emerald-400 to-green-600',
  rose:    'from-rose-400 to-red-600',
  amber:   'from-amber-300 to-orange-500',
  lime:    'from-lime-300 to-emerald-500',
}

export default function ShoppingPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [activeList, setActiveList] = useState('all')
  const [predicting, setPredicting] = useState(false)
  const [embedding, setEmbedding] = useState(false)

  const { data: items = [], isLoading, refetch } = useShoppingList()
  const upsert = useUpsertShoppingItem()
  const del = useDeleteShoppingItem()
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  function handleSave(e) {
    e.preventDefault()
    const list_name = form.list_name || (activeList !== 'all' ? activeList : 'Pantry')
    upsert.mutate({ ...form, list_name }, {
      onSuccess: () => { toast.success(`Added to ${list_name} 🛒`); setForm(EMPTY); setShowForm(false) },
      onError: err => toast.error(err.message),
    })
  }

  function toggleApproved(item) {
    upsert.mutate({ ...item, approved: !item.approved }, {
      onSuccess: () => {
        if (item.approved) {
          // Was approved → now back to "pending"; goes back into Buy Again.
          toast.success('Moved back to Buy Again')
        } else {
          // Was a Buy Again suggestion → now on the curated Smashlist.
          const list = item.list_name || 'Pantry'
          toast.success(`Added to ${list} ✓`)
        }
      }
    })
  }

  // Build a human-friendly, dated, grouped text representation of the
  // current Smashlist (curated + Buy Again together). Used by both the
  // native share sheet on phones AND the clipboard fallback on desktop.
  function buildShareText(items, activeListLabel = 'all') {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    const header = activeListLabel === 'all'
      ? `🥑 GetGuac Smashlist · ${today}`
      : `🥑 GetGuac ${activeListLabel} · ${today}`
    if (!items.length) return `${header}\n\n(empty list)`
    // Group by list_name so each section is its own header.
    const byList = new Map()
    for (const it of items) {
      const name = it.list_name || 'Pantry'
      if (!byList.has(name)) byList.set(name, [])
      byList.get(name).push(it)
    }
    const sections = []
    for (const [name, rows] of byList) {
      const meta = SHOPPING_LIST_META[name] || {}
      const emoji = meta.emoji || '🛒'
      sections.push(`\n${emoji} ${name.toUpperCase()}`)
      for (const it of rows) {
        const qty = it.qty && it.qty !== 1 ? ` (×${it.qty})` : ''
        sections.push(`  □ ${it.item_name}${qty}`)
      }
    }
    return `${header}${sections.join('\n')}\n\n— shared from getguac.app`
  }

  async function shareSmashlist(items, listLabel = 'all') {
    const text = buildShareText(items, listLabel)
    const shareData = {
      title: 'My GetGuac Smashlist',
      text,
    }
    // Phones (Chrome/Safari iOS+Android) expose navigator.share — opens
    // the native share sheet with WhatsApp, Messages, Mail, etc.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        return
      } catch (e) {
        // User cancelled or share denied — fall through to clipboard.
        if (e?.name !== 'AbortError') console.warn('[share] failed:', e.message)
      }
    }
    // Desktop fallback: copy the dated list to clipboard so the user can
    // paste it anywhere (Slack, email, message).
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Smashlist copied to clipboard — paste anywhere 🛒')
    } catch (e) {
      toast.error('Copy failed: ' + e.message)
    }
  }

  async function dismissPredicted(item) {
    try {
      const res = await fetch('/api/smashlist/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Dismiss failed')
      toast.success(`Won't suggest "${item.item_name}" again`)
      refetch()
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Predict button does BOTH steps the right way round:
  //   1. backfill embeddings for any unembedded items (so the similarity
  //      merge in step 2 actually works — "KS Whole Milk" + "GV 2% Milk"
  //      collapse into one cadence signal)
  //   2. run the smashlist predictor
  // No need for a separate "Embed" button — the user shouldn't have to
  // know about the embedding step.
  async function predictNow() {
    setPredicting(true)
    try {
      // STEP 1: embed unembedded items. One backfill call processes up
      // to 30 batches × 50 = 1500 items; for accounts bigger than that
      // we tell the user the next click picks up where we left off
      // instead of blocking the whole flow. The predictor still works
      // on partial embeddings — it just won't merge variants that
      // haven't been embedded yet.
      setEmbedding(true)
      try {
        const eres = await fetch('/api/embeddings/backfill', { method: 'POST' })
        const ejson = await eres.json().catch(() => ({}))
        if (eres.ok && ejson.embedded > 0) {
          if (ejson.done) {
            toast.success(`Embedded ${ejson.embedded} items 🧠`)
          } else {
            toast(`Embedded ${ejson.embedded}, ${ejson.remaining} left — running predictor on what's ready`, { icon: '⏳' })
          }
        }
        // If embedding fails (rate limit, missing migration, etc.) we
        // press on — the predictor still works on names alone, just
        // with lower merge quality.
      } catch (_) { /* fall through to predict */ }
      finally { setEmbedding(false) }

      // STEP 2: run the predictor.
      const res = await fetch('/api/smashlist/predict', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Predict failed')
      const { inserted = 0, predictions = 0, aliases_added = 0 } = json
      toast.success(
        inserted > 0
          ? `${inserted} item${inserted === 1 ? '' : 's'} added to Buy Again 🛒`
          : predictions > 0
            ? `${predictions} already in Buy Again — scroll up`
            : 'Nothing due to buy again yet'
      )
      if (aliases_added > 0) toast.success(`${aliases_added} item${aliases_added === 1 ? '' : 's'} grouped together`)
      refetch()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setPredicting(false)
    }
  }

  // Split into suggestions (predicted + not approved) vs the user's list.
  // Predicted items the user has approved get treated as regular list items.
  const { suggestions, ownList } = useMemo(() => {
    const sug = []
    const own = []
    for (const it of items) {
      if (it.predicted && !it.approved) sug.push(it)
      else own.push(it)
    }
    return { suggestions: sug, ownList: own }
  }, [items])

  const filteredOwn = useMemo(() => {
    if (activeList === 'all') return ownList
    return ownList.filter(i => (i.list_name || 'Pantry') === activeList)
  }, [ownList, activeList])

  const filteredSuggestions = useMemo(() => {
    const filtered = activeList === 'all'
      ? suggestions
      : suggestions.filter(i => (i.list_name || 'Pantry') === activeList)
    // Sort by urgency descending — most overdue at the top so the
    // user sees what's actually running out first. Rows without
    // cadence metadata fall to the bottom.
    return [...filtered].sort((a, b) => {
      const ua = urgencyForItem(a)?.ratio ?? -Infinity
      const ub = urgencyForItem(b)?.ratio ?? -Infinity
      return ub - ua
    })
  }, [suggestions, activeList])

  // Errand Plan — group predictions by store so the user can plan "one
  // trip to Costco for these 4 items" instead of N separate trips.
  // Uses the central groupPredictionsByStore helper in
  // lib/prediction-feedback so future surfaces (mobile dashboard,
  // weekly digest email) get the same shape.
  const errandPlan = useMemo(() => groupPredictionsByStore(filteredSuggestions), [filteredSuggestions])

  // Tab badge counts include BOTH the user's curated rows AND the
  // Buy Again suggestions sitting in that list, because users were
  // seeing "Pantry 0" next to a Pantry tab packed with 12 Buy Again
  // items. The count should answer "how many things are on this
  // list?" — suggestions count too.
  const counts = useMemo(() => {
    const total = ownList.length + suggestions.length
    const m = { all: total }
    for (const n of SHOPPING_LISTS) m[n] = 0
    for (const i of ownList) {
      const n = i.list_name || 'Pantry'
      m[n] = (m[n] || 0) + 1
    }
    for (const i of suggestions) {
      const n = i.list_name || 'Pantry'
      m[n] = (m[n] || 0) + 1
    }
    return m
  }, [ownList, suggestions])

  return (
    <div className="space-y-5 max-w-7xl font-sans">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Smashlist</h1>
          <p className="text-sm text-gray-500">Stocked, themed, ready to grab</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={predictNow}
            disabled={predicting}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
            title="Find items you usually buy that are due for a restock"
          >
            <Wand2 size={16} /> {
              embedding ? 'Embedding…' :
              predicting ? 'Finding…' :
              'Buy Again'
            }
          </button>
          <button
            onClick={() => {
              // Share the currently-visible items (current tab's ownList +
              // its Buy Again suggestions) as a dated, grouped text block.
              const visible = [...filteredOwn, ...filteredSuggestions]
              shareSmashlist(visible, activeList === 'all' ? 'all' : activeList)
            }}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
            title="Share this list — phone opens the native share sheet, desktop copies to clipboard"
          >
            <Share2 size={16} /> Share
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
            <GuacMascot expression="happy" size={22} /> Add Item
          </button>
        </div>
      </div>

      {/* List-name tabs */}
      <div className="flex flex-wrap gap-2">
        <ListTab
          active={activeList === 'all'}
          onClick={() => setActiveList('all')}
          emoji="🌈" label="All" count={counts.all} tone="emerald"
        />
        {SHOPPING_LISTS.map(name => {
          const meta = SHOPPING_LIST_META[name] || {}
          return (
            <ListTab
              key={name}
              active={activeList === name}
              onClick={() => setActiveList(name)}
              emoji={meta.emoji}
              label={name}
              count={counts[name] || 0}
              tone={meta.color}
              desc={meta.desc}
            />
          )
        })}
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="font-semibold">Add Item</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="label">List</label>
                <select className="input font-sans" value={form.list_name || (activeList !== 'all' ? activeList : 'Pantry')} onChange={s('list_name')}>
                  {SHOPPING_LISTS.map(n => <option key={n} value={n}>{SHOPPING_LIST_META[n]?.emoji} {n}</option>)}
                </select>
              </div>
              <div><label className="label">Item Name*</label><input required className="input" value={form.item_name} onChange={s('item_name')} /></div>
              <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={s('sku')} /></div>
              <div><label className="label">Qty</label><input type="number" className="input" value={form.qty} onChange={s('qty')} /></div>
              <div><label className="label">Price ($)</label><input type="number" step="0.01" className="input" value={form.price} onChange={s('price')} /></div>
              <div><label className="label">Store</label><input className="input" value={form.store_name_id} onChange={s('store_name_id')} /></div>
              <div>
                <label className="label">Frequency</label>
                <select className="input font-sans" value={form.frequency} onChange={s('frequency')}>
                  <option>Monthly</option><option>Weekly</option><option>Biweekly</option>
                </select>
              </div>
              <div><label className="label">Comments</label><input className="input" value={form.comments} onChange={s('comments')} /></div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={upsert.isPending} className="btn-primary">{upsert.isPending ? 'Saving…' : 'Add'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Errand Plan — predictions grouped by store. Only renders when
          there are 2+ stores with predictions (1 store doesn't need a
          "plan"). Click-through filters the Smashlist to that store. */}
      {errandPlan.length >= 2 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-emerald-700" />
            <h2 className="font-semibold text-gray-800">Errand plan</h2>
            <span className="text-xs text-gray-500">
              {errandPlan.length} stores · {filteredSuggestions.length} items · combine the trip
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {errandPlan.map(group => {
              const storeName = group.items[0]?.store?.store_name
              const display = storeName ? displayStoreName(storeName) : 'NO STORE TAGGED'
              return (
                <div key={group.storeId || 'nostore'} className="card border-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <StoreIcon size={15} className="text-emerald-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate text-sm">{display}</p>
                      <p className="text-[11px] text-emerald-700/80">
                        {group.itemCount} item{group.itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-0.5 ml-1">
                    {group.items.slice(0, 5).map(it => (
                      <li key={it.id} className="truncate">• {it.item_name}</li>
                    ))}
                    {group.items.length > 5 && (
                      <li className="text-[10px] text-gray-400">+{group.items.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Buy Again section — items the predictor thinks are due for a
          restock. Renders below the Errand Plan, above the curated list,
          so it's the first thing the user sees inside the Smashlist tabs. */}
      {filteredSuggestions.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-500" />
            <h2 className="font-semibold text-gray-800">Buy Again</h2>
            <span className="text-xs text-gray-500">Items you usually buy that look due for a restock. ✓ to add, ✕ to hide.</span>
          </div>
          <div className="card p-0 overflow-hidden border-violet-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-violet-50/50 border-b text-xs text-violet-700 uppercase tracking-wide">
                  <tr>{['List','Item','Why','Store','Qty','Price','Actions'].map(h =>
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  )}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSuggestions.map(item => {
                    const meta = SHOPPING_LIST_META[item.list_name || 'Pantry'] || {}
                    const u = urgencyForItem(item)
                    const storeName = item.store?.store_name ? displayStoreName(item.store.store_name) : ''
                    // External price-comparison link. We don't host a paid
                    // price API yet, but a Google Shopping search ("buy <item>
                    // best price") is one tap away and free. Future surface
                    // can swap in the real /steals AI price hunt.
                    const priceSearchUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.item_name + ' best price')}`
                    return (
                      <tr key={item.id} className="hover:bg-violet-50/30">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                            {meta.emoji} {item.list_name || 'Pantry'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {u?.isUrgent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                                <Star size={10} className="fill-rose-500 text-rose-500" /> Restock
                              </span>
                            )}
                            {u?.isOverdue && !u.isUrgent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Due now
                              </span>
                            )}
                            <span className="font-medium">{item.item_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                          {u ? (
                            <div className="space-y-0.5">
                              <div className={u.isOverdue ? 'text-rose-700 font-semibold' : 'text-gray-700'}>
                                Runs out {formatRunsOut(u.daysToRunOut, u.runsOutISO)}
                              </div>
                              <div className="text-[10px] text-gray-400">Bought every {Math.round(item.predicted_avg_cadence_days)}d</div>
                            </div>
                          ) : (item.predicted_reason || '—')}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {storeName ? (
                            <span className="inline-flex items-center gap-1">
                              <StoreIcon size={12} className="text-gray-400" />
                              {storeName}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">{item.qty}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{item.price ? `$${item.price}` : '—'}</span>
                            <a
                              href={priceSearchUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Search the web for the best current price"
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline whitespace-nowrap"
                            >
                              best price ↗
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleApproved(item)}
                              className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium inline-flex items-center gap-1"
                              title="Add to your Smashlist"
                            >
                              <ShoppingCart size={12} /> Add to Smashlist
                            </button>
                            <button
                              onClick={() => dismissPredicted(item)}
                              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium inline-flex items-center gap-1"
                              title="Never suggest this again"
                            >
                              <X size={12} /> Dismiss
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Your Smashlist — the items the user has actually committed to
          buying. Renders below the Buy Again strip, always with a
          visible header so the user can find where Approved items go. */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-emerald-700" />
          <h2 className="font-semibold text-gray-800">Your Smashlist</h2>
          <span className="text-xs text-gray-500">
            {filteredOwn.length} item{filteredOwn.length === 1 ? '' : 's'} ready to grab
          </span>
        </div>
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">Loading…</div>
          ) : filteredOwn.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <GuacMascot expression="relaxing" size={140} />
              <p className="text-gray-500 max-w-sm">
                {activeList === 'all'
                  ? (filteredSuggestions.length > 0
                      ? 'Nothing on your Smashlist yet — tap "Add to Smashlist" on any Buy Again row above to start.'
                      : 'Smashlist is empty. Drop items from receipts or pick from your Stash.')
                  : `Nothing in ${activeList} yet.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                  <tr>{['List','Item','SKU','Store','Qty','Price','Frequency','Status','Actions'].map(h =>
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  )}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOwn.map(item => {
                    const meta = SHOPPING_LIST_META[item.list_name || 'Pantry'] || {}
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                            {meta.emoji} {item.list_name || 'Pantry'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.item_name}</span>
                            {item.predicted && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700"
                                title={item.predicted_reason || 'Predicted from purchase history'}>
                                <Sparkles size={10} /> Predicted
                              </span>
                            )}
                          </div>
                          {item.predicted && item.predicted_reason && (
                            <div className="text-[11px] text-gray-400 mt-0.5">{item.predicted_reason}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{item.sku || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{item.store?.store_name ? displayStoreName(item.store.store_name) : '—'}</td>
                        <td className="px-4 py-3">{item.qty}</td>
                        <td className="px-4 py-3">{item.price ? `$${item.price}` : '—'}</td>
                        <td className="px-4 py-3"><span className="badge-gray">{item.frequency}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleApproved(item)} className="flex items-center gap-1 text-xs font-medium">
                            {item.approved
                              ? <><CheckCircle size={14} className="text-green-500" /> <span className="text-green-600">Approved</span></>
                              : <><Circle size={14} className="text-yellow-400" /> <span className="text-yellow-600">Pending</span></>
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => del.mutate(item.id, { onSuccess: () => toast.success('Removed') })}
                            className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ListTab({ active, onClick, emoji, label, count, tone, desc }) {
  const grad = LIST_TONE[tone] || LIST_TONE.emerald
  return (
    <button
      type="button"
      onClick={onClick}
      title={desc}
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
