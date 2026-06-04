'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, X, Loader2, AlertTriangle } from 'lucide-react'

// VoiceCapture — push-to-talk modal that records a transcript via the
// browser SpeechRecognition API and returns it to the parent. The actual
// AI parsing (transcript → receipt fields) happens server-side in
// /api/receipts/from-voice; this component is pure capture + display.
//
// Off-device transcription was deliberately ruled out by the user (off-
// device fine; on-device opens platform-specific cans of worms). The
// browser SR API in Chromium/Edge/Safari delegates to Google/Apple
// speech services off-device, so it satisfies the constraint without
// us shipping a model.
//
// Graceful degradation: when neither `SpeechRecognition` nor
// `webkitSpeechRecognition` exists (Firefox, some embedded webviews),
// the component shows a "Not supported in this browser" panel with a
// hint to use Chrome/Edge/Safari. Parent never has to branch on support.
export default function VoiceCapture({ open, onClose, onTranscript }) {
  const recRef = useRef(null)
  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [final, setFinal] = useState('')
  const [error, setError] = useState('')

  // Reset state every time the modal opens. Without this, re-opening
  // after a previous capture would show the last transcript.
  useEffect(() => {
    if (!open) return
    setInterim('')
    setFinal('')
    setError('')
  }, [open])

  // Probe support exactly once. We don't try to instantiate the recognizer
  // here — that's lazy so the mic permission prompt only triggers when the
  // user actually presses "Start recording".
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(Boolean(SR))
  }, [])

  // Clean up the recognizer when the modal closes so we don't leave a
  // mic indicator on in the OS tray.
  useEffect(() => {
    if (open) return
    const rec = recRef.current
    if (rec) {
      try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.stop() } catch {}
      recRef.current = null
    }
    setListening(false)
  }, [open])

  const start = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setError('')
    setInterim('')
    setFinal('')

    let rec
    try {
      rec = new SR()
    } catch (e) {
      setError(e?.message || 'Could not start the microphone.')
      return
    }
    rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US'
    rec.interimResults = true
    rec.continuous = false  // single-utterance — the user dictates one sentence at a time
    rec.maxAlternatives = 1

    let finalAccum = ''
    rec.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalAccum += r[0].transcript
        else interimText += r[0].transcript
      }
      setFinal(finalAccum.trim())
      setInterim(interimText.trim())
    }
    rec.onerror = (e) => {
      // 'no-speech' fires when the user opens the modal but never talks;
      // it's a normal "try again" condition, not a hard failure.
      if (e.error === 'no-speech') {
        setError('Didn\'t catch anything. Tap the mic and try again.')
      } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone permission denied. Allow mic access in your browser settings.')
      } else if (e.error === 'audio-capture') {
        setError('No microphone found. Plug one in and try again.')
      } else {
        setError(`Speech error: ${e.error || 'unknown'}`)
      }
      setListening(false)
    }
    rec.onend = () => {
      setListening(false)
    }

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch (e) {
      // Some browsers throw if .start() is called twice in quick succession.
      setError(e?.message || 'Could not start recording.')
    }
  }, [])

  const stop = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    try { rec.stop() } catch {}
    setListening(false)
  }, [])

  const submit = useCallback(() => {
    const t = (final || interim).trim()
    if (!t) {
      setError('Nothing to send — record something first.')
      return
    }
    onTranscript?.(t)
  }, [final, interim, onTranscript])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold text-gray-800 mb-1">Voice → Receipt</h3>
        <p className="text-sm text-gray-500 mb-4">
          Say something like <em>&quot;Thirty bucks at Costco on groceries.&quot;</em>
        </p>

        {!supported ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Not supported in this browser</p>
              <p>Voice capture needs the SpeechRecognition API — try Chrome, Edge, or Safari. Firefox users: use the camera button instead.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 py-2">
              <button
                type="button"
                onClick={listening ? stop : start}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  listening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
                aria-label={listening ? 'Stop recording' : 'Start recording'}
              >
                {listening ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
              </button>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {listening ? 'Listening… tap to stop' : 'Tap mic to start'}
              </p>
            </div>

            <div className="mt-3 min-h-[80px] rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
              {final || interim ? (
                <>
                  <p className="text-gray-800">{final}</p>
                  {interim && <p className="text-gray-400 italic">{interim}</p>}
                </>
              ) : (
                <p className="text-gray-400">Your spoken receipt will appear here…</p>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn-primary disabled:opacity-50"
                disabled={listening || !(final || interim).trim()}
                onClick={submit}
              >
                Parse this
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400 leading-relaxed">
              Heads up: speech recognition varies by accent and background noise. We&apos;ll show
              the parsed fields for you to review before saving.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
