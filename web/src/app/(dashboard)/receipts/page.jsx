'use client'
import { useState, useCallback, useRef, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useReceipts, useReceipt, useAddReceipt, useDeleteReceipt, useUpdateReceiptItem } from '../../../hooks/useReceipts'
import { addToShoppingList } from '../../../lib/db'
import { uploadReceiptForParse } from '../../../lib/parse-receipt-upload'
import { createClient } from '../../../lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatDateShort } from '../../../lib/dateFormat'
import { Upload, Trash2, Eye, Search, Download, Loader2, Sparkles, X, Shield, Camera, ChevronDown, ChevronRight, Undo2, ShoppingCart, Monitor, Link2, Tag, RefreshCw } from 'lucide-react'
import { guessCategory } from '../../../lib/categorizeRules'
import { createClient as createSbClient } from '../../../lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import CameraCapture from '../../../components/CameraCapture'
import ScreenshotCapture from '../../../components/ScreenshotCapture'
import GuacMascot from '../../../components/GuacMascot'

const EMPTY = { store_name: '', date: '', total_amount: '', tax_paid: '', reward_no: '', business_purchase: false }

// Column definitions for the receipts table. `default` is the initial pixel
// width; users can drag the right edge of any header to override, and the
// override is persisted to localStorage under 'receipts_col_widths_v1'.
const RECEIPT_COLUMNS = [
  { id: 'id',       label: 'Receipt ID', default: 140 },
  { id: 'store',    label: 'Store',      default: 220 },
  { id: 'date',     label: 'Date',       default: 120 },
  { id: 'amount',   label: 'Amount',     default: 110 },
  { id: 'tax',      label: 'Tax',        default: 90  },
  { id: 'reward',   label: 'Reward No',  default: 130 },
  { id: 'business', label: 'Business',   default: 90  },
  { id: 'receipt',  label: 'Receipt',    default: 90  },
  { id: 'actions',  label: 'Actions',    default: 130 },
]

