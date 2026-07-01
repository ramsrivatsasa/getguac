'use client'
import { useState, useCallback, useRef, useEffect, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useReceipts, useReceipt, useAddReceipt, useDeleteReceipt, useUpdateReceiptItem, useBankStatementMap } from '../../../hooks/useReceipts'
import { addToShoppingList } from '../../../lib/db'
import { uploadReceiptForParse } from '../../../lib/parse-receipt-upload'
import { createClient } from '../../../lib/supabase/client'
import { useConfirm } from '../../../components/ConfirmDialog'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatDateShort } from '../../../lib/dateFormat'
import { Upload, Trash2, Eye, Search, Download, Loader2, Sparkles, X, Shield, Camera, ChevronDown, ChevronRight, Undo2, ShoppingCart, Monitor, Link2, Tag, RefreshCw, Copy, FileText, Mic, Plus } from 'lucide-react'
import { guessCategory } from '../../../lib/categorizeRules'
import { normalizeStoreName, displayStoreName } from '../../../lib/store-name-normalize'
import { logoUrlForStore } from '../../../lib/store-logo'
import { RECEIPT_CHIP_IDS, parseReceiptsUrlParams, chipToDateFrom } from '../../../lib/receipts-deeplink'
import { isItemPerishable, getNonReturnableReason } from '../../../lib/perishable'
import { isItemNonReturnable } from '../../../lib/non-returnable'
import { createClient as createSbClient } from '../../../lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import CameraCapture from '../../../components/CameraCapture'
import ReceiptScanAnimation from '../../../components/ReceiptScanAnimation'
import ScreenshotCapture from '../../../components/ScreenshotCapture'
import VoiceCapture from '../../../components/VoiceCapture'
import GuacMascot from '../../../components/GuacMascot'
import CategoryPicker from '../../../components/CategoryPicker'
import PreTripPanel from '../../../components/PreTripPanel'
import { ShimmerBox } from '../../../components/animated'
import LottieAnimation from '../../../components/LottieAnimation'
import emptyReceiptsLottie from '../../../lottie/empty-receipts.json'
import docFileSearching from '../../../lottie/doc-file-searching.json'

const EMPTY = { store_name: '', date: '', total_amount: '', tax_paid: '', reward_no: '', business_purchase: false }

// Column definitions for the receipts table. `default` is the initial pixel
// width; users can drag the right edge of any header to override, and the
// override is persisted to localStorage under 'receipts_col_widths_v2'.
// Clean column set matching the redesign mockup. The receipt id moved into
// the Store cell (under the name), and Reward No + the receipt-download column
// were dropped — both still live on the receipt detail page.
const RECEIPT_COLUMNS = [
  { id: 'store',    label: 'Store',    default: 300, align: 'left'   },
  { id: 'category', label: 'Category', default: 150, align: 'left'   },
  { id: 'date',     label: 'Date',     default: 96,  align: 'left'   },
  { id: 'amount',   label: 'Amount',   default: 110, align: 'right'  },
  { id: 'tax',      label: 'Tax',      default: 86,  align: 'right'  },
  { id: 'business', label: 'Biz',      default: 76,  align: 'center' },
  { id: 'actions',  label: 'Actions',  default: 110, align: 'right'  },
]

// First alphanumeric character of a store's display name, for the round
// avatar tile in the receipts table. Falls back to "?" for blank names.
function storeInitial(name) {
  const m = (displayStoreName(name) || '').match(/[A-Za-z0-9]/)
  return m ? m[0].toUpperCase() : '?'
}

// Receipt-table display name: brands print in ALL CAPS on receipts, but the
// redesign shows them Title Cased. Names that already carry mixed case (real
// brand casing like "McDonald's") are left untouched; only all-caps strings get
// re-cased, and the lowercase "'s" possessive is preserved.
function titleCaseStore(name) {
  const s = displayStoreName(name) || ''
  if (/[a-z]/.test(s)) return s
  return s.toLowerCase().replace(/(^|[\s&/-])([a-z])/g, (_, pre, c) => pre + c.toUpperCase())
}

// Compact "25 Jun" date (day + short month, no year) for the receipts table,
// matching the redesign mockup. Parses YYYY-MM-DD without a timezone shift.
const _MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDayMonth(dateStr) {
  if (!dateStr) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr))
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return `${String(d.getDate()).padStart(2, '0')} ${_MONTHS[d.getMonth()]}`
}

