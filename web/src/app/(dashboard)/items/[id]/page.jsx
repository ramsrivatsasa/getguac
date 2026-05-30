// /items/[id] — Single line-item detail page.
//
// Shows the item's core fields (name, sku, model, qty, price, category,
// returned, warranty) plus a "Purchase history" panel listing every prior
// receipt where this user bought the same item. Useful for price tracking
// ("is Lowe's actually cheaper than Home Depot for this SKU?") and quick
// re-categorisation across the user's entire history.

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, ShoppingCart, MapPin, Receipt, ExternalLink, X, Share2, Heart, ChevronDown, ChevronUp } from 'lucide-react'
import { displayStoreName } from '../../../../lib/store-name-normalize'
import { createClient } from '../../../../lib/supabase/client'
import { updateReceiptItem, setStashProductCategory, addToShoppingList } from '../../../../lib/db'
import { formatDateShort } from '../../../../lib/dateFormat'
import CategoryPicker from '../../../../components/CategoryPicker'
import { StoreLogo } from '../../../../components/StoreLogo'
import { tintForCategory } from '../../../../components/ProductCard'

// Pull the item + its parent receipt + store in a single round-trip.
async function getItem(id) {
  const sb = createClient()
  const { data, error } = await sb
    .from('receipt_items')
    .select(`
      *,
      receipt:receipt_id (
        id, store_name, store_id, date, total_amount, business_purchase, receipt_link,
        from_statement, is_return,
        store:store_id ( id, store_name, address, phone_no, website )
      )
    `)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

// Other purchases of the SAME item (by SKU first, then by exact name) across
// every one of the user's receipts. Capped at 50; the user can search the
// Stash for a deeper view if they want.
async function getPurchaseHistory({ user_id, sku, item_name, excludeId }) {
  const sb = createClient()
  let q = sb
    .from('receipt_items')
    .select(`id, qty, price, returned, item_name, sku, model, category,
             receipt:receipt_id!inner ( id, store_name, date, user_id )`)
    .neq('id', excludeId)
    .order('id', { ascending: false })
    .limit(50)
  // Match strategy: SKU first (most precise — same product across stores),
  // fall back to exact item_name when SKU is missing/empty.
  if (sku && sku.trim()) {
    q = q.ilike('sku', sku.trim())
  } else if (item_name && item_name.trim()) {
    q = q.ilike('item_name', item_name.trim())
  } else {
    return []
  }
  const { data, error } = await q
  if (error) throw error
  // RLS already scopes to the user but the join may include unrelated rows
  // if SKU collides across users — filter defensively.
  return (data || []).filter(r => r.receipt?.user_id === user_id)
}

export default function ItemDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const sb = createClient(); const { data } = await sb.auth.getUser(); return data.user },
  })

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => getItem(id),
    enabled: !!id,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['item-history', item?.sku, item?.item_name, item?.id],
    queryFn: () => getPurchaseHistory({
      user_id: user?.id,
      sku: item?.sku,
      item_name: item?.item_name,
      excludeId: item?.id,
    }),
    enabled: !!user?.id && !!item,
  })

  // Bulk recategorise: change the category here -> propagate to every
  // receipt_item of the same product (same store + sku/name).
  const recat = useMutation({
    mutationFn: ({ slug }) => setStashProductCategory({
      storeId: item?.receipt?.store_id,
      storeName: item?.receipt?.store_name,
      sku: item?.sku,
      item_name: item?.item_name,
      category: slug || null,
    }),
    onSuccess: (rows) => {
      toast.success(rows && rows.length > 1 ? `Recategorised ${rows.length} purchases` : 'Category updated')
      qc.invalidateQueries({ queryKey: ['item', id] })
      qc.invalidateQueries({ queryKey: ['item-history'] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['stash'] })
    },
    onError: err => toast.error(err.message),
  })

  // Toggle returned flag on this specific row only (NOT bulk).
  const toggleReturned = useMutation({
    mutationFn: (next) => updateReceiptItem(item.id, { returned: next }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item', id] })
    },
    onError: err => toast.error(err.message),
  })

  async function handleAddToSmashlist() {
    try {
      await addToShoppingList({
        sku: item.sku,
        item_name: item.item_name,
        qty: item.qty || 1,
        price: item.price ?? null,
      })
      toast.success(`Added "${item.item_name}" to Smashlist 🛒`)
    } catch (e) { toast.error(e.message) }
  }

  if (isLoading) return <div className="text-gray-400 py-10 text-center">Loading…</div>
  if (!item)     return <div className="text-rose-500 py-10 text-center">Item not found.</div>

  const isCharity = item.category === 'charity'
  const isReturn  = item.returned || item.receipt?.is_return

  // Aggregate purchase-history stats
  const totalQty = history.reduce((s, r) => s + (r.qty || 0), 0) + (item.qty || 0)
  const totalSpent = history.reduce((s, r) => s + (r.price || 0), 0) + (item.price || 0)
  const avgPrice = history.length > 0
    ? (history.reduce((s, r) => s + (r.price || 0), 0) + (item.price || 0)) / (history.length + 1)
    : (item.price || 0)
  const minPrice = Math.min(item.price || 0, ...history.map(r => r.price || Infinity))
  const minPriceRow = history.find(r => (r.price || 0) === minPrice && r.price)
    || ((item.price || 0) === minPrice ? item : null)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Hero banner — colored category-tinted backdrop, floating
          back + share buttons, large centered product photo,
          brand-logo badge, social-proof chip + quest-style progress
          bar. Mirrors the Fetch item-detail hero so an item page
          feels like an offer page, not a database row. */}
      <ItemDetailHero
        item={item}
        history={history}
        totalQty={totalQty}
        onBack={() => router.back()}
        onAddToSmashlist={handleAddToSmashlist}
        canAdd={!isCharity && !isReturn}
      />

      {/* Core fields */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <Field label="SKU"      value={item.sku   || '—'} />
          <Field label="Model"    value={item.model || '—'} />
          <Field label="Qty"      value={item.qty   || 1} />
          <Field label="Price"    value={`$${(item.price || 0).toFixed(2)}`} />
          <Field label="Purchase date" value={item.purchase_date ? formatDateShort(item.purchase_date) : formatDateShort(item.receipt?.date)} />
          <Field label="Returned" value={
            isCharity ? '❤️ Donation (no return)' :
            item.returned ? 'Yes' : 'No'
          } />
        </div>

        {/* Category — bulk-applies to every receipt_item with same store+sku/name */}
        <div className="pt-1">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
          <CategoryPicker value={item.category} onChange={(slug) => recat.mutate({ slug })} />
          <p className="text-[10px] text-gray-400 mt-1">Changing the category here updates every purchase of this product (same store + SKU/name).</p>
        </div>

        {/* Returned toggle — only show for non-charity, non-statement rows */}
        {!isCharity && !item.receipt?.from_statement && (
          <div className="pt-1 flex items-center gap-2">
            <input type="checkbox" id="returned" className="w-4 h-4 rounded cursor-pointer"
              checked={!!item.returned}
              onChange={e => toggleReturned.mutate(e.target.checked)} />
            <label htmlFor="returned" className="text-xs font-medium text-gray-700">Mark as returned</label>
          </div>
        )}
      </div>

      {/* Source receipt */}
      <div className="card space-y-2">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2"><Receipt size={14} /> Source receipt</h3>
        <Link href={`/receipts/${item.receipt?.id}`}
          className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/40 hover:bg-emerald-50 transition-colors group">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900 truncate">{displayStoreName(item.receipt?.store_name) || 'Receipt'}</p>
            <p className="text-[11px] text-gray-500 flex items-center gap-2">
              {formatDateShort(item.receipt?.date)}
              {item.receipt?.business_purchase && <span className="badge-blue text-[9px]">Biz</span>}
              {item.receipt?.from_statement && <span className="text-indigo-600">🏦 Statement</span>}
              {item.receipt?.is_return && <span className="text-rose-600">↩️ Return</span>}
            </p>
            {item.receipt?.store?.address && (
              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {item.receipt.store.address}
              </p>
            )}
          </div>
          <ExternalLink size={14} className="text-emerald-700 opacity-70 group-hover:opacity-100" />
        </Link>
      </div>

      {/* Purchase history */}
      {history.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold text-gray-800 text-sm">Purchase history</h3>
            <p className="text-[10px] text-gray-400">
              {history.length + 1} buy{history.length === 0 ? '' : 's'} · total ${totalSpent.toFixed(2)} · avg ${avgPrice.toFixed(2)}
              {minPriceRow && minPrice > 0 && (
                <span> · best ${minPrice.toFixed(2)} at {displayStoreName(minPriceRow.receipt?.store_name || (minPriceRow === item ? item.receipt?.store_name : '')) || '?'}</span>
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b text-[10px] text-gray-500">
                <tr>
                  <th className="px-3 py-1 text-left">Date</th>
                  <th className="px-3 py-1 text-left">Store</th>
                  <th className="px-3 py-1 text-right">Qty</th>
                  <th className="px-3 py-1 text-right">Price</th>
                  <th className="px-3 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-blue-50/40">
                    <td className="px-3 py-1 text-gray-500 whitespace-nowrap">{formatDateShort(h.receipt?.date)}</td>
                    <td className="px-3 py-1">
                      <Link href={`/receipts/${h.receipt?.id}`} className="text-blue-700 hover:underline">
                        {displayStoreName(h.receipt?.store_name) || '—'}
                      </Link>
                    </td>
                    <td className="px-3 py-1 text-right">{h.qty || 1}</td>
                    <td className="px-3 py-1 text-right">${(h.price || 0).toFixed(2)}</td>
                    <td className="px-3 py-1 text-gray-500 text-[10px]">
                      {h.returned ? '↩️ Returned' : (h.category === 'charity' ? '❤️ Donation' : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

// Big colored hero at the top of the item-detail page.
//
// Visual reference is Fetch's offer page: sky/pastel backdrop, large
// centered product photo, floating Back + Share, brand-circle badge
// peeking off the bottom-right, urgency chip + title + reward chip
// + progress bar showing how many of this item you still need to hit
// the next earn tier.
//
// We don't have product-image URLs for every item yet, so the
// fallback is a brand-colored category emoji.
function ItemDetailHero({ item, history, totalQty, onBack, onAddToSmashlist, canAdd }) {
  const tint = tintForCategory(item.category)
  const storeName = item.receipt?.store_name || ''
  const purchaseCount = (history?.length || 0) + 1
  const target = 6   // earn-tier target — "Buy 6 more like this" matches the Fetch quest copy
  const progress = Math.min(totalQty / target, 1)
  const remaining = Math.max(target - totalQty, 0)

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: item.item_name, url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); toast.success('Link copied') } catch {
      toast('Copy this URL: ' + url)
    }
  }

  return (
    <div className="relative rounded-3xl overflow-hidden">
      {/* Tinted backdrop — drives the entire hero color. */}
      <div className="relative px-6 pt-4 pb-12" style={{ background: tint }}>
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/70 backdrop-blur hover:bg-white text-gray-700 flex items-center justify-center shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white/70 backdrop-blur hover:bg-white text-gray-700 flex items-center justify-center shadow-sm"
            aria-label="Share"
          >
            <Share2 size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[180px] mt-2">
          {/* Product image if present, otherwise a category emoji. */}
          <div className="text-7xl drop-shadow-md">{categoryEmoji(item.category)}</div>
        </div>
      </div>

      {/* Footer band — heart + count on left, brand badge peeking. */}
      <div className="relative bg-white px-5 pt-4 pb-5 -mt-4 rounded-t-3xl">
        <div className="absolute -top-7 right-5">
          <StoreLogo storeName={storeName} size={56} fallbackEmoji="🏬" emojiBg="#15803d" />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 transition"
            aria-label="Save"
          >
            <Heart size={15} />
          </button>
          <span className="text-xs font-semibold text-gray-500 tabular-nums">{purchaseCount}× purchased</span>
        </div>

        {/* Urgency / quest chip — "Buy N more" reads as a tier nudge. */}
        {remaining > 0 ? (
          <span className="inline-flex mt-3 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-700 border border-violet-200">
            Buy {remaining} more
          </span>
        ) : (
          <span className="inline-flex mt-3 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
            Tier hit 🥑
          </span>
        )}
        <h1 className="text-2xl font-black text-gray-900 mt-1 leading-tight">{item.item_name || 'Item'}</h1>
        <p className="text-sm text-gray-500">
          {storeName ? displayStoreName(storeName) : 'Receipt item'}
          {item.sku ? ` · SKU ${item.sku}` : ''}
        </p>

        <div className="flex items-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-extrabold tabular-nums">
            🥑 ${(item.price || 0).toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 ml-auto tabular-nums">
            {remaining > 0 ? `${remaining} to go` : 'Complete'}
          </span>
        </div>

        {/* Six-segment progress bar — same shape as Fetch's reward
            tier indicator. Filled segments = remaining items needed. */}
        <div className="mt-2 grid grid-cols-6 gap-1">
          {Array.from({ length: target }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full ${
                i < Math.round(progress * target)
                  ? 'bg-gradient-to-r from-emerald-400 to-lime-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {canAdd && (
          <button
            onClick={onAddToSmashlist}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold shadow hover:shadow-lg transition"
          >
            <ShoppingCart size={15} /> Add to Smashlist
          </button>
        )}
      </div>
    </div>
  )
}

// Lightweight category → emoji map (no external lib dep) so the hero
// can render a stand-in product mark when there's no real photo.
function categoryEmoji(slug) {
  const map = {
    grocery: '🥦', beverages: '🧃', alcohol: '🍷', pet: '🐶',
    household: '🧴', health: '💊', restaurant: '🍴', clothing: '👕',
    electronics: '📱', toys: '🧸', baby: '👶', fuel: '⛽', auto: '🚗',
  }
  return map[slug] || '🛒'
}
