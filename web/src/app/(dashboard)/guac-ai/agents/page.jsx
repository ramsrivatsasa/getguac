'use client'

import Link from 'next/link'
import { useState } from 'react'
import { NEWS_TOPICS } from '../../../../lib/background-agents/policy.mjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, BarChart3, Bot, Newspaper, Pause, Play, RefreshCw, ShoppingCart, Target, Wallet } from 'lucide-react'

const AGENTS = [
  { kind: 'news', name: 'News', icon: Newspaper, href: '/news', detail: 'Fresh official economic releases and rates.' },
  { kind: 'analysis', name: 'Analysis', icon: BarChart3, href: '/reports', detail: 'Spending summaries from your saved records.' },
  { kind: 'plan', name: 'My 10% plan', icon: Target, href: '/my-plan', detail: 'Recalculate your plan from recorded money activity.' },
  { kind: 'goals', name: 'Goals', icon: Target, href: '/wealth', detail: 'Track progress toward your saved goals.' },
  { kind: 'wealth', name: 'Wealth', icon: Wallet, href: '/wealth', detail: 'Summarize saved account and debt balances.' },
  { kind: 'shopping', name: 'Shopping List', icon: ShoppingCart, href: '/shopping', detail: 'Review your shopping list and saved purchase context.' },
]
const TOPICS = NEWS_TOPICS
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 disabled:opacity-50'
const money = (value, divisor = 100) => Number.isFinite(Number(value)) && value != null ? (Number(value) / divisor).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'Not available'
function date(value, fallback = 'Not yet') {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : fallback
}
async function request(url, body) {
  const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Could not update agents. Please try again.')
  return result
}
function Results({ kind, result }) {
  const data = result?.data || result
  if (!data) return <p>No result yet. Refresh to queue a run.</p>
  if (kind === 'news') return <><p>Newest publication: {date(result.freshness?.latestPublishedAt)}</p>{result.partial && <p className="mt-2 text-amber-800">Some publishers are temporarily unavailable.</p>}<ul className="mt-3 space-y-2">{(result.items || []).slice(0, 4).map(item => <li key={item.link}><a href={item.link} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 underline">{item.title}</a><span className="block text-xs text-slate-500">{item.source} · {date(item.date)}</span></li>)}</ul></>
  if (kind === 'wealth') return <dl className="space-y-2">{[['Assets',data.assetCents],['Debts',data.debtCents],['Net worth',data.netWorthCents]].map(([label,value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-bold">{money(value)}</dd></div>)}<p className="pt-2 text-xs text-slate-500">Saved balances, not live market valuations.</p></dl>
  if (kind === 'goals') return data.goals?.length ? <ul className="space-y-3">{data.goals.slice(0, 5).map(goal => <li key={goal.id}><span className="font-bold">{goal.name}</span><span className="block">{money(goal.currentCents)} of {money(goal.targetCents)}{goal.overdue ? ' · Target date passed' : ''}</span></li>)}</ul> : <p>No saved goals yet.</p>
  if (kind === 'analysis') return <p>Recorded spending: <strong>{money(data.metrics?.totalSpent?.current, 1)}</strong><span className="mt-1 block">Since {data.rangeStart || 'the start of the reporting period'} · Transactions: {data.metrics?.transactions?.current ?? 'Not available'}</span></p>
  if (kind === 'plan') return <p>Monthly income: <strong>{money(data.incomeCents)}</strong><span className="mt-1 block">Target: {money(data.incomeTargetCents)} · Goal {data.goalPct ?? 10}%</span>{data.progress && <span className="mt-1 block">Found (estimated): {money(data.progress.foundCents)} · Kept this month: {money(data.progress.keptCents)}</span>}<span className="mt-1 block">{data.receiptsCount ?? 0} receipts in this month. {data.ready ? 'Income recorded.' : 'Income details needed.'}</span></p>
  return data.recommendations?.length ? <ul className="space-y-2">{data.recommendations.slice(0, 5).map(item => <li key={item.key || item.item_name}><strong>{item.item_name}</strong><span className="block text-xs">{typeof item.priceBasis === 'string' ? item.priceBasis : 'Based on saved purchase records'}</span></li>)}<li className="text-xs text-slate-500">Suggestions only. Nothing added automatically.</li></ul> : <p>No shopping suggestions yet.</p>
}

export default function AgentsPage() {
  const client = useQueryClient()
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const { data, error, isLoading } = useQuery({ queryKey: ['background-agents'], queryFn: () => request('/api/agents'), refetchInterval: 15000 })
  async function act(kind, action) {
    setBusy(kind); setNotice(''); setActionError('')
    try {
      await request('/api/agents', {kind,action})
      await client.invalidateQueries({queryKey:['background-agents']})
      setNotice(action === 'refresh' ? 'Refresh queued. Results will appear after the agent runs.' : action === 'pause' ? 'Future runs paused. An already running check may finish.' : 'Agent resumed.')
    } catch (e) { setActionError(e.message) } finally { setBusy(null) }
  }
  async function feedback(topic, vote) {
    setBusy('feedback'); setActionError(''); setNotice('')
    try {
      await request('/api/agents/feedback', {kind:'news',topic,vote})
      await client.invalidateQueries({queryKey:['background-agents']})
      await client.invalidateQueries({queryKey:['economic-news']})
      setNotice('News preference saved.')
    } catch (e) { setActionError(e.message) } finally { setBusy(null) }
  }
  return <main className="mx-auto w-full max-w-[1600px] space-y-5 pb-10">
    <Link href="/chat" className={`${button} w-fit`}><ArrowLeft size={16}/> Guac AI chat</Link>
    <header className="rounded-3xl bg-[#08142D] p-5 text-white sm:p-7"><div className="flex items-center gap-3"><Bot className="shrink-0 text-violet-300" size={28}/><div><p className="text-xs font-bold uppercase tracking-widest text-violet-300">Guac AI</p><h1 className="text-3xl font-black">Your background agents</h1></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">Manage recurring checks, see the latest results, and decide what runs.</p></header>
    {isLoading && <p role="status" className="rounded-2xl bg-white p-5">Loading agent status…</p>}
    {(error || actionError) && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError || error.message}</p>}
    {notice && <p role="status" className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-800">{notice}</p>}
    {data && <p className={`rounded-2xl border p-4 text-sm ${data.scheduler?.stale ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}>{data.scheduler?.stale ? 'Background runner has not checked in recently. Queued refreshes may be delayed.' : 'Background runner is checking for work.'}<span className="mt-1 block text-xs">Last check-in: {date(data.scheduler?.lastTickAt, 'No check-in recorded')}</span></p>}
    <section aria-label="Background agents" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{AGENTS.map(agent => {
      const job = data?.jobs?.find(j => j.kind === agent.kind)
      const snapshot = data?.snapshots?.find(s => s.kind === agent.kind)
      const Icon = agent.icon
      const paused = job?.enabled === false
      const status = !job ? 'Not initialized' : paused ? 'Paused' : job.status === 'running' ? 'Running' : ['succeeded', 'pending'].includes(job.status) && job.requested_version > job.processed_version ? 'Queued' : job.status === 'failed' ? 'Needs attention' : job.status === 'queued' ? 'Queued' : job.status === 'succeeded' ? 'Ready' : job.status || 'Scheduled'
      return <article key={agent.kind} className="flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Icon size={20}/></span><h2 className="text-lg font-black text-slate-950">{agent.name}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">{status}</span></div><p className="mt-3 text-sm leading-6 text-slate-500">{agent.detail}</p><dl className="my-4 space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-1"><dt className="text-slate-500">Last refreshed</dt><dd className="font-semibold">{date(snapshot?.refreshed_at)}</dd></div><div className="flex flex-wrap justify-between gap-1"><dt className="text-slate-500">Next run</dt><dd className="font-semibold">{paused ? 'Paused' : date(job?.next_run_at, 'Not scheduled')}</dd></div></dl>{job?.last_error && <p className="mb-4 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{job.last_error}</p>}
      <div className="mt-auto flex flex-wrap gap-2">{agent.kind !== 'news' && <><button className={button} disabled={Boolean(busy) || !data} onClick={() => act(agent.kind, paused ? 'resume' : 'pause')}>{paused ? <Play size={15}/> : <Pause size={15}/>} {paused ? 'Resume' : 'Pause'}</button><button className={button} disabled={Boolean(busy) || !data || paused} onClick={() => act(agent.kind, 'refresh')}><RefreshCw size={15} className={busy === agent.kind ? 'animate-spin' : ''}/> Refresh</button></>}{agent.kind === 'news' && <span className="flex min-h-11 items-center text-xs font-semibold text-slate-500">Shared news feed · centrally managed</span>}<Link href={agent.href} aria-label={`Open ${agent.name}`} className={`${button} text-violet-700`}>Open <ArrowUpRight size={15}/></Link></div>
      <details className="mt-4 border-t border-slate-100 pt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-slate-700">Latest result</summary><div className="pb-2 text-sm leading-6 text-slate-600"><Results kind={agent.kind} result={snapshot?.result}/></div></details></article>
    })}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-black text-slate-950">What news helps you?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Guac AI learns your topic preferences from feedback. This personalizes news; it does not train a model. Other agents calculate results from saved records.</p><div className="mt-4 divide-y divide-slate-100">{TOPICS.map(topic => {
      const vote = data?.feedback?.find(item => item.kind === 'news' && item.topic === topic)?.vote || 0
      return <div key={topic} className="flex flex-wrap items-center justify-between gap-3 py-3"><p className="font-semibold text-slate-700">{topic}</p><div className="flex flex-wrap gap-2">{[[1,'Helpful'],[-1,'Less useful'],[0,'Reset']].map(([value,label]) => <button key={value} aria-label={`${label}: ${topic}`} aria-pressed={vote === value} disabled={Boolean(busy) || !data} className={`${button} ${vote === value && value !== 0 ? 'border-violet-400 bg-violet-50 text-violet-800' : ''}`} onClick={() => feedback(topic,value)}>{label}</button>)}</div></div>
    })}</div></section>
  </main>
}
