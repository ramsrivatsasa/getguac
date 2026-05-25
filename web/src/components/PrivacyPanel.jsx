'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ShieldCheck, Lock, Download, Trash2, AlertTriangle, Loader2, Eye, EyeOff
} from 'lucide-react'
// Categories that can be selectively deleted. Order matters — drives row order.
const DELETE_CATEGORIES = [
  { key: 'embeddings',     label: 'Item embeddings (semantic vectors)', emoji: '🧠', danger: false, desc: 'Inferred AI data — safe to clear, regeneratable from your items.' },
  { key: 'search_history', label: 'Search history',                     emoji: '🔍', danger: false, desc: 'Queries you have run against your data.' },
  { key: 'shopping_list',  label: 'Smashlist items',                    emoji: '🛒', danger: false },
  { key: 'car_trips',      label: 'Car miles / trips',                  emoji: '🚗', danger: false },
  { key: 'receipt_items',  label: 'Receipt line items',                  emoji: '📋', danger: true,  desc: 'Drops the line items but keeps the receipt header (totals, store, date).' },
  { key: 'receipts',       label: 'Receipts (header + items)',           emoji: '🧾', danger: true,  desc: 'Permanent. The full receipt + all of its items + refund policies.' },
  { key: 'payments',       label: 'Saved payment cards (last4)',         emoji: '💳', danger: true,  desc: 'Removes the masked card metadata you added in this profile.' },
]

// Retention windows the user can configure (days). The key matches the column
// in user_privacy_settings; the label is what we show.
const RETENTION_FIELDS = [
  { key: 'receipts_retention_days',       label: 'Receipts',          recommend: 'Keep forever' },
  { key: 'receipt_items_retention_days',  label: 'Receipt line items', recommend: 'Keep forever' },
  { key: 'shopping_list_retention_days',  label: 'Smashlist',         recommend: '180 days' },
  { key: 'car_trip_retention_days',       label: 'Car trips',         recommend: '730 days (tax season)' },
  { key: 'embeddings_retention_days',     label: 'AI embeddings',     recommend: '365 days' },
  { key: 'search_history_retention_days', label: 'Search history',    recommend: '30 days' },
]

const PRIVACY_TOGGLES = [
  { key: 'auto_purge_enabled',   label: 'Auto-purge expired data',   desc: 'Run the retention windows above on a schedule. When off, you must purge manually.' },
  { key: 'scrub_payment_last4',  label: 'Hide payment card last-4',  desc: 'When on, all payment_last4 fields are blanked from new receipts.' },
  { key: 'scrub_addresses',      label: 'Hide street addresses',     desc: 'Trim full street addresses on receipts and car trips. City + state preserved.' },
  { key: 'block_telemetry',      label: 'Block telemetry',           desc: 'Never send anonymous usage events.' },
  { key: 'disallow_ai_training', label: 'Never train AI on my data', desc: 'Excludes your records from any future training set, even anonymized.' },
]

