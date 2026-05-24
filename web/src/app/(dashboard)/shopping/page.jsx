'use client'
import { useState, useMemo } from 'react'
import { useShoppingList, useUpsertShoppingItem, useDeleteShoppingItem } from '../../../hooks/useShopping'
import { SHOPPING_LISTS, SHOPPING_LIST_META } from '../../../lib/db'
import toast from 'react-hot-toast'
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react'
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

  const { data: items = [], isLoading } = useShoppingList()
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

  const filtered = useMemo(() => {
    if (activeList === 'all') return items
    return items.filter(i => (i.list_name || 'Pantry') === activeList)
  }, [items, activeList])

  const counts = useMemo(() => {
    const m = { all: items.length }
    for (const n of SHOPPING_LISTS) m[n] = 0
    for (const i of items) {
      const n = i.list_name || 'Pantry'
      m[n] = (m[n] || 0) + 1
    }
    return m
  }, [items])

  return (
    <div className="space-y-5 max-w-7xl font-sans">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Smashlist</h1>
          <p className="text-sm text-gray-500">Stocked, themed, ready to grab</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary">
          <GuacMascot expression="happy" size={22} /> Add Item
        </button>
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

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <GuacMascot expression="relaxing" size={140} />
            <p className="text-gray-500 max-w-sm">
              {activeList === 'all' ? 'Smashlist is empty. Drop items from receipts or pick from your Stash.' : `${activeList} list is empty.`}
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
                {filtered.map(item => {
                  const meta = SHOPPING_LIST_META[item.list_name || 'Pantry'] || {}
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                          {meta.emoji} {item.list_name || 'Pantry'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{item.item_name}</td>
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
