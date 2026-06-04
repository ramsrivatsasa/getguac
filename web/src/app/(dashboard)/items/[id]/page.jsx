// /items/[id] — Single line-item detail page.
//
// Fetch-style cleaner layout (v0.3+ redesign):
//   • Tall hero with the product image (or store logo) on a soft pastel
//     gradient. Round Heart chip top-left, Share chip top-right.
//   • White card pulled up over the hero with a small status pill,
//     bold title, lighter subtitle, money row (lifetime spent · "to go"),
//     a 6-segment pill row showing the last 6 buys (filled when the
//     receipt is within the last 90 days), then "Where you've bought it"
//     and "Recent receipts" sections.
//   • Existing fetches + mutations preserved: getItem, getPurchaseHistory,
//     setStashProductCategory, updateReceiptItem, addToShoppingList.

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, ShoppingCart, MapPin, Receipt, ExternalLink, Share2, Heart } from 'lucide-react'
import { displayStoreName } from '../../../../lib/store-name-normalize'
import { createClient } from '../../../../lib/supabase/client'
import { updateReceiptItem, setStashProductCategory, addToShoppingList } from '../../../../lib/db'
import { formatDateShort } from '../../../../lib/dateFormat'
import CategoryPicker from '../../../../components/CategoryPicker'
import { StoreLogo } from '../../../../components/StoreLogo'
import { CountUp, FadeUpStagger, SlideUp } from '../../../../components/animated'

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
// every one of the user's receipts. Capped at 50.
async function getPurchaseHistory({ user_id, sku, item_name, excludeId }) {
  const sb = createClient()
  let q = sb
    .from('receipt_items')
    .select(`id, qty, price, returned, item_name, sku, model, category,
             receipt:receipt_id!inner ( id, store_name, date, user_id )`)
    .neq('id', excludeId)
    .order('id', { ascending: false })
    .limit(50)
  if (sku && sku.trim()) {
    q = q.ilike('sku', sku.trim())
  } else if (item_name && item_name.trim()) {
    q = q.ilike('item_name', item_name.trim())
  } else {
    return []
  }
  const { data, error } = await q
  if (error) throw error
  return (data || []).filter(r => r.receipt?.user_id === user_id)
}

