'use client'
import { useState, useMemo, useCallback } from 'react'
import { useShoppingList, useUpsertShoppingItem, useDeleteShoppingItem } from '../../../hooks/useShopping'
import { SHOPPING_LISTS, SHOPPING_LIST_META } from '../../../lib/db'
import toast from 'react-hot-toast'
import { Trash2, CheckCircle, Circle, X, Sparkles, Wand2, Zap, Store as StoreIcon, MapPin, Star, Share2, ShoppingCart, BadgeDollarSign, ChevronDown, ChevronRight, MessageCircle, Phone, Mail, Copy } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { groupPredictionsByStore } from '../../../lib/prediction-feedback'
import { displayStoreName } from '../../../lib/store-name-normalize'
import { createClient } from '../../../lib/supabase/client'
import { StoreList } from '../../../components/StoreList'

// Same tone palette as /stash so Buy Again cards visually rhyme with
// the Stash grid. Maps the per-Smashlist color (Pantry=emerald,
// Cravings=rose, Snack Stack=amber, Grub & Grab=lime).
const TONE_TINT = {
  emerald: { from: 'from-emerald-50', to: 'to-green-100',   ring: 'ring-emerald-200', text: 'text-emerald-900', accent: 'bg-emerald-500' },
  rose:    { from: 'from-rose-50',    to: 'to-red-100',     ring: 'ring-rose-200',    text: 'text-rose-900',    accent: 'bg-rose-500' },
  amber:   { from: 'from-amber-50',   to: 'to-yellow-100',  ring: 'ring-amber-200',   text: 'text-amber-900',   accent: 'bg-amber-500' },
  lime:    { from: 'from-lime-50',    to: 'to-emerald-100', ring: 'ring-lime-200',    text: 'text-lime-900',    accent: 'bg-lime-500' },
  gray:    { from: 'from-gray-50',    to: 'to-gray-100',    ring: 'ring-gray-200',    text: 'text-gray-900',    accent: 'bg-gray-500' },
}

// Items the user manually adds default to approved=true ("ready to grab")
// — if they took the trouble to add it, they're committing to buying it.
// Only predictor-generated suggestions live in the approved=false state
// (where they show up in the Buy Again strip until the user taps the cart).
const EMPTY = { sku: '', item_name: '', order_date: '', qty: '1', price: '', store_name_id: '', comments: '', frequency: 'Monthly', list_name: 'Pantry', approved: true, sent_to_store: false }

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

