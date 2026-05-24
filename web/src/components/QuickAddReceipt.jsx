'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { createClient } from '../lib/supabase/client'
import { useAddReceipt } from '../hooks/useReceipts'
import CameraCapture from './CameraCapture'

// Floating "Add Receipt" widget. Lives in the dashboard layout, visible on every
// page. Provides:
//   - Bottom-right FAB. Click → camera modal (works on PC webcam + Android camera).
//   - Drop a file ANYWHERE on the page → auto-parse + save + jump to detail.
// On the /receipts page the existing in-page dropzone keeps working too —
// they don't conflict because the layout-level drop overlay handles its own
// preventDefault on a higher z-index.
export default function QuickAddReceipt() {
  const router = useRouter()
  const pathname = usePathname()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [busy, setBusy] = useState(0)
  const [pageDragging, setPageDragging] = useState(false)
  const fileInputRef = useRef(null)

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const sb = createClient(); const { data } = await sb.auth.getUser(); return data.user },
  })

  const addReceipt = useAddReceipt()

  const processFile = useCallback(async (f) => {
    const fd = new FormData()
    fd.append('file', f)
    const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error('Server returned non-JSON') }
    if (!res.ok) throw new Error(data.error || 'Parse failed')
    if (!data.store_name || !data.date) throw new Error('Missing store or date')

    const saved = await addReceipt.mutateAsync({
      receipt: {
        store_name: data.store_name,
        date: data.date,
        total_amount: data.total_amount ?? 0,
        tax_paid: data.tax_paid ?? 0,
        business_purchase: false,
        processed: (data.items?.length || 0) > 0,
        category: data.category || null,
      },
      file: f,
      userId: user?.id,
      items: data.items || [],
      storeInfo: { store_name: data.store_name, address: data.store_address, phone_no: data.store_phone, website: data.store_website },
      locationInfo: {
        location_name: data.location_name, address: data.store_address, city: data.store_city,
        state: data.store_state, zip: data.store_zip, phone_no: data.store_phone, store_no: data.store_no,
      },
      refundPolicies: data.refund_policies || [],
    })
    return { ...data, _savedId: saved?.id }
  }, [user?.id, addReceipt])

  const handleFiles = useCallback(async (files) => {
    if (!files?.length) return
    if (!user?.id) { toast.error('Sign in first'); return }
    setBusy(files.length)
    let lastId = null
    for (const f of files) {
      try {
        const r = await processFile(f)
        lastId = r._savedId || lastId
        toast.success(`${r.store_name} • $${Number(r.total_amount || 0).toFixed(2)} saved (${r.items?.length || 0} items)`)
      } catch (err) {
        toast.error(`${f.name}: ${err.message}`)
      } finally {
        setBusy(n => Math.max(0, n - 1))
      }
    }
    if (files.length === 1 && lastId) router.push(`/receipts/${lastId}`)
  }, [user?.id, processFile, router])

  // Window-level drag handlers — show overlay & swallow browser default file-open.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')
    const onEnter = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setPageDragging(true)
    }
    const onOver = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onLeave = (e) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setPageDragging(false)
    }
    const onDrop = (e) => {
      // Real drops on the overlay are handled by its own onDrop; this swallows strays
      // (so the browser doesn't navigate to the dropped file).
      const files = e.dataTransfer?.files
      if (files?.length) e.preventDefault()
      depth = 0
      setPageDragging(false)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  // Hide on auth pages, Smashlist, Bank/Statements (own upload flow), and on
  // GuacWizard (a money-insights page — receipt-add doesn't belong there).
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/shopping') ||
    pathname?.startsWith('/bank') ||
    pathname?.startsWith('/statements') ||
    pathname?.startsWith('/guacwizard')
  ) return null

  function handleOverlayDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setPageDragging(false)
    handleFiles(Array.from(e.dataTransfer?.files || []))
  }

  function handleFabClick() {
    setCameraOpen(true)
  }

  function handlePickFile() {
    fileInputRef.current?.click()
  }

  function handlePickChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length) handleFiles(files)
    e.target.value = ''
  }

  return (
    <>
      {/* Full-page drop overlay — appears whenever dragging files */}
      {pageDragging && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDrop={handleOverlayDrop}
        >
          <div className="rounded-2xl border-4 border-dashed border-emerald-500 bg-white/95 px-10 py-8 flex flex-col items-center gap-3 shadow-2xl pointer-events-none">
            <Upload size={48} className="text-emerald-600 animate-bounce" />
            <p className="text-xl font-semibold text-emerald-800">Drop to auto-add receipts</p>
            <p className="text-sm text-gray-500">PDF or images — Guacanomics handles the rest 🥑</p>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {busy > 0 && (
          <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold">
            <Loader2 size={12} className="animate-spin" />
            Scanning {busy}…
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* File picker — useful on desktop without drag-and-drop */}
          <button
            type="button"
            onClick={handlePickFile}
            className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-emerald-700 hover:border-emerald-400 shadow-md hover:shadow-lg transition-all"
            title="Upload a file"
          >
            <Upload size={18} />
          </button>
          {/* Camera FAB — primary */}
          <button
            type="button"
            onClick={handleFabClick}
            className="group flex items-center gap-2 h-14 pl-4 pr-5 rounded-full bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-800 transition-all"
            title="Add receipt"
          >
            <span className="text-xl">🥑</span>
            <span className="hidden sm:inline font-bold text-sm">Add Receipt</span>
            <Camera size={18} className="text-emerald-100" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handlePickChange}
        />
      </div>

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={(file) => handleFiles([file])} />
    </>
  )
}
