'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, ArrowRight, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { detectAnomalies } from '../lib/spending-anomalies'

// Dashboard surface for the spending-anomaly detector. Shows the top
// 3 flagged anomalies in a compact panel, each with a tap-target to
// drill into the relevant receipts. Per-session dismiss so it doesn't
// nag you all day once you've seen it.
//
// Empty state: panel doesn't render at all. The dashboard stays clean
// when there's nothing genuinely off in the user's spending.

const DISMISS_KEY = 'getguac.anomalies-panel.dismissed.v1'
const TOP_N = 3

export default function AnomaliesPanel({ receipts = [] }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY)) setDismissed(true)
    } catch {}
  }, [])

  const anomalies = useMemo(() => detectAnomalies(receipts), [receipts])
  const topAnomalies = anomalies.slice(0, TOP_N)

  if (topAnomalies.length === 0 || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  // Tone driver: any 'flag' raises the panel to rose; otherwise amber.
  const hasFlag = topAnomalies.some(a => a.severity === 'flag')
  const tone = hasFlag
    ? { border: 'border-rose-300', bg: 'bg-rose-50/40', iconBg: 'bg-rose-100', iconColor: 'text-rose-700', heading: 'text-rose-900', body: 'text-rose-800/80', linkBg: 'hover:bg-rose-100', linkColor: 'text-rose-900' }
    : { border: 'border-amber-300', bg: 'bg-amber-50/40', iconBg: 'bg-amber-100', iconColor: 'text-amber-700', heading: 'text-amber-900', body: 'text-amber-800/80', linkBg: 'hover:bg-amber-100', linkColor: 'text-amber-900' }

  return (
    <div className={`card border-l-4 ${tone.border} ${tone.bg} py-3 px-4`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full ${tone.iconBg} flex items-center justify-center shrink-0`}>
            <AlertTriangle size={16} className={tone.iconColor} />
          </div>
          <div>
            <p className={`text-sm font-bold ${tone.heading}`}>
              {anomalies.length === 1 ? '1 spending anomaly' : `${anomalies.length} spending anomalies`} worth a look
            </p>
            <p className={`text-[11px] ${tone.body}`}>
              Compared to your last 3 windows of the same length
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className={`w-8 h-8 rounded-lg ${tone.linkColor} ${tone.linkBg} flex items-center justify-center transition-colors`}
          aria-label="Dismiss anomalies for this session"
          title="Hide until next session"
        >
          <EyeOff size={14} />
        </button>
      </div>

      <div className="space-y-1.5">
        {topAnomalies.map((a, i) => (
          <Link
            key={`${a.kind}:${a.storeKey || a.category || i}`}
            href={a.actionUrl}
            className={`flex items-start justify-between gap-2 rounded-lg px-2.5 py-1.5 -mx-1 ${tone.linkBg} transition-colors group`}
          >
            <div className="min-w-0 flex-1">
              <p className={`text-[13px] font-semibold ${tone.heading} truncate flex items-center gap-1.5`}>
                {a.severity === 'flag' && <TrendingUp size={12} className={tone.iconColor} />}
                {a.title}
              </p>
              <p className={`text-[11px] ${tone.body} truncate mt-0.5`}>{a.body}</p>
            </div>
            <ArrowRight size={14} className={`${tone.iconColor} opacity-50 group-hover:opacity-100 transition-opacity shrink-0 mt-1.5`} />
          </Link>
        ))}
      </div>

      {anomalies.length > TOP_N && (
        <p className={`text-[11px] ${tone.body} mt-2 text-right`}>
          +{anomalies.length - TOP_N} more
        </p>
      )}
    </div>
  )
}
