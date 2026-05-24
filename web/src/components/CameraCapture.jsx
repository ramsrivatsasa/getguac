'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, RefreshCw, Loader2 } from 'lucide-react'

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

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-blue-600" />
            <h3 className="font-semibold">Capture Receipt</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 rounded-md" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-black aspect-video flex items-center justify-center">
          {/* Always mounted so the effect can attach the stream as soon as it resolves. */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-contain ${error || starting ? 'opacity-0' : 'opacity-100'}`}
          />
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6 py-10 bg-black/80">
              <p className="text-sm mb-3 opacity-80">{error}</p>
              <button onClick={pickFile} className="btn-primary">Choose a photo instead</button>
              <input
                ref={fallbackInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFallbackPicked}
              />
            </div>
          ) : starting ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white opacity-80 gap-2">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Starting camera…</p>
            </div>
          ) : null}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <button
            type="button"
            onClick={flipCamera}
            disabled={!!error || starting}
            className="btn-secondary"
            title="Flip camera"
          >
            <RefreshCw size={15} /> Flip
          </button>
          <button
            type="button"
            onClick={snap}
            disabled={!!error || starting}
            className="btn-primary"
          >
            <Camera size={16} /> Capture
          </button>
        </div>
      </div>
    </div>
  )
}