export default function PrivacyPanel() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [pickedCats, setPickedCats] = useState(() => new Set())
  const [olderThan, setOlderThan] = useState('')     // empty = all-time
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [busyAction, setBusyAction] = useState(null) // 'export' | 'delete' | 'sweep'
  const [includeEmbeddingsInExport, setIncludeEmbeddingsInExport] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/privacy/settings')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        if (!cancelled) setSettings(data.settings)
      } catch (err) {
        toast.error(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function patch(patchBody) {
    setSaving(true)
    try {
      const res = await fetch('/api/privacy/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSettings(data.settings)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function setRetention(key, val) {
    const num = val === '' ? null : Math.max(0, Math.floor(Number(val)))
    setSettings(s => ({ ...s, [key]: num }))
    patch({ [key]: num })
  }
  function toggleSwitch(key) {
    const next = !settings[key]
    setSettings(s => ({ ...s, [key]: next }))
    patch({ [key]: next })
  }

  async function exportData() {
    setBusyAction('export')
    try {
      const res = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_embeddings: includeEmbeddingsInExport }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `getguac-export-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyAction(null)
    }
  }

  async function runSweep() {
    setBusyAction('sweep')
    try {
      const res = await fetch('/api/privacy/sweep', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sweep failed')
      if (data.skipped) toast(data.skipped === 'auto_purge_disabled' ? 'Enable auto-purge first' : 'No retention windows set', { icon: 'ℹ️' })
      else toast.success('Retention sweep complete')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyAction(null)
    }
  }

  async function doDelete() {
    const categories = [...pickedCats]
    if (categories.length === 0) { toast.error('Pick at least one category'); return }
    const olderThanDays = olderThan === '' ? null : Math.max(0, Math.floor(Number(olderThan)))
    const isWipe = olderThanDays === null
    if (isWipe && confirmPhrase !== 'DELETE MY DATA') {
      toast.error('Type DELETE MY DATA to confirm permanent deletion')
      return
    }
    setBusyAction('delete')
    try {
      const res = await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          older_than_days: olderThanDays,
          confirm_phrase: isWipe ? confirmPhrase : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success(`Removed ${data.total_rows} rows`)
      setShowDelete(false); setPickedCats(new Set()); setOlderThan(''); setConfirmPhrase('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) return <div className="card py-8 text-center text-gray-400 text-sm">Loading privacy settings…</div>
  if (!settings)  return null

  return (
    <div className="space-y-5">
      <div className="card border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-lime-50/40">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-emerald-700 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-gray-900">Privacy & Security</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Your data lives in your private Supabase row, encrypted at rest, isolated by Row Level Security.
              Below you control retention, scrubbing, and the right to delete.
            </p>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="card space-y-1">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Lock size={15} /> Privacy switches</h3>
        {PRIVACY_TOGGLES.map(t => (
          <label key={t.key} className="flex items-start gap-3 py-2 cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 accent-emerald-600"
              checked={!!settings[t.key]}
              onChange={() => toggleSwitch(t.key)}
              disabled={saving} />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500">{t.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Retention */}
      <div className="card">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {settings.auto_purge_enabled ? <Eye size={15} className="text-emerald-600" /> : <EyeOff size={15} className="text-gray-400" />}
            Retention windows
          </h3>
          <button className="btn-secondary text-xs py-1" onClick={runSweep} disabled={busyAction === 'sweep' || !settings.auto_purge_enabled}>
            {busyAction === 'sweep' ? <Loader2 size={12} className="animate-spin" /> : null}
            Run sweep now
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Records older than the number of days you set will be auto-purged when sweeps run.
          Leave blank to keep forever. Auto-purge must be enabled above.
        </p>
        <div className="space-y-2">
          {RETENTION_FIELDS.map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <label className="text-sm text-gray-700 flex-1">{f.label}
                <span className="text-[11px] text-gray-400 ml-2">recommend: {f.recommend}</span>
              </label>
              <input type="number" min="0" max="36500"
                placeholder="forever"
                value={settings[f.key] == null ? '' : settings[f.key]}
                onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                onBlur={e => setRetention(f.key, e.target.value)}
                className="input w-28 text-sm" disabled={saving} />
              <span className="text-xs text-gray-400">days</span>
            </div>
          ))}
        </div>
        {settings.last_purge_at && (
          <p className="text-[11px] text-gray-400 mt-3">Last sweep: {new Date(settings.last_purge_at).toLocaleString()}</p>
        )}
      </div>

      {/* Export */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Download size={15} /> Export everything</h3>
        <p className="text-xs text-gray-500 mb-3">
          Download every record we hold about you as one JSON file (right-to-data-portability).
          Up to 3 downloads per hour.
        </p>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" className="w-4 h-4 accent-emerald-600"
            checked={includeEmbeddingsInExport}
            onChange={e => setIncludeEmbeddingsInExport(e.target.checked)} />
          Include AI embedding vectors (large, mostly noise to humans)
        </label>
        <button className="btn-primary text-sm" onClick={exportData} disabled={busyAction === 'export'}>
          {busyAction === 'export' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Download JSON export
        </button>
        {settings.last_export_at && (
          <p className="text-[11px] text-gray-400 mt-3">Last export: {new Date(settings.last_export_at).toLocaleString()}</p>
        )}
      </div>

      {/* Selective delete */}
      <div className="card border-rose-200/70">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-rose-700"><Trash2 size={15} /> Delete data</h3>
          <button className="btn-secondary text-xs py-1" onClick={() => setShowDelete(v => !v)}>
            {showDelete ? 'Cancel' : 'Configure…'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Selectively remove categories of your data — immediately, or only rows older than N days.
          Audit trail kept in <span className="font-mono">data_purge_log</span>.
        </p>

        {showDelete && (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5 rounded-xl bg-rose-50/40 p-3 border border-rose-100">
              {DELETE_CATEGORIES.map(c => (
                <label key={c.key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-rose-600"
                    checked={pickedCats.has(c.key)}
                    onChange={e => {
                      const next = new Set(pickedCats)
                      if (e.target.checked) next.add(c.key); else next.delete(c.key)
                      setPickedCats(next)
                    }} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${c.danger ? 'text-rose-900' : 'text-gray-800'}`}>
                      {c.emoji} {c.label}
                    </p>
                    {c.desc && <p className="text-xs text-gray-500">{c.desc}</p>}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm text-gray-700">Only rows older than</label>
              <input type="number" min="0" placeholder="(all)"
                value={olderThan} onChange={e => setOlderThan(e.target.value)}
                className="input w-24 text-sm" />
              <span className="text-sm text-gray-500">days · leave blank for ALL TIME</span>
            </div>

            {olderThan === '' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-sm text-amber-900 flex items-center gap-2 font-medium">
                  <AlertTriangle size={14} /> All-time deletion is permanent.
                </p>
                <p className="text-xs text-amber-800">Type <span className="font-mono font-bold">DELETE MY DATA</span> to confirm.</p>
                <input className="input text-sm" value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value)} />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button className="btn-secondary text-sm" onClick={() => setShowDelete(false)}>Cancel</button>
              <button className="text-sm px-4 py-2 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                onClick={doDelete} disabled={busyAction === 'delete' || pickedCats.size === 0}>
                {busyAction === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete selected
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card text-xs text-gray-500 space-y-2 border-gray-100">
        <p className="font-semibold text-gray-700">What protects your data</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Row Level Security</b> — every Postgres query is scoped to <span className="font-mono">auth.uid()</span>. No other GetGuac user can read your data, even with a stolen API key.</li>
          <li><b>Encryption at rest</b> — Supabase encrypts the database volume with AES-256.</li>
          <li><b>TLS in flight</b> — all API and database traffic is HTTPS.</li>
          <li><b>Rate limits</b> — destructive endpoints (export, delete) are throttled to make scripted abuse painful.</li>
          <li><b>Audit log</b> — every export and deletion is recorded in <span className="font-mono">data_purge_log</span>, queryable only by you.</li>
          <li><b>AI parsers</b> — statement / receipt uploads are sent to the AI provider in-memory and not stored by us. Provider retention is governed by their own policy.</li>
        </ul>
      </div>
    </div>
  )
}
