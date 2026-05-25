'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Monitor, Loader2, ClipboardPaste } from 'lucide-react'
// Capture a screenshot of another screen, window, or browser tab using the
// W3C Screen Capture API (`getDisplayMedia`). Browsers ALWAYS prompt the user
// to pick what to share — there is no way to capture silently.
//
// On open:
//   1. Asks the user which surface to share (other monitor, window, or tab).
//   2. Shows a live preview.
//   3. Single click on "Capture" grabs one JPEG frame and returns it via onCapture.
//
// Falls back to a clipboard-paste helper if getDisplayMedia is unavailable.
export default function ScreenshotCapture({ open, onClose, onCapture }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError]       = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setStarting(true)
    let cancelled = false

    const start = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        setError('Screen-capture API not available in this browser. Use Ctrl+V to paste a screenshot instead.')
        setStarting(false)
        return
      }
      try {
        // `displaySurface: 'monitor'` hints the prompt toward another screen.
        // The browser still lets the user pick window / tab.
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' },
          audio: false,
        })
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop()
          return
        }
        streamRef.current = stream

        // If user clicks "Stop sharing" in the browser bar, close the modal.
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (!cancelled) onClose()
        })

        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await new Promise(resolve => {
            const done = () => { video.removeEventListener('loadedmetadata', done); resolve() }
            if (video.readyState >= 1) resolve()
            else video.addEventListener('loadedmetadata', done)
          })
          try { await video.play() } catch { /* autoplay can be blocked */ }
        }
        if (!cancelled) setStarting(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.name === 'NotAllowedError'
            ? 'You declined the screen-share prompt. Reopen and pick a screen to capture.'
            : (err.message || 'Could not start screen capture')
          )
          setStarting(false)
        }
      }
    }
    start()

    return () => {
      cancelled = true
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop()
        streamRef.current = null
      }
    }
  }, [open, onClose])

  function snap() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth, h = video.videoHeight
    if (!w || !h) return
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `screen-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      onClose()
    }, 'image/jpeg', 0.92)
  }

  // Paste-from-clipboard fallback button (works whether or not getDisplayMedia is supported).
  async function pasteFromClipboard() {
    try {
      if (!navigator.clipboard?.read) {
        setError('Clipboard API blocked. Press Ctrl+V on the Receipts page instead.')
        return
      }
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'))
        if (!imgType) continue
        const blob = await item.getType(imgType)
        const ext = imgType.split('/')[1] || 'png'
        const file = new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imgType })
        onCapture(file); onClose()
        return
      }
      setError('No image found on the clipboard. Take a screenshot first, then click Paste.')
    } catch (err) {
      setError(err.message || 'Could not read clipboard')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-emerald-600" />
            <h3 className="font-semibold">Screen Capture</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 rounded-md" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef} playsInline muted autoPlay
            className={`w-full h-full object-contain ${error || starting ? 'opacity-0' : 'opacity-100'}`}
          />
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6 py-10 bg-black/80 gap-3">
              <p className="text-sm opacity-80 max-w-md">{error}</p>
              <button onClick={pasteFromClipboard} className="btn-primary"><ClipboardPaste size={15} /> Paste from clipboard</button>
            </div>
          ) : starting ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white opacity-80 gap-2">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Waiting for you to pick a screen…</p>
            </div>
          ) : null}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 gap-2">
          <p className="text-xs text-gray-500 hidden sm:block">
            Tip: take a normal screenshot (Win+Shift+S / Cmd+Shift+4), then press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">Ctrl+V</kbd> on the Receipts page.
          </p>
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={pasteFromClipboard} className="btn-secondary" title="Paste an image from your clipboard">
              <ClipboardPaste size={15} /> Paste
            </button>
            <button type="button" onClick={snap} disabled={!!error || starting} className="btn-primary">
              <Monitor size={16} /> Capture frame
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
