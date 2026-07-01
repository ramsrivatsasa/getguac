'use client'
// /notifications — settings page for push-notification preferences.
// Reads + writes via /api/notify/prefs (which writes the
// profiles.notification_prefs JSON column). Each category renders
// as a toggle; flipping the toggle persists immediately so there's
// no Save button to forget.

import { useEffect, useState } from 'react'
import { Bell, Gift, Package, TrendingUp, AlertTriangle, ShoppingCart, MoonStar, Clock } from 'lucide-react'
import FeatureHeader from '../../../components/FeatureHeader'

const CATEGORIES = [
  { key: 'rewards_expiring', icon: Gift,           label: 'Reward expiring',         desc: 'Heads-up when a reward expires within 7 days.' },
  { key: 'return_window',    icon: Package,        label: 'Return window closing',    desc: "Reminder the day before an item's return-by date." },
  { key: 'bank_bite_digest', icon: TrendingUp,     label: 'Weekly Bank Bite digest',  desc: 'Monday recap of interest + fees from the prior 7 days.' },
  { key: 'anomaly_alert',    icon: AlertTriangle,  label: 'Anomaly alert',            desc: 'When a spending category spikes above its baseline.' },
  { key: 'smashlist_day',    icon: ShoppingCart,   label: 'Smashlist day',            desc: 'Reminder on a predicted shopping day for a store.' },
]

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState(null)
  const [busy, setBusy]   = useState(null)

  useEffect(() => {
    fetch('/api/notify/prefs').then(r => r.json()).then(d => setPrefs(d.prefs || {}))
  }, [])

  async function toggle(key, value) {
    setBusy(key)
    const next = { ...(prefs || {}), [key]: value }
    setPrefs(next)                                  // optimistic
    try {
      await fetch('/api/notify/prefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
    } finally {
      setBusy(null)
    }
  }

  if (!prefs) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="page-title">Notifications</h1>
        <div className="card text-gray-400 py-8 text-center text-sm flex flex-col items-center gap-3">
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      <FeatureHeader
        expression="happy"
        title="Notifications"
        subtitle="Pick which alerts you want. Changes save automatically."
      />

      <div className="card divide-y divide-guac-line p-0 overflow-hidden">
        {CATEGORIES.map(({ key, icon: Icon, label, desc }) => {
          const on = prefs[key] !== false
          return (
            <label key={key} className="flex items-start gap-3 p-4 hover:bg-guac-50/30 cursor-pointer transition-colors">
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${on ? 'bg-guac-100 text-guac-700' : 'bg-gray-100 text-gray-400'}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${on ? 'text-gray-900' : 'text-gray-500'}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <input
                type="checkbox"
                checked={on}
                disabled={busy === key}
                onChange={e => toggle(key, e.target.checked)}
                className="mt-1.5 w-10 h-6 appearance-none rounded-full bg-gray-200 checked:bg-guac-600 relative cursor-pointer transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-5 before:h-5 before:rounded-full before:bg-white before:shadow checked:before:translate-x-4 before:transition-transform"
              />
            </label>
          )
        })}
      </div>

      <div className="card">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
          <MoonStar size={14} /> Quiet hours
        </h2>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Skip sends between these hours (UTC). Off by default.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={prefs.quiet_hours === true}
            onChange={e => toggle('quiet_hours', e.target.checked)}
            className="w-10 h-6 appearance-none rounded-full bg-gray-200 checked:bg-guac-600 relative cursor-pointer transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-5 before:h-5 before:rounded-full before:bg-white before:shadow checked:before:translate-x-4 before:transition-transform"
          />
          <Clock size={14} className="text-gray-400" />
          <input
            type="number" min="0" max="23"
            value={prefs.quiet_start ?? 22}
            onChange={e => toggle('quiet_start', parseInt(e.target.value, 10) || 0)}
            disabled={prefs.quiet_hours !== true}
            className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 disabled:opacity-50"
          />
          <span className="text-xs text-gray-500">to</span>
          <input
            type="number" min="0" max="23"
            value={prefs.quiet_end ?? 8}
            onChange={e => toggle('quiet_end', parseInt(e.target.value, 10) || 0)}
            disabled={prefs.quiet_hours !== true}
            className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 disabled:opacity-50"
          />
          <span className="text-xs text-gray-500 ml-1">UTC</span>
        </div>
      </div>
    </div>
  )
}
