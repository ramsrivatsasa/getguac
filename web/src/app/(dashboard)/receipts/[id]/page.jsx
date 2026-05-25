'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useReceipt, useUpdateReceipt, useAddReceiptItem, useUpdateReceiptItem } from '../../../../hooks/useReceipts'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Plus, Shield, MapPin, Phone, Hash, Sparkles, MessageCircle, ImageIcon, ShoppingCart, Tag } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addToShoppingList, setStashProductCategory } from '../../../../lib/db'
import { CATEGORIES } from '../../../../lib/categories'
import CategoryPicker from '../../../../components/CategoryPicker'

const RECEIPT_RATING_META = {
  5: { label: 'Essential', emoji: '💎' },
  4: { label: 'Important', emoji: '✅' },
  3: { label: 'OK',        emoji: '🙂' },
  2: { label: 'Splurge',   emoji: '🍿' },
  1: { label: 'Regret',    emoji: '🙈' },
}
const PRESET_TAGS = [
  'Essential', 'Planned', 'Impulse buy', 'Subscription', 'Gift',
  'Replacement', 'Upgrade', 'Emergency', 'Treat', 'Bulk save', 'Work', 'Family',
]

export default function ReceiptDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: receipt, isLoading } = useReceipt(id)
  const updateReceipt = useUpdateReceipt()
  const addItem = useAddReceiptItem()
  const updateItem = useUpdateReceiptItem()
  const [localReceipt, setLocalReceipt] = useState(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [newItem, setNewItem] = useState({ sku: '', model: '', item_name: '', purchase_date: '', qty: 1, price: '', warranty_info: '', item_manual: '', return_date: '', returned: false })

  const current = localReceipt ?? receipt

  // ── Hooks must all be called unconditionally before any early returns ──
  // Bulk recategorize: when user changes an item's category here, propagate to every
  // receipt_item of the same product (same store + sku/name) across all receipts.
  const qc = useQueryClient()
  const recat = useMutation({
    mutationFn: ({ slug, item }) =>
      setStashProductCategory({
        storeId: current?.store_id,
        sku: item.sku,
        item_name: item.item_name,
        category: slug || null,
      }),
    onSuccess: (rows) => {
      toast.success(rows && rows.length > 1 ? `Recategorized ${rows.length} purchases` : 'Category updated')
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipts', id] })
      qc.invalidateQueries({ queryKey: ['stash'] })
    },
    onError: err => toast.error(err.message),
  })

  function handleFieldChange(key, value) {
    setLocalReceipt(p => ({ ...(p ?? receipt), [key]: value }))
  }

  async function handleSave() {
    updateReceipt.mutate(current, {
      onSuccess: () => { toast.success('Saved'); router.push('/receipts') },
      onError: err => toast.error(err.message),
    })
  }

  async function handleAddItem(e) {
    e.preventDefault()
    addItem.mutate({ ...newItem, receipt_id: id }, {
      onSuccess: () => { toast.success('Item added'); setShowItemForm(false); setNewItem({ sku: '', model: '', item_name: '', purchase_date: '', qty: 1, price: '', warranty_info: '', item_manual: '', return_date: '', returned: false }) },
      onError: err => toast.error(err.message),
    })
  }

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading receipt…</div>
  if (!current) return <div className="py-16 text-center text-red-500">Receipt not found</div>

  // Sort items so unrated ones appear first (so they're easier to rate).
  const items = [...(current.receipt_items ?? [])].sort((a, b) => {
    const ar = a.rating == null ? 0 : 1
    const br = b.rating == null ? 0 : 1
    return ar - br
  })
  const refundPolicies = current.receipt_refund_policies ?? []
  const location = current.store_locations || null
  const si = k => e => setNewItem(p => ({ ...p, [k]: e.target.value }))

  async function handleAddToSmashlist(item) {
    try {
      await addToShoppingList({
        sku: item.sku,
        item_name: item.item_name,
        qty: item.qty || 1,
        price: parseFloat(item.price || 0) || null,
        store_name_id: current.store_id || null,
      })
      toast.success(`Added "${item.item_name}" to Smashlist 🛒`)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost p-1.5"><ArrowLeft size={20} /></button>
        <h1 className="page-title">Receipt — {current.store_name}</h1>
      </div>

      {/* Receipt header */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800">Receipt Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Store Name', key: 'store_name' },
            { label: 'Date', key: 'date', type: 'date' },
            { label: 'Total Amount ($)', key: 'total_amount', type: 'number' },
            { label: 'Tax Paid ($)', key: 'tax_paid', type: 'number' },
            { label: 'Reward No', key: 'reward_no' },
          ].map(({ label, key, type = 'text' }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type={type} className="input" value={current[key] || ''}
                onChange={e => handleFieldChange(key, e.target.value)} />
            </div>
          ))}
          <div className="flex items-center gap-2 mt-5">
            <input type="checkbox" id="biz" className="w-4 h-4 rounded" checked={current.business_purchase || false}
              onChange={e => handleFieldChange('business_purchase', e.target.checked)} />
            <label htmlFor="biz" className="text-sm font-medium">Business Purchase</label>
          </div>
        </div>

        {/* Category picker — controls what page this receipt feeds into (Bites, etc.) */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Tag size={12} className="text-emerald-500" />
            Category
            <span className="text-[10px] text-gray-400 normal-case font-normal">
              {current.category === 'eats' && '— restaurant items appear on Bites'}
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => {
              const active = current.category === c.slug
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => handleFieldChange('category', c.slug)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    active
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-800'
                  }`}>
                  {c.emoji} {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Worth It? rating — hidden for statement-imported, returns, and non-positive totals.
            Those aren't rateable purchases. */}
        {!current.from_statement && !current.is_return && (parseFloat(current.total_amount ?? 0) > 0) && (
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-lime-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🥑</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Worth It?</span>
            <span className="text-[10px] text-gray-500">Tap a rating — applies to the whole receipt</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[5, 4, 3, 2, 1].map(n => {
              const info = RECEIPT_RATING_META[n]
              const active = current.rating === n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    handleFieldChange('rating', n)
                    handleFieldChange('validated_at', new Date().toISOString())
                  }}
                  title={info.label}
                  className={`flex flex-col items-center gap-1 py-2 rounded-2xl border-2 transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm scale-[1.03]'
                      : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}>
                  <span className="text-xl">{info.emoji}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-emerald-800' : 'text-gray-500'}`}>{info.label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Quick tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map(t => {
                const tags = current.validation_tags || []
                const active = tags.includes(t)
                return (
                  <button key={t} type="button"
                    onClick={() => {
                      const next = active ? tags.filter(x => x !== t) : [...tags, t]
                      handleFieldChange('validation_tags', next)
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      active
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-800'
                    }`}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={12} className="text-gray-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Notes</span>
            </div>
            <textarea
              value={current.validation_comment || ''}
              onChange={e => handleFieldChange('validation_comment', e.target.value)}
              rows={2}
              placeholder="Anything you'd remember about this purchase…"
              className="input resize-none text-sm"
            />
          </div>
          <p className="text-[10px] text-gray-400">Changes save when you click <span className="font-semibold">Save Changes</span> below.</p>
        </div>
        )}

        {/* Source pill for statement-imported / refund entries */}
        {(current.from_statement || current.is_return) && (
          <div className={`rounded-2xl border p-3 text-xs font-semibold ${
            current.is_return
              ? 'border-rose-200 bg-rose-50/60 text-rose-900'
              : 'border-gray-200 bg-gray-50 text-gray-700'
          }`}>
            {current.is_return
              ? '↩️ Refund / return — no Worth It? rating or image.'
              : '💳 Imported from a credit-card statement — no receipt image, no Worth It? rating.'}
          </div>
        )}

        {location && (
          <div className="bg-gray-50/70 rounded-xl px-4 py-3 text-sm text-gray-600 flex flex-wrap gap-x-5 gap-y-1">
            {(location.location_name || location.city) && (
              <span className="font-medium text-gray-800">{location.location_name || location.city}</span>
            )}
            {location.address && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {[location.address, location.city, location.state, location.zip].filter(Boolean).join(', ')}
              </span>
            )}
            {location.phone_no && (
              <span className="flex items-center gap-1"><Phone size={12} className="text-gray-400" />{location.phone_no}</span>
            )}
            {location.store_no && (
              <span className="flex items-center gap-1"><Hash size={11} className="text-gray-400" />Store #{location.store_no}</span>
            )}
          </div>
        )}
        {current.receipt_link && !current.from_statement && (
          <a
            href={current.receipt_link}
            target="_blank"
            rel="noreferrer"
            title="View receipt image"
            aria-label="View receipt image"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm font-bold text-sm">
            <ImageIcon size={16} /> View image
          </a>
        )}
        <button onClick={handleSave} disabled={updateReceipt.isPending} className="btn-primary">
          <Save size={15} /> {updateReceipt.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Refund Policy */}
      {refundPolicies.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-800">Refund Policy</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Policy</th>
                  <th className="px-3 py-2 text-left">Days</th>
                  <th className="px-3 py-2 text-left">Expires</th>
                  <th className="px-3 py-2 text-left">Eligible</th>
                  <th className="px-3 py-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {refundPolicies.map(p => {
                  const expired = p.expiry_date && new Date(p.expiry_date) < new Date()
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-medium">{p.policy_id || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{p.days ?? '—'}</td>
                      <td className={`px-3 py-2 ${expired ? 'text-rose-600 font-medium' : 'text-gray-600'}`}>
                        {p.expiry_date || '—'}{expired && ' (expired)'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={p.eligible && !expired ? 'badge-green' : 'badge-gray'}>
                          {p.eligible && !expired ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{p.details || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Line Items</h3>
          <button onClick={() => setShowItemForm(v => !v)} className="btn-secondary text-xs py-1.5">
            <Plus size={13} /> Add Item
          </button>
        </div>

        {showItemForm && (
          <form onSubmit={handleAddItem} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'SKU', key: 'sku' }, { label: 'Model', key: 'model' },
                { label: 'Item Name*', key: 'item_name' }, { label: 'Qty', key: 'qty', type: 'number' },
                { label: 'Price ($)', key: 'price', type: 'number' }, { label: 'Purchase Date', key: 'purchase_date', type: 'date' },
                { label: 'Return Date', key: 'return_date', type: 'date' }, { label: 'Warranty Info', key: 'warranty_info' },
                { label: 'Manual URL', key: 'item_manual' },
              ].map(({ label, key, type = 'text' }) => (
                <div key={key}>
                  <label className="label text-xs">{label}</label>
                  <input type={type} className="input text-sm" value={newItem[key]} onChange={si(key)} required={label.includes('*')} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addItem.isPending} className="btn-primary text-xs py-1.5">Add</button>
              <button type="button" className="btn-secondary text-xs py-1.5" onClick={() => setShowItemForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No items. Add line items from your receipt.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>{['SKU','Model','Name','Category','Date','Qty','Price','Worth It?','Policy','Warranty','Return Date','Returned','Smashlist'].map(h =>
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-400">{item.sku || '—'}</td>
                    <td className="px-3 py-2 text-gray-400">{item.model || '—'}</td>
                    <td className="px-3 py-2 font-medium">{item.item_name}</td>
                    <td className="px-3 py-2">
                      <CategoryPicker
                        value={item.category}
                        onChange={(slug) => recat.mutate({ slug, item })}
                        disabled={recat.isPending}
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-400">{item.purchase_date || '—'}</td>
                    <td className="px-3 py-2">{item.qty}</td>
                    <td className="px-3 py-2">${item.price}</td>
                    <td className="px-3 py-2">
                      {(item.returned || current.from_statement || current.is_return) ? (
                        <span className="text-[10px] text-gray-400">—</span>
                      ) : (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => {
                          const emoji = { 1: '🙈', 2: '🍿', 3: '🙂', 4: '✅', 5: '💎' }[n]
                          const label = { 1: 'Regret', 2: 'Splurge', 3: 'OK', 4: 'Important', 5: 'Essential' }[n]
                          const active = item.rating === n
                          return (
                            <button
                              key={n}
                              type="button"
                              title={label}
                              onClick={() => updateItem.mutate({
                                id: item.id,
                                rating: n,
                                validated_at: new Date().toISOString(),
                              })}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                                active ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'hover:bg-emerald-50 opacity-60 hover:opacity-100'
                              }`}>
                              {emoji}
                            </button>
                          )
                        })}
                      </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {item.refund_policy_id
                        ? <span className="badge-purple text-xs">{item.refund_policy_id}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <input className="input py-0.5 text-xs w-32" defaultValue={item.warranty_info}
                        onBlur={e => updateItem.mutate({ id: item.id, warranty_info: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" className="input py-0.5 text-xs" defaultValue={item.return_date}
                        onBlur={e => updateItem.mutate({ id: item.id, return_date: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={item.returned || false}
                        onChange={e => updateItem.mutate({ id: item.id, returned: e.target.checked })} />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleAddToSmashlist(item)}
                        title="Add to Smashlist"
                        aria-label="Add to Smashlist"
                        className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center ring-2 ring-white hover:ring-amber-200 group">
                        <span className="absolute -top-1 -right-1 text-[10px] drop-shadow-sm">🥑</span>
                        <ShoppingCart size={15} className="drop-shadow-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
