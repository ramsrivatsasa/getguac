'use client'
// The no-account receipt trial, extracted from JoinClient.jsx.
//
// WHY THIS FILE EXISTS: /join's primary CTA promises "Try 1 receipt", but the
// demo_3 port (JoinV3Client) replaced the page this trial lived inside, and the
// CTA was left pointing at /register?try=receipt - a parameter nothing reads,
// on a page that just asks for an account. The ad's main promise led to a
// signup wall. This lifts the trial out of the old client so the new page can
// mount it without inheriting the rest of that 2,989-line file.
//
// Verbatim extraction, not a rewrite: the handlers, dialogs and result view are
// the same code that was in JoinClient.jsx, so the behaviour it was written for
// is preserved. Only the wiring changed - it opens from a `startSignal` prop
// instead of a button this component owns.
//
// It posts to /api/try-receipt: anonymous, parse-only, rate limited to 50 per
// device per day, and it persists NOTHING server-side. Results live in
// localStorage under the visitor's first name until they clear them.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3, Camera, Check, FileText, Images, Loader2, Mic, Receipt,
  Scissors, Share2, Sparkles, Star, Trash2, X,
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import { trackClick } from '../../lib/track-click'
import GoogleG from '../../components/GoogleG'
import CameraCapture from '../../components/CameraCapture'
import ReceiptScanAnimation from '../../components/ReceiptScanAnimation'
import VoiceCapture from '../../components/VoiceCapture'

