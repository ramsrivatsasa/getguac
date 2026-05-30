'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react'
// Opens the device camera (rear if available) in an overlay, lets the user snap
// a still, then returns the result to the parent as a File via onCapture.
// Works on Chrome / Firefox / Edge / Safari, desktop and mobile.
//
// Falls back to a regular file input + capture="environment" if getUserMedia
// is unavailable or rejected (e.g. http:// origin on mobile).
export default function CameraCapture({ open, onClose, onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fallbackInputRef = useRef(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [facing, setFacing] = useState('environment')

  useEffect(() => {
    if (!open) return
    setError('')
    setStarting(true)
    let cancelled = false

    const start = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not available — use the file picker.')
        setStarting(false)
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        })
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop()
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          // Wait for the first frame so we don't show a black preview
          await new Promise(resolve => {
            const done = () => { video.removeEventListener('loadedmetadata', done); resolve() }
            if (video.readyState >= 1) resolve()
            else video.addEventListener('loadedmetadata', done)
          })
          try { await video.play() } catch { /* autoplay can be blocked, user can tap */ }
        }
        if (!cancelled) setStarting(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not access camera')
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
  }, [open, facing])

  function snap() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      onClose()
    }, 'image/jpeg', 0.92)
  }

  function flipCamera() {
    setFacing(f => (f === 'environment' ? 'user' : 'environment'))
  }

  function pickFile() {
    fallbackInputRef.current?.click()
  }

  function onFallbackPicked(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) { onCapture(f); onClose() }
  }

  if (!open) return null

  // Native camera-app feel. Black fullscreen viewfinder with a dashed
  // receipt-shaped frame guide so the user knows where to aim, a
  // tip-of-the-day line below it, and a centered round shutter — the
  // big interaction. Gallery + Flip flank the shutter.
  return (
    <div className="fixed inset-0 z-[260] bg-black text-white flex flex-col" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm"
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
          <span className="text-sm font-bold text-white/90 tracking-wide">Capture receipt</span>
          <button
            onClick={pickFile}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm"
            aria-label="Pick from gallery"
            title="Pick from gallery"
          >
            <ImageIcon size={18} />
          </button>
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onFallbackPicked}
          />
        </div>

        {/* Viewfinder + receipt-shape guide overlay */}
        <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${error || starting ? 'opacity-0' : 'opacity-100'}`}
          />

          {/* Receipt-shaped dashed guide — pulsing edges so it
              telegraphs "align the receipt with this rectangle". */}
          {!error && !starting && (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none" />
              <div
                className="relative border-2 border-dashed border-emerald-300 rounded-2xl frame-pulse"
                style={{ width: '78%', maxWidth: 360, aspectRatio: '5 / 7' }}
              >
                {/* Corner brackets — bright emerald to read against any background */}
                <span className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                <span className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                <span className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />
              </div>

              {/* Tip line under the guide */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none">
                <p className="text-[12px] font-semibold text-white/90 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  Tip: include the store name, date, and total
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6 py-10 bg-black/85">
              <p className="text-sm mb-3 opacity-80">{error}</p>
              <button onClick={pickFile} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold">
                Choose a photo instead
              </button>
            </div>
          )}

          {!error && starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Footer — centered big round shutter with flip on the right.
            Native-camera feel. */}
        <div className="px-6 pb-8 pt-4 bg-black/90 flex items-center justify-center gap-10">
          <button
            type="button"
            onClick={pickFile}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            aria-label="Gallery"
            title="Pick from gallery"
          >
            <ImageIcon size={20} />
          </button>
          <button
            type="button"
            onClick={snap}
            disabled={!!error || starting}
            className="relative w-20 h-20 rounded-full bg-white p-1.5 shadow-[0_0_0_4px_rgba(255,255,255,0.25)] hover:shadow-[0_0_0_8px_rgba(16,185,129,0.35)] disabled:opacity-50 transition-shadow"
            aria-label="Capture"
          >
            <span className="block w-full h-full rounded-full bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center">
              <Camera size={26} className="text-white" />
            </span>
          </button>
          <button
            type="button"
            onClick={flipCamera}
            disabled={!!error || starting}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-40"
            aria-label="Flip camera"
            title="Flip camera"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        <style jsx>{`
          .frame-pulse { animation: frame-pulse 2.2s ease-in-out infinite; }
          @keyframes frame-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.0); }
            50%      { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0.25); }
          }
          @media (prefers-reduced-motion: reduce) {
            .frame-pulse { animation: none; }
          }
        `}</style>
      </div>
    </div>
  )
}
