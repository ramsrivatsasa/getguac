'use client'
// /admin/crashes — crash & error dashboard. Admin-only (profiles.is_admin;
// the /api/admin/crashes route enforces it server-side too). Surfaces the
// error/warn events the mobile app (DebugLog) and server reporters write to
// audit_log, grouped into issues with counts, platforms, versions and the
// full stack / data-dump for each.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase/client'
import { Bug, AlertCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Smartphone, Globe, Server, Users } from 'lucide-react'

const LEVELS = [
  { value: 'all', label: 'Errors + warnings' },
  { value: 'error', label: 'Errors only' },
  { value: 'warn', label: 'Warnings only' },
]
const PLATFORMS = [
  { value: '', label: 'All platforms' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'web', label: 'Web' },
]
const WINDOWS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
]

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PlatformBadge({ p }) {
  const Icon = p === 'web' ? Globe : p === 'server' ? Server : Smartphone
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
      <Icon size={10} /> {p}
    </span>
  )
}

export default function AdminCrashesPage() {
  const sb = createClient()
  const router = useRouter()
  const [authed, setAuthed] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [expanded, setExpanded] = useState(null)

  // Filters
  const [level, setLevel] = useState('all')
  const [platform, setPlatform] = useState('')
  const [days, setDays] = useState(7)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const params = new URLSearchParams({ level, platform, days: String(days), q })
      const res = await fetch(`/api/admin/crashes?${params}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Failed (${res.status})`)
      setData(body)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [level, platform, days, q])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (!prof?.is_admin) { setAuthed(false); return }
      setAuthed(true)
    })()
  }, [sb, router])

  useEffect(() => { if (authed) load() }, [authed, load])

  if (authed === false) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-rose-500 mb-3" />
        <h1 className="font-display text-2xl font-extrabold text-guac-ink mb-2">Admin only</h1>
        <p className="text-gray-600">This page is restricted. Set <code>profiles.is_admin = true</code> in Supabase to access it.</p>
        <Link href="/dashboard" className="inline-block mt-4 text-guac-700 font-bold">← Dashboard</Link>
      </div>
    )
  }
  if (authed === null) return <div className="p-8 text-gray-500">Loading…</div>

  const stats = data?.stats
  const issues = data?.issues || []

  return (
    <div className="max-w-5xl pb-20">
      <header className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
          <Bug size={28} className="text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">Crash dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Errors &amp; warnings from the mobile app and server, grouped into issues.
            Admin gets an email digest of new crashes.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2 shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        <StatTile label="Total" value={stats?.total} tone="ink" />
        <StatTile label="Errors" value={stats?.errors} tone="rose" />
        <StatTile label="Warnings" value={stats?.warnings} tone="amber" />
        <StatTile label="Last 24h" value={stats?.last24h} tone="ink" />
        <StatTile label="Unique issues" value={stats?.unique_issues} tone="guac" />
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-2 mb-4">
        <select value={level} onChange={e => setLevel(e.target.value)} className="input !py-1.5 !text-sm !w-auto">
          {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select value={platform} onChange={e => setPlatform(e.target.value)} className="input !py-1.5 !text-sm !w-auto">
          {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {WINDOWS.map(w => (
            <button key={w.value} onClick={() => setDays(w.value)}
              className={`px-3 py-1.5 text-sm font-semibold ${days === w.value ? 'bg-guac-100 text-guac-ink' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {w.label}
            </button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Search tag / message…" className="input !py-1.5 !text-sm flex-1 min-w-[160px]" />
      </section>

      {err && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}

      {/* Issues */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading && !data ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading crashes…</div>
        ) : issues.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <Bug size={28} className="text-gray-300" />
            No crashes in this window. 🎉
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {issues.map(issue => {
              const open = expanded === issue.key
              const isErr = issue.level === 'error'
              return (
                <li key={issue.key}>
                  <button onClick={() => setExpanded(open ? null : issue.key)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                    <span className="mt-0.5 shrink-0">
                      {isErr ? <AlertCircle size={16} className="text-rose-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[11px] font-bold text-gray-500">{issue.tag}</code>
                        {issue.platforms.map(p => <PlatformBadge key={p} p={p} />)}
                        {issue.affected_users > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><Users size={10} /> {issue.affected_users}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate mt-0.5">{issue.title || '(no message)'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        last seen {fmt(issue.last_seen)}
                        {issue.versions.length > 0 && <> · {issue.versions.slice(0, 3).join(', ')}</>}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-extrabold tabular-nums px-2 py-0.5 rounded-full ${isErr ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                      {issue.count}
                    </span>
                    <span className="shrink-0 mt-0.5 text-gray-300">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                  </button>
                  {open && issue.sample && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/60 border-t border-gray-100">
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-500 mb-2">
                        <div><span className="font-semibold text-gray-400">Action:</span> {issue.sample.action}</div>
                        <div><span className="font-semibold text-gray-400">Level:</span> {issue.sample.level}</div>
                        <div><span className="font-semibold text-gray-400">First seen:</span> {fmt(issue.first_seen)}</div>
                        <div><span className="font-semibold text-gray-400">Session:</span> {issue.sample.session_id || '—'}</div>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap break-words mb-2">{issue.sample.message}</p>
                      {issue.sample.stack && (
                        <pre className="text-[10px] font-mono bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-64">{issue.sample.stack}</pre>
                      )}
                      {issue.sample.meta && (
                        <details className="mt-2">
                          <summary className="text-[11px] font-semibold text-gray-500 cursor-pointer">Data dump</summary>
                          <pre className="text-[10px] font-mono bg-white border border-gray-200 rounded-lg p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(issue.sample.meta, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {data?.truncated && (
        <p className="text-[11px] text-amber-700 mt-3">⚠ Result capped — narrow the window or add a search term to see everything.</p>
      )}
      <p className="text-[11px] text-gray-400 mt-4">
        Source: <code>audit_log</code> (error/warn). Email digest of new crashes sent to admin by the
        <code> crash-digest</code> cron — needs <code>ALERT_SMTP_PASS</code> set. Web browser/server crashes also go to Sentry when <code>NEXT_PUBLIC_SENTRY_DSN</code> is set.
      </p>
    </div>
  )
}

function StatTile({ label, value, tone }) {
  const tones = {
    ink: 'text-guac-ink', rose: 'text-rose-600', amber: 'text-amber-600', guac: 'text-guac-700',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-2xl font-extrabold tabular-nums mt-0.5 ${tones[tone] || 'text-guac-ink'}`}>
        {value == null ? '—' : value.toLocaleString()}
      </p>
    </div>
  )
}