async function prepareTrialUpload(file) {
  if (!file?.type?.startsWith('image/') || file.size <= 3.5 * 1024 * 1024) return file
  try {
    const bitmap = await createImageBitmap(file)
    const maxSide = 2200
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    return blob ? new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

// Money, formatted so a refund reads as one. `$${n.toFixed(2)}` produces the
// malformed "$-6.50" for any negative — which is exactly what a Cinemark refund
// rendered as. Negatives get the sign OUTSIDE the symbol: −$6.50.
const money = (n) => {
  const v = Number(n || 0)
  return v < 0 ? `−$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`
}

// A receipt is a refund if the engine says so, or if the money is negative.
// Both are checked because is_return only started being passed through the
// trial API today — an older cached result would only have the negative.
const isRefund = (r) => Boolean(r?.is_return) || Number(r?.total_amount || 0) < 0

// Things worth telling the visitor about rather than rendering as a bare
// number. A refund shown under "TOTAL SPEND" reads as a parsing failure; a
// $0.00 total looks like nothing happened.
function anomaliesFor(r) {
  const out = []
  if (!r) return out
  if (isRefund(r)) out.push({ tone: 'info', text: `This looks like a refund or return — the amounts are negative, which is why you see ${money(r.total_amount)}.` })
  if (Number(r.total_amount || 0) === 0) out.push({ tone: 'warn', text: 'We could not read a total on this one. The store and items still came through — a brighter, straighter photo usually fixes the total.' })
  if (!(r.items || []).length) out.push({ tone: 'warn', text: 'No line items were readable on this receipt, so only the header details came through.' })
  if (!r.date) out.push({ tone: 'info', text: 'No date was printed clearly, so this one is undated.' })
  return out
}

// One of the three figures under the result headline (items read / sales tax /
// categories). Lived further down JoinClient.jsx, outside the extracted range.
function ResultStat({ value, label }) {
  return (
    <div className="rounded-2xl bg-white px-2 py-3 text-center ring-1 ring-emerald-900/10">
      <div className="text-lg font-black text-[#315F17] sm:text-xl">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 sm:text-[11px]">{label}</div>
    </div>
  )
}

// startSignal: increment it to open the trial. A counter rather than a boolean
// so a second press re-opens after the visitor closes it.
export default function JoinReceiptTrial({ startSignal = 0 }) {
  const [tryNameOpen, setTryNameOpen] = useState(false)
  const [tryName, setTryName] = useState('')
  const [trialBusy, setTrialBusy] = useState(false)
  const [trialCameraOpen, setTrialCameraOpen] = useState(false)
  const [trialSourceOpen, setTrialSourceOpen] = useState(false)
  const [trialVoiceOpen, setTrialVoiceOpen] = useState(false)
  const [trialResult, setTrialResult] = useState(null)
  const [trialReceipts, setTrialReceipts] = useState([])
  const [trialView, setTrialView] = useState('receipt')
  const [trialDeleted, setTrialDeleted] = useState(false)
  const [trialShareMessage, setTrialShareMessage] = useState('')
  const [trialError, setTrialError] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  // Shown only when navigator.share is unavailable (desktop). sms: and mailto:
  // actually open the Messages / Mail app, which a clipboard copy never did.
  const [trialShareChoices, setTrialShareChoices] = useState(false)
  const trialMobileInputRef = useRef(null)
  const trialGalleryInputRef = useRef(null)
  const trialFileInputRef = useRef(null)

  useEffect(() => {
    if (startSignal > 0) { setTrialDeleted(false); setTryNameOpen(true) }
  }, [startSignal])

  async function oauth(provider) {
    setBusy(provider); setErr('')
    trackClick(`join-signup-${provider}`)
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })
      // No conversion event here, and there must never be one. This fires the
      // instant we hand off to Google, BEFORE consent — and this button signs
      // EXISTING users in too, so a fire here counts both abandoned consent
      // screens and every returning user as a fresh registration.
      //
      // ✅ The gap this used to leave is now CLOSED, server-side: the account
      // is created in /auth/callback, and that route fires CompleteRegistration
      // through the Conversions API on the new-account branch only. See
      // lib/meta-capi.js. Inert until FB_CAPI_TOKEN is set in Vercel.
      if (error) { setErr(error.message); setBusy('') }
    } catch (e) {
      setErr(e?.message || `Could not start ${provider} sign in`)
      setBusy('')
    }
  }

  async function processTrialReceipt(file) {
    if (!file) return
    setTrialError('')
    setTrialResult(null)
    setTrialBusy(true)
    try {
      const form = new FormData()
      form.append('file', await prepareTrialUpload(file))
      const response = await fetch('/api/try-receipt', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'We could not read that receipt.')
      storeTrialResult(data)
      trackClick('join-try-one-receipt-success')
    } catch (error) {
      setTrialError(error?.message || 'We could not read that receipt. Try a clearer photo.')
    } finally {
      setTrialBusy(false)
    }
  }

  function storeTrialResult(data) {
    const storedReceipt = { ...data, trial_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
    setTrialResult(storedReceipt)
    const storageKey = `getguac_trial_${tryName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40) || 'guest'}`
    let existing = []
    try { existing = JSON.parse(localStorage.getItem(storageKey) || '[]') } catch {}
    const nextReceipts = [...(Array.isArray(existing) ? existing : []), storedReceipt].slice(-100)
    setTrialReceipts(nextReceipts)
    try { localStorage.setItem(storageKey, JSON.stringify(nextReceipts)) } catch {}
  }

  async function processTrialVoice(transcript) {
    if (!transcript?.trim()) return
    setTrialVoiceOpen(false)
    setTrialBusy(true)
    setTrialError('')
    try {
      const response = await fetch('/api/receipts/from-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'We could not understand that receipt.')
      storeTrialResult(data)
    } catch (error) {
      setTrialError(error?.message || 'We could not understand that receipt.')
    } finally {
      setTrialBusy(false)
    }
  }

  function openTrialCamera() {
    setTrialDeleted(false)
    const useNativeCamera = window.matchMedia?.('(pointer: coarse)')?.matches && window.innerWidth <= 900
    if (useNativeCamera) setTrialSourceOpen(true)
    else setTrialCameraOpen(true)
  }

  function deleteTrialData() {
    const storageKey = `getguac_trial_${tryName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40) || 'guest'}`
    try { localStorage.removeItem(storageKey) } catch {}
    setTrialReceipts([])
    setTrialResult(null)
    setTryName('')
    setTrialDeleted(true)
  }

  // 🔴 WAS /join_demo — which 404s in production. Every "refer a friend" share
  // has been sending people to a dead page. /join is the real landing page, and
  // it is the one carrying the pixel and the click counters, so referral traffic
  // is now measurable too.
  // 🔴 Pinned to production, NOT window.location.origin. A share sent from a
  // preview or localhost would hand the recipient a dead link — the destination
  // of a shared link must not depend on where the sharer happened to be.
  const SHARE_URL = 'https://getguac.app/join'
  const SHARE_TEXT = 'One photo of a receipt → every item, the tax, and the date, sorted in about a minute. That is GetGuac. Free, and it never asks for your bank login.'

  async function shareTrialPage(mode) {
    trackClick(mode === 'refer' ? 'join-trial-refer' : 'join-trial-save')
    const referring = mode === 'refer'
    const shareData = {
      title: 'Try GetGuac',
      text: referring ? SHARE_TEXT : 'Save GetGuac and come back when you are ready.',
      url: SHARE_URL,
    }
    try {
      // navigator.share opens the OS sheet — Messages, Mail, WhatsApp — and is
      // the right answer on a phone. It does NOT exist on most desktop
      // browsers, where this used to fall through to a silent clipboard copy
      // that felt like nothing had happened.
      if (navigator.share) {
        await navigator.share(shareData)
        setTrialShareMessage(referring ? 'Thanks for sharing GetGuac!' : 'GetGuac is ready in your share menu.')
        window.setTimeout(() => setTrialShareMessage(''), 3500)
        return
      }
      if (referring) {
        // No share sheet: offer the two things that DO open something.
        setTrialShareChoices(true)
        return
      }
      // Saving, no share sheet. A page cannot add its own bookmark — every
      // browser removed that on purpose — so copy the link and say the one
      // thing that actually works.
      await navigator.clipboard.writeText(SHARE_URL)
      const mac = /Mac|iPhone|iPad/.test(navigator.platform || '')
      setTrialShareMessage(`Link copied — press ${mac ? '⌘' : 'Ctrl'}+D to bookmark it.`)
      window.setTimeout(() => setTrialShareMessage(''), 5000)
    } catch (error) {
      if (error?.name !== 'AbortError') setTrialShareMessage('Copy this page link to save or share GetGuac.')
    }
  }

  return (
    <>
      {/* Hidden inputs the source sheet triggers. They must exist in the tree
          before the sheet can click them, so they are not inside a conditional. */}
      <div className="sr-only">
                  <input
                    ref={trialMobileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label="Take a receipt photo with the rear camera"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) processTrialReceipt(file)
                      e.target.value = ''
                    }}
                  />
                  <input
                    ref={trialGalleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    aria-label="Pick one or more receipt photos"
                    className="sr-only"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || [])
                      e.target.value = ''
                      for (const file of files) await processTrialReceipt(file)
                    }}
                  />
                  <input
                    ref={trialFileInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    aria-label="Choose a receipt image, file, or PDF"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) processTrialReceipt(file)
                      e.target.value = ''
                    }}
                  />
      </div>

      {tryNameOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="try-receipt-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setTryNameOpen(false)}
        >
          <form
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              if (!tryName.trim()) return
              trackClick('join-trial-name-submit')
              const storageKey = `getguac_trial_${tryName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40) || 'guest'}`
              try {
                const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
                setTrialReceipts(Array.isArray(saved) ? saved : [])
              } catch { setTrialReceipts([]) }
              setTryNameOpen(false)
              openTrialCamera()
            }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-100 text-lime-700">
              <Camera size={22} aria-hidden />
            </div>
            <h2 id="try-receipt-title" className="text-xl font-extrabold text-[#15281C]">What&apos;s your name?</h2>
            <p className="mt-1 text-sm text-gray-500">Then we&apos;ll open your camera for one receipt.</p>
            <label htmlFor="try-receipt-name" className="mt-5 block text-sm font-bold text-gray-700">First name</label>
            <input
              id="try-receipt-name"
              autoFocus
              autoComplete="given-name"
              value={tryName}
              onChange={(e) => setTryName(e.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition focus:border-lime-500"
            />
            <button
              type="submit"
              disabled={!tryName.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65A30D] px-4 py-3 font-extrabold text-white disabled:opacity-40"
            >
              <Camera size={18} aria-hidden /> Open camera
            </button>
          </form>
        </div>
      )}

      <CameraCapture
        open={trialCameraOpen}
        onClose={() => setTrialCameraOpen(false)}
        onCapture={(file) => {
          trackClick('join-trial-camera-capture')
          setTrialCameraOpen(false)
          processTrialReceipt(file)
        }}
      />

      <VoiceCapture
        open={trialVoiceOpen}
        onClose={() => setTrialVoiceOpen(false)}
        onTranscript={processTrialVoice}
      />

      {trialSourceOpen && (
        <div className="fixed inset-0 z-[105] flex items-end bg-black/50" role="dialog" aria-modal="true" aria-labelledby="trial-source-title" onClick={() => setTrialSourceOpen(false)}>
          <div className="w-full rounded-t-[28px] bg-[#F8FBF1] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-300" />
            <h2 id="trial-source-title" className="sr-only">Add a receipt</h2>
            <button type="button" onClick={() => { trackClick('join-trial-source-camera'); setTrialSourceOpen(false); trialMobileInputRef.current?.click() }} className="flex w-full items-center gap-4 rounded-2xl px-3 py-4 text-left active:bg-lime-100">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Camera size={26} aria-hidden /></span>
              <span><strong className="block text-lg text-[#15281C]">Take photos</strong><span className="mt-0.5 block text-sm text-gray-500">Snap paper receipts with your rear camera</span></span>
            </button>
            <button type="button" onClick={() => { trackClick('join-trial-source-gallery'); setTrialSourceOpen(false); trialGalleryInputRef.current?.click() }} className="flex w-full items-center gap-4 rounded-2xl px-3 py-4 text-left active:bg-lime-100">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Images size={26} aria-hidden /></span>
              <span><strong className="block text-lg text-[#15281C]">Pick from gallery</strong><span className="mt-0.5 block text-sm text-gray-500">Select one or many receipt screenshots</span></span>
            </button>
            <button type="button" onClick={() => { trackClick('join-trial-source-file'); setTrialSourceOpen(false); trialFileInputRef.current?.click() }} className="flex w-full items-center gap-4 rounded-2xl px-3 py-4 text-left active:bg-lime-100">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><FileText size={26} aria-hidden /></span>
              <span><strong className="block text-lg text-[#15281C]">Choose file or PDF</strong><span className="mt-0.5 block text-sm text-gray-500">Browse Downloads, Files, Drive, or a PDF statement</span></span>
            </button>
            <button type="button" onClick={() => { trackClick('join-trial-source-voice'); setTrialSourceOpen(false); setTrialVoiceOpen(true) }} className="flex w-full items-center gap-4 rounded-2xl px-3 py-4 text-left active:bg-lime-100">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Mic size={26} aria-hidden /></span>
              <span><strong className="block text-lg text-[#15281C]">Voice</strong><span className="mt-0.5 block text-sm text-gray-500">Dictate a receipt, like “thirty bucks at Costco”</span></span>
            </button>
          </div>
        </div>
      )}

      <ReceiptScanAnimation count={trialBusy ? 1 : 0} variant="receipt" />

      {trialError && !trialBusy && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="trial-error-title" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4" onClick={() => setTrialError('')}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 id="trial-error-title" className="text-xl font-extrabold text-[#15281C]">Let&apos;s try that again</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{trialError}</p>
            <button type="button" onClick={() => { trackClick('join-trial-error-retry'); setTrialError(''); openTrialCamera() }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65A30D] px-4 py-3 font-extrabold text-white">
              <Camera size={18} aria-hidden /> Try again
            </button>
          </div>
        </div>
      )}

      {trialResult && !trialBusy && (
        <div role="dialog" aria-modal="true" aria-labelledby="trial-result-title" className="fixed inset-0 z-[110] overflow-y-auto bg-[#07110C]/80 p-0 backdrop-blur-sm sm:p-4">
          <div className="mx-auto min-h-[100dvh] w-full max-w-lg overflow-hidden bg-[#F8FBF4] shadow-2xl sm:my-4 sm:min-h-0 sm:rounded-3xl">
            <div className="bg-gradient-to-br from-[#315F17] to-[#65A30D] px-6 py-7 text-white">
              <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-lime-100"><Sparkles size={17} aria-hidden /> {isRefund(trialResult) ? 'Guac-AI read your refund' : 'Guac-AI found it'}</div>
              <h2 id="trial-result-title" className="mt-3 text-3xl font-black">Nice, {tryName.trim()}.</h2>
              <p className="mt-1 text-lime-50">{isRefund(trialResult)
                ? 'A refund, read and filed — money coming back to you.'
                : 'One photo became organized spending—without typing a line.'}</p>
              <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl bg-white/15 p-4 ring-1 ring-white/20">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-lime-100">{trialResult.store_name}</p>
                  <p className="mt-1 text-sm text-white/80">{trialResult.date || 'Date ready to confirm'}</p>
                </div>
                <p className="text-3xl font-black">{money(trialResult.total_amount)}</p>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {/* ANOMALY MESSAGES. A refund rendered as "TOTAL SPEND $-6.50"
                  reads as a parsing failure when the model was actually right —
                  it detected the return and returned negative amounts, exactly
                  as the prompt instructs. Say what happened instead of leaving
                  the visitor to interpret a negative number. Same for a total
                  we could not read, or a receipt with no legible line items. */}
              {anomaliesFor(trialResult).map((a, k) => (
                <div key={k} className={`flex gap-2 rounded-2xl p-3 text-sm leading-5 ${a.tone === 'warn' ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'}`}>
                  <span aria-hidden className="shrink-0">{a.tone === 'warn' ? '⚠️' : 'ℹ️'}</span>
                  <span>{a.text}</span>
                </div>
              ))}

              {/* THE ASK, MOVED UP. It used to live at the very bottom of this
                  panel, below the "what Guac does every time" copy and the saved-
                  receipts list. Over 90 days, 11 people reached this result and 5
                  pressed a tab — but join-trial-signup, join-trial-save and
                  join-trial-refer were ALL zero. Those three sit in that buried
                  block; the tabs sit high. The likeliest read is that nobody
                  scrolled that far, not that they saw the ask and declined.
                  The moment of most intent is right here, immediately after the
                  total lands. So the ask is here now, and the buried buttons stay
                  where they are as a second chance.

                  🔒 COPY IS DELIBERATELY NOT "save this receipt". The trial keeps
                  results in localStorage only; registering does NOT import them.
                  Promising that would be false the moment someone signs up. */}
              <div className="rounded-2xl border-2 border-[#65A30D]/30 bg-white p-4 text-center">
                <p className="text-[15px] font-extrabold leading-snug text-[#15281C]">
                  That took about a minute. Do it for every receipt.
                </p>
                <p className="mt-1 text-xs text-gray-500">Free forever · no card · delete anytime</p>
                <Link
                  href="/register"
                  onClick={() => trackClick('join-trial-signup')}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65A30D] px-4 py-3 font-extrabold text-white no-underline"
                >
                  <Sparkles size={17} aria-hidden /> Create your free account
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <ResultStat value={trialResult.items?.length || 0} label={(trialResult.items?.length || 0) === 1 ? "item read" : "items read"} />
                <ResultStat value={money(trialResult.tax_paid)} label="sales tax" />
                <ResultStat value={new Set((trialResult.items || []).map((item) => item.category).filter(Boolean)).size || (trialResult.category ? 1 : 0)} label={(new Set((trialResult.items || []).map((item) => item.category).filter(Boolean)).size || (trialResult.category ? 1 : 0)) === 1 ? "category" : "categories"} />
              </div>
              <p className="text-center text-sm font-bold text-[#4D7C0F]">{trialReceipts.length} receipt{trialReceipts.length === 1 ? '' : 's'} processed for {tryName.trim()}</p>

              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#EAF2E1] p-1.5" aria-label="Preview trial results">
                {[
                  { id: 'receipt', label: 'Receipts', icon: Receipt },
                  { id: 'smashlist', label: 'Shopping List', icon: Scissors },
                  { id: 'report', label: 'Report', icon: BarChart3 },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { trackClick(`join-trial-view-${id}`); setTrialView(id) }}
                    aria-pressed={trialView === id}
                    className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-extrabold transition sm:flex-row sm:text-xs ${trialView === id ? 'bg-white text-[#315F17] shadow-sm ring-1 ring-emerald-900/10' : 'text-[#617064] hover:bg-white/60'}`}
                  >
                    <Icon size={17} aria-hidden /> {label}
                  </button>
                ))}
              </div>

              {trialView === 'receipt' && <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-900/10">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-lime-700">Receipt dashboard preview</p>
                    <h3 className="font-extrabold text-[#15281C]">What you bought</h3>
                  </div>
                  <span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-bold text-lime-800">Auto-organized</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {(trialResult.items || []).slice(0, 6).map((item, index) => (
                    <li key={`${item.item_name}-${index}`} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-lime-50 text-xs font-black text-lime-700">{Number(item.qty || 1)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700">{item.item_name || 'Receipt item'}</span>
                      <span className="text-sm font-extrabold text-[#15281C]">{money(item.price)}</span>
                    </li>
                  ))}
                </ul>
                {(trialResult.items || []).length > 6 && <p className="pt-2 text-center text-xs font-bold text-lime-700">+ {(trialResult.items || []).length - 6} more items read</p>}
              </div>}

              {trialView === 'smashlist' && <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-900/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-lime-700">Shopping List preview</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div><h3 className="font-extrabold text-[#15281C]">Buy again</h3><p className="text-xs text-gray-500">Your receipt starts the list for you.</p></div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">{trialResult.items?.length || 0} saved</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {(trialResult.items || []).slice(0, 5).map((item, index) => (
                    <li key={`${item.item_name}-smash-${index}`} className="flex items-center gap-3 rounded-xl bg-[#F6F8F3] p-3">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 border-lime-300 bg-white text-lime-700"><Check size={16} aria-hidden /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-700">{item.item_name || 'Receipt item'}</span>
                      <span className="text-sm font-extrabold text-[#315F17]">{money(item.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>}

              {trialView === 'report' && <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-900/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-lime-700">Spending report preview</p>
                <div className="mt-1 flex items-start justify-between gap-4">
                  <div><h3 className="font-extrabold text-[#15281C]">This receipt at a glance</h3><p className="text-xs text-gray-500">A simple breakdown from one scan.</p></div>
                  <BarChart3 className="text-[#65A30D]" size={25} aria-hidden />
                </div>
                <div className="mt-4 space-y-3">
                  {Array.from(new Set((trialResult.items || []).map((item) => item.category).filter(Boolean))).slice(0, 4).map((category, index, categories) => {
                    const amount = (trialResult.items || []).filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.price || 0), 0)
                    const percentage = Math.max(8, Math.min(100, Math.round((amount / Math.max(Number(trialResult.total_amount || 0), 1)) * 100)))
                    return <div key={category}>
                      <div className="mb-1 flex justify-between text-xs font-bold text-gray-600"><span>{category}</span><span>${amount.toFixed(2)}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${index % 2 ? 'bg-amber-400' : 'bg-[#65A30D]'}`} style={{ width: `${percentage}%` }} /></div>
                    </div>
                  })}
                  {!((trialResult.items || []).some((item) => item.category)) && <div className="rounded-xl bg-lime-50 p-4 text-sm font-semibold text-lime-900">{money(trialResult.total_amount)} organized from {trialResult.items?.length || 0} {(trialResult.items?.length || 0) === 1 ? "item" : "items"} at {trialResult.store_name || 'this store'}.</div>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 text-center">
                  <div><p className="text-xl font-black text-[#315F17]">{money(trialResult.total_amount)}</p><p className="text-[10px] font-bold uppercase text-gray-400">{isRefund(trialResult) ? "Refunded" : "Total spend"}</p></div>
                  <div><p className="text-xl font-black text-[#315F17]">{money(trialResult.tax_paid)}</p><p className="text-[10px] font-bold uppercase text-gray-400">Tax tracked</p></div>
                </div>
              </div>}

              <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
                <p className="font-extrabold text-lime-900">This is what GetGuac does every time.</p>
                <p className="mt-1 text-sm leading-5 text-lime-800">Save multiple receipts to compare spending, watch return windows, and find patterns across stores.</p>
              </div>

              {trialReceipts.length > 1 && (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-900/10">
                  <h3 className="font-extrabold text-[#15281C]">Receipts under {tryName.trim()}</h3>
                  <div className="mt-2 space-y-2">
                    {trialReceipts.slice(-3).reverse().map((receipt) => (
                      <div key={receipt.trial_id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate font-semibold text-gray-700">{receipt.store_name || 'Receipt'}</span>
                        <span className="font-extrabold text-[#15281C]">{money(receipt.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-emerald-100 bg-white p-4 text-center ring-1 ring-emerald-900/5">
                <p className="font-extrabold text-[#15281C]">Like what you saw but need more time?</p>
                <p className="mt-1 text-sm leading-5 text-gray-500">Save GetGuac for later—or send it to a friend who could use it.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => shareTrialPage('save')} className="flex items-center justify-center gap-2 rounded-xl border-2 border-lime-200 bg-lime-50 px-3 py-3 text-sm font-extrabold text-[#4D7C0F]">
                    <Star size={17} aria-hidden /> Save GetGuac
                  </button>
                  <button type="button" onClick={() => shareTrialPage('refer')} className="flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-extrabold text-emerald-800">
                    <Share2 size={17} aria-hidden /> Refer a friend
                  </button>
                </div>
                {/* Desktop fallback. navigator.share does not exist in most
                    desktop browsers, so "Refer a friend" used to quietly copy a
                    link and look broken. These two DO open something: sms: hands
                    off to Messages, mailto: to the mail client. */}
                {trialShareChoices && (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-bold text-emerald-900">Send it how you like:</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <a
                        href={`sms:?&body=${encodeURIComponent(`${SHARE_TEXT} ${SHARE_URL}`)}`}
                        onClick={() => setTrialShareChoices(false)}
                        className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-extrabold text-emerald-800 no-underline"
                      >
                        <Share2 size={15} aria-hidden /> Text it
                      </a>
                      <a
                        href={`mailto:?subject=${encodeURIComponent('Try GetGuac')}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${SHARE_URL}`)}`}
                        onClick={() => setTrialShareChoices(false)}
                        className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-extrabold text-emerald-800 no-underline"
                      >
                        <Share2 size={15} aria-hidden /> Email it
                      </a>
                    </div>
                  </div>
                )}
                {trialShareMessage && <p role="status" className="mt-2 text-xs font-bold text-[#4D7C0F]">{trialShareMessage}</p>}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => { trackClick('join-trial-try-again'); setTrialResult(null); openTrialCamera() }} className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#65A30D] bg-white px-4 py-3 font-extrabold text-[#4D7C0F]">
                  <Camera size={18} aria-hidden /> Try again
                </button>
                <Link href="/register" onClick={() => trackClick('join-trial-signup')} className="flex items-center justify-center gap-2 rounded-xl bg-[#65A30D] px-4 py-3 font-extrabold text-white no-underline">
                  <Receipt size={18} aria-hidden /> Sign up
                </Link>
                <button type="button" onClick={() => oauth('google')} disabled={!!busy} className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-extrabold text-gray-700 disabled:opacity-50">
                  <span aria-hidden className="inline-flex rounded-full bg-white p-1"><GoogleG size={17} /></span>
                  {busy === 'google' ? 'Opening Google…' : 'Sign up with Google'}
                </button>
                <button type="button" onClick={() => { trackClick('join-trial-delete'); deleteTrialData() }} className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-extrabold text-red-700">
                  <Trash2 size={17} aria-hidden /> Delete data
                </button>
              </div>
              <p className="text-center text-[11px] leading-5 text-gray-400">Trial results stay on this device under the name you entered. They are not added to an account. Delete data clears them from this device.</p>
            </div>
          </div>
        </div>
      )}

      {trialDeleted && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07110C]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#F8FBF4] p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime-100 text-[#4D7C0F]">
              <Check size={34} strokeWidth={3} aria-hidden />
            </div>
            <h2 className="mt-5 text-2xl font-black text-[#15281C]">Your trial data is deleted</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">The name, receipt results, and saved trial history were removed from this device. Returning you to the homepage…</p>
            <button type="button" onClick={() => { trackClick('join-trial-home'); window.location.assign('/') }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65A30D] px-4 py-3 font-extrabold text-white">
              Go to homepage
            </button>
          </div>
        </div>
      )}
      {err ? <p className="sr-only" role="status">{err}</p> : null}
    </>
  )
}
