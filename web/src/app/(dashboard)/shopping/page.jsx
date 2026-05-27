'use client'
import { useState, useMemo } from 'react'
import { useShoppingList, useUpsertShoppingItem, useDeleteShoppingItem } from '../../../hooks/useShopping'
import { SHOPPING_LISTS, SHOPPING_LIST_META } from '../../../lib/db'
import toast from 'react-hot-toast'
import { Trash2, CheckCircle, Circle, X, Sparkles, Wand2, Zap } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'

const EMPTY = { sku: '', item_name: '', order_date: '', qty: '1', price: '', store_name_id: '', comments: '', frequency: 'Monthly', list_name: 'Pantry', approved: false, sent_to_store: false }

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
      onSuccess: () => toast.success(item.approved ? 'Unapproved' : 'Approved')
    })
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

  async function predictNow() {
    setPredicting(true)
    try {
      const res = await fetch('/api/smashlist/predict', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Predict failed')
      const { inserted = 0, predictions = 0, aliases_added = 0 } = json
      toast.success(
        inserted > 0
          ? `${inserted} new suggestion${inserted === 1 ? '' : 's'} added 🪄`
          : predictions > 0
            ? `${predictions} ready — already in your list`
            : 'No suggestions right now'
      )
      if (aliases_added > 0) toast.success(`${aliases_added} item${aliases_added === 1 ? '' : 's'} grouped together`)
      refetch()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setPredicting(false)
    }
  }

  async function embedNow() {
    setEmbedding(true)
    try {
      const res = await fetch('/api/embeddings/backfill', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Embed failed')
      const { embedded = 0, remaining = 0, done = false } = json
      toast.success(
        done
          ? `All caught up — ${embedded} embedded`
          : `Embedded ${embedded}, ${remaining} remaining. Click again to continue.`
      )
    } catch (e) {
      toast.error(e.message)
    } finally {
      setEmbedding(false)
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
    if (activeList === 'all') return suggestions
    return suggestions.filter(i => (i.list_name || 'Pantry') === activeList)
  }, [suggestions, activeList])

  const counts = useMemo(() => {
    const m = { all: ownList.length }
    for (const n of SHOPPING_LISTS) m[n] = 0
    for (const i of ownList) {
      const n = i.list_name || 'Pantry'
      m[n] = (m[n] || 0) + 1
    }
    return m
  }, [ownList])

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
            title="Refresh suggestions from your purchase history"
          >
            <Wand2 size={16} /> {predicting ? 'Predicting…' : 'Predict now'}
          </button>
          <button
            onClick={embedNow}
            disabled={embedding}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
            title="Embed historical items so similar names get grouped"
          >
            <Zap size={16} /> {embedding ? 'Embedding…' : 'Embed now'}
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

      {/* Suggestions section — only renders when there are predicted items */}
      {filteredSuggestions.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-500" />
            <h2 className="font-semibold text-gray-800">Suggestions for you</h2>
            <span className="text-xs text-gray-500">Based on your purchase history. Approve to add, dismiss to hide forever.</span>
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
                    return (
                      <tr key={item.id} className="hover:bg-violet-50/30">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                            {meta.emoji} {item.list_name || 'Pantry'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
                              <Sparkles size={10} /> Suggested
                            </span>
                            <span className="font-medium">{item.item_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{item.predicted_reason || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{item.store_name_id || '—'}</td>
                        <td className="px-4 py-3">{item.qty}</td>
                        <td className="px-4 py-3">{item.price ? `$${item.price}` : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleApproved(item)}
                              className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium inline-flex items-center gap-1"
                              title="Add to my list"
                            >
                              <CheckCircle size={12} /> Approve
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

      {/* Main list */}
      <section className="space-y-2">
        {filteredSuggestions.length > 0 && (
          <h2 className="font-semibold text-gray-800">Your list</h2>
        )}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">Loading…</div>
          ) : filteredOwn.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <GuacMascot expression="relaxing" size={140} />
              <p className="text-gray-500 max-w-sm">
                {activeList === 'all'
                  ? (filteredSuggestions.length > 0
                      ? 'No items in your list yet — approve a suggestion above to start.'
                      : 'Smashlist is empty. Drop items from receipts or pick from your Stash.')
                  : `${activeList} list is empty.`}
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
                        <td className="px-4 py-3 text-gray-500">{item.store_name_id || '—'}</td>
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
