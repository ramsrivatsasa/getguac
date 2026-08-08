'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Activity, AlertTriangle, ArrowLeft, BellRing, BrainCircuit, CheckCircle2,
  Clipboard, FlaskConical, Gauge, Megaphone, RefreshCw, Send, ShieldCheck,
  Sparkles, Target, Users,
} from 'lucide-react'

const EMPTY_CAMPAIGN = {
  campaignName: 'Facebook — Join page', spend: '', linkClicks: '',
  landingPageViews: '', accountsCreated: '', firstReceipts: '', notes: '',
}

function Metric({ icon: Icon, label, value, detail, tone = 'green' }) {
  const tones = {
    green: 'bg-guac-50 text-guac-700', blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700',
  }
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} /></div>
      <p className="text-2xl font-extrabold tabular-nums text-guac-ink">{value}</p>
      <p className="text-sm font-bold text-gray-800">{label}</p>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </div>
  )
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-guac-50 text-guac-700"><Icon size={18} /></div>
        <div><h2 className="font-display text-lg font-extrabold text-guac-ink">{title}</h2>{subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}</div>
      </div>
      {children}
    </section>
  )
}

function severityClass(severity) {
  if (severity === 'high') return 'border-rose-200 bg-rose-50 text-rose-900'
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-gray-200 bg-gray-50 text-gray-800'
}

