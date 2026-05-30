'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, ArrowRight, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
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
  // Collapsed by default — the full list took up too much vertical
  // space on the dashboard (3 rows × ~50px + header + padding). Header
  // alone is ~60px and expands on click.
  const [expanded, setExpanded] = useState(false)

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

  // Tiny inline preview of the top stores hit — fits inside the
  // collapsed header so the user gets the gist without expanding.
  const previewStores = topAnomalies.slice(0, 3).map(a => {
    const name = (a.storeKey || a.title || '').split(' ').slice(0, 2).join(' ')
    const mult = (a.body.match(/(\d+(?:\.\d+)?)\s*[x×]/i) || [])[1]
    return mult ? `${name} ${mult}×` : name
  }).filter(Boolean).join(' · ')

  return (
    <div className={`card border-l-4 ${tone.border} ${tone.bg} py-2 px-3`}>
      {/* Collapsed header — entire row clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 text-left"
      >
        <div className={`w-7 h-7 rounded-full ${tone.iconBg} flex items-center justify-center shrink-0`}>
          <AlertTriangle size={13} className={tone.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-bold ${tone.heading} truncate`}>
            {anomalies.length === 1 ? '1 spending anomaly' : `${anomalies.length} spending anomalies`}
            {previewStores && (
              <span className={`font-normal ${tone.body}`}> · {previewStores}</span>
            )}
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className={tone.iconColor} /> : <ChevronDown size={14} className={tone.iconColor} />}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); dismiss() }}
          className={`w-7 h-7 rounded-lg ${tone.linkColor} ${tone.linkBg} flex items-center justify-center transition-colors ml-1`}
          aria-label="Dismiss for this session"
          title="Hide until next session"
        >
          <EyeOff size={12} />
        </button>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 pt-2 border-t border-current/10">
          <p className={`text-[10px] ${tone.body} mb-1`}>
            Compared to your last 3 windows of the same length
          </p>
          {topAnomalies.map((a, i) => (
            <Link
              key={`${a.kind}:${a.storeKey || a.category || i}`}
              href={a.actionUrl}
              className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 ${tone.linkBg} transition-colors group`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-[12px] font-semibold ${tone.heading} truncate flex items-center gap-1.5`}>
                  {a.severity === 'flag' && <TrendingUp size={11} className={tone.iconColor} />}
                  {a.title}
                </p>
                <p className={`text-[10px] ${tone.body} truncate mt-0.5`}>{a.body}</p>
              </div>
              <ArrowRight size={13} className={`${tone.iconColor} opacity-50 group-hover:opacity-100 transition-opacity shrink-0 mt-1`} />
            </Link>
          ))}
          {anomalies.length > TOP_N && (
            <p className={`text-[10px] ${tone.body} text-right`}>
              +{anomalies.length - TOP_N} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}