// Display-only USD formatter: thousands separators + exactly two decimals
// ($1,218.99), matching the mockup. Presentation only — the raw numeric
// values are untouched. Replaces bare .toFixed(2) on rendered amounts.
function money(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 36px store avatar — prefers a real brand logo (logoUrlForStore resolves a
// curated domain or a best-effort favicon) and falls back to the avocado
// initial tile when there's no logo or the image 404s. The error swap is what
// keeps a wrong/blank logo from ever rendering for ambiguous merchant names.
function StoreAvatar({ name }) {
  const [errored, setErrored] = useState(false)
  const url = errored ? null : logoUrlForStore(name)
  if (url) {
    return (
      <span className="shrink-0 w-9 h-9 rounded-[11px] bg-white ring-1 ring-guac-100 overflow-hidden flex items-center justify-center" title={titleCaseStore(name)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          onError={() => setErrored(true)}
          className="w-[22px] h-[22px] object-contain"
        />
      </span>
    )
  }
  return (
    <span aria-hidden="true" className="shrink-0 w-9 h-9 rounded-[11px] bg-[#F1F6EA] text-[#1F8A3D] flex items-center justify-center font-extrabold text-sm">
      {storeInitial(name)}
    </span>
  )
}

export default function ReceiptsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Initialize the search box from ?store=<name> so the Spending-by-Store
  // bars on the dashboard can deep-link into a pre-filtered receipts list.
  // Initial state from the URL via the shared deep-link parser.
  // Default chip is 1M; arriving from the dashboard chart with ?period=3M
  // (etc) overrides it. Centralized so the chip set + parse rules live in
  // one place (lib/receipts-deeplink.js).
  const initialDeeplink = parseReceiptsUrlParams(searchParams)
  const [search, setSearch] = useState(initialDeeplink.store)
  const [period, setPeriod] = useState(initialDeeplink.period)
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

  // Scope the query to the selected period. Undefined dateFrom = no
  // lower bound (for "All"). useReceipts is keyed by filters so swapping
  // periods triggers a fresh fetch automatically.
  const dateFrom = useMemo(() => chipToDateFrom(period), [period])
  const { data: receipts = [], isLoading } = useReceipts({ dateFrom })
  const { data: bankStmts = new Map() } = useBankStatementMap()
  // Quick lookup so we can resolve reconciled-but-not-from-statement rows
  // to their paired statement row's issuer/file_name without an extra query.
  const receiptById = useMemo(() => {
    const m = new Map()
    for (const r of receipts) m.set(r.id, r)
    return m
  }, [receipts])
  // Given any receipt, return the bank_statements row that explains its
  // statement linkage (its own, if from_statement; otherwise its paired
  // partner's). Returns null when there's no statement linkage at all.
  function bankInfoFor(r) {
    if (!r) return null
    if (r.statement_import_id) return bankStmts.get(r.statement_import_id) || null
    if (r.reconciled && r.reconciled_with) {
      const partner = receiptById.get(r.reconciled_with)
      if (partner?.statement_import_id) return bankStmts.get(partner.statement_import_id) || null
    }
    return null
  }
  const addReceipt = useAddReceipt()
  const deleteReceipt = useDeleteReceipt()
  const confirm = useConfirm()

  // Resizable column state — widths persist in localStorage so a user's
  // preferred layout survives reloads. Drag the 1px handle on the right edge
  // of any header cell to resize.
  const [colWidths, setColWidths] = useState(() => {
    const defaults = Object.fromEntries(RECEIPT_COLUMNS.map(c => [c.id, c.default]))
    if (typeof window === 'undefined') return defaults
    try {
      const saved = JSON.parse(localStorage.getItem('receipts_col_widths_v2') || '{}')
      return { ...defaults, ...saved }
    } catch { return defaults }
  })
  useEffect(() => {
    try { localStorage.setItem('receipts_col_widths_v2', JSON.stringify(colWidths)) } catch {}
  }, [colWidths])

  // Keep the search box AND period chip in sync with the URL so coming
  // back from the dashboard with a fresh ?store + ?period updates the
  // visible state even when this component was already mounted (e.g.
  // user already opened /receipts, then clicked a different dashboard bar).
  // Uses the shared parser so the chip allowlist + default stay in one place.
  useEffect(() => {
    const dl = parseReceiptsUrlParams(searchParams)
    if (dl.store && dl.store !== search) setSearch(dl.store)
    if (dl.period && dl.period !== period) setPeriod(dl.period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
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
        // Threaded through to receipts.validation_comment when this save
        // originated from the voice flow. Lets us grep for `[voice]`
        // rows to audit voice-parse accuracy later.
        validation_comment: voiceComment || undefined,
      },
      {
        onSuccess: () => {
          toast.success(existingId ? 'Receipt updated' : 'Receipt saved')
          setForm(EMPTY); setFile(null); setParsedItems([]); setRefundPolicies([]); setLocationInfo(null); setShowForm(false)
          setVoiceComment(null)
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
    setVoiceComment(null)
  }

  function updatePolicy(i, field, val) {
    setRefundPolicies(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }
  function removePolicy(i) {
    setRefundPolicies(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleDelete(id) {
    if (!(await confirm({ title: 'Delete this receipt?', body: 'The line items are removed too.', confirmText: 'Delete', danger: true }))) return
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
        toast.success(`${data.store_name} • $${money(data.total_amount)} saved (${data.items?.length || 0} items)`)
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

  // Voice capture: dictate a receipt instead of photographing it. The
  // modal records a transcript via the browser SpeechRecognition API
  // and hands it to /api/receipts/from-voice; Gemini fills the same
  // shape /api/parse-receipt returns, so the existing review form
  // works unchanged. We open showForm with the parsed result instead
  // of saving silently — speech recognition is too noisy to skip the
  // human-in-the-loop review step.
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceParsing, setVoiceParsing] = useState(false)
  const handleVoiceClick = () => setVoiceOpen(true)
  const handleVoiceTranscript = useCallback(async (transcript) => {
    if (!transcript) return
    setVoiceOpen(false)
    setVoiceParsing(true)
    const t = toast.loading('Parsing voice receipt…')
    try {
      const res = await fetch('/api/receipts/from-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Voice parse failed (${res.status})`)
      // Pop the manual-review form open, pre-filled with the parsed
      // fields. The user verifies and taps Save — we DON'T auto-save
      // because voice accuracy varies enough that a silent insert
      // would create bad rows.
      setForm(prev => ({
        ...prev,
        store_name: data.store_name || prev.store_name,
        date: data.date || prev.date,
        total_amount: data.total_amount ?? prev.total_amount,
        tax_paid: data.tax_paid ?? prev.tax_paid,
      }))
      setParsedItems(Array.isArray(data.items) ? data.items : [])
      setStoreInfo({
        store_name: data.store_name,
        address: '', phone_no: '', website: '',
      })
      setLocationInfo(null)
      setRefundPolicies([])
      // Stamp the in-flight save with the original transcript so the
      // resulting row's validation_comment audits voice-parse accuracy.
      // The receipts.source column doesn't exist yet — we route through
      // validation_comment which IS in the schema. Format is stable
      // enough for future grep: `[voice] <transcript>`.
      setVoiceComment(`[voice] ${transcript}`)
      setShowForm(true)
      toast.success('Voice parsed — review before saving', { id: t, duration: 3500 })
    } catch (err) {
      toast.error(err.message || 'Voice parse failed', { id: t })
    } finally {
      setVoiceParsing(false)
    }
  }, [])
  // Holds the audit comment for the NEXT save (cleared after Save / Cancel).
  // Set by the voice flow above; the manual photo/file flow leaves it null.
  const [voiceComment, setVoiceComment] = useState(null)

  // PDF-only upload. Utility bills, internet invoices, subscription
  // statements, pay stubs — these come as PDFs that drop into a desktop
  // download folder. Posts to /api/receipts/from-pdf which validates
  // magic bytes, parses via Gemini→Groq, and saves source='pdf'. This
  // is desktop-only on purpose; mobile PDF share-sheet flow is a
  // separate problem (iOS share extensions are their own can of worms).
  const pdfFileRef = useRef(null)
  const [pdfBusy, setPdfBusy] = useState(0)
  const handlePdfClick = () => pdfFileRef.current?.click()
  const handlePdfChange = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    if (!user?.id) { toast.error('Sign in first'); return }
    setPdfBusy(files.length)
    let ok = 0
    let lastId = null
    for (const f of files) {
      try {
        // Client-side guard mirrors the server check — refuse anything
        // the browser doesn't tag as application/pdf OR whose name doesn't
        // end in .pdf. The server still magic-byte-sniffs as the source
        // of truth (browsers lie), but this saves a round-trip on
        // obviously-wrong drops.
        const looksPdf = (f.type === 'application/pdf') || /\.pdf$/i.test(f.name || '')
        if (!looksPdf) {
          toast.error(`${f.name}: not a PDF`)
          continue
        }
        const fd = new FormData()
        fd.append('file', f)
        const res = await fetch('/api/receipts/from-pdf', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || `Server error (${res.status})`)
        }
        ok++
        lastId = data.receipt_id || lastId
        const store = data.parsed?.store_name || 'Receipt'
        const total = money(data.parsed?.total_amount)
        toast.success(`${store} • $${total} saved from PDF`)
      } catch (err) {
        toast.error(`${f.name}: ${err.message}`)
      } finally {
        setPdfBusy(n => Math.max(0, n - 1))
      }
    }
    qc.invalidateQueries({ queryKey: ['receipts'] })
    qc.invalidateQueries({ queryKey: ['reports'] })
    if (files.length === 1 && ok === 1 && lastId) {
      router.push(`/receipts/${lastId}`)
    } else if (files.length > 1) {
      toast(`PDFs processed — ${ok}/${files.length} saved`)
    }
  }

  // Screen capture: pick another monitor / window / tab and grab one frame.
  // Useful for grabbing a receipt that's already on screen (email body, PDF
  // viewer on another monitor, an order-confirmation tab, etc.).
  const [screenOpen, setScreenOpen] = useState(false)
  const handleScreenClick = () => setScreenOpen(true)

  // Floating "Add" menu — collapses Camera / Voice / Screen / Drop PDF behind
  // a single trigger so the header doesn't sprawl into a row of pills. Closes
  // on outside-click or Escape.
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef(null)
  useEffect(() => {
    if (!addMenuOpen) return
    const onDoc = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setAddMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [addMenuOpen])

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
  const [dedupBusy, setDedupBusy] = useState(false)
  const [dedupPreview, setDedupPreview] = useState(null)  // null | { groups }
  // Per-group selection: { [groupKey]: { keeperId, deleteIds: Set<string> } }.
  // Seeded from the server's suggested keeper but fully user-editable.
  const [dedupSelection, setDedupSelection] = useState({})
  // Inline per-row category update from the receipts table. Optimistic
  // refetch via TanStack invalidation so the chip reflects the new state
  // immediately. Toast on save / error.
  async function handleRowCategoryChange(receiptId, slug) {
    try {
      const sb = createSbClient()
      // category_source = 'user' marks this as a confirmed override, so the
      // Tier 2 per-store learning (infer_user_store_category RPC) treats it
      // as signal. After ~3 same-category corrections at the same store the
      // next receipt from that store auto-uses this slug.
      const { error } = await sb.from('receipts')
        .update({ category: slug || null, category_source: 'user' })
        .eq('id', receiptId)
      if (error) throw new Error(error.message)
      toast.success(slug ? `Categorized as ${slug}` : 'Category cleared')
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
    } catch (e) {
      toast.error(e.message)
    }
  }
  async function handleFindDuplicates() {
    setDedupBusy(true)
    try {
      // Dry-run first so the user can see what'll be merged before anything is deleted.
      const res = await fetch('/api/receipts/dedup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Dedup scan failed')
      if (!data.groups || data.groups.length === 0) {
        toast.success('No duplicate receipts found 🎉')
        setDedupPreview(null)
        setDedupSelection({})
      } else {
        // Seed per-group selection from the server's suggested keeper.
        const seed = {}
        for (const g of data.groups) {
          const rows = g.receipts || []
          const keeper = rows.find(r => r.suggested_keeper) || rows[0]
          if (!keeper) continue
          seed[g.key] = {
            keeperId: keeper.id,
            deleteIds: new Set(rows.filter(r => r.id !== keeper.id).map(r => r.id)),
          }
        }
        setDedupPreview({ groups: data.groups })
        setDedupSelection(seed)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDedupBusy(false)
    }
  }

  // Make a different receipt the keeper in this group. Everything that was
  // marked for deletion gets re-marked relative to the new keeper, and the
  // previous keeper joins the deletion set (preserving the user's prior
  // include/exclude choices on the OTHER rows).
  function setGroupKeeper(groupKey, newKeeperId) {
    setDedupSelection(prev => {
      const cur = prev[groupKey]
      if (!cur) return prev
      const oldKeeperId = cur.keeperId
      const nextDelete = new Set(cur.deleteIds)
      nextDelete.delete(newKeeperId)            // new keeper is no longer a delete candidate
      if (oldKeeperId && oldKeeperId !== newKeeperId) nextDelete.add(oldKeeperId)  // demoted keeper now joins (unless user excludes it next)
      return { ...prev, [groupKey]: { keeperId: newKeeperId, deleteIds: nextDelete } }
    })
  }
  // Toggle a non-keeper receipt's "delete me" checkbox. Keepers can't be
  // toggled — they go on the delete list only by making something else the
  // keeper (via setGroupKeeper).
  function toggleDeleteId(groupKey, receiptId) {
    setDedupSelection(prev => {
      const cur = prev[groupKey]
      if (!cur || cur.keeperId === receiptId) return prev
      const nextDelete = new Set(cur.deleteIds)
      if (nextDelete.has(receiptId)) nextDelete.delete(receiptId)
      else nextDelete.add(receiptId)
      return { ...prev, [groupKey]: { ...cur, deleteIds: nextDelete } }
    })
  }
  // Sum of receipts the user has actually marked for deletion across all groups.
  const dedupTotalToDelete = Object.values(dedupSelection).reduce((acc, g) => acc + (g?.deleteIds?.size || 0), 0)

  async function handleConfirmDedup() {
    setDedupBusy(true)
    try {
      // Build the explicit custom_groups payload from the user's selections.
      // Groups where the user deselected EVERY non-keeper get skipped server-side.
      const custom_groups = Object.entries(dedupSelection).map(([key, sel]) => ({
        key,
        keeper_id: sel.keeperId,
        delete_ids: [...sel.deleteIds],
      })).filter(g => g.delete_ids.length > 0)
      if (custom_groups.length === 0) {
        toast('Nothing selected for deletion', { icon: '🤔' })
        setDedupBusy(false)
        return
      }
      const res = await fetch('/api/receipts/dedup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, custom_groups }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Dedup failed')
      toast.success(`Removed ${data.receipts_deleted} duplicate receipt${data.receipts_deleted === 1 ? '' : 's'}`)
      setDedupPreview(null)
      setDedupSelection({})
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['reports'] })
      router.refresh()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDedupBusy(false)
    }
  }
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

  // Full-text search across:
  //   - receipt id (exact substring)
  //   - store_name (substring + normalized-key match for variants like
  //     "COSTCO WHOLESALE" / "Costco #218")
  //   - item names (any item on the receipt — lets you find that
  //     receipt with the oat milk on it, even if you forgot which
  //     store you bought it at)
  //   - category slug (so typing "grub" matches all grocery receipts)
  // Empty search returns everything.
  const searchKey = normalizeStoreName(search)
  const searchLower = search.toLowerCase().trim()
  const filtered = receipts.filter(r => {
    if (!searchLower) return true
    if (r.id?.includes(search)) return true
    const name = r.store_name?.toLowerCase() || ''
    if (name.includes(searchLower)) return true
    if (searchKey && normalizeStoreName(r.store_name || '') === searchKey) return true
    // Category slug match — typing "auto" surfaces every auto receipt.
    if ((r.category || '').toLowerCase().includes(searchLower)) return true
    // Item-name substring match. Receipt_items array is preloaded by
    // useReceipts (RECEIPTS_LIST_COLS in lib/db.js).
    if (Array.isArray(r.receipt_items)) {
      for (const it of r.receipt_items) {
        const nm = (it?.item_name || '').toLowerCase()
        if (nm && nm.includes(searchLower)) return true
      }
    }
    return false
  })

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => allSelected ? new Set() : new Set(filtered.map(r => r.id)))
  }
  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!(await confirm({ title: `Delete ${selected.size} receipt${selected.size === 1 ? '' : 's'}?`, confirmText: 'Delete all', danger: true }))) return
    const ids = [...selected]
    const results = await Promise.allSettled(ids.map(id => deleteReceipt.mutateAsync(id)))
    const failed = results.filter(r => r.status === 'rejected').length
    setSelected(new Set())
    if (failed) toast.error(`${failed} failed`); else toast.success(`Deleted ${ids.length}`)
  }

  return (
    <div className="space-y-5 max-w-7xl" style={{ fontFamily: 'var(--font-jakarta)' }}>
      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
      <ScreenshotCapture open={screenOpen} onClose={() => setScreenOpen(false)} onCapture={(f) => onQuickDrop([f])} />
      <VoiceCapture open={voiceOpen} onClose={() => setVoiceOpen(false)} onTranscript={handleVoiceTranscript} />
      {/* Search-mascot scan overlay while a row is re-parsing — count =
          number of receipts mid-reparse (shows the "{n} receipts" badge
          for a bulk re-parse). Previously a re-parse only spun a small
          row icon, so it looked like nothing happened. */}
      <ReceiptScanAnimation count={reparsing.size} />
      {/* Full-page drop overlay — interactive (it IS the drop target).
          pointer-events-auto so the drop actually registers. */}
      {pageDragging && !showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDrop={handleOverlayDrop}
        >
          <div className="rounded-2xl border-4 border-dashed border-guac-600 bg-white/95 px-10 py-8 flex flex-col items-center gap-3 shadow-2xl pointer-events-none">
            {/* Paper-drop reads as "drop your receipt here". Replaces
                the too-generic animate-bounce with a softer 8px lift
                using a backOut curve. */}
            <Upload size={48} className="text-guac-600 anim-paper-drop" />
            <p className="text-xl font-semibold text-blue-800">Drop to auto-add</p>
            <p className="text-sm text-gray-500">PDF or images — we&apos;ll scan and save each one</p>
          </div>
        </div>
      )}

      {/* Header row 1 — title + wide drop zone (mockup layout). */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 shrink-0">
          <GuacMascot expression="happy" size={50} className="shrink-0" />
          <h1 className="page-title" style={{ fontFamily: 'var(--font-bricolage)', color: '#14241A', letterSpacing: '-0.02em', fontSize: '30px', lineHeight: 1 }}>Receipts</h1>
        </div>
        {/* Click-to-upload button styled like a dropzone (the real drop target is the overlay) */}
        <button
          type="button"
          onClick={handleQuickClick}
          className={`flex-1 min-w-[220px] cursor-pointer rounded-[14px] border-[1.5px] border-dashed px-4 py-3 text-[13px] font-semibold flex items-center justify-center gap-2 transition-all ${
            quickBusy > 0 ? 'border-amber-400 bg-amber-50 text-amber-700' :
            pageDragging ? 'border-guac-600 bg-guac-50 text-guac-700' :
            'border-[#176B33]/[0.22] text-[#9AA89E] hover:border-guac-600 hover:bg-guac-50/40'
          }`}
        >
          {quickBusy > 0 ? (
            <><Loader2 size={15} className="animate-spin" /><span>Scanning {quickBusy} file{quickBusy === 1 ? '' : 's'}…</span></>
          ) : (
            <><Upload size={15} /><span>Drop receipt or order screenshot to add</span></>
          )}
        </button>
        <input ref={quickFileRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleQuickChange} />
        <input ref={pdfFileRef} type="file" multiple accept="application/pdf,.pdf" className="hidden" onChange={handlePdfChange} />
      </div>

      {/* Header row 2 — action buttons. */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Floating "Add" menu — Camera / Voice / Screen / Drop PDF behind one
            green trigger instead of a sprawling row of pills. */}
        <div className="relative shrink-0" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setAddMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-[11px] bg-[#14532D] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#0f3d22] transition-colors"
            aria-haspopup="menu"
            aria-expanded={addMenuOpen}
            title="Add a receipt another way"
          >
            {(voiceParsing || pdfBusy > 0)
              ? <Loader2 size={16} className="animate-spin" />
              : <Plus size={16} className={`transition-transform ${addMenuOpen ? 'rotate-45' : ''}`} />}
            Add
          </button>
          {addMenuOpen && (
            <div role="menu" className="absolute left-0 top-full mt-2 z-30 w-48 rounded-2xl bg-white shadow-xl ring-1 ring-gray-100 p-1.5 anim-fadeup">
              <button role="menuitem" type="button" onClick={() => { setAddMenuOpen(false); handleCameraClick() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-guac-50 hover:text-guac-700 transition-colors">
                <Camera size={16} /> Camera
              </button>
              <button role="menuitem" type="button" disabled={voiceParsing} onClick={() => { setAddMenuOpen(false); handleVoiceClick() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-guac-50 hover:text-guac-700 transition-colors disabled:opacity-50">
                {voiceParsing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />} Voice
              </button>
              <button role="menuitem" type="button" onClick={() => { setAddMenuOpen(false); handleScreenClick() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-guac-50 hover:text-guac-700 transition-colors">
                <Monitor size={16} /> Screen
              </button>
              {/* PDF-only upload. Utility bills, internet invoices,
                  subscription statements, pay stubs — parsed via Gemini→Groq. */}
              <button role="menuitem" type="button" disabled={pdfBusy > 0} onClick={() => { setAddMenuOpen(false); handlePdfClick() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-guac-50 hover:text-guac-700 transition-colors disabled:opacity-50">
                {pdfBusy > 0
                  ? <><Loader2 size={16} className="animate-spin" /> {pdfBusy} PDF{pdfBusy === 1 ? '' : 's'}…</>
                  : <><FileText size={16} /> Drop PDF</>}
              </button>
            </div>
          )}
        </div>
        {unreconciledStatementCount > 0 && (
          <button
            type="button"
            onClick={handleReconcileAll}
            disabled={reconciling}
            className="inline-flex items-center gap-1.5 rounded-[11px] border border-[#176B33]/[0.14] bg-white px-4 py-2.5 text-[13px] font-bold text-[#4A5A4E] hover:bg-[#F1F6EA] transition-colors disabled:opacity-50"
            title="Match unreconciled statement rows to real receipts by date, store, and amount"
          >
            {reconciling ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={16} />}
            Reconcile <span className="ml-1 text-[10px] font-bold bg-guac-100 text-blue-800 rounded-full px-1.5">{unreconciledStatementCount}</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleFindDuplicates}
          disabled={dedupBusy}
          className="inline-flex items-center gap-1.5 rounded-[11px] border border-[#176B33]/[0.14] bg-white px-4 py-2.5 text-[13px] font-bold text-[#4A5A4E] hover:bg-[#F1F6EA] transition-colors disabled:opacity-50"
          title="Scan for duplicate receipts (same store, date, total) and merge them"
        >
          {dedupBusy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={16} />}
          Find duplicates
        </button>
        {uncategorizedCount > 0 && (
          <button
            type="button"
            onClick={handleAutoCategorize}
            disabled={autocatBusy}
            className="inline-flex items-center gap-1.5 rounded-[11px] border border-[#176B33]/[0.14] bg-white px-4 py-2.5 text-[13px] font-bold text-[#4A5A4E] hover:bg-[#F1F6EA] transition-colors disabled:opacity-50"
            title="Auto-categorize uncategorized receipts (rules + AI fallback)"
          >
            {autocatBusy ? <Loader2 size={14} className="animate-spin" /> : <Tag size={16} />}
            Auto-categorize <span className="ml-1 text-[11px] font-extrabold bg-[#E9F5DD] text-[#1F8A3D] rounded-full px-[7px] py-0.5">{uncategorizedCount}</span>
          </button>
        )}
        <Link href="/validate"
          className="group ml-auto inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-[#FBB040] to-[#E8870E] px-[18px] py-2.5 text-[13px] font-extrabold text-white shadow-[0_6px_16px_-8px_rgba(232,135,14,0.6)] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          title="Rate your purchases — high = must-have, low = adhoc">
          <span className="text-base leading-none">🥑</span>
          <span>Worth&nbsp;It?</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80 hidden sm:inline">Validate</span>
        </Link>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="gg-h2">New Receipt</h3>

          {/* Upload zone — first so scanning fills the form below */}
          <div>
            <label className="label">Upload Receipt</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-guac-600 bg-guac-50' : parsing ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-guac-600 hover:bg-guac-row'
            }`}>
              <input {...getInputProps()} />
              {parsing ? (
                <div className="flex flex-col items-center gap-2 text-amber-700">
                  <LottieAnimation data={docFileSearching} size={120} loop label="Reading your receipt" fallback="🔍" />
                  <p className="text-sm font-medium">Scanning receipt with Guac-AI…</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-1">
                  <Sparkles size={20} className="text-guac-600" />
                  <p className="text-sm text-guac-700 font-medium">{file.name}</p>
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
                  <label className="label mb-0">Line Items <span className="text-guac-600 font-semibold">({parsedItems.length} scanned)</span></label>
                </div>
                <div className="border rounded-xl overflow-hidden">
                  <table className="gg-tbl w-full text-sm">
                    <thead className="border-b border-guac-line gg-colhead">
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
                        <tr key={i} className="hover:bg-guac-row">
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
                  <Shield size={13} className="text-guac-600" /> Refund Policy
                  <span className="text-guac-600 font-semibold">({refundPolicies.length} scanned)</span>
                </label>
                <div className="border rounded-xl overflow-hidden">
                  <table className="gg-tbl w-full text-sm">
                    <thead className="border-b border-guac-line gg-colhead">
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
                        <tr key={i} className="hover:bg-guac-row">
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
                  A receipt from <strong>{duplicate.store_name}</strong> on <strong>{formatDateShort(duplicate.date)}</strong> (<span className="gg-num">${money(duplicate.total_amount)}</span>) was found.
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

      {/* Pre-trip prompt — surfaces pending Smashlist predictions
          grouped by store so the user can glance before walking
          in. Self-hides when nothing pending; session-dismissable. */}
      <PreTripPanel />

      {/* Filter row — segmented period control + search + result count, all on
          one line (mockup layout: no "Show" label, no Select-all button). */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-[11px] bg-[#F1F6EA] p-1 shrink-0">
          {RECEIPT_CHIP_IDS.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`text-[12.5px] px-3.5 py-1.5 rounded-lg transition-colors ${
                period === id
                  ? 'bg-white text-[#14532D] font-extrabold shadow-[0_1px_3px_rgba(20,40,28,0.08)]'
                  : 'text-[#7C8A7E] font-semibold hover:text-[#14532D]'
              }`}
            >
              {id}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A6B3A9]" />
          <input
            className="w-full rounded-[11px] border border-[#176B33]/[0.12] bg-white pl-11 pr-4 py-2.5 text-[13.5px] text-[#14241A] placeholder:text-[#A6B3A9] focus:outline-none focus:ring-2 focus:ring-guac-600/30 focus:border-transparent transition-all"
            placeholder="Search store, item, category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="shrink-0 text-[13px] font-semibold text-[#9AA89E]">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        {selected.size > 0 && (
          <button type="button" onClick={handleDeleteSelected} className="btn-danger text-xs py-1.5 shrink-0">
            <Trash2 size={13} /> Delete {selected.size}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          // ShimmerBox skeletons stand in while the receipts query
          // resolves. Eight rows is enough to fill a typical viewport
          // without flashing tons of placeholders.
          <div className="px-4 py-4 space-y-2" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <ShimmerBox className="h-4 w-4" rounded="lg" />
                <ShimmerBox className="h-4 flex-1" rounded="lg" />
                <ShimmerBox className="h-4 w-16" rounded="lg" />
                <ShimmerBox className="h-4 w-20" rounded="lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          // First-run empty state doubles as a drag-and-drop zone for
          // screenshots and receipt photos. Anything dropped (or clicked
          // through the hidden file input) flows into the SAME quick-parse
          // pipeline as the header upload button, so users discover the
          // feature without needing to find the small dropzone up top.
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation()
              const files = Array.from(e.dataTransfer?.files || [])
              if (files.length) onQuickDrop(files)
            }}
            onClick={handleQuickClick}
            className="py-10 px-6 text-center flex flex-col items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-guac-100/60 hover:border-guac-600 hover:bg-guac-50/30 transition-colors m-4"
          >
            <LottieAnimation data={emptyReceiptsLottie} size={160} fallback="📥" />
            <p className="text-gray-700 font-semibold">Drag screenshots here</p>
            <p className="text-sm text-gray-500 max-w-md">
              Drop a screenshot from an Amazon, Doordash, Uber Eats, Instacart, or Walmart
              order — or a regular receipt photo / PDF. Guac-AI will read it and file it
              automatically. You can also paste (Ctrl/Cmd+V) or click here to pick a file.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gg-tbl w-full text-[13px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 40 }} />
                {RECEIPT_COLUMNS.map(c => (
                  <col key={c.id} style={{ width: colWidths[c.id] }} />
                ))}
              </colgroup>
              <thead className="border-b border-guac-line gg-colhead">
                <tr>
                  <th className="pl-4 pr-2 py-3">
                    <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={allSelected}
                      onChange={toggleAll} aria-label="Select all" />
                  </th>
                  {RECEIPT_COLUMNS.map(c => (
                    <th key={c.id} className={`px-4 py-3 relative select-none overflow-hidden whitespace-nowrap text-ellipsis ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>
                      {c.label}
                      <span
                        onMouseDown={(e) => startResize(e, c.id)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-guac-600 active:bg-guac-600 transition-colors"
                        title="Drag to resize"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-guac-line">
                {filtered.map((r, idx) => {
                  const isExpanded = expandedId === r.id
                  // Soft fade-in keyed on receipt id. New rows from
                  // background email-imports slide into the table with
                  // a 180ms entrance instead of flash-cutting. Cap the
                  // stagger at the first 8 visible rows so a large
                  // table doesn't fade in for seconds.
                  const animStyle = idx < 8
                    ? { animationDelay: `${idx * 30}ms`, animationDuration: '220ms' }
                    : undefined
                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => router.push(`/receipts/${r.id}`)}
                        style={animStyle}
                        className={`hover:bg-[#F7FBF1] cursor-pointer transition-colors anim-fadeup ${selected.has(r.id) ? 'bg-guac-50/60' : ''}`}>
                        <td className="pl-4 pr-2 py-1" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4 rounded cursor-pointer" checked={selected.has(r.id)}
                            onChange={() => toggleOne(r.id)} aria-label={`Select ${r.store_name}`} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Real brand logo when resolvable, else the
                                avocado initial tile. */}
                            <StoreAvatar name={r.store_name} />
                            <div className="min-w-0">
                              {/* Canonicalized display name; the raw printed
                                  receipts.store_name is still stored in the DB. */}
                              <div className="text-[#14241A] text-sm font-medium truncate">{titleCaseStore(r.store_name)}</div>
                              {/* Receipt id sits beneath the name (mockup layout).
                                  With line items it doubles as the inline expand
                                  toggle; otherwise it's plain mono text. */}
                              {(() => {
                                const itemCount = Array.isArray(r.receipt_items) ? r.receipt_items.length : 0
                                if (itemCount > 0) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); toggleExpanded(r.id) }}
                                      title={`Click to show ${itemCount} line item${itemCount === 1 ? '' : 's'}`}
                                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#B3BEB2] hover:text-guac-700 transition-colors">
                                      {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                      {r.id?.slice(0, 8) || '—'}
                                    </button>
                                  )
                                }
                                return <div className="font-mono text-[11px] text-[#B3BEB2]">{r.id?.slice(0, 8) || '—'}</div>
                              })()}
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {(() => {
                              const bank = bankInfoFor(r)
                              const bankLabel = bank ? `${bank.issuer || 'Bank'}${bank.account_last4 ? ` ••${bank.account_last4}` : ''}` : null
                              const stmtTooltip = bank
                                ? `${bank.issuer || 'Bank'}${bank.account_last4 ? ` ••${bank.account_last4}` : ''}${bank.period_start && bank.period_end ? ` · ${bank.period_start} → ${bank.period_end}` : (bank.file_name ? ` · ${bank.file_name}` : '')}`
                                : (r.statement_source || 'Imported from statement')
                              return <>
                                {r.from_statement && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100" title={stmtTooltip}>
                                    🏦 {bankLabel || 'Statement'}
                                  </span>
                                )}
                                {r.reconciled && (
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handleUnreconcile(r.id) }}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-guac-50 text-guac-700 border border-guac-line hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 transition-colors"
                                    title={bank ? `Reconciled with ${stmtTooltip} — click to unlink` : 'Reconciled — click to unlink'}
                                  >
                                    <Link2 size={10} /> Reconciled{!r.from_statement && bankLabel ? <span className="text-guac-600 font-normal">· {bankLabel}</span> : null}
                                  </button>
                                )}
                              </>
                            })()}
                          </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                          <CategoryPicker
                            size="sm"
                            hideEmoji
                            soft
                            value={r.category || ''}
                            onChange={slug => handleRowCategoryChange(r.id, slug)}
                          />
                        </td>
                        <td className="px-4 py-2 gg-num text-[#6B7A6E] whitespace-nowrap">{formatDayMonth(r.date)}</td>
                        <td className="px-4 py-2 text-right gg-num font-extrabold text-[14.5px] text-[#14241A]">${money(r.total_amount)}</td>
                        <td className="px-4 py-2 text-right gg-num text-[13px] text-[#9AA89E]">${money(r.tax_paid)}</td>
                        <td className="px-4 py-2 text-center">
                          {r.business_purchase
                            ? <span className="inline-flex items-center text-[11px] font-extrabold text-[#1F8A3D] bg-[#E9F5DD] px-2 py-0.5 rounded-full">Biz</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5 text-[#A6B3A9]">
                            <Link href={`/receipts/${r.id}`} aria-label="View"
                              className="w-7 h-7 rounded-lg hover:bg-guac-50 hover:text-guac-700 transition-colors flex items-center justify-center">
                              <Eye size={15} />
                            </Link>
                            <button
                              onClick={() => handleReparse(r.id, r.store_name)}
                              aria-label="Re-parse this receipt"
                              title="Re-parse this receipt from the source email (only works for email-forwarded receipts)"
                              disabled={reparsing.has(r.id)}
                              className="w-7 h-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
                              <RefreshCw size={14} className={reparsing.has(r.id) ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={() => handleDelete(r.id)} aria-label="Delete"
                              className="w-7 h-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#F7FBF1]">
                          <td colSpan={8} className="px-6 py-3">
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

      {/* Find-duplicates preview modal. Each group lists every receipt in it
          with a Keep radio + a Delete checkbox. The auto-pick is pre-selected
          but fully editable; user can change the keeper or exclude any row
          from deletion before confirming. */}
      {dedupPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Copy size={18} className="text-amber-600" />
                <h3 className="gg-h2">
                  {dedupPreview.groups.length} duplicate group{dedupPreview.groups.length === 1 ? '' : 's'} found
                </h3>
              </div>
              <button onClick={() => setDedupPreview(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Pick which receipt to <strong>keep</strong> per group (radio) and uncheck any duplicate you'd rather <strong>not delete</strong>. Items and refund policies on the kept row are preserved; email-message links are re-pointed automatically.
              </p>
              <div className="space-y-3 text-xs">
                {dedupPreview.groups.map(g => {
                  const sel = dedupSelection[g.key]
                  if (!sel) return null
                  return (
                    <div key={g.key} className="border rounded-lg bg-gray-50 overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-white">
                        <span className="font-semibold text-gray-800">{displayStoreName(g.store_name)}</span>
                        <span className="text-gray-500 gg-num">{g.date} · ${money(Math.abs(g.total_amount))}{g.sign === '-' ? ' refund' : ''}</span>
                      </div>
                      {g.variants && g.variants.length > 1 && (
                        <div className="px-3 pt-2 text-[10px] text-gray-400">
                          Matched name variants: {g.variants.join(' · ')}
                        </div>
                      )}
                      <table className="gg-tbl w-full">
                        <thead className="border-b border-guac-line gg-colhead">
                          <tr>
                            <th className="px-2 py-1.5 text-center w-12">Keep</th>
                            <th className="px-2 py-1.5 text-center w-14">Delete</th>
                            <th className="px-2 py-1.5 text-left">Receipt</th>
                            <th className="px-2 py-1.5 text-right">Why</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-guac-line">
                          {g.receipts.map(r => {
                            const isKeeper = sel.keeperId === r.id
                            const isDeleting = sel.deleteIds.has(r.id)
                            return (
                              <tr key={r.id} className={isKeeper ? 'bg-guac-50/60' : (isDeleting ? '' : 'bg-amber-50/30')}>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="radio"
                                    name={`keeper-${g.key}`}
                                    checked={isKeeper}
                                    onChange={() => setGroupKeeper(g.key, r.id)}
                                    aria-label="Keep this receipt"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={isKeeper}
                                    checked={isDeleting}
                                    onChange={() => toggleDeleteId(g.key, r.id)}
                                    aria-label="Mark for deletion"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Link href={`/receipts/${r.id}`} target="_blank" className="text-guac-700 hover:underline font-mono text-[10px]">{r.id.slice(0, 8)}</Link>
                                    <span className="text-gray-700">{displayStoreName(r.store_name)}</span>
                                    {r.from_statement && <span className="inline-flex items-center text-[9px] px-1 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">🏦 Statement</span>}
                                    {r.reconciled && <span className="inline-flex items-center text-[9px] px-1 py-0.5 rounded-full bg-guac-50 text-guac-700 border border-guac-line">🔗 Reconciled</span>}
                                    {r.is_return && <span className="inline-flex items-center text-[9px] px-1 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">Refund</span>}
                                    {r.receipt_link && <a href={r.receipt_link} target="_blank" rel="noreferrer" className="text-guac-600 hover:text-guac-700" title="Open receipt link"><Download size={11} /></a>}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5"><span className="gg-num">tax ${money(r.tax_paid)}</span> · created {(r.created_at || '').slice(0,10)}</div>
                                </td>
                                <td className="px-2 py-1.5 text-right text-gray-500">{r.reason}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">
                {dedupTotalToDelete} receipt{dedupTotalToDelete === 1 ? '' : 's'} marked for deletion across {Object.values(dedupSelection).filter(g => g?.deleteIds?.size > 0).length} group{Object.values(dedupSelection).filter(g => g?.deleteIds?.size > 0).length === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setDedupPreview(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleConfirmDedup} disabled={dedupBusy || dedupTotalToDelete === 0} className="btn-primary text-sm">
                  {dedupBusy && <Loader2 size={14} className="animate-spin" />}
                  Delete {dedupTotalToDelete} duplicate{dedupTotalToDelete === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline expansion: fetches the receipt + its items for the receipts-list row
function ReceiptLineItems({ receiptId }) {
  const { data, isLoading, error } = useReceipt(receiptId)
  const updateItem = useUpdateReceiptItem()
  // Pull every receipt for the user once — only used by the
  // statement-line matcher below. Cached by react-query so it's free
  // when multiple statement rows expand.
  const { data: allReceipts = [] } = useReceipts()

  if (isLoading) return <div className="text-xs text-gray-400 py-2">Loading items…</div>
  if (error) return <div className="text-xs text-rose-500 py-2">Failed to load: {error.message}</div>
  const items = data?.receipt_items || []
  const policies = data?.receipt_refund_policies || []

  // For statement-imported receipts, each "item" is actually a separate
  // bank transaction. Try to match each transaction against a real receipt
  // the user already imported (camera / email). Match key: amount within
  // $0.01 + date within ±5 days + the candidate is NOT itself a statement.
  // When matched, the action cell shows a "View receipt" deep-link or a
  // "Reconciled" badge instead of the meaningless Return button.
  const isFromStatement = !!data?.from_statement
  function findReceiptMatchForStatementItem(it) {
    if (!isFromStatement) return null
    const amount = Math.abs(parseFloat(it.price || 0))
    if (!Number.isFinite(amount) || amount === 0) return null
    const stmtDate = data?.date ? new Date(data.date) : null
    if (!stmtDate || isNaN(stmtDate.getTime())) return null
    const candidates = allReceipts.filter(r =>
      !r.from_statement &&
      r.id !== data.id &&
      Math.abs(parseFloat(r.total_amount || 0) - amount) < 0.011 &&
      r.date
    )
    if (candidates.length === 0) return null
    // Pick the candidate with the closest date.
    let best = null
    let bestDelta = Infinity
    for (const c of candidates) {
      const delta = Math.abs((new Date(c.date) - stmtDate) / 86400000)
      if (delta <= 5 && delta < bestDelta) { best = c; bestDelta = delta }
    }
    return best
  }
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
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-guac-50 border border-guac-line2">
        <span className="text-lg">🥑</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-guac-ink">Nothing chopped yet</p>
          <p className="text-[11px] text-guac-700">Open the receipt to add items, or re-scan a clearer photo so Guac-AI can pull them in.</p>
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
  // Catch-all fallback for items without a specific refund_policy_id. The
  // first eligible "default" policy is the right default — covers the case
  // where Gemini returned one policy at the receipt level but didn't tag
  // each item, or the row came from the migration_034 store-default backfill.
  const fallbackPolicy = policies.find(p => p.eligible !== false &&
    (!p.policy_id || p.policy_id === 'default' || policies.length === 1)) || null

  return (
    <div className="space-y-3">
      {items.length === 0 ? null : (() => {
      // Receipt-level non-returnable categories. There's nothing physical to
      // return — they're either consumed at point-of-sale (eats, gas-up,
      // bars + the soft drinks / coffee / tea / juice / milkshake one-time
      // purchases) or non-physical (subs, bills = utilities, charity =
      // donations). The receipt-level Refund Policy card above still shows
      // any money-back-guarantee window for these (e.g. IONOS hosting's 30d
      // refund), so users haven't lost the policy info — they just can't
      // ask GuacWizard to "mark this hosting plan returned".
      // Categories that never offer a meaningful "Return" affordance.
      // Consumables, recurring services, donations, and bank charges all
      // bypass the merchant return-policy flow — refunds/cancellations
      // happen via the issuer or merchant directly, not by marking a
      // line item returned in our app.
      const NON_RETURNABLE_CATEGORIES = new Set([
        'eats', 'gas-up', 'bars', 'tea', 'drinks',
        'subs', 'bills', 'bank-fees', 'cloud', 'charity',
      ])
      const isNonReturnable = NON_RETURNABLE_CATEGORIES.has(data?.category)
      const nonReturnableLabel = {
        'eats':       'Prepared food — already consumed, no returns',
        'gas-up':     'Fuel pumped — no returns',
        'bars':       'Bar tab — alcohol consumed, no returns',
        'tea':        'Beverage consumed — no returns',
        'drinks':     'Beverage consumed — no returns',
        'subs':       'Subscription — cancel/refund via the merchant, not via a return',
        'bills':      'Utility bill — non-returnable; disputes go to the provider',
        'bank-fees':  'Bank fee — dispute with the issuer, not via return',
        'cloud':      'Cloud / hosting / domain — refund via the provider, not via a return',
        'charity':    'Donation — non-refundable',
      }[data?.category] || 'Non-returnable category'
      return (
      <div className="rounded-lg border bg-white overflow-hidden">
      {isNonReturnable && (
        <div className="px-3 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-semibold border-b border-amber-100">
          {nonReturnableLabel} — return option hidden
        </div>
      )}
      <table className="gg-tbl w-full text-sm">
        <thead className="border-b border-guac-line gg-colhead">
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
        <tbody className="divide-y divide-guac-line">
          {items.map(it => {
            // Per-item non-returnable check.
            //   'perishable' = fresh produce / dairy / raw meat / eggs /
            //                  prepared deli / ice / bakery / cut flowers
            //   'pharmacy'   = dispensed prescriptions, CGM sensors, test
            //                  strips, insulin, hearing aids, contact lenses,
            //                  syringes, etc. — regulatory restrictions
            //                  prevent merchants from accepting returns.
            // These over-ride any receipt-level return policy because no
            // merchant takes back a half-eaten salad or a dispensed Rx even
            // when the store's general window is generous.
            const nrReason = getNonReturnableReason(it)
            // serviceBlock = item is a service / subscription / bank fee /
            // cloud hosting / domain renewal — not a physical product. Covers
            // the IONOS case where the receipt is categorized 'tech' or 'misc'
            // but the line is still non-returnable based on item category,
            // name keywords ("domain renewal", "hosting plan"), or the
            // known-service-merchant store fallback.
            const serviceBlock = !nrReason && isItemNonReturnable(it, data)
            const perishable = nrReason !== null || serviceBlock
            const blockLabel = nrReason === 'pharmacy' ? 'Pharmacy · final sale'
                             : nrReason ? 'Perishable · final sale'
                             : it.category === 'cloud' ? '☁️ Service · no return'
                             : it.category === 'subs' ? '🔁 Subscription · no return'
                             : it.category === 'bills' ? '💡 Utility · no return'
                             : it.category === 'bank-fees' ? '💸 Bank fee · no return'
                             : it.category === 'charity' ? '❤️ Donation · no return'
                             : 'Service · no return'
            const blockTip = nrReason === 'pharmacy'
              ? "Pharmacy item — dispensed prescriptions, CGM sensors, test strips, hearing aids etc. can't be returned for resale (FDA / state regs)."
              : nrReason ? "Fresh produce / dairy / meat / eggs / prepared food — merchants don't accept returns on perishables."
              : "Service / subscription / cloud line — refund happens via the provider's cancel flow, not as a return."
            return (
            <tr key={it.id} className={it.returned ? 'bg-rose-50/40' : ''}>
              <td className="px-3 py-0.5 text-gray-400 text-[11px]">{it.sku || '—'}</td>
              <td className="px-3 py-0.5 text-gray-400 text-[11px]">{it.model || '—'}</td>
              <td className="px-3 py-0.5">
                <Link href={`/items/${it.id}`} className="text-[#14532D] font-medium hover:underline" title="Item details + purchase history">
                  {it.item_name}
                </Link>
              </td>
              <td className="px-3 py-0.5 gg-num">{it.qty}</td>
              <td className="px-3 py-0.5 gg-num">
                {it.price == null ? <span className="text-gray-300">—</span> : `$${money(it.price)}`}
              </td>
              <td className="px-3 py-0.5">
                {perishable ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                    title={blockTip}
                  >
                    {blockLabel}
                  </span>
                ) : (() => {
                  // Render policy inline: ID + days, with expiry + eligible in
                  // the hover tooltip. Used to be a separate panel above the
                  // items table — folded here for uniform UI across receipts.
                  // If the item doesn't carry its own refund_policy_id we fall
                  // back to the receipt-level default so Lowe's items (90d at
                  // the receipt level, untagged per-line) still surface the
                  // policy badge instead of an unhelpful "—".
                  const pid = it.refund_policy_id
                  const p = (pid && policyById[pid]) || fallbackPolicy
                  if (!p) return <span className="text-gray-300">—</span>
                  const expired = p.expiry_date && new Date(p.expiry_date) < new Date()
                  const tip = [
                    p.policy_id && `Policy ${p.policy_id}`,
                    p.days != null && `${p.days} days`,
                    p.expiry_date && `expires ${p.expiry_date}${expired ? ' (expired)' : ''}`,
                    p.eligible === false ? 'NOT eligible' : null,
                    p.details && p.details,
                    !pid && p && 'Inherited from receipt-level policy',
                  ].filter(Boolean).join(' · ')
                  const cls = expired
                    ? 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100'
                    : (p.eligible === false
                      ? 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200'
                      : 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-guac-50 text-guac-700 border border-guac-line')
                  return (
                    <span className={cls} title={tip}>
                      {p.policy_id || 'default'}
                      {p.days != null && <span className="opacity-70">·{p.days}d</span>}
                      {p.source_url && (
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="ml-0.5 opacity-70 hover:opacity-100"
                          title="View merchant's published policy"
                        >↗</a>
                      )}
                    </span>
                  )
                })()}
              </td>
              {!isNonReturnable && (
                <td className="px-3 py-0.5 text-gray-500">
                  {perishable ? <span className="text-gray-300">—</span> : (() => {
                    // If the item was actually returned, that date wins.
                    if (it.return_date) return it.return_date
                    // Otherwise show "by <expiry_date>" so the column tells the
                    // user how long they still have to return — same source
                    // as the policy badge fallback above.
                    const p = (it.refund_policy_id && policyById[it.refund_policy_id]) || fallbackPolicy
                    if (!p || !p.expiry_date) return '—'
                    const expired = new Date(p.expiry_date) < new Date()
                    return (
                      <span className={expired ? 'text-rose-600' : ''} title={expired ? 'Return window has passed' : `${p.days || 'lifetime'} window`}>
                        by {p.expiry_date}{expired && ' (expired)'}
                      </span>
                    )
                  })()}
                </td>
              )}
              {!isNonReturnable && (
                <td className="px-3 py-0.5">
                  {isFromStatement ? (() => {
                    // Bank-statement rows aren't user-returnable items.
                    // Refunds (negative amounts) get returned=true at import,
                    // but Undo doesn't make sense either — the bank's
                    // transaction is authoritative, not ours. Replace the
                    // Return/Undo button with a "View receipt" deep-link if
                    // we matched the transaction to a real receipt, or with
                    // a "Reconciled" badge when the match's receipt already
                    // points back at this statement (per migration_016).
                    const match = findReceiptMatchForStatementItem(it)
                    if (!match) {
                      return <span className="text-[10px] text-gray-400 italic">unmatched</span>
                    }
                    const reconciled = match.reconciled && match.reconciled_with === data.id
                    if (reconciled) {
                      return (
                        <Link
                          href={`/receipts/${match.id}`}
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-guac-50 text-guac-700 border border-guac-line hover:bg-guac-100"
                          title={`Reconciled with ${match.store_name || 'receipt'} on ${match.date}`}
                        >
                          ✓ Reconciled
                        </Link>
                      )
                    }
                    return (
                      <Link
                        href={`/receipts/${match.id}`}
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-guac-50 text-guac-700 border border-blue-100 hover:bg-guac-100"
                        title={`Open the matching receipt — ${match.store_name || ''} on ${match.date}`}
                      >
                        <Eye size={11} /> View receipt
                      </Link>
                    )
                  })() : (perishable && !it.returned) ? (
                    // Don't offer the Return button on a perishable item the
                    // user hasn't already marked returned — clicking it would
                    // never have a real-world payoff. Keep Undo available
                    // when it WAS marked returned (the rare case of refund
                    // for spoiled-on-arrival produce, etc.).
                    <span className="text-[10px] text-gray-400 italic">N/A</span>
                  ) : (
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
                  )}
                </td>
              )}
              <td className="px-3 py-0.5">
                {(it.returned || data?.is_return || data?.from_statement || perishable) ? (
                  // Services / subscriptions / cloud / bills / bank-fees /
                  // perishables / pharmacy — none belong on a re-order list.
                  // perishable now ALSO covers serviceBlock from
                  // isItemNonReturnable, so a cloud / hosting / domain row
                  // hides this cart too.
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
            )
          })}
        </tbody>
      </table>
      </div>
      )
      })()}
    </div>
  )
}