function Plan({ result }) {
  const plan = result?.plan
  if (!plan) return null

  async function copyPlan() {
    await navigator.clipboard.writeText(JSON.stringify(plan, null, 2))
    toast.success('Growth plan copied')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-guac-line2 bg-gradient-to-br from-guac-50 to-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-guac-700">Latest recommendation</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-guac-ink">{plan.summary}</h2>
            <p className="mt-3 text-sm text-gray-600"><strong>North star:</strong> {plan.northStar?.metric} — {plan.northStar?.reason}</p>
          </div>
          <button type="button" onClick={copyPlan} className="inline-flex items-center gap-2 rounded-xl border border-guac-line2 bg-white px-3 py-2 text-xs font-bold text-guac-800 hover:bg-guac-50">
            <Clipboard size={14} /> Copy JSON
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-white px-3 py-1 text-guac-700">Model: {result.provider}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Approval required before publishing or spending</span>
        </div>
      </div>

      <Section icon={AlertTriangle} title="Diagnosis" subtitle="Observed evidence is kept separate from hypotheses.">
        <div className="grid gap-2">
          {(plan.diagnosis || []).map((item, index) => (
            <div key={`${item.title}-${index}`} className={`rounded-xl border p-3 ${severityClass(item.severity)}`}>
              <div className="flex items-center justify-between gap-3"><p className="font-bold">{item.title}</p><span className="text-[10px] font-extrabold uppercase">{item.severity}</span></div>
              <p className="mt-1 text-xs opacity-80"><strong>Evidence:</strong> {item.evidence}</p>
              <p className="mt-1 text-xs"><strong>Next:</strong> {item.action}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Target} title="Priority actions" subtitle="The smallest sequence likely to improve activated customers.">
        <div className="grid gap-3 sm:grid-cols-2">
          {(plan.priorities || []).map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-guac-600 text-xs font-black text-white">{index + 1}</span><p className="font-bold text-guac-ink">{item.title}</p></div>
              <p className="mt-2 text-xs text-gray-600">{item.why}</p>
              <p className="mt-2 text-[11px] font-semibold text-guac-700">{item.timeframe} · {item.successMetric}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Megaphone} title="Campaign drafts" subtitle="One customer pain per campaign; nothing is published automatically.">
        <div className="grid gap-3 lg:grid-cols-3">
          {(plan.campaigns || []).map((item, index) => (
            <article key={`${item.name}-${index}`} className="rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-guac-700">{item.audience}</p>
              <h3 className="mt-1 font-display text-lg font-extrabold text-guac-ink">{item.name}</h3>
              <p className="mt-2 text-sm font-bold text-gray-900">{item.hook}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">{item.primaryText}</p>
              <div className="mt-3 rounded-lg bg-guac-50 p-2 text-xs"><strong>{item.headline}</strong><span className="block text-guac-700">CTA: {item.cta}</span></div>
              <p className="mt-2 text-[11px] text-gray-500">Landing match: {item.landingMessage}</p>
            </article>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Sparkles} title="Organic content">
          <div className="space-y-3">
            {(plan.organic || []).map((item, index) => (
              <div key={`${item.hook}-${index}`} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <p className="text-[10px] font-extrabold uppercase text-gray-400">{item.format}</p><p className="font-bold text-guac-ink">{item.hook}</p>
                <p className="mt-1 text-xs text-gray-600">{item.script}</p><p className="mt-1 text-xs font-semibold text-guac-700">{item.cta}</p>
              </div>
            ))}
          </div>
        </Section>
        <Section icon={BellRing} title="Lifecycle messages" subtitle="Drafts for preference-respecting automated delivery.">
          <div className="space-y-3">
            {(plan.lifecycle || []).map((item, index) => (
              <div key={`${item.trigger}-${index}`} className="rounded-xl bg-gray-50 p-3">
                <div className="flex justify-between gap-2 text-[10px] font-extrabold uppercase text-gray-500"><span>{item.channel} · +{item.delayHours}h</span><span>{item.route}</span></div>
                <p className="mt-1 text-xs text-gray-500">{item.trigger}</p><p className="mt-1 font-bold text-guac-ink">{item.title}</p><p className="text-xs text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section icon={FlaskConical} title="Experiments" subtitle="Each experiment has one primary metric and a stop rule.">
        <div className="grid gap-3 sm:grid-cols-2">
          {(plan.experiments || []).map((item, index) => (
            <div key={`${item.name}-${index}`} className="rounded-xl border border-gray-200 p-4 text-xs">
              <p className="font-bold text-guac-ink">{item.name}</p><p className="mt-1 text-gray-600">{item.hypothesis}</p>
              <p className="mt-2"><strong>Control:</strong> {item.control}</p><p><strong>Variant:</strong> {item.variant}</p>
              <p className="mt-2 text-guac-700"><strong>Primary:</strong> {item.primaryMetric}</p><p className="mt-1 text-rose-700"><strong>Stop:</strong> {item.stopRule}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

export default function GrowthAdminPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [campaign, setCampaign] = useState(EMPTY_CAMPAIGN)
  const [result, setResult] = useState(null)

  async function loadMetrics() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/growth', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not load metrics')
      setData(payload)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadMetrics() }, [])

  const metrics = data?.metrics
  const joinViews = useMemo(() => Number(metrics?.traffic?.topPaths?.find((row) => row.path === '/join')?.views || 0), [metrics])

  async function generate(event) {
    event.preventDefault(); setGenerating(true)
    try {
      const response = await fetch('/api/admin/growth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campaign),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Generation failed')
      setResult(payload); setData((current) => ({ ...(current || {}), metrics: payload.metrics }))
      toast.success('New growth plan generated')
      setTimeout(() => document.getElementById('growth-plan')?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err) { toast.error(err.message) }
    finally { setGenerating(false) }
  }

  const update = (key) => (event) => setCampaign((current) => ({ ...current, [key]: event.target.value }))

  if (loading) return <div className="p-8 text-gray-500">Loading Growth AI…</div>
  if (error) return (
    <div className="max-w-2xl space-y-4 p-4"><h1 className="page-title">Growth AI</h1><div className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</div><button onClick={loadMetrics} className="btn-primary">Try again</button></div>
  )

  return (
    <div className="max-w-6xl space-y-5 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-guac-100 text-guac-700"><BrainCircuit size={25} /></div>
          <div><div className="flex items-center gap-2"><h1 className="page-title">Growth AI</h1><span className="rounded-full bg-guac-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-guac-700">Admin only</span></div><p className="text-sm text-gray-500">Aggregate funnel analysis, campaign drafts and approval-safe automation.</p></div>
        </div>
        <div className="flex gap-2"><Link href="/admin" className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold"><ArrowLeft size={14} /> Admin</Link><button onClick={loadMetrics} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold"><RefreshCw size={14} /> Refresh</button></div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric icon={Users} label="Visitors · 30d" value={(metrics?.traffic?.current?.visitors || 0).toLocaleString()} detail={`${metrics?.traffic?.visitorChangePct ?? '—'}% vs prior 30d`} />
        <Metric icon={Activity} label="Join page views" value={joinViews.toLocaleString()} detail="First-party counter · 30d" tone="blue" />
        <Metric icon={ShieldCheck} label="New accounts · 30d" value={(metrics?.signups?.current || 0).toLocaleString()} detail={`${metrics?.signups?.changePct ?? '—'}% vs prior 30d`} tone="blue" />
        <Metric icon={Gauge} label="First-receipt activation" value={metrics?.activation?.currentRate == null ? '—' : `${metrics.activation.currentRate}%`} detail={`${metrics?.activation?.currentUsers || 0} activated new accounts`} tone={metrics?.activation?.currentRate >= 40 ? 'green' : 'amber'} />
        <Metric icon={BellRing} label="Push-enabled users" value={(metrics?.notifications?.pushEnabledUsers || 0).toLocaleString()} detail={`${metrics?.notifications?.currentSent || 0} sends in 30d`} tone="amber" />
      </div>

      {!metrics?.tracking?.metaConversionsConfigured && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><div><p className="font-bold">Meta registration attribution is incomplete</p><p className="text-xs">The pixel is present, but <code>FB_CAPI_TOKEN</code> is not configured. Google registrations cannot be reported reliably.</p></div></div>
      )}

      <form onSubmit={generate} className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Send size={17} /></div><div><h2 className="font-display text-lg font-extrabold text-guac-ink">Add the latest paid-campaign totals</h2><p className="text-xs text-gray-500">Optional. Internal product metrics are collected automatically; enter only aggregate advertising numbers.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2"><span className="label">Campaign</span><input value={campaign.campaignName} onChange={update('campaignName')} className="input" /></label>
          {[['spend', 'Spend ($)'], ['linkClicks', 'Link clicks'], ['landingPageViews', 'Landing views'], ['accountsCreated', 'Accounts']].map(([key, label]) => (
            <label key={key}><span className="label">{label}</span><input type="number" min="0" step={key === 'spend' ? '0.01' : '1'} value={campaign[key]} onChange={update(key)} className="input" placeholder="0" /></label>
          ))}
          <label><span className="label">First receipts</span><input type="number" min="0" value={campaign.firstReceipts} onChange={update('firstReceipts')} className="input" placeholder="Auto if blank" /></label>
          <label className="sm:col-span-2 lg:col-span-5"><span className="label">Context or constraints</span><input value={campaign.notes} onChange={update('notes')} className="input" placeholder="Example: $5/day cap; no cash rewards; Facebook cold traffic" /></label>
          <div className="flex items-end"><button type="submit" disabled={generating} className="btn-primary w-full justify-center"><BrainCircuit size={16} /> {generating ? 'Analyzing…' : 'Generate next plan'}</button></div>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs"><CheckCircle2 size={16} className="mb-1 text-guac-600" /><strong>Outcome-learning</strong><p className="text-gray-500">Each run stores aggregate outcomes and plan summaries for comparison on the next run.</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs"><ShieldCheck size={16} className="mb-1 text-blue-600" /><strong>No customer financial data</strong><p className="text-gray-500">The model receives counts and rates, never receipts, email addresses or identities.</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs"><BellRing size={16} className="mb-1 text-amber-600" /><strong>Safe automation</strong><p className="text-gray-500">Daily notifications use approved triggers, preferences, quiet hours, dedupe and frequency limits.</p></div>
      </div>

      <div id="growth-plan"><Plan result={result} /></div>
    </div>
  )
}