// Soft pastel gradients indexed by category. Single soft pastel — not
// the heavy emerald that lived on the old receipt-detail hero. Each entry
// is two stops sampled from the same hue so the gradient stays subtle.
const CATEGORY_GRADIENT = {
  grocery:    ['#ecfccb', '#f7fee7'],  // lime
  beverages:  ['#fef3c7', '#fffbeb'],  // amber
  alcohol:    ['#fee2e2', '#fff1f2'],  // rose
  pet:        ['#fce7f3', '#fdf2f8'],  // pink
  household:  ['#dbeafe', '#eff6ff'],  // sky
  health:     ['#f3e8ff', '#faf5ff'],  // violet
  restaurant: '#fef9c3,#fefce8'.split(','), // yellow
  clothing:   ['#fde68a', '#fffbeb'],  // amber-warm
  electronics:['#e0e7ff', '#eef2ff'],  // indigo
  toys:       ['#fbcfe8', '#fdf2f8'],  // pink
  baby:       ['#fef3c7', '#fffbeb'],  // amber
  fuel:       ['#e5e7eb', '#f9fafb'],  // gray
  auto:       ['#e5e7eb', '#f9fafb'],  // gray
}
function gradientForCategory(slug) {
  const stops = CATEGORY_GRADIENT[slug] || ['#f1f5f9', '#f8fafc']  // slate
  return `linear-gradient(180deg, ${stops[0]} 0%, ${stops[1]} 100%)`
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

  // Resolve the product image for the hero — same /api/product-image-batch
  // endpoint Stash uses. Single-name batch keeps the cache hot.
  const [productImage, setProductImage] = useState(null)
  useEffect(() => {
    const name = item?.item_name
    if (!name) return
    let cancelled = false
    fetch('/api/product-image-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: [name] }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled) return
        const url = json?.byName?.[name]
        if (url) setProductImage(url)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [item?.item_name])

  // Bulk recategorise — change category here -> propagate to every receipt_item
  // of the same product (same store + sku/name).
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

  // Toggle returned flag on this specific row only.
  const toggleReturned = useMutation({
    mutationFn: (next) => updateReceiptItem(item.id, { returned: next }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['item', id] }) },
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
      toast.success(`Added "${item.item_name}" to Smashlist`)
    } catch (e) { toast.error(e.message) }
  }

  if (isLoading) return <div className="text-gray-400 py-10 text-center">Loading…</div>
  if (!item)     return <div className="text-rose-500 py-10 text-center">Item not found.</div>

  const isCharity = item.category === 'charity'
  const isReturn  = item.returned || item.receipt?.is_return

  // Aggregate purchase-history stats — total quantity, lifetime spend, and
  // the last 6 receipts (chronological) for the pill strip.
  const allRows = [
    {
      id: item.id,
      receipt: item.receipt,
      qty: item.qty || 1,
      price: item.price || 0,
      returned: !!item.returned,
      isCurrent: true,
    },
    ...history.map(h => ({
      id: h.id,
      receipt: h.receipt,
      qty: h.qty || 1,
      price: h.price || 0,
      returned: !!h.returned,
      isCurrent: false,
    })),
  ]
  // Sort chronologically (newest first) for the pill strip and recent list.
  const sortedRows = [...allRows].sort((a, b) => {
    const ad = a.receipt?.date || ''
    const bd = b.receipt?.date || ''
    return bd.localeCompare(ad)
  })
  const totalQty = sortedRows.reduce((s, r) => s + (r.qty || 0), 0)
  const totalSpent = sortedRows.reduce((s, r) => s + (r.price || 0), 0)

  // 90-day window — used both for the Smashlist "Buy N" badge and to decide
  // which pill segments render filled.
  const now = Date.now()
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
  const within90 = (iso) => {
    if (!iso) return false
    const t = Date.parse(iso)
    return Number.isFinite(t) && (now - t) <= NINETY_DAYS_MS
  }
  const buys90 = sortedRows.filter(r => within90(r.receipt?.date)).length

  // Where you've bought it — store → count + lifetime spend.
  const byStore = new Map()
  for (const r of sortedRows) {
    const key = r.receipt?.store_name || 'Unknown'
    const prev = byStore.get(key) || { name: key, count: 0, spent: 0 }
    prev.count += 1
    prev.spent += r.price || 0
    byStore.set(key, prev)
  }
  const stores = [...byStore.values()].sort((a, b) => b.count - a.count)

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* HERO — soft pastel gradient, round chips top, big product image */}
      <ItemHero
        item={item}
        productImage={productImage}
        onBack={() => router.back()}
      />

      {/* Floating white card pulled up over the hero. SlideUp gives
          the white block a 320ms entrance so it lands AFTER the hero
          has painted — the page assembles itself top-down. */}
      <SlideUp className="relative -mt-8 bg-white rounded-3xl shadow-sm px-5 pt-5 pb-6 space-y-4">
        {/* Status pill — Smashlist "Buy N" signal if any 90-day buys, else "In your kitchen" */}
        {buys90 > 0 ? (
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-700">
            Buy {buys90}
          </span>
        ) : (
          <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700">
            In your kitchen
          </span>
        )}

        {/* Big bold title + lighter subtitle (category · last store · last date) */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
            {item.item_name || 'Item'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {[
              item.category && titleCase(item.category),
              displayStoreName(item.receipt?.store_name),
              item.receipt?.date && formatDateShort(item.receipt.date),
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Money / coin row — GuacScore-y emerald chip with the lifetime total.
            CountUp tweens the dollar figure on mount so "lifetime spent" lands
            with the same retally cadence as the dashboard hero numbers. */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-extrabold tabular-nums">
            <span aria-hidden>🥑</span>
            <CountUp value={Number(totalSpent) || 0} duration={520} prefix="$" decimals={2} from={0} />
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            spent across {sortedRows.length} buy{sortedRows.length === 1 ? '' : 's'}
            {totalQty !== sortedRows.length ? ` · ${totalQty} unit${totalQty === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        {/* Six-pill cadence strip — last 6 receipts; filled when within 90d */}
        <CadenceStrip rows={sortedRows.slice(0, 6)} within90={within90} />

        {/* Add-to-Smashlist primary action (mirrors the old design) */}
        {!isCharity && !isReturn && (
          <button
            onClick={handleAddToSmashlist}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold shadow hover:shadow-lg transition"
          >
            <ShoppingCart size={15} /> Add to Smashlist
          </button>
        )}
      </SlideUp>

      {/* Where you've bought it (replaces "Excludes") */}
      {stores.length > 0 && (
        <section className="mt-5 bg-white rounded-2xl shadow-sm px-5 py-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-emerald-600" /> Where you've bought it
          </h2>
          {/* Staggered fade-in on mount — each store row lands with
              a 35ms offset so the list reads as building itself up. */}
          <FadeUpStagger as="ul" className="divide-y divide-gray-100" delayMs={35}>
            {stores.map(s => (
              <li key={s.name} className="flex items-center gap-3 py-2.5">
                <StoreLogo storeName={s.name} size={32} fallbackEmoji="🏬" emojiBg="#15803d" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{displayStoreName(s.name)}</p>
                  <p className="text-[11px] text-gray-500">
                    {s.count} buy{s.count === 1 ? '' : 's'} · ${s.spent.toFixed(2)}
                  </p>
                </div>
              </li>
            ))}
          </FadeUpStagger>
        </section>
      )}

      {/* Recent receipts (replaces "Conditions") — tappable rows -> /receipts/[id] */}
      <section className="mt-5 bg-white rounded-2xl shadow-sm px-5 py-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Receipt size={14} className="text-sky-600" /> Recent receipts
        </h2>
        <FadeUpStagger as="ul" className="divide-y divide-gray-100" delayMs={35}>
          {sortedRows.slice(0, 5).map(r => (
            <li key={r.id}>
              <Link
                href={`/receipts/${r.receipt?.id}`}
                className="flex items-center gap-3 py-2.5 -mx-1 px-1 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="text-xs font-semibold text-gray-500 w-16 tabular-nums shrink-0">
                  {formatDateShort(r.receipt?.date)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {displayStoreName(r.receipt?.store_name) || '—'}
                    {r.isCurrent && <span className="ml-1.5 text-[10px] font-bold text-emerald-700">· this</span>}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {r.qty} unit{r.qty === 1 ? '' : 's'} · ${(r.price || 0).toFixed(2)}
                    {r.returned && <span className="ml-1 text-rose-600">· returned</span>}
                  </p>
                </div>
                <ExternalLink size={14} className="text-gray-400 shrink-0" />
              </Link>
            </li>
          ))}
        </FadeUpStagger>
      </section>

      {/* Category + returned controls — kept exactly as before so bulk
          recategorise + returned-flag still work without surprise. */}
      <section className="mt-5 bg-white rounded-2xl shadow-sm px-5 py-4 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <Field label="SKU" value={item.sku || '—'} />
          <Field label="Model" value={item.model || '—'} />
          <Field label="Qty (this buy)" value={item.qty || 1} />
          <Field label="Price (this buy)" value={`$${(item.price || 0).toFixed(2)}`} />
          <Field label="Purchase date" value={item.purchase_date ? formatDateShort(item.purchase_date) : formatDateShort(item.receipt?.date)} />
          <Field label="Returned" value={
            isCharity ? '❤️ Donation' :
            item.returned ? 'Yes' : 'No'
          } />
        </div>

        <div className="pt-1">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label>
          <CategoryPicker value={item.category} onChange={(slug) => recat.mutate({ slug })} />
          <p className="text-[10px] text-gray-400 mt-1">Changing the category here updates every purchase of this product (same store + SKU/name).</p>
        </div>

        {!isCharity && !item.receipt?.from_statement && (
          <div className="pt-1 flex items-center gap-2">
            <input type="checkbox" id="returned" className="w-4 h-4 rounded cursor-pointer"
              checked={!!item.returned}
              onChange={e => toggleReturned.mutate(e.target.checked)} />
            <label htmlFor="returned" className="text-xs font-medium text-gray-700">Mark as returned</label>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────
// Tall pastel hero. Heart chip top-left (visual only — wires up once we have a
// stash-product like model), Share chip top-right. Centered product image, or
// the store logo if we don't have a product image yet.
function ItemHero({ item, productImage, onBack }) {
  const storeName = item.receipt?.store_name || ''
  const gradient = gradientForCategory(item.category)

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
    <div
      className="relative rounded-3xl overflow-hidden px-5 pt-4 pb-16"
      style={{ background: gradient, minHeight: 260 }}
    >
      {/* Round chip row — back on the left, share on the right. Heart sits
          beside back as a soft secondary action. */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChipButton onClick={onBack} ariaLabel="Back"><ArrowLeft size={18} /></ChipButton>
          <ChipButton ariaLabel="Save"><Heart size={16} /></ChipButton>
        </div>
        <ChipButton onClick={handleShare} ariaLabel="Share"><Share2 size={16} /></ChipButton>
      </div>

      {/* Product image OR store logo, centered. Drop shadow gives a subtle
          float so the round chip row doesn't visually compete. */}
      <div className="flex items-center justify-center mt-4">
        {productImage ? (
          <img
            src={productImage}
            alt={item.item_name || ''}
            className="w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-md"
          />
        ) : (
          <div className="drop-shadow-md">
            <StoreLogo storeName={storeName} size={120} fallbackEmoji="🛒" emojiBg="#15803d" />
          </div>
        )}
      </div>
    </div>
  )
}

function ChipButton({ children, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-10 h-10 rounded-full bg-white/80 backdrop-blur hover:bg-white text-gray-700 flex items-center justify-center shadow-sm transition"
    >
      {children}
    </button>
  )
}

// ─── Cadence Strip ───────────────────────────────────────────────────────────
// Six pill placeholders representing the last 6 receipts (chronological).
// Filled (emerald gradient) for buys within the last 90 days; muted otherwise.
function CadenceStrip({ rows, within90 }) {
  const slots = Array.from({ length: 6 }).map((_, i) => rows[i] || null)
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {slots.map((r, i) => {
        const filled = r && within90(r.receipt?.date)
        const present = !!r
        return (
          <div
            key={i}
            className={`h-2 rounded-full ${
              filled
                ? 'bg-gradient-to-r from-emerald-400 to-lime-500'
                : present
                  ? 'bg-gray-300'
                  : 'bg-gray-100'
            }`}
            title={r?.receipt?.date || ''}
          />
        )
      })}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-gray-800 mt-0.5 break-words">{value}</p>
    </div>
  )
}

function titleCase(slug) {
  if (!slug) return ''
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
