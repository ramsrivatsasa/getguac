'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useReceipt, useUpdateReceipt, useAddReceiptItem, useUpdateReceiptItem } from '../../../../hooks/useReceipts'
import { createClient } from '../../../../lib/supabase/client'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Plus, Shield, MapPin, Phone, Hash, Sparkles, MessageCircle, ImageIcon, ShoppingCart, Tag, RefreshCw, X, FileText } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addToShoppingList, setStashProductCategory } from '../../../../lib/db'
import { CATEGORIES } from '../../../../lib/categories'
import { ITEM_TAG_META } from '../../../../lib/itemTagVocab'
import { isItemNonReturnable } from '../../../../lib/non-returnable'
import CategoryPicker from '../../../../components/CategoryPicker'
import ReceiptScanAnimation from '../../../../components/ReceiptScanAnimation'
import { displayStoreName } from '../../../../lib/store-name-normalize'
import mascotBus from '../../../../lib/mascotEventBus'
import { TapScale, SuccessPop, CountUp } from '../../../../components/animated'
import MascotLoading from '../../../../components/MascotLoading'

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
  const { data: receipt, isLoading, isError, error: receiptError, refetch: refetchReceipt } = useReceipt(id)
  const updateReceipt = useUpdateReceipt()
  const addItem = useAddReceiptItem()
  const updateItem = useUpdateReceiptItem()
  const [localReceipt, setLocalReceipt] = useState(null)
  const [showItemForm, setShowItemForm] = useState(false)
  // Bumped on every rating tap so SuccessPop fires the checkmark
  // animation on top of the chosen rating pill. State, not ref, so
  // the child re-renders and reads the new trigger value.
  const [ratingPop, setRatingPop] = useState(0)
  const [newItem, setNewItem] = useState({ sku: '', model: '', item_name: '', purchase_date: '', qty: 1, price: '', warranty_info: '', item_manual: '', return_date: '', returned: false })
  // Email-sourced receipts have no photo — load the source email so we can
  // offer "View email" where camera receipts show "View image".
  const [emailMsg, setEmailMsg] = useState(null)
  const [showEmail, setShowEmail] = useState(false)

  // Next can reuse this client component while browser history changes the
  // dynamic route. Never render edits from the previously opened receipt.
  const current = localReceipt?.id === id ? localReceipt : receipt

  // ── Hooks must all be called unconditionally before any early returns ──
  // Bulk recategorize: when user changes an item's category here, propagate to every
  // receipt_item of the same product (same store + sku/name) across all receipts.
  const qc = useQueryClient()
  const recat = useMutation({
    mutationFn: ({ slug, item }) =>
      setStashProductCategory({
        storeId: current?.store_id,
        storeName: current?.store_name,
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

  // Fetch the source email for this receipt (if it was parsed from email).
  // RLS lets users read their own email_messages; linked via receipt_id.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLocalReceipt(null)
    setEmailMsg(null)
    setShowEmail(false)
    setShowItemForm(false)
    setNewItem({ sku: '', model: '', item_name: '', purchase_date: '', qty: 1, price: '', warranty_info: '', item_manual: '', return_date: '', returned: false })
    ;(async () => {
      try {
        const sb = createClient()
        const { data } = await sb
          .from('email_messages')
          .select('subject, from_addr, body_html, body_text')
          .eq('receipt_id', id)
          .maybeSingle()
        if (!cancelled) setEmailMsg(data || null)
      } catch { /* best-effort — no email source is fine */ }
    })()
    return () => { cancelled = true }
  }, [id])

  // Re-parse this single receipt against its source email body. Only available
  // for email-sourced receipts; the endpoint returns 400 with an explainer if
  // the receipt wasn't created from a forwarded email.
  const reparseFromEmail = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/receipts/${id}/reparse`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Re-parse failed (${res.status})`)
      return body
    },
    onSuccess: (data) => {
      toast.success(
        `Re-parsed: ${data?.receipt?.store_name || 'updated'} · ${data?.items_parsed || 0} items`,
        { duration: 5000 }
      )
      setLocalReceipt(null)
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipts', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  // Email receipts have no photo. Render the source email to a stored PNG + PDF
  // the first time the receipt is opened, so it gets a real image (and a
  // downloadable PDF) that survives the source email being deleted. The server
  // is idempotent — once receipt_link is set it returns instantly.
  const snapshot = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/receipts/${id}/email-snapshot`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Snapshot failed (${res.status})`)
      return body
    },
    onSuccess: (data) => {
      if (data?.already) return
      setLocalReceipt(null)
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipts', id] })
    },
    // Silent on error: the "View email" fallback still works, no need to nag.
    onError: () => {},
  })

  // One-shot per receipt: fire once we've confirmed it's email-sourced
  // (emailMsg loaded) and has no image yet.
  const snappedRef = useRef('')
  useEffect(() => {
    if (!emailMsg || !current) return
    if (current.receipt_link || current.from_statement) return
    if (snappedRef.current === id) return
    snappedRef.current = id
    snapshot.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailMsg, current?.receipt_link, current?.from_statement, id])

  function handleFieldChange(key, value) {
    setLocalReceipt(p => {
      const base = p ?? receipt
      const next = { ...base, [key]: value }
      // Tier 2 learning: a manual category change is the strongest signal
      // we have for per-store preferences. Mark the source so the
      // infer_user_store_category RPC counts it correctly.
      if (key === 'category') next.category_source = 'user'
      return next
    })
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

  if (isLoading) return <MascotLoading label="Loading receipt…" />
  if (isError || !current) return (
    <div className="py-16 text-center flex flex-col items-center gap-3">
      <p className="text-red-500 font-semibold">
        {isError ? "We couldn't load this receipt" : 'Receipt not found'}
      </p>
      {/* Keep the raw reason visible but secondary — users were reading the
          PostgREST wording ("...in the schema cache") as the whole message. */}
      {isError && receiptError?.message && (
        <p className="text-xs text-gray-500 max-w-md">{receiptError.message}</p>
      )}
      <div className="flex items-center gap-4">
        {isError && (
          <button type="button" onClick={() => refetchReceipt()}
            className="text-sm text-guac-700 font-semibold hover:underline">Try again</button>
        )}
        <Link href="/receipts" className="text-sm text-guac-700 font-semibold hover:underline">Back to receipts</Link>
      </div>
    </div>
  )

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
      toast.success(`Added "${item.item_name}" to Shopping List 🛒`)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Full-screen search-mascot scan overlay while a re-parse runs — the
          same animation the upload flow shows, so Re-parse no longer looks
          like nothing is happening (only a tiny spinner before). */}
      <ReceiptScanAnimation count={reparseFromEmail.isPending ? 1 : 0} />
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.back()} className="btn-ghost p-1.5"><ArrowLeft size={20} /></button>
        <h1 className="page-title flex-1 min-w-0 truncate">Receipt — {displayStoreName(current.store_name)}</h1>
        <button
          onClick={() => reparseFromEmail.mutate()}
          disabled={reparseFromEmail.isPending}
          className="btn-secondary flex items-center gap-2 text-sm"
          title="Re-run the AI parser against this receipt's source — the email body for forwarded receipts, or the photo for camera-captured ones."
        >
          <RefreshCw size={14} className={reparseFromEmail.isPending ? 'animate-spin' : ''} />
          {reparseFromEmail.isPending ? 'Re-parsing…' : 'Re-parse'}
        </button>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors shrink-0"
          title="Close"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Receipt header */}
      <div className="card space-y-4">
        <h3 className="gg-h2">Receipt Details</h3>
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
            <Tag size={12} className="text-guac-600" />
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
                      ? 'bg-guac-700 border-guac-700 text-white shadow'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-guac-line2 hover:text-guac-700'
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
        <div className="rounded-2xl border border-guac-line bg-gradient-to-br from-emerald-50/70 via-white to-lime-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🥑</span>
            <span className="text-xs font-bold uppercase tracking-wider text-guac-700">Worth It?</span>
            <span className="text-[10px] text-gray-500">Tap a rating — applies to the whole receipt</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[5, 4, 3, 2, 1].map(n => {
              const info = RECEIPT_RATING_META[n]
              const active = current.rating === n
              return (
                <TapScale key={n}>
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldChange('rating', n)
                      handleFieldChange('validated_at', new Date().toISOString())
                      mascotBus.celebrate('Rated!')
                      // Bump triggers SuccessPop on the chosen pill;
                      // the check draws into the pill so the user
                      // sees the value lock in.
                      setRatingPop(p => p + 1)
                    }}
                    title={info.label}
                    className={`relative flex flex-col items-center gap-1 py-2 rounded-2xl border-2 transition-all ${
                      active
                        ? 'border-guac-600 bg-guac-50 shadow-sm scale-[1.03]'
                        : 'border-gray-100 hover:border-guac-line2 hover:bg-guac-50/50'
                    }`}>
                    <span className="text-xl">{info.emoji}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-guac-700' : 'text-gray-500'}`}>{info.label}</span>
                    {/* Fires only on the freshly-chosen rating —
                        ratingPop bumps each tap; SuccessPop's effect
                        clears after 900ms so additional taps re-fire. */}
                    {active && <SuccessPop trigger={ratingPop} size={24} />}
                  </button>
                </TapScale>
              )
            })}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-guac-600" />
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
                        ? 'bg-guac-700 border-guac-700 text-white shadow'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-guac-line2 hover:text-guac-700'
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
        {current.receipt_link && !current.from_statement && (() => {
          // Image pages only — a snapshot PDF lives in extra_page_urls too, but
          // gets its own "PDF" button below rather than an image-page slot.
          const extras = (Array.isArray(current.extra_page_urls) ? current.extra_page_urls : [])
            .filter((u) => !String(u).endsWith('.pdf'))
          const pages = [current.receipt_link, ...extras]
          if (pages.length === 1) {
            return (
              <a
                href={current.receipt_link}
                target="_blank"
                rel="noreferrer"
                title="View receipt image"
                aria-label="View receipt image"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-guac-700 text-white hover:bg-guac-700 active:scale-95 transition-all shadow-sm font-bold text-sm">
                <ImageIcon size={16} /> View image
              </a>
            )
          }
          // Multi-page receipt — show one button per page so the user can open each.
          return (
            <div className="inline-flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-guac-700 mr-1">{pages.length} pages:</span>
              {pages.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  title={`Open page ${i + 1}`} aria-label={`Open page ${i + 1}`}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-guac-700 text-white hover:bg-guac-700 active:scale-95 transition-all shadow-sm text-xs font-bold">
                  <ImageIcon size={12} /> {i + 1}
                </a>
              ))}
            </div>
          )
        })()}
        {/* PDF of the source email — durable, printable, attachable to a return
            or warranty claim. Present once the snapshot has run. */}
        {(() => {
          const pdf = (Array.isArray(current.extra_page_urls) ? current.extra_page_urls : [])
            .find((u) => String(u).endsWith('.pdf'))
          return pdf ? (
            <a href={pdf} target="_blank" rel="noreferrer"
              title="Download this receipt as a PDF"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-guac-line2 text-guac-700 hover:bg-guac-50 active:scale-95 transition-all shadow-sm font-bold text-sm">
              <FileText size={16} /> PDF
            </a>
          ) : null
        })()}
        {/* Auto-snapshot in progress (email receipt with no image yet). */}
        {snapshot.isPending && !current.receipt_link && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-guac-50 text-guac-700 text-sm font-semibold">
            <RefreshCw size={14} className="animate-spin" /> Saving email image…
          </span>
        )}
        {/* View the raw source email — stays available even after the snapshot,
            so the user can always see exactly what arrived. */}
        {!current.from_statement && emailMsg && (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            title="View the source email this receipt was parsed from"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-guac-line2 text-guac-700 hover:bg-guac-50 active:scale-95 transition-all shadow-sm font-bold text-sm">
            <MessageCircle size={16} /> View email
          </button>
        )}
        <button onClick={handleSave} disabled={updateReceipt.isPending} className="btn-primary">
          <Save size={15} /> {updateReceipt.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Source-email viewer — email receipts have no photo, so show the
          original email (sandboxed iframe = no script execution). */}
      {showEmail && emailMsg && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowEmail(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-guac-700 flex items-center gap-1"><MessageCircle size={12} /> Source email</div>
                <div className="font-bold text-gray-900 truncate mt-0.5">{emailMsg.subject || '(no subject)'}</div>
                <div className="text-xs text-gray-500 truncate">From {emailMsg.from_addr || 'unknown sender'}</div>
              </div>
              <button onClick={() => setShowEmail(false)} aria-label="Close" className="text-gray-400 hover:text-gray-700 shrink-0"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 min-h-[300px]">
              {emailMsg.body_html
                ? <iframe title="Source email" sandbox="" className="w-full h-[60vh] bg-white border-0" srcDoc={emailMsg.body_html} />
                : <pre className="p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans">{emailMsg.body_text || 'No email body was stored for this receipt.'}</pre>}
            </div>
          </div>
        </div>
      )}

      {/* Refund Policy */}
      {refundPolicies.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-guac-600" />
            <h3 className="gg-h2">Refund Policy</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="gg-tbl w-full text-sm">
              <thead className="border-b border-guac-line gg-colhead">
                <tr>
                  <th className="px-3 py-1 text-left">Policy</th>
                  <th className="px-3 py-1 text-left">Days</th>
                  <th className="px-3 py-1 text-left">Expires</th>
                  <th className="px-3 py-1 text-left">Eligible</th>
                  <th className="px-3 py-1 text-left">Source</th>
                  <th className="px-3 py-1 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-guac-line">
                {refundPolicies.map(p => {
                  const expired = p.expiry_date && new Date(p.expiry_date) < new Date()
                  // Source badge: where the policy data came from. Lets the user
                  // see at a glance whether the policy was printed on their
                  // receipt vs looked up from a store's published default.
                  const sourceInfo = {
                    'receipt':       { label: 'On receipt',      cls: 'bg-guac-50 text-guac-700 border-guac-line', tip: 'Printed on the receipt body' },
                    'store-default': { label: 'Store default',   cls: 'bg-sky-50 text-sky-700 border-sky-100',             tip: 'Looked up from the merchant’s published policy' },
                    'manual':        { label: 'You set this',    cls: 'bg-amber-50 text-amber-800 border-amber-100',       tip: 'Manually entered' },
                  }[p.source || 'receipt'] || {
                    label: 'Policy source', cls: 'bg-gray-50 text-gray-600 border-gray-200', tip: 'Receipt policy source',
                  }
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-1 font-medium">{p.policy_id || '—'}</td>
                      <td className="px-3 py-1 text-gray-500">{p.days ?? '—'}</td>
                      <td className={`px-3 py-1 ${expired ? 'text-rose-600 font-medium' : 'text-gray-600'}`}>
                        {p.expiry_date || '—'}{expired && ' (expired)'}
                      </td>
                      <td className="px-3 py-1">
                        <span className={p.eligible && !expired ? 'badge-green' : 'badge-gray'}>
                          {p.eligible && !expired ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-3 py-1">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${sourceInfo.cls}`} title={sourceInfo.tip}>
                            {sourceInfo.label}
                          </span>
                          {/* Clickable citation — opens the merchant's published return-policy page (Costco, Amazon, etc.) so the user can verify what we stored. Only renders when we have a URL. */}
                          {p.source_url && (
                            <a
                              href={p.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-guac-700 hover:text-guac-700 underline-offset-2 hover:underline"
                              title={`Read ${current.store_name || 'the store'}'s full return policy`}
                            >
                              View policy ↗
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1 text-gray-500">{p.details || '—'}</td>
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
          <h3 className="gg-h2">Line Items</h3>
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
            <table className="gg-tbl w-full text-sm">
              <thead className="border-b border-guac-line gg-colhead">
                <tr>{['SKU','Model','Name','Category','Date','Qty','Price','Worth It?','Policy','Warranty','Return Date','Returned','Shopping List'].map(h =>
                  <th key={h} className="px-3 py-1 text-left">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-guac-line">
                {items.map(item => {
                  // Per-line non-returnable check: covers charity, subs,
                  // cloud (hosting/domain/AWS), bills, bank-fees, drinks,
                  // tea, bars, eats, gas-up — plus name-keyword heuristics
                  // (domain renewal, subscription, etc.) and a known-service-
                  // merchant fallback (IONOS, GoDaddy, AWS, …).
                  const nonReturnable = isItemNonReturnable(item, current)
                  return (
                  <tr key={item.id}>
                    <td className="px-3 py-1 text-gray-400">{item.sku || '—'}</td>
                    <td className="px-3 py-1 text-gray-400">{item.model || '—'}</td>
                    <td className="px-3 py-1 font-medium">
                      <span>{item.item_name}</span>
                      {/* Guac-AI semantic tag chip — small inline pill, only
                          rendered when the tagger filled ai_tag with a value
                          from the fixed vocabulary (lib/itemTagVocab.js). */}
                      {item.ai_tag && ITEM_TAG_META[item.ai_tag] && (
                        <span
                          className={`ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${ITEM_TAG_META[item.ai_tag].tone}`}
                          title={`Guac-AI tag: ${ITEM_TAG_META[item.ai_tag].label}`}
                        >
                          <span>{ITEM_TAG_META[item.ai_tag].emoji}</span>
                          <span>{ITEM_TAG_META[item.ai_tag].label}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1">
                      <CategoryPicker
                        size="xs"
                        value={item.category}
                        onChange={(slug) => recat.mutate({ slug, item })}
                        disabled={recat.isPending}
                      />
                    </td>
                    <td className="px-3 py-1 text-gray-400">{item.purchase_date || '—'}</td>
                    <td className="px-3 py-1">{item.qty}</td>
                    <td className="px-3 py-1">${item.price}</td>
                    <td className="px-3 py-1">
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
                              onClick={() => {
                                updateItem.mutate({
                                  id: item.id,
                                  rating: n,
                                  validated_at: new Date().toISOString(),
                                })
                                mascotBus.celebrate('Rated!')
                              }}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                                active ? 'bg-guac-100 ring-2 ring-guac-600 scale-110' : 'hover:bg-guac-50 opacity-60 hover:opacity-100'
                              }`}>
                              {emoji}
                            </button>
                          )
                        })}
                      </div>
                      )}
                    </td>
                    <td className="px-3 py-1">
                      {item.refund_policy_id
                        ? <span className="badge-purple text-xs">{item.refund_policy_id}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-1">
                      <input className="input py-0.5 text-xs w-32" defaultValue={item.warranty_info}
                        onBlur={e => updateItem.mutate({ id: item.id, warranty_info: e.target.value })} />
                    </td>
                    <td className="px-3 py-1">
                      {nonReturnable ? (
                        <span className="text-[10px] text-gray-400" title="Non-returnable line — no return window">—</span>
                      ) : (
                        <input type="date" className="input py-0.5 text-xs" defaultValue={item.return_date}
                          onBlur={e => updateItem.mutate({ id: item.id, return_date: e.target.value })} />
                      )}
                    </td>
                    <td className="px-3 py-1">
                      {nonReturnable ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-1.5 py-0.5"
                          title={
                            item.returned ? 'Already returned' :
                            item.category === 'charity' ? 'Charitable contribution — no return' :
                            item.category === 'cloud' ? 'Cloud / hosting / domain service — no return' :
                            item.category === 'subs' ? 'Subscription — cancel via the merchant' :
                            item.category === 'bills' ? 'Utility bill — no return' :
                            item.category === 'bank-fees' ? 'Bank fee — dispute via issuer' :
                            'Non-returnable line item'
                          }
                        >
                          {item.category === 'charity' ? '❤️ Donation'
                            : item.category === 'cloud' ? '☁️ Service'
                            : item.category === 'subs' ? '🔁 Subscription'
                            : item.category === 'bills' ? '💡 Utility'
                            : item.category === 'bank-fees' ? '💸 Bank fee'
                            : '— No return'}
                        </span>
                      ) : (
                        <input type="checkbox" checked={item.returned || false}
                          onChange={e => updateItem.mutate({ id: item.id, returned: e.target.checked })} />
                      )}
                    </td>
                    <td className="px-3 py-1">
                      {nonReturnable ? (
                        <span className="text-[10px] text-gray-400">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToSmashlist(item)}
                          title="Add to Shopping List"
                          aria-label="Add to Shopping List"
                          className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-rose-500 to-fuchsia-600 text-white shadow-md hover:shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center ring-2 ring-white hover:ring-amber-200 group">
                          <span className="absolute -top-1 -right-1 text-[10px] drop-shadow-sm">🥑</span>
                          <ShoppingCart size={15} className="drop-shadow-sm" />
                        </button>
                      )}
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