// Human-friendly restock label. Negative days = already past the
// typical reorder point, so we say "Low in stock" instead of the
// clinical "out 5d ago" phrasing.
function formatRunsOut(daysToRunOut, isoDate) {
  if (daysToRunOut == null) return ''
  if (daysToRunOut < 0) return 'Low in stock'
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
  // 'list' (default) groups by Smashlist bucket; 'store' groups by
  // store name so the curated list reads as a per-merchant trip plan.
  const [viewMode, setViewMode] = useState('list')

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
    // Group by STORE so the recipient can plan one stop per merchant
    // ("here's everything at Costco, here's everything at Walmart").
    // Items without a known store fall into a "🛒 ANY STORE" bucket
    // so they're not dropped from the share.
    const byStore = new Map()
    for (const it of items) {
      const key = it.store?.store_name
        ? displayStoreName(it.store.store_name)
        : 'Any store'
      if (!byStore.has(key)) byStore.set(key, [])
      byStore.get(key).push(it)
    }
    const sections = []
    for (const [storeName, rows] of byStore) {
      const emoji = storeName === 'Any store' ? '🛒' : '📍'
      sections.push(`\n${emoji} ${storeName.toUpperCase()}`)
      for (const it of rows) {
        const qty = it.qty && it.qty !== 1 ? ` (×${it.qty})` : ''
        const listTag = it.list_name && it.list_name !== 'Pantry' ? ` · ${it.list_name}` : ''
        sections.push(`  □ ${it.item_name}${qty}${listTag}`)
      }
    }
    return `${header}${sections.join('\n')}\n\n— shared from getguac.app`
  }

  // Direct share-channel handlers — bypass the native share sheet so
  // the user picks WhatsApp / Messages / Mail without a second tap.
  // Each opens a URL the system already knows how to route.
  function shareViaWhatsApp(text) {
    // wa.me works on web, Android, and iOS; opens the WhatsApp app
    // pre-filled when installed, otherwise the WhatsApp web client.
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }
  function shareViaSMS(text) {
    // sms: URI scheme works on mobile (opens Messages); on desktop most
    // browsers do nothing, so we fall back to clipboard.
    const isPhone = /iPhone|iPad|Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
    if (isPhone) {
      // iOS uses & for the body separator; Android uses ?body=. The
      // ?body= form is widely supported on iOS too, so use it.
      window.location.href = `sms:?body=${encodeURIComponent(text)}`
    } else {
      navigator.clipboard.writeText(text).then(
        () => toast.success('SMS not supported on desktop — copied so you can paste'),
        () => toast.error('Copy failed'),
      )
    }
  }
  function shareViaEmail(text) {
    const subject = 'My GetGuac Smashlist'
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
  }
  function shareViaClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied — paste anywhere 🛒'),
      (e) => toast.error('Copy failed: ' + e.message),
    )
  }
  // Original native share sheet — kept as the "More" affordance for
  // surfaces the explicit channels can't cover (Slack, Telegram, etc).
  async function shareNative(text) {
    if (typeof navigator?.share === 'function') {
      try { await navigator.share({ title: 'My GetGuac Smashlist', text }); return }
      catch (e) { if (e?.name !== 'AbortError') console.warn('[share] native failed:', e.message) }
    }
    shareViaClipboard(text)
  }
  // Convenience used by the Share button to fall through to native on
  // phones, clipboard on desktop. Kept for keyboard-tab speed.
  async function shareSmashlist(items, listLabel = 'all') {
    shareNative(buildShareText(items, listLabel))
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
  // Bulk-approve every Buy Again suggestion in one click. The criteria
  // controls which store_name_id we record on each row — 'cheapest'
  // picks the user's historical min-price store, 'frequent' picks the
  // most-used store, 'asis' keeps whatever the predictor wrote.
  //
  // Note: the predictor itself does NOT cost AI (just cosine math on
  // already-embedded vectors). The cron runs it nightly at 06:00 UTC
  // for every active user, so the suggestions visible here are at
  // most a day old. Re-running predict on every Auto-Add click would
  // be safe but wasteful — we just bulk-approve what's already here.
  async function autoAddAll(criteria = 'asis') {
    const targets = filteredSuggestions
    if (targets.length === 0) {
      toast('Nothing to add — no Buy Again suggestions yet. Check back tomorrow once the cron has run.')
      return
    }
    const sb = createClient()
    let ok = 0
    let pickStoreFor = null  // resolved per criteria
    if (criteria === 'cheapest' || criteria === 'frequent') {
      // Fetch per-item per-store history once for all target items.
      const names = targets.map(t => t.item_name)
      try {
        const { data } = await sb
          .from('receipt_items')
          .select('item_name, price, receipts!inner(store_id, store_name)')
          .in('item_name', names)
          .limit(2000)
        const perItem = new Map()  // item_name -> store_id -> {count, min_price}
        for (const r of data || []) {
          const k = r.item_name
          if (!perItem.has(k)) perItem.set(k, new Map())
          const m = perItem.get(k)
          const sid = r.receipts?.store_id
          if (!sid) continue
          if (!m.has(sid)) m.set(sid, { id: sid, count: 0, min_price: null })
          const e = m.get(sid)
          e.count++
          const p = r.price != null ? Number(r.price) : null
          if (p != null && (e.min_price == null || p < e.min_price)) e.min_price = p
        }
        pickStoreFor = (itemName) => {
          const m = perItem.get(itemName)
          if (!m || m.size === 0) return null
          const arr = [...m.values()]
          arr.sort(criteria === 'cheapest'
            ? (a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity)
            : (a, b) => b.count - a.count)
          return arr[0]?.id || null
        }
      } catch (e) {
        toast.error('Auto-Add lookup failed: ' + e.message)
        return
      }
    }
    for (const t of targets) {
      const patch = { ...t, approved: true }
      if (pickStoreFor) {
        const sid = pickStoreFor(t.item_name)
        if (sid) patch.store_name_id = String(sid)
      }
      try {
        await new Promise((resolve, reject) => upsert.mutate(patch, { onSuccess: resolve, onError: reject }))
        ok++
      } catch (_) { /* keep going on per-item failures */ }
    }
    const label = criteria === 'cheapest' ? 'cheapest store'
                : criteria === 'frequent' ? 'most-used store'
                : 'Smashlist'
    toast.success(`Added ${ok}/${targets.length} via ${label} ✓`)
  }

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

  // Group filteredOwn by store_name for the "By store" view. Items
  // without a known store fall into 'Any store' so they're not dropped.
  // Order: stores with the most items first.
  const ownByStore = useMemo(() => {
    const m = new Map()
    for (const it of filteredOwn) {
      const key = it.store?.store_name ? displayStoreName(it.store.store_name) : 'Any store'
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(it)
    }
    return [...m.entries()]
      .map(([store, items]) => ({ store, items }))
      .sort((a, b) => b.items.length - a.items.length)
  }, [filteredOwn])

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
          {/* Buy Again button removed — the nightly cron at 05:30 UTC
              runs the embedding backfill + predictor automatically, so
              the manual button was redundant for daily use. Edge cases
              (just imported 200 receipts, just seeded) can either wait
              for the cron or trigger via /api/smashlist/predict directly.
              predictNow() is kept in scope in case we want to re-add it
              as a small icon in the section header later. */}
          <AutoAddMenu
            count={filteredSuggestions.length}
            onPick={(criteria) => autoAddAll(criteria)}
          />
          <ShareMenu
            buildText={() => buildShareText(
              [...filteredOwn, ...filteredSuggestions],
              activeList === 'all' ? 'all' : activeList,
            )}
            handlers={{
              whatsapp: shareViaWhatsApp,
              sms:      shareViaSMS,
              email:    shareViaEmail,
              clipboard: shareViaClipboard,
              native:   shareNative,
            }}
          />
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
          {/* Card grid — Stash-style: gradient background per list tone,
              color stripe header, emoji avatar, 3 stat tiles, expandable
              best-price hunter, and Qty + Add to Smashlist footer. Mirrors
              ProductCard from /stash so the two surfaces feel like one
              app. */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSuggestions.map(item => (
              <BuyAgainCard
                key={item.id}
                item={item}
                onAdd={() => toggleApproved(item)}
                onQty={(qty) => upsert.mutate({ ...item, qty }, {
                  onError: (err) => toast.error(err.message),
                })}
              />
            ))}
          </div>
          <p className="text-[11px] text-gray-400 px-1">
            * Calculated based on your purchase dates.
          </p>
        </section>
      )}

      {/* Your Smashlist — the items the user has actually committed to
          buying. Renders below the Buy Again strip, always with a
          visible header so the user can find where Approved items go. */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ShoppingCart size={16} className="text-emerald-700" />
          <h2 className="font-semibold text-gray-800">Your Smashlist</h2>
          <span className="text-xs text-gray-500">
            {filteredOwn.length} item{filteredOwn.length === 1 ? '' : 's'} ready to grab
          </span>
          {/* View toggle — by Smashlist bucket OR by store */}
          <div className="ml-auto inline-flex items-center bg-emerald-50 border border-emerald-100 rounded-full p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-full transition-all ${viewMode === 'list' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-700/70 hover:text-emerald-900'}`}
            >
              By list
            </button>
            <button
              type="button"
              onClick={() => setViewMode('store')}
              className={`px-3 py-1 rounded-full transition-all ${viewMode === 'store' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-700/70 hover:text-emerald-900'}`}
            >
              By store
            </button>
          </div>
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
          ) : viewMode === 'store' ? (
            <div className="divide-y divide-gray-100">
              {ownByStore.map(({ store, items: rows }) => (
                <div key={store} className="p-3">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <StoreIcon size={14} className="text-emerald-700" />
                    <h3 className="font-bold text-emerald-900 text-sm">{store}</h3>
                    <span className="text-[10px] text-gray-500 font-semibold">{rows.length} item{rows.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                        <tr>{['List','Item','SKU','Qty','Price','Frequency','Status','Actions'].map(h =>
                          <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                        )}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map(item => <SmashRow
                          key={item.id}
                          item={item}
                          omitStoreCol
                          onQty={(qty) => upsert.mutate({ ...item, qty }, { onError: (err) => toast.error(err.message) })}
                          onToggleApproved={() => toggleApproved(item)}
                          onDelete={() => del.mutate(item.id, { onSuccess: () => toast.success('Removed') })}
                        />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
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
                        <td className="px-4 py-3">
                          <QtyInput
                            value={item.qty || 1}
                            onSave={(qty) => upsert.mutate({ ...item, qty }, {
                              onError: (err) => toast.error(err.message),
                            })}
                          />
                        </td>
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

// Auto-Add dropdown — bulk-approves every Buy Again suggestion with a
// criterion (cheapest store / most-used store / as-is). Sits next to
// the Buy Again button so the user can run predict THEN one-tap to
// fill their Smashlist without manually tapping each card.
function AutoAddMenu({ count, onPick }) {
  const [open, setOpen] = useState(false)
  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
  }
  return (
    <div className="relative inline-block" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="btn-secondary inline-flex items-center gap-1.5 text-sm"
        title="Refresh predictions, then bulk-add the items the system thinks you should buy"
      >
        <ShoppingCart size={14} /> Auto-Add{count > 0 ? ` (${count})` : ''} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-64 rounded-xl bg-white shadow-xl ring-1 ring-gray-200 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
            Pick the store for each item
          </div>
          {[
            { key: 'cheapest', icon: '💰', label: 'Cheapest store',  sub: 'Lowest historical price per item' },
            { key: 'frequent', icon: '🏪', label: 'Most-used store',  sub: 'Where you buy this item most often' },
            { key: 'asis',     icon: '⚡', label: 'Whatever predictor picked', sub: 'Skip the store optimization' },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onPick(opt.key); setOpen(false) }}
              className="w-full flex items-start gap-3 px-3 py-2 text-sm text-gray-800 hover:bg-emerald-50 text-left"
            >
              <span className="text-base leading-none mt-0.5">{opt.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{opt.label}</span>
                <span className="block text-[10px] text-gray-500">{opt.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Share dropdown — main button opens the native share sheet (best on
// phones); secondary buttons send directly to WhatsApp / Messages /
// Mail / clipboard. The dropdown closes when the user clicks anywhere
// outside it.
function ShareMenu({ buildText, handlers }) {
  const [open, setOpen] = useState(false)
  // Click-outside: close when the focus leaves the menu container.
  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
  }
  return (
    <div className="relative inline-block" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="btn-secondary inline-flex items-center gap-1.5 text-sm"
        title="Share this Smashlist"
      >
        <Share2 size={16} /> Share <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-xl bg-white shadow-xl ring-1 ring-gray-200 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
            Send your list to…
          </div>
          {[
            { key: 'whatsapp',  icon: <MessageCircle size={14} className="text-emerald-600" />, label: 'WhatsApp', tone: 'hover:bg-emerald-50' },
            { key: 'sms',       icon: <Phone size={14} className="text-sky-600" />,            label: 'Text / SMS', tone: 'hover:bg-sky-50' },
            { key: 'email',     icon: <Mail size={14} className="text-amber-600" />,           label: 'Email',     tone: 'hover:bg-amber-50' },
            { key: 'clipboard', icon: <Copy size={14} className="text-gray-600" />,            label: 'Copy text', tone: 'hover:bg-gray-50' },
            { key: 'native',    icon: <Share2 size={14} className="text-violet-600" />,        label: 'More…',     tone: 'hover:bg-violet-50' },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { handlers[opt.key](buildText()); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-800 ${opt.tone}`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Curated Smashlist row — used by both view modes. The `omitStoreCol`
// flag skips the Store cell when the parent renders rows grouped under
// a per-store header (since the header already carries the store name).
function SmashRow({ item, omitStoreCol = false, onQty, onToggleApproved, onDelete }) {
  const meta = SHOPPING_LIST_META[item.list_name || 'Pantry'] || {}
  return (
    <tr className="hover:bg-gray-50/50">
      <td className={omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
          {meta.emoji} {item.list_name || 'Pantry'}
        </span>
      </td>
      <td className={omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}>
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
      <td className={`text-gray-400 text-xs ${omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}`}>{item.sku || '—'}</td>
      {!omitStoreCol && (
        <td className="px-4 py-3 text-gray-500">{item.store?.store_name ? displayStoreName(item.store.store_name) : '—'}</td>
      )}
      <td className={omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}>
        <QtyInput value={item.qty || 1} onSave={onQty} />
      </td>
      <td className={omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}>{item.price ? `$${item.price}` : '—'}</td>
      <td className={omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}><span className="badge-gray">{item.frequency}</span></td>
      <td className={omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}>
        <button onClick={onToggleApproved} className="flex items-center gap-1 text-xs font-medium">
          {item.approved
            ? <><CheckCircle size={14} className="text-green-500" /> <span className="text-green-600">Approved</span></>
            : <><Circle size={14} className="text-yellow-400" /> <span className="text-yellow-600">Pending</span></>
          }
        </button>
      </td>
      <td className={omitStoreCol ? 'px-3 py-2' : 'px-4 py-3'}>
        <button onClick={onDelete}
          className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// Buy Again card — Stash-styled visual: gradient background by list
// tone, color stripe header, emoji avatar, 3 stat tiles, expandable
// best-price hunter (calls /api/best-price with geolocation), and a
// Qty + Add to Smashlist footer.
function BuyAgainCard({ item, onAdd, onQty }) {
  const meta = SHOPPING_LIST_META[item.list_name || 'Pantry'] || {}
  const tone = TONE_TINT[meta.color] || TONE_TINT.gray
  const u = urgencyForItem(item)
  const storeName = item.store?.store_name ? displayStoreName(item.store.store_name) : ''

  // Per-store history of THIS item across the user's receipts. Lazy:
  // fetched on first expand so the page-load cost stays zero. Same
  // shape as the Stash card's "Your stores" panel (count + min/last
  // price) so we can reuse the StoreList component verbatim.
  const [expanded, setExpanded] = useState(false)
  const [yourStores, setYourStores] = useState(null)
  const [yourStoresLoading, setYourStoresLoading] = useState(false)
  // Inline best-price hunter — calls /api/best-price with browser
  // geolocation. Results render below the user's-stores list.
  const [webPrices, setWebPrices] = useState(null)
  const [webLoading, setWebLoading] = useState(false)

  const fetchStoreHistory = useCallback(async () => {
    if (yourStores !== null) return  // already loaded
    setYourStoresLoading(true)
    try {
      const sb = createClient()
      // Match on item_name (case-insensitive) — predictor merges variants
      // via embeddings, but this client-side fetch is a quick ILIKE so
      // exact + near-exact names land. Worth replacing with a server
      // endpoint that uses the same canonical key as the predictor if
      // we want fuzzier matching later.
      const { data } = await sb
        .from('receipt_items')
        .select('price, receipts!inner(store_id, store_name, date)')
        .ilike('item_name', item.item_name)
        .limit(500)
      const m = new Map()
      for (const row of data || []) {
        const sid = row.receipts?.store_id || null
        const sname = row.receipts?.store_name || 'Unknown store'
        const price = row.price != null ? Number(row.price) : null
        const date = row.receipts?.date || ''
        const key = sid || sname
        if (!m.has(key)) m.set(key, { id: sid, name: sname, count: 0, min_price: null, last_price: null, last_date: '' })
        const e = m.get(key)
        e.count++
        if (price != null && (e.min_price == null || price < e.min_price)) e.min_price = price
        if (date > e.last_date) { e.last_date = date; if (price != null) e.last_price = price }
      }
      setYourStores([...m.values()])
    } catch (e) {
      toast.error('Could not load store history: ' + e.message)
      setYourStores([])
    } finally {
      setYourStoresLoading(false)
    }
  }, [item.item_name, yourStores])

  const getLocation = useCallback(() => new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve({ lat: null, lng: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),  // user denied — proceed without coords
      { timeout: 4000, maximumAge: 600_000 },
    )
  }), [])

  const huntBestPrice = useCallback(async () => {
    setWebLoading(true)
    try {
      const { lat, lng } = await getLocation()
      const res = await fetch('/api/best-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: item.item_name, lat, lng }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Best-price lookup failed')
      // Wrap in array for uniform rendering even though endpoint
      // currently returns a single best result.
      setWebPrices(data.store_name ? [data] : [])
      if (!data.store_name) toast('No reliable price found — try refreshing later', { icon: '🤷' })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setWebLoading(false)
    }
  }, [item.item_name, getLocation])

  return (
    <div className={`relative bg-gradient-to-br ${tone.from} ${tone.to} rounded-2xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-emerald-300 hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ring-1 ${tone.ring}`}>
      <div className={`h-1 ${tone.accent}`} />
      <div className="p-3 flex flex-col">
        {/* Header — emoji avatar + name + urgency badge */}
        <div className="flex items-start gap-2.5">
          <div className={`w-10 h-10 rounded-2xl ${tone.accent} text-white shadow-md flex items-center justify-center text-xl ring-2 ring-white shrink-0`}>
            {meta.emoji || '🛒'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm leading-tight line-clamp-2 ${tone.text}`}>{item.item_name}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              {item.list_name || 'Pantry'}
            </p>
          </div>
          {/* Right stack: list pill + urgency badge (matches the
              "Drinks dropdown + count chip" stack on the Stash card). */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-emerald-800 border border-emerald-200">
              {meta.emoji} {item.list_name || 'Pantry'}
            </span>
            {u?.isUrgent ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                <Star size={10} className="fill-rose-500 text-rose-500" /> Restock
              </span>
            ) : u?.isOverdue ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Due now
              </span>
            ) : null}
          </div>
        </div>

        {/* 4 stat tiles — Restock | Order frequency | Last bought | Store */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Restock</p>
            <p className={`font-bold text-[11px] tabular-nums ${u?.isOverdue ? 'text-rose-700' : 'text-gray-700'}`}>
              {u ? formatRunsOut(u.daysToRunOut, u.runsOutISO) : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Order</p>
            <p className="font-bold text-[11px] text-violet-700 truncate">
              {item.frequency
                ? `${item.frequency} Purchase`
                : item.predicted_avg_cadence_days
                  ? `every ${Math.round(item.predicted_avg_cadence_days)}d`
                  : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Last bought</p>
            <p className="font-bold text-[11px] text-amber-700 tabular-nums">
              {item.predicted_last_purchase_date
                ? new Date(item.predicted_last_purchase_date + 'T00:00:00Z')
                    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 px-2 py-1 text-center ring-1 ring-white truncate">
            <p className="text-[9px] uppercase text-gray-500 font-bold">Store</p>
            <p className="font-bold text-[11px] text-emerald-700 truncate" title={storeName}>
              {storeName || '—'}
            </p>
          </div>
        </div>

        {/* Amber callout — only when overdue. Mirrors the "Cheapest at
            Walmart" strip on the Stash card. */}
        {u?.isOverdue && (
          <div className="mt-3 flex items-center gap-2 text-xs bg-amber-100/80 text-amber-900 rounded-xl px-3 py-2 border border-amber-200">
            <Star size={14} className="text-amber-600 fill-amber-500 shrink-0" />
            <span>
              <span className="font-bold">Heads up</span> —
              {' '}you usually re-up on <span className="font-bold">{item.frequency || 'this cadence'}</span>{' '}
              and the last buy was <span className="font-bold">{u.runsOutISO}</span>.
            </span>
          </div>
        )}

        {/* Compare stores — same expandable affordance as the Stash card.
            Tapping opens a panel with the user's per-store price history
            for this item, plus a "Hunt web prices" CTA at the bottom. */}
        <button
          type="button"
          onClick={() => { setExpanded(v => !v); fetchStoreHistory() }}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 self-start"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {yourStores && yourStores.length > 1
            ? `Compare ${yourStores.length} stores`
            : yourStores && yourStores.length === 1
              ? `1 store`
              : 'Compare stores'}
        </button>

        {expanded && (
          <div className="mt-2 bg-white/80 rounded-xl p-2 ring-1 ring-white space-y-2">
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500 mb-1 px-2">📦 Your stores</p>
              {yourStoresLoading ? (
                <p className="text-[11px] text-gray-400 px-2 py-1">Loading…</p>
              ) : yourStores && yourStores.length > 0 ? (
                <StoreList
                  stores={yourStores}
                  best={yourStores.length > 1
                    ? yourStores.reduce((best, s) => !best || (s.min_price != null && s.min_price < (best.min_price ?? Infinity)) ? s : best, null)
                    : null}
                  onAddToSmashlist={(store) => {
                    onAdd()
                    // Also pin the chosen store on the row so the next
                    // Add records the user's choice for future predictions.
                    if (store?.id) {
                      // best-effort upsert with store_name_id; ignore errors
                      const sb = createClient()
                      sb.from('shopping_list').update({ store_name_id: String(store.id) }).eq('id', item.id).then(() => {}, () => {})
                    }
                  }}
                />
              ) : (
                <p className="text-[11px] text-gray-400 px-2 py-1">No prior buys found.</p>
              )}
            </div>

            {webPrices && webPrices.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[9px] uppercase tracking-wider font-bold text-fuchsia-700 mb-1 px-2">💎 Live web prices</p>
                <StoreList
                  stores={webPrices.map(p => ({ id: null, name: p.store_name || 'Unknown', last_price: p.price, min_price: p.price, count: 1, url: p.url, web: true }))}
                  best={null}
                  onAddToSmashlist={() => onAdd()}
                />
              </div>
            )}

            <button
              type="button"
              onClick={huntBestPrice}
              disabled={webLoading}
              className="w-full text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg py-1.5 transition-all flex items-center justify-center gap-1.5"
            >
              {webLoading ? <>⏳ Scanning the web…</> : webPrices ? <>🔄 Refresh web prices</> : <>💎 Hunt web prices</>}
            </button>
          </div>
        )}

        {/* Footer — qty stepper + Add to Smashlist CTA */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/50 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Qty</span>
            <QtyInput value={item.qty || 1} onSave={onQty} />
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all"
            title="Add to Smashlist"
          >
            <ShoppingCart size={13} /> Add
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact inline qty editor. Internal state so typing doesn't fire
// onSave on every keystroke; commits on blur AND on Enter. ± buttons
// step the value (touch users don't have to invoke the number keyboard).
function QtyInput({ value, onSave }) {
  const [local, setLocal] = useState(String(value))
  // Keep local state in sync if the row's qty is updated elsewhere.
  useMemo(() => setLocal(String(value)), [value])
  function commit() {
    const n = parseInt(local, 10)
    const safe = Number.isFinite(n) && n > 0 ? n : 1
    if (safe !== value) onSave(safe)
    setLocal(String(safe))
  }
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => { const n = Math.max(1, parseInt(local, 10) - 1); setLocal(String(n)); onSave(n) }}
        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold leading-none"
        aria-label="Decrease"
      >−</button>
      <input
        type="number"
        min="1"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
        className="w-12 text-center text-sm font-semibold border border-gray-200 rounded px-1 py-0.5"
      />
      <button
        type="button"
        onClick={() => { const n = (parseInt(local, 10) || 0) + 1; setLocal(String(n)); onSave(n) }}
        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold leading-none"
        aria-label="Increase"
      >+</button>
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