export default function ReceiptsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parsedItems, setParsedItems] = useState([])
  const [storeInfo, setStoreInfo] = useState(null)
  const [locationInfo, setLocationInfo] = useState(null)
  const [refundPolicies, setRefundPolicies] = useState([])
  const [duplicate, setDuplicate] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  // Only one row can be expanded at a time — clicking another auto-closes the previous.
  const [expandedId, setExpandedId] = useState(null)

  function toggleExpanded(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const sb = createClient(); const { data } = await sb.auth.getUser(); return data.user },
  })

  const { data: receipts = [], isLoading } = useReceipts()
  const addReceipt = useAddReceipt()
  const deleteReceipt = useDeleteReceipt()

  // Resizable column state — widths persist in localStorage so a user's
  // preferred layout survives reloads. Drag the 1px handle on the right edge
  // of any header cell to resize.
  const [colWidths, setColWidths] = useState(() => {
    const defaults = Object.fromEntries(RECEIPT_COLUMNS.map(c => [c.id, c.default]))
    if (typeof window === 'undefined') return defaults
    try {
      const saved = JSON.parse(localStorage.getItem('receipts_col_widths_v1') || '{}')
      return { ...defaults, ...saved }
    } catch { return defaults }
  })
  useEffect(() => {
    try { localStorage.setItem('receipts_col_widths_v1', JSON.stringify(colWidths)) } catch {}
  }, [colWidths])
  const startResize = useCallback((e, colId) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[colId] || RECEIPT_COLUMNS.find(c => c.id === colId)?.default || 100
    const onMove = (ev) => {
      const newW = Math.max(50, Math.min(700, startW + (ev.clientX - startX)))
      setColWidths(prev => ({ ...prev, [colId]: newW }))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colWidths])

  const parseReceipt = useCallback(async (f) => {
    setParsing(true)
    setParsedItems([])
    setRefundPolicies([])
    setLocationInfo(null)
    try {
      // Shared helper handles MIME-from-extension fallback + retry on
      // transient errors. Was inline fetch — duplicated in quickProcess
      // and didn't recover from network blips or wrong content-type from
      // mobile-browser camera captures.
      const data = await uploadReceiptForParse(f)
      console.log('[parse-receipt] result', data)
      setForm(prev => ({
        ...prev,
        store_name: data.store_name || prev.store_name,
        date: data.date || prev.date,
        total_amount: data.total_amount ?? prev.total_amount,
        tax_paid: data.tax_paid ?? prev.tax_paid,
      }))
      if (Array.isArray(data.items) && data.items.length > 0) setParsedItems(data.items)
      setStoreInfo({
        store_name: data.store_name,
        address: data.store_address,
        phone_no: data.store_phone,
        website: data.store_website,
      })
      setLocationInfo({
        location_name: data.location_name,
        address: data.store_address,
        city: data.store_city,
        state: data.store_state,
        zip: data.store_zip,
        phone_no: data.store_phone,
        store_no: data.store_no,
      })
      setRefundPolicies(data.refund_policies || [])
      const msgBits = [`${data.items?.length ?? 0} items`]
      if (data.refund_policies?.length) msgBits.push(`${data.refund_policies.length} refund polic${data.refund_policies.length === 1 ? 'y' : 'ies'}`)
      toast.success(`Receipt scanned — ${msgBits.join(', ')}`)
    } catch (err) {
      toast.error('Scan failed: ' + err.message)
    } finally {
      setParsing(false)
    }
  }, [])

  const onDrop = useCallback(async (files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    if (!f.type.startsWith('application/pdf') && !f.type.startsWith('image/')) return
    await parseReceipt(f)
  }, [parseReceipt])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [], 'application/pdf': [] }, maxFiles: 1
  })

  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  function updateItem(i, field, val) {
    setParsedItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function removeItem(i) {
    setParsedItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function doSave(existingId = null) {
    setDuplicate(null)
    const receiptData = { ...form, processed: parsedItems.length > 0 }
    if (existingId) receiptData.id = existingId
    addReceipt.mutate(
      {
        receipt: receiptData,
        file,
        userId: user?.id,
        items: parsedItems,
        storeInfo,
        locationInfo,
        refundPolicies,
      },
      {
        onSuccess: () => {
          toast.success(existingId ? 'Receipt updated' : 'Receipt saved')
          setForm(EMPTY); setFile(null); setParsedItems([]); setRefundPolicies([]); setLocationInfo(null); setShowForm(false)
        },
        onError: err => toast.error(err.message),
      }
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    const dup = receipts.find(r =>
      r.store_name?.toLowerCase() === form.store_name?.toLowerCase() && r.date === form.date
    )
    if (dup) { setDuplicate(dup); return }
    doSave()
  }

  function handleCancel() {
    setShowForm(false); setForm(EMPTY); setFile(null); setParsedItems([])
    setDuplicate(null); setStoreInfo(null); setLocationInfo(null); setRefundPolicies([])
  }

  function updatePolicy(i, field, val) {
    setRefundPolicies(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }
  function removePolicy(i) {
    setRefundPolicies(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleDelete(id) {
    if (!confirm('Delete this receipt?')) return
    deleteReceipt.mutate(id, {
      onSuccess: () => toast.success('Deleted'),
      onError: err => toast.error(err.message),
    })
  }

  // Track which receipts are mid-reparse so we can spin the icon. Set, not
  // bool, so multiple rows can spin in parallel if the user hammers it.
  const [reparsing, setReparsing] = useState(() => new Set())
  async function handleReparse(id, storeName) {
    if (reparsing.has(id)) return
    setReparsing(prev => new Set(prev).add(id))
    const t = toast.loading(`Re-parsing ${storeName || 'receipt'}…`)
    try {
      const res = await fetch(`/api/receipts/${id}/reparse`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Re-parse failed (${res.status})`)
      const updatedStore = body?.receipt?.store_name || storeName || 'Receipt'
      const items = body?.items_parsed || 0
      toast.success(`Re-parsed ${updatedStore} · ${items} items`, { id: t, duration: 4000 })
      qc.invalidateQueries({ queryKey: ['receipts'] })
      // Re-parse changes the store_name / total / items, so any
      // server-rendered aggregation (Spending by Store, top categories)
      // needs a refresh too — same pattern as useDeleteReceipt.
      router.refresh()
    } catch (e) {
      toast.error(e.message, { id: t })
    } finally {
      setReparsing(prev => {
        const next = new Set(prev); next.delete(id); return next
      })
    }
  }

  // Top-level drag-drop: parse + save in one shot, no manual review.
  // Bulk: drops multiple files → processes them sequentially.
  const [quickBusy, setQuickBusy] = useState(0)

  const quickProcess = useCallback(async (f) => {
    // Same helper as the manual-review path so the bulk-drop quickProcess
    // also gets MIME fix-up + transient retry. The previous inline fetch
    // had no recovery for application/octet-stream uploads or flaky
    // connections — now matches the mobile v0.2.40 retry policy.
    const data = await uploadReceiptForParse(f)
    if (!data.store_name || !data.date) throw new Error('Missing store or date')

    const receiptData = {
      store_name: data.store_name,
      date: data.date,
      total_amount: data.total_amount ?? 0,
      tax_paid: data.tax_paid ?? 0,
      business_purchase: false,
      processed: (data.items?.length || 0) > 0,
    }
    const storeInfo = {
      store_name: data.store_name,
      address: data.store_address,
      phone_no: data.store_phone,
      website: data.store_website,
    }
    const locationInfo = {
      location_name: data.location_name,
      address: data.store_address,
      city: data.store_city,
      state: data.store_state,
      zip: data.store_zip,
      phone_no: data.store_phone,
      store_no: data.store_no,
    }
    const saved = await addReceipt.mutateAsync({
      receipt: receiptData,
      file: f,
      userId: user?.id,
      items: data.items || [],
      storeInfo,
      locationInfo,
      refundPolicies: data.refund_policies || [],
    })
    return { ...data, _savedId: saved?.id }
  }, [user?.id, addReceipt])

  const onQuickDrop = useCallback(async (files) => {
    if (!files?.length) return
    if (!user?.id) { toast.error('Sign in first'); return }
    setQuickBusy(files.length)
    let ok = 0, fail = 0
    let lastSavedId = null
    for (const f of files) {
      try {
        const data = await quickProcess(f)
        ok++
        lastSavedId = data._savedId || lastSavedId
        toast.success(`${data.store_name} • $${Number(data.total_amount || 0).toFixed(2)} saved (${data.items?.length || 0} items)`)
      } catch (err) {
        fail++
        toast.error(`${f.name}: ${err.message}`)
      } finally {
        setQuickBusy(n => Math.max(0, n - 1))
      }
    }
    if (files.length > 1) toast(`Done — ${ok} saved${fail ? `, ${fail} failed` : ''}`)
    // Single-file upload → jump straight to detail page so the items are visible
    if (files.length === 1 && lastSavedId) {
      router.push(`/receipts/${lastSavedId}`)
    }
  }, [user?.id, quickProcess, router])

  // Drag-and-drop state. We use native window handlers so we can:
  //   1) Stop the browser from opening files dropped outside our zone (default behavior)
  //   2) Show a full-page drop overlay so users can drop ANYWHERE on the page
  // Works in Chrome, Firefox, Edge, Safari.
  const [pageDragging, setPageDragging] = useState(false)
  useEffect(() => {
    let dragDepth = 0
    const hasFiles = (e) => {
      const types = e.dataTransfer?.types
      if (!types) return false
      // DataTransferItemList vs DOMStringList — both have a .contains-equivalent
      return Array.from(types).includes('Files')
    }
    const onEnter = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth++
      setPageDragging(true)
    }
    const onOver = (e) => {
      if (!hasFiles(e)) return
      // MUST preventDefault on dragover or the drop event won't fire on most browsers
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onLeave = (e) => {
      if (!hasFiles(e)) return
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) setPageDragging(false)
    }
    const onDropWin = (e) => {
      // If a file makes it to the window drop handler, it was NOT dropped on the overlay's
      // explicit onDrop. Swallow it so the browser doesn't navigate to the file.
      const files = e.dataTransfer?.files
      if (files && files.length) e.preventDefault()
      dragDepth = 0
      setPageDragging(false)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDropWin)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDropWin)
    }
  }, [])

  // Drop handler on the visible overlay
  const handleOverlayDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setPageDragging(false)
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length) onQuickDrop(files)
  }

  // Click-to-upload for the header button
  const quickFileRef = useRef(null)
  const handleQuickClick = () => quickFileRef.current?.click()
  const handleQuickChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length) onQuickDrop(files)
    e.target.value = ''
  }

  // Camera capture: opens a real video-preview modal (works on PC + Android).
  // Falls back to a file input automatically inside CameraCapture if getUserMedia fails.
  const [cameraOpen, setCameraOpen] = useState(false)
  const handleCameraClick = () => setCameraOpen(true)
  const handleCameraCapture = (file) => onQuickDrop([file])

  // Screen capture: pick another monitor / window / tab and grab one frame.
  // Useful for grabbing a receipt that's already on screen (email body, PDF
  // viewer on another monitor, an order-confirmation tab, etc.).
  const [screenOpen, setScreenOpen] = useState(false)
  const handleScreenClick = () => setScreenOpen(true)

  // Auto-categorize: rule-based first pass (free, instant), AI fallback for
  // anything unmatched. Targets receipts with no category or "misc". Updates
  // are batched per row but parallelized for speed.
  const [autocatBusy, setAutocatBusy] = useState(false)
  const uncategorizedCount = receipts.filter(r =>
    !r.category || r.category === 'misc'
  ).length
  async function handleAutoCategorize() {
    if (uncategorizedCount === 0) {
      toast('Every receipt is already categorized', { icon: '✓' })
      return
    }
    setAutocatBusy(true)
    try {
      const sb = createSbClient()
      const targets = receipts.filter(r => !r.category || r.category === 'misc')

      // ── Pass 1: rule-based ────────────────────────────────────────────
      const ruleHits = []
      const stillUnknown = []
      for (const r of targets) {
        const guess = guessCategory(r.store_name)
        if (guess && guess !== 'misc') ruleHits.push({ id: r.id, slug: guess })
        else stillUnknown.push(r)
      }

      // ── Pass 2: AI fallback for unknowns ─────────────────────────────
      let aiHits = []
      if (stillUnknown.length > 0) {
        try {
          const res = await fetch('/api/categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receipts: stillUnknown.map(r => ({
                id: r.id,
                store_name: r.store_name,
                total_amount: r.total_amount,
              })),
            }),
          })
          const data = await res.json()
          if (res.ok && data.categories) {
            aiHits = Object.entries(data.categories)
              .filter(([, slug]) => slug && slug !== 'misc')
              .map(([id, slug]) => ({ id, slug }))
          } else if (!res.ok) {
            console.warn('[auto-categorize] AI failed:', data.error)
          }
        } catch (e) {
          console.warn('[auto-categorize] AI error:', e.message)
        }
      }

      // ── Persist ─────────────────────────────────────────────────────
      const all = [...ruleHits, ...aiHits]
      if (all.length === 0) {
        toast('Couldn\'t confidently categorize any. Try labeling a few manually.', { icon: '🤔' })
        return
      }
      const results = await Promise.allSettled(
        all.map(({ id, slug }) => sb.from('receipts').update({ category: slug }).eq('id', id))
      )
      const ok = results.filter(r => r.status === 'fulfilled' && !r.value?.error).length
      const fail = results.length - ok
      toast.success(`Categorized ${ok} receipt${ok === 1 ? '' : 's'}${fail ? ` · ${fail} failed` : ''} (rules: ${ruleHits.length}, AI: ${aiHits.length})`)
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      router.refresh()
    } catch (e) {
      toast.error(`Auto-categorize failed: ${e.message}`)
    } finally {
      setAutocatBusy(false)
    }
  }

  // Reconcile: pair statement rows with real receipts (date/store/amount match).
  // The server RPC runs in one shot and returns the number of new pairs created.
  const qc = useQueryClient()
  const [reconciling, setReconciling] = useState(false)
  const unreconciledStatementCount = receipts.filter(r => r.from_statement && !r.reconciled).length
  async function handleReconcileAll() {
    setReconciling(true)
    try {
      const res = await fetch('/api/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reconcile failed')
      if (data.paired > 0) toast.success(`Paired ${data.paired} statement row${data.paired === 1 ? '' : 's'} with receipts`)
      else toast('No new matches found', { icon: '🔍' })
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      router.refresh()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setReconciling(false)
    }
  }
  async function handleUnreconcile(id) {
    try {
      const res = await fetch('/api/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unreconcile: id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unlink failed')
      toast.success('Unlinked')
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      router.refresh()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Global clipboard paste — Ctrl/Cmd+V anywhere on the /receipts page that
  // contains an image (e.g. just took a screenshot with Win+Shift+S, or
  // copied an image from another tab) auto-uploads it.
  useEffect(() => {
    const onPaste = (e) => {
      // Don't hijack pastes into actual inputs — only fire when the user
      // pastes onto the page body / a non-input element.
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return

      const items = e.clipboardData?.items
      if (!items) return
      const files = []
      for (const item of items) {
        if (item.kind !== 'file') continue
        if (!item.type.startsWith('image/')) continue
        const blob = item.getAsFile()
        if (!blob) continue
        const ext = (item.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
        files.push(new File([blob], `pasted-${Date.now()}.${ext}`, { type: item.type }))
      }
      if (files.length) {
        e.preventDefault()
        toast(`Pasted ${files.length} screenshot${files.length === 1 ? '' : 's'} — scanning…`, { icon: '📋' })
        onQuickDrop(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onQuickDrop])

  const filtered = receipts.filter(r =>
    r.store_name?.toLowerCase().includes(search.toLowerCase()) || r.id?.includes(search)
  )

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => allSelected ? new Set() : new Set(filtered.map(r => r.id)))
  }
  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} receipt${selected.size === 1 ? '' : 's'}?`)) return
    const ids = [...selected]
    const results = await Promise.allSettled(ids.map(id => deleteReceipt.mutateAsync(id)))
    const failed = results.filter(r => r.status === 'rejected').length
    setSelected(new Set())
    if (failed) toast.error(`${failed} failed`); else toast.success(`Deleted ${ids.length}`)
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
      <ScreenshotCapture open={screenOpen} onClose={() => setScreenOpen(false)} onCapture={(f) => onQuickDrop([f])} />
      {/* Full-page drop overlay — interactive (it IS the drop target).
          pointer-events-auto so the drop actually registers. */}
      {pageDragging && !showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDrop={handleOverlayDrop}
        >
          <div className="rounded-2xl border-4 border-dashed border-blue-500 bg-white/95 px-10 py-8 flex flex-col items-center gap-3 shadow-2xl pointer-events-none">
            <Upload size={48} className="text-blue-600 animate-bounce" />
            <p className="text-xl font-semibold text-blue-800">Drop to auto-add</p>
            <p className="text-sm text-gray-500">PDF or images — we&apos;ll scan and save each one</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">Receipts</h1>
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          {/* Click-to-upload button styled like a dropzone (the actual drop target is the overlay) */}
          <button
            type="button"
            onClick={handleQuickClick}
            className={`flex-1 max-w-md cursor-pointer rounded-xl border-2 border-dashed px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-all ${
              quickBusy > 0 ? 'border-amber-400 bg-amber-50 text-amber-700' :
              pageDragging ? 'border-blue-500 bg-blue-50 text-blue-700 scale-105' :
              'border-gray-300 text-gray-500 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            {quickBusy > 0 ? (
              <><Loader2 size={15} className="animate-spin" /><span>Scanning {quickBusy} file{quickBusy === 1 ? '' : 's'}…</span></>
            ) : (
              <><Upload size={15} /><span>Drop, click, or paste (Ctrl+V) to upload</span></>
            )}
          </button>
          <input
            ref={quickFileRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleQuickChange}
          />
          <button type="button" onClick={handleCameraClick} className="btn-secondary" title="Take a photo of the receipt">
            <Camera size={16} /> Camera
          </button>
          <button type="button" onClick={handleScreenClick} className="btn-secondary" title="Capture a receipt that's open on another screen, window, or tab">
            <Monitor size={16} /> Screen
          </button>
          {unreconciledStatementCount > 0 && (
            <button
              type="button"
              onClick={handleReconcileAll}
              disabled={reconciling}
              className="btn-secondary"
              title="Match unreconciled statement rows to real receipts by date, store, and amount"
            >
              {reconciling ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={16} />}
              Reconcile <span className="ml-1 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full px-1.5">{unreconciledStatementCount}</span>
            </button>
          )}
          {uncategorizedCount > 0 && (
            <button
              type="button"
              onClick={handleAutoCategorize}
              disabled={autocatBusy}
              className="btn-secondary"
              title="Auto-categorize uncategorized receipts (rules + AI fallback)"
            >
              {autocatBusy ? <Loader2 size={14} className="animate-spin" /> : <Tag size={16} />}
              Auto-categorize <span className="ml-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full px-1.5">{uncategorizedCount}</span>
            </button>
          )}
          <Link href="/validate"
            className="group inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-rose-500 text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all"
            title="Rate your purchases — high = must-have, low = adhoc">
            <span className="text-base leading-none">🥑</span>
            <span>Worth&nbsp;It?</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80 hidden sm:inline">Validate</span>
          </Link>
        </div>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">New Receipt</h3>

          {/* Upload zone — first so scanning fills the form below */}
          <div>
            <label className="label">Upload Receipt</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : parsing ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}>
              <input {...getInputProps()} />
              {parsing ? (
                <div className="flex flex-col items-center gap-2 text-amber-700">
                  <Loader2 size={22} className="animate-spin" />
                  <p className="text-sm font-medium">Scanning receipt with Guac-AI…</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-1">
                  <Sparkles size={20} className="text-green-600" />
                  <p className="text-sm text-green-700 font-medium">{file.name}</p>
                  <p className="text-xs text-gray-400">Drop a new file to re-scan</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload size={22} />
                  <p className="text-sm">Drop receipt image or PDF — fields auto-fill from the scan</p>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="label">Store Name</label>
                <input required className="input" value={form.store_name} onChange={s('store_name')} placeholder="Auto-filled from scan" />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" required className="input" value={form.date} onChange={s('date')} />
              </div>
              <div>
                <label className="label">Total Amount ($)</label>
                <input type="number" step="0.01" required className="input" value={form.total_amount} onChange={s('total_amount')} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Tax Paid ($)</label>
                <input type="number" step="0.01" className="input" value={form.tax_paid} onChange={s('tax_paid')} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Reward No</label>
                <input className="input" value={form.reward_no} onChange={s('reward_no')} />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" id="biz" className="w-4 h-4 rounded" checked={form.business_purchase}
                  onChange={e => setForm(p => ({ ...p, business_purchase: e.target.checked }))} />
                <label htmlFor="biz" className="text-sm font-medium">Business Purchase</label>
              </div>
            </div>

            {/* Parsed line items preview */}
            {parsedItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Line Items <span className="text-blue-600 font-semibold">({parsedItems.length} scanned)</span></label>
                </div>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left w-16">Qty</th>
                        <th className="px-3 py-2 text-left w-24">Price ($)</th>
                        <th className="px-3 py-2 text-left w-28">SKU</th>
                        <th className="px-3 py-2 text-left w-28">Model</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedItems.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-3 py-0.5">
                            <input className="input py-1 text-sm" value={item.item_name} onChange={e => updateItem(i, 'item_name', e.target.value)} />
                          </td>
                          <td className="px-3 py-0.5">
                            <input type="number" min="1" className="input py-1 text-sm w-16" value={item.qty} onChange={e => updateItem(i, 'qty', +e.target.value)} />
                          </td>
                          <td className="px-3 py-0.5">
                            <input type="number" step="0.01" className="input py-1 text-sm w-24" value={item.price} onChange={e => updateItem(i, 'price', +e.target.value)} />
                          </td>
                          <td className="px-3 py-0.5">
                            <input className="input py-1 text-sm w-28" value={item.sku || ''} onChange={e => updateItem(i, 'sku', e.target.value)} />
                          </td>
                          <td className="px-3 py-0.5">
                            <input className="input py-1 text-sm w-28" value={item.model || ''} onChange={e => updateItem(i, 'model', e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Refund policies preview */}
            {refundPolicies.length > 0 && (
              <div>
                <label className="label flex items-center gap-1.5">
                  <Shield size={13} className="text-emerald-500" /> Refund Policy
                  <span className="text-emerald-600 font-semibold">({refundPolicies.length} scanned)</span>
                </label>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-50/60 text-xs text-emerald-700 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left w-16">Policy</th>
                        <th className="px-3 py-2 text-left w-16">Days</th>
                        <th className="px-3 py-2 text-left w-32">Expires</th>
                        <th className="px-3 py-2 text-left w-20">Eligible</th>
                        <th className="px-3 py-2 text-left">Details</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {refundPolicies.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-3 py-0.5">
                            <input className="input py-1 text-sm w-14" value={p.policy_id || ''} onChange={e => updatePolicy(i, 'policy_id', e.target.value)} />
                          </td>
                          <td className="px-3 py-0.5">
                            <input type="number" className="input py-1 text-sm w-14" value={p.days ?? ''} onChange={e => updatePolicy(i, 'days', e.target.value ? +e.target.value : null)} />
                          </td>
                          <td className="px-3 py-0.5">
                            <input type="date" className="input py-1 text-sm" value={p.expiry_date || ''} onChange={e => updatePolicy(i, 'expiry_date', e.target.value)} />
                          </td>
                          <td className="px-3 py-0.5 text-center">
                            <input type="checkbox" checked={p.eligible !== false} onChange={e => updatePolicy(i, 'eligible', e.target.checked)} />
                          </td>
                          <td className="px-3 py-0.5">
                            <input className="input py-1 text-sm" value={p.details || ''} onChange={e => updatePolicy(i, 'details', e.target.value)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <button type="button" onClick={() => removePolicy(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {duplicate && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800">Receipt already exists</p>
                <p className="text-sm text-amber-700">
                  A receipt from <strong>{duplicate.store_name}</strong> on <strong>{formatDateShort(duplicate.date)}</strong> (${parseFloat(duplicate.total_amount).toFixed(2)}) was found.
                  Do you want to update it?
                </p>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => doSave(duplicate.id)} disabled={addReceipt.isPending} className="btn-primary text-xs py-1.5">
                    {addReceipt.isPending ? 'Updating…' : 'Yes, Update Existing'}
                  </button>
                  <button type="button" onClick={() => doSave()} disabled={addReceipt.isPending} className="btn-secondary text-xs py-1.5">
                    Save as New
                  </button>
                  <button type="button" onClick={() => setDuplicate(null)} className="btn-ghost text-xs py-1.5">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!duplicate && (
              <div className="flex gap-3">
                <button type="submit" disabled={addReceipt.isPending || parsing} className="btn-primary">
                  {addReceipt.isPending ? 'Saving…' : 'Save Receipt'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Search + bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search store or ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
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

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading receipts…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <GuacMascot expression="relaxing" size={140} />
            <p className="text-gray-500">No receipts. Drop one above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 40 }} />
                {RECEIPT_COLUMNS.map(c => (
                  <col key={c.id} style={{ width: colWidths[c.id] }} />
                ))}
              </colgroup>
              <thead className="bg-gray-50 border-b text-xs text-gray-500">
                <tr>
                  <th className="pl-4 pr-2 py-1">
                    <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={allSelected}
                      onChange={toggleAll} aria-label="Select all" />
                  </th>
                  {RECEIPT_COLUMNS.map(c => (
                    <th key={c.id} className="px-4 py-1 text-left relative select-none overflow-hidden whitespace-nowrap text-ellipsis">
                      {c.label}
                      <span
                        onMouseDown={(e) => startResize(e, c.id)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-400 active:bg-emerald-500 transition-colors"
                        title="Drag to resize"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const isExpanded = expandedId === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => router.push(`/receipts/${r.id}`)}
                        className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${selected.has(r.id) ? 'bg-blue-50/60' : ''}`}>
                        <td className="pl-4 pr-2 py-1" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selected.has(r.id)}
                            onChange={() => toggleOne(r.id)} aria-label={`Select ${r.store_name}`} />
                        </td>
                        <td className="px-4 py-1" onClick={e => e.stopPropagation()}>
                          {(() => {
                            const itemCount = Array.isArray(r.receipt_items) ? (r.receipt_items[0]?.count ?? 0) : 0
                            const canExpand = itemCount > 0
                            // Both branches use the SAME flex layout with a 12px chevron slot
                            // so the receipt-id text starts at the same x-coordinate whether
                            // the row has line items or not. Non-expandable rows render an
                            // invisible spacer in place of the chevron.
                            const slot = canExpand
                              ? (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
                              : <span aria-hidden="true" style={{ display: 'inline-block', width: 12, height: 12 }} />
                            if (!canExpand) {
                              return (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-400 px-2 py-1" title="No line items">
                                  {slot}
                                  {r.id?.slice(0, 8) || '—'}
                                </span>
                              )
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(r.id)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                title={`Click to show ${itemCount} line item${itemCount === 1 ? '' : 's'}`}>
                                {slot}
                                {r.id?.slice(0, 8) || '—'}
                                <span className="ml-1 text-[10px] text-gray-400">·{itemCount}</span>
                              </button>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-1">
                          <div className="text-blue-700 hover:underline">{r.store_name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {r.from_statement && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100" title={r.statement_source || 'Imported from statement'}>
                                🏦 Statement
                              </span>
                            )}
                            {r.reconciled && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleUnreconcile(r.id) }}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition-colors"
                                title="Reconciled — click to unlink"
                              >
                                <Link2 size={10} /> Reconciled
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-1 text-gray-500 whitespace-nowrap">{formatDateShort(r.date)}</td>
                        <td className="px-4 py-1">${parseFloat(r.total_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-1 text-gray-500">${parseFloat(r.tax_paid || 0).toFixed(2)}</td>
                        <td className="px-4 py-1 text-gray-400 text-xs">{r.reward_no || '—'}</td>
                        <td className="px-4 py-1">
                          <span className={r.business_purchase ? 'badge-blue' : 'badge-gray'}>
                            {r.business_purchase ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-1" onClick={e => e.stopPropagation()}>
                          {r.receipt_link ? (
                            <a href={r.receipt_link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                              <Download size={15} />
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-1" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1.5">
                            <Link href={`/receipts/${r.id}`} aria-label="View"
                              className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
                              <Eye size={12} />
                            </Link>
                            <button
                              onClick={() => handleReparse(r.id, r.store_name)}
                              aria-label="Re-parse this receipt"
                              title="Re-parse this receipt from the source email (only works for email-forwarded receipts)"
                              disabled={reparsing.has(r.id)}
                              className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm">
                              <RefreshCw size={11} className={reparsing.has(r.id) ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={() => handleDelete(r.id)} aria-label="Delete"
                              className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={10} className="px-6 py-3">
                            <ReceiptLineItems receiptId={r.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

// Inline expansion: fetches the receipt + its items for the receipts-list row
function ReceiptLineItems({ receiptId }) {
  const { data, isLoading, error } = useReceipt(receiptId)
  const updateItem = useUpdateReceiptItem()

  if (isLoading) return <div className="text-xs text-gray-400 py-2">Loading items…</div>
  if (error) return <div className="text-xs text-rose-500 py-2">Failed to load: {error.message}</div>
  const items = data?.receipt_items || []
  const policies = data?.receipt_refund_policies || []
  if (items.length === 0 && policies.length === 0) {
    // Statement-imported receipts never have line items — your card issuer
    // only gives a total. Show a friendly note instead of the bare "no items".
    if (data?.from_statement) {
      return (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200">
          <span className="text-lg">💳</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-700">Straight from your card statement</p>
            <p className="text-[11px] text-gray-500">Your bank only shares the total — no per-item breakdown. Snap or forward the original receipt to unlock items + Worth-It scoring.</p>
          </div>
        </div>
      )
    }
    if (data?.is_return) {
      return (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-rose-50 border border-rose-200">
          <span className="text-lg">↩️</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-rose-900">Refund / return</p>
            <p className="text-[11px] text-rose-700">Money came back — no items to track here.</p>
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <span className="text-lg">🥑</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-900">Nothing chopped yet</p>
          <p className="text-[11px] text-emerald-700">Open the receipt to add items, or re-scan a clearer photo so Guac-AI can pull them in.</p>
        </div>
      </div>
    )
  }

  function handleToggleReturn(item) {
    const next = !item.returned
    updateItem.mutate({
      id: item.id,
      returned: next,
      return_date: next ? new Date().toISOString().slice(0, 10) : null,
    }, {
      onSuccess: () => toast.success(next ? 'Marked as returned' : 'Return cleared'),
      onError: err => toast.error(err.message),
    })
  }

  async function handleAddToSmashlist(item) {
    try {
      await addToShoppingList({
        sku: item.sku,
        item_name: item.item_name,
        qty: item.qty || 1,
        price: parseFloat(item.price || 0) || null,
        store_name_id: data?.store_id || null,
      })
      toast.success(`Added "${item.item_name}" to Smashlist 🛒`)
    } catch (e) { toast.error(e.message) }
  }

  // Build a lookup of refund policies by their policy_id so each item row
  // can render the matching policy inline (days + expiry + eligible) without
  // requiring a separate panel above. Keeps the layout uniform across
  // receipts that do and don't have policies.
  const policyById = {}
  for (const p of policies) {
    if (p.policy_id) policyById[p.policy_id] = p
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? null : (() => {
      const isNonReturnable = data?.category === 'eats' || data?.category === 'gas-up'
      return (
      <div className="rounded-lg border bg-white overflow-hidden">
      {isNonReturnable && (
        <div className="px-3 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-semibold border-b border-amber-100">
          Non-returnable category — return option hidden
        </div>
      )}
      <table className="w-full text-xs">
        <thead className="bg-gray-100/70 text-gray-500 uppercase">
          <tr>
            <th className="px-3 py-0.5 text-left">SKU</th>
            <th className="px-3 py-0.5 text-left">Model</th>
            <th className="px-3 py-0.5 text-left">Item</th>
            <th className="px-3 py-0.5 text-left">Qty</th>
            <th className="px-3 py-0.5 text-left">Price</th>
            <th className="px-3 py-0.5 text-left">Policy</th>
            {!isNonReturnable && <th className="px-3 py-0.5 text-left">Return Date</th>}
            {!isNonReturnable && <th className="px-3 py-0.5 text-left w-24">Action</th>}
            <th className="px-3 py-0.5 text-left w-12">Cart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map(it => (
            <tr key={it.id} className={it.returned ? 'bg-rose-50/40' : ''}>
              <td className="px-3 py-0.5 text-gray-400 text-[11px]">{it.sku || '—'}</td>
              <td className="px-3 py-0.5 text-gray-400 text-[11px]">{it.model || '—'}</td>
              <td className="px-3 py-0.5">
                <Link href={`/items/${it.id}`} className="text-blue-700 hover:underline" title="Item details + purchase history">
                  {it.item_name}
                </Link>
              </td>
              <td className="px-3 py-0.5">{it.qty}</td>
              <td className="px-3 py-0.5">
                {it.price == null ? <span className="text-gray-300">—</span> : `$${parseFloat(it.price).toFixed(2)}`}
              </td>
              <td className="px-3 py-0.5">
                {(() => {
                  // Render policy inline: ID + days, with expiry + eligible in
                  // the hover tooltip. Used to be a separate panel above the
                  // items table — folded here for uniform UI across receipts.
                  const pid = it.refund_policy_id
                  if (!pid) return <span className="text-gray-300">—</span>
                  const p = policyById[pid]
                  if (!p) return <span className="badge-purple text-[10px]">{pid}</span>
                  const expired = p.expiry_date && new Date(p.expiry_date) < new Date()
                  const tip = [
                    p.policy_id && `Policy ${p.policy_id}`,
                    p.days != null && `${p.days} days`,
                    p.expiry_date && `expires ${p.expiry_date}${expired ? ' (expired)' : ''}`,
                    p.eligible === false ? 'NOT eligible' : null,
                    p.details && p.details,
                  ].filter(Boolean).join(' · ')
                  const cls = expired
                    ? 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100'
                    : (p.eligible === false
                      ? 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200'
                      : 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100')
                  return (
                    <span className={cls} title={tip}>
                      {p.policy_id || pid}
                      {p.days != null && <span className="opacity-70">·{p.days}d</span>}
                    </span>
                  )
                })()}
              </td>
              {!isNonReturnable && (
                <td className="px-3 py-0.5 text-gray-500">{it.return_date || '—'}</td>
              )}
              {!isNonReturnable && (
                <td className="px-3 py-0.5">
                  <button
                    type="button"
                    onClick={() => handleToggleReturn(it)}
                    disabled={updateItem.isPending}
                    className={it.returned
                      ? 'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-rose-600 text-white hover:bg-rose-700'}>
                    <Undo2 size={11} />
                    {it.returned ? 'Undo' : 'Return'}
                  </button>
                </td>
              )}
              <td className="px-3 py-0.5">
                {(it.returned || data?.is_return || data?.from_statement) ? (
                  <span className="text-[10px] text-gray-300">—</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddToSmashlist(it)}
                    title="Add to Smashlist"
                    aria-label="Add to Smashlist"
                    className="relative w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-sm hover:shadow-md hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
                    <span className="absolute -top-1 -right-1 text-[8px]">🥑</span>
                    <ShoppingCart size={11} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )
      })()}
    </div>
  )
}
