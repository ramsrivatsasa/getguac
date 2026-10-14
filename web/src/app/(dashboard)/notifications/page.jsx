'use client'
// /notifications — settings page for push-notification preferences.
// Reads + writes via /api/notify/prefs (which writes the
// profiles.notification_prefs JSON column). Each category renders
// as a toggle; flipping the toggle persists immediately so there's
// no Save button to forget.

import { useEffect, useState } from 'react'
import { Bell, Gift, Package, TrendingUp, AlertTriangle, ShoppingCart, MoonStar, Clock, Tag } from 'lucide-react'
import FeatureHeader from '../../../components/FeatureHeader'
import ProductAlerts from '../../../components/ProductAlerts'
import NewsNotifications from '../../../components/NewsNotifications'
import { newsFrequency } from '../../../lib/news-notifications.mjs'

const CATEGORIES = [
  { key: 'product_recall', icon: AlertTriangle, label: 'Product safety alerts', desc: 'Recall notices that may match purchases on your receipts, with groceries first.' },
  { key: 'rewards_expiring', icon: Gift,           label: 'Reward expiring',         desc: 'Heads-up when a reward expires within 7 days.' },
  { key: 'return_window',    icon: Package,        label: 'Return window closing',    desc: "Reminder the day before an item's return-by date." },
  { key: 'bank_bite_digest', icon: TrendingUp,     label: 'Weekly Bank Bite digest',  desc: 'Monday recap of interest + fees from the prior 7 days.' },
  { key: 'anomaly_alert',    icon: AlertTriangle,  label: 'Anomaly alert',            desc: 'When a spending category spikes above its baseline.' },
  { key: 'smashlist_day',    icon: ShoppingCart,   label: 'Smashlist day',            desc: 'Reminder on a predicted shopping day for a store.' },
  { key: 'steals_found',     icon: Tag,            label: 'New Steals found',         desc: 'When fresh deals appear on your saved searches.' },
  { key: 'reengagement',     icon: Bell,           label: 'Come-back nudges',         desc: "An occasional reminder to scan a receipt or play a game when you've been away." },
]

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState(null)
  const [busy, setBusy]   = useState(null)
  const [error,setError]=useState('')
  const [attempt,setAttempt]=useState(0)

  useEffect(() => {
    let active=true
    const controller=new AbortController()
    const timer=setTimeout(()=>controller.abort(),10000)
    setError('')
    fetch('/api/notify/prefs',{signal:controller.signal}).then(async r=>{
      if(!r.ok)throw new Error('Preferences could not load. Please retry.')
      return r.json()
    }).then(d=>{if(active)setPrefs(d.prefs||{})}).catch(()=>{if(active)setError('Preferences could not load. Please retry.')}).finally(()=>clearTimeout(timer))
    return ()=>{active=false;clearTimeout(timer);controller.abort()}
  }, [attempt])

  async function toggle(key, value) {
    setBusy(key);setError('')
    const previous=prefs
    const next = { ...(prefs || {}), [key]: value }
    setPrefs(next)                                  // optimistic
    try {
      const response=await fetch('/api/notify/prefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if(!response.ok)throw new Error('Save failed')
    } catch {
      setPrefs(previous);setError('Preferences could not save. Please retry.')
    } finally {
      setBusy(null)
    }
  }

  if (!prefs) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="page-title">Notifications</h1>
        <div className="card text-gray-400 py-8 text-center text-sm flex flex-col items-center gap-3">
          {error?<><p role="alert">{error}</p><button onClick={()=>setAttempt(n=>n+1)}>Retry</button></>:<p>Loading…</p>}
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

      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      <ProductAlerts />
      <NewsNotifications />
      <section className="rounded-xl border border-violet-100 bg-white p-4 space-y-3" aria-label="News notification preferences">
        <div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor="news-frequency" className="text-sm font-bold">News frequency</label><select id="news-frequency" value={newsFrequency(prefs)} disabled={busy !== null} onChange={e => toggle('news_frequency', e.target.value)} className="min-h-11 rounded-lg border border-violet-200 px-3 text-sm"><option value="off">Off</option><option value="daily">Daily roundup</option><option value="weekly">Weekly roundup</option><option value="important">Important only</option></select></div>
        <p className="text-xs text-guac-muted">At most one roundup per UTC day, or one per Monday–Sunday week. Important only includes official Fed policy, BLS inflation and employment releases, and feed-marked important stories. Product safety alerts use their separate setting.</p>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={prefs.news_watchlist_only === true} disabled={busy !== null} onChange={e => toggle('news_watchlist_only', e.target.checked)}/>Only news matching stocks in my saved watchlists</label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={prefs.news_push === true} disabled={busy !== null} onChange={e => toggle('news_push', e.target.checked)}/>Also send news to my enabled notification devices</label>
      </section>

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
                disabled={busy !== null}
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
