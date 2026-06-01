'use client'
// Polls /api/build-info and surfaces a "reload to update" banner
// the moment a new Vercel deploy starts serving. Strategy:
//
//   - Compare process.env.NEXT_PUBLIC_BUILD_SHA (baked in at build
//     time, frozen for this tab's bundle) against the server's
//     current SHA (returned by /api/build-info at request time).
//   - Poll every 5 minutes while the tab is visible, plus an
//     immediate check on tab-focus so a user who left a stale tab
//     overnight sees the prompt the moment they switch back.
//   - 'dev' SHA (local runs) short-circuits the check so devs
//     don't get nagged every reload.
//
// The banner is dismissible per-tab but reappears on the next
// poll if the SHAs still differ — by design; we'd rather nag than
// silently let a user keep filing bugs against a 3-day-old bundle.

import { useEffect, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

const POLL_INTERVAL_MS = 5 * 60_000

export default function UpdatePrompt() {
  const localSha = process.env.NEXT_PUBLIC_BUILD_SHA
  const [serverSha, setServerSha] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!localSha || localSha === 'dev') return  // skip in dev
    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/api/build-info', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const { sha } = await res.json()
        if (!cancelled) setServerSha(sha)
      } catch {
        // Network blip — just retry next interval.
      }
    }

    check()
    timerRef.current = setInterval(check, POLL_INTERVAL_MS)

    function onVisible() {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [localSha])

  // Re-show the banner if the SHA changes again (e.g. another
  // deploy lands after the user dismissed the previous prompt).
  useEffect(() => {
    setDismissed(false)
  }, [serverSha])

  const hasUpdate = serverSha && serverSha !== localSha && serverSha !== 'dev'
  if (!hasUpdate || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm bg-white border border-emerald-200 shadow-lg rounded-2xl px-4 py-3 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-500 flex items-center justify-center">
        <RefreshCw size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm">A new version is ready</p>
        <p className="text-xs text-gray-500 mt-0.5">Reload to get the latest features and fixes.</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors"
          >
            Reload now
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            Later
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}
