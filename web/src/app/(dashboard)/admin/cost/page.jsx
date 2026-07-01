'use client'
// /admin/cost — internal dashboard for tracking distance to free-tier
// ceilings. Gated by profiles.is_admin (RPC enforces it server-side
// too — never trust the client gate alone). Reads from usage_metrics
// via read_usage RPC, populated by /api/cron/usage-snapshot daily.

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../../lib/supabase/client'
import { Database, AlertCircle, TrendingUp, ExternalLink, Sparkles, Tags } from 'lucide-react'
import toast from 'react-hot-toast'

// Supabase free-tier ceilings (May 2026). Bump when you upgrade plans.
const CEILINGS = {
  'total_receipts':         { soft: 80_000,  hard: 100_000,  label: 'Receipts',           why: 'Supabase free-tier row cap' },
  'total_receipt_items':    { soft: 400_000, hard: 500_000,  label: 'Receipt items',      why: 'Supabase free-tier row cap' },
  'total_profiles':         { soft: 8_000,   hard: 10_000,   label: 'Users',              why: 'Supabase free-tier auth cap' },
}

export default function AdminCostPage() {
  const sb = createClient()
  const router = useRouter()
  const [rows, setRows] = useState(null)
  const [err, setErr]   = useState(null)
  const [authed, setAuthed] = useState(null)
  const [recatBusy, setRecatBusy] = useState(false)
  const [tagBusy, setTagBusy]     = useState(false)

  // ── Guac-AI enrichment admin actions ─────────────────────────────────
  // Both call the same shape: a per-user batch endpoint that re-runs the
  // AI step on receipts/items that didn't get a result on the first save.
  // Conservative — never touches a row where category_source = 'user'.
  async function handleRecategorize() {
    setRecatBusy(true)
    try {
      const res  = await fetch('/api/receipts/categorize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),       // empty body = "all uncategorized for me"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Categorize-batch failed')
      const ruleN = data.rule_hits || 0
      const aiN   = data.ai_hits   || 0
      toast.success(
        `Recategorized ${data.updated}/${data.matched} receipts (rules: ${ruleN}, AI: ${aiN})`,
        { duration: 4000 },
      )
    } catch (e) {
      toast.error(`Recategorize failed: ${e.message}`)
    } finally { setRecatBusy(false) }
  }

  async function handleTagItems() {
    setTagBusy(true)
    try {
      const res  = await fetch('/api/items/tag-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),       // empty body = "all untagged for me"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Tag-batch failed')
      toast.success(`Tagged ${data.updated}/${data.matched} items`, { duration: 4000 })
    } catch (e) {
      toast.error(`Tag items failed: ${e.message}`)
    } finally { setTagBusy(false) }
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (!prof?.is_admin) { setAuthed(false); return }
      setAuthed(true)
      const { data, error } = await sb.rpc('read_usage', { p_days: 14 })
      if (error) { setErr(error.message); return }
      setRows(data || [])
    })()
  }, [sb, router])

  // Latest row per metric — used for the headline ceiling bars.
  const latest = useMemo(() => {
    if (!rows) return new Map()
    const m = new Map()
    for (const r of rows) {
      const cur = m.get(r.metric)
      if (!cur || r.day > cur.day) m.set(r.metric, r)
    }
    return m
  }, [rows])

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
  if (authed === null || rows === null) return <div className="p-8 text-gray-500">Loading…</div>
  if (err) return <div className="p-8 text-rose-600">Error: {err}</div>

  return (
    <div className="max-w-4xl pb-20">
      <header className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-guac-100 flex items-center justify-center">
          <TrendingUp size={28} className="text-guac-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">Cost monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daily distance to free-tier ceilings. Cron snapshot at 8am UTC daily.
          </p>
        </div>
      </header>

      {/* Ceiling bars */}
      <section className="mb-7">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Distance to ceilings</h2>
        <div className="grid gap-3">
          {Object.entries(CEILINGS).map(([metric, c]) => {
            const row = latest.get(metric)
            const v = Number(row?.value || 0)
            const pct = Math.min(100, (v / c.hard) * 100)
            const tone =
              v >= c.hard ? 'bg-rose-500' :
              v >= c.soft ? 'bg-amber-400' :
              'bg-guac-600'
            return (
              <div key={metric} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="font-bold text-gray-900">{c.label}</p>
                  <p className="text-sm tabular-nums text-gray-600">
                    {v.toLocaleString()} / {c.hard.toLocaleString()}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">{c.why} · {pct.toFixed(1)}% used</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Guac-AI enrichment backfill actions. Conservative — they only
          touch rows that have NULL / 'misc' / 'uncategorized' category
          (for receipts) or NULL ai_tag (for items). A row the user already
          curated is never overwritten. */}
      <section className="mb-7">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Guac-AI enrichment</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <button
            type="button"
            onClick={handleRecategorize}
            disabled={recatBusy}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-guac-line2 hover:shadow-sm disabled:opacity-60 text-left"
            title="Re-runs the categorize step on any receipt where category is NULL / 'misc'. Skips user-curated rows."
          >
            <div className="w-8 h-8 rounded-lg bg-guac-50 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-guac-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900">{recatBusy ? 'Working…' : 'Re-categorize uncategorized'}</p>
              <p className="text-[11px] text-gray-500">Sweeps NULL / misc receipts through rules + Gemini.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleTagItems}
            disabled={tagBusy}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-guac-line2 hover:shadow-sm disabled:opacity-60 text-left"
            title="Runs the Guac-AI item-tagger on every receipt_items row whose ai_tag is NULL."
          >
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
              <Tags size={16} className="text-sky-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900">{tagBusy ? 'Working…' : 'Tag untagged items'}</p>
              <p className="text-[11px] text-gray-500">Backfills ai_tag (household / kid / health / treat …).</p>
            </div>
          </button>
        </div>
      </section>

      {/* Outside-Supabase ceilings — we don't have automated tracking
          but link to the relevant dashboards so they're one click away. */}
      <section className="mb-7">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">External dashboards</h2>
        <div className="grid gap-2 text-sm">
          {[
            { name: 'Vercel — usage',           href: 'https://vercel.com/dashboard/usage', note: 'Function execution / cron / bandwidth' },
            { name: 'Supabase — project usage', href: 'https://supabase.com/dashboard',     note: 'DB size, auth users, storage, egress' },
            { name: 'Google CSE — quotas',      href: 'https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas', note: 'Custom Search API daily quota' },
            { name: 'Sentry',                   href: 'https://sentry.io',                  note: 'Error volume vs free tier (5K events / mo)' },
            { name: 'PostHog',                  href: 'https://us.posthog.com',             note: 'Events vs free tier (1M / mo)' },
          ].map(d => (
            <a key={d.href} href={d.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-guac-line2 hover:shadow-sm">
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{d.name}</p>
                <p className="text-[11px] text-gray-500">{d.note}</p>
              </div>
              <ExternalLink size={14} className="text-gray-400" />
            </a>
          ))}
        </div>
      </section>

      {/* Raw rolling history */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Last 14 days · raw metrics</h2>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-guac-line text-[10.5px] uppercase tracking-[0.05em] text-guac-label font-extrabold">
              <tr>
                <th className="text-left px-3 py-2">Day</th>
                <th className="text-left px-3 py-2">Metric</th>
                <th className="text-right px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.day}</td>
                  <td className="px-3 py-2"><code className="text-xs">{r.metric}</code></td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{Number(r.value).toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan="3" className="px-3 py-6 text-center text-gray-500 text-sm">
                  No snapshots yet. Cron fires at 8am UTC daily, or hit <code>/api/cron/usage-snapshot</code> in dev to backfill.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] text-gray-400 mt-6">
        Free-tier ceilings hard-coded in <code>web/src/app/(dashboard)/admin/cost/page.jsx</code>. Bump when you upgrade plans.
      </p>
    </div>
  )
}
