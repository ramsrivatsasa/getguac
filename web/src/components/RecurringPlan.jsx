'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, CalendarDays, Wallet, CreditCard, ArrowRight, RefreshCw } from 'lucide-react'
import { CAPTURE_STEPS, recurringAnalysis } from '../lib/find-your-10/recurring.mjs'
import PlanPreferences from './PlanPreferences'
import { PlanWealthEducation } from './TenPercentSections'
import PlanProgress from './PlanProgress'
import { accountOpportunities } from '../lib/find-your-10/opportunities.mjs'
import PlanFamily from './PlanFamily'

const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
const icons = [Receipt, CalendarDays, Wallet, CreditCard]
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-800 px-5 py-3 text-sm font-bold text-white'
export default function RecurringPlan({ data, now, completeCapture, savePreferences, saveProgress, dashboardHref = '/dashboard', userId, embedded = false }) {
  const router = useRouter()
  const [interactive, setInteractive] = useState(false)
  const [liveDate, setDate] = useState(() => new Date())
  const date = now ? new Date(now) : liveDate
  const [reviewed, setReviewed] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const plan = recurringAnalysis(data, date)
  const opportunities = accountOpportunities(data, date)
  useEffect(() => { setInteractive(true) }, [])
  useEffect(() => {
    if (!userId) return
    try { setReviewed(JSON.parse(sessionStorage.getItem(`find10-review:${userId}`) || '{}')) } catch {}
  }, [userId])
  function review(id, checked) {
    setReviewed(previous => {
      const next = { ...previous, [id]: checked }
      if (userId) { try { sessionStorage.setItem(`find10-review:${userId}`, JSON.stringify(next)) } catch {} }
      return next
    })
  }
  useEffect(() => {
    if (now) return
    const refresh = () => { setDate(new Date()); router.refresh() }
    const visible = () => { if (!document.hidden) refresh() }
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', visible)
    const timer = setInterval(visible, 60000)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); clearInterval(timer) }
  }, [now, router])
  async function finish() {
    setBusy(true); setError('')
    try {
      if (completeCapture) await completeCapture(reviewed)
      else {
        const response = await fetch('/api/find-your-10', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewed }) })
        const result = await response.json(); if (!response.ok) throw Error(result.error || 'Your progress could not be saved.')
        router.refresh()
      }
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    
    {!embedded && <header><p className="text-xs font-bold uppercase tracking-widest text-violet-800">Capture · Analyze · Save · Repeat</p><h1 className="mt-2 text-3xl font-black text-slate-950">Your 10% plan</h1><p className="mt-2 text-sm text-slate-600">An ongoing monthly cycle, refreshed as you add receipts, bills, payments and debt.</p></header>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <PlanPreferences plan={plan} lastCheckIn={data.lastCheckIn} onSave={savePreferences} />
    {!plan.captureComplete ? <>
      <section className={panel}><h2 className="text-xl font-black">First, bring your expenses together.</h2><p className="mt-2 text-sm text-slate-600">Use the tools you already have. Existing records count—there’s no need to enter them again. Review each area, including anything that does not apply.</p></section>
      <div className="grid gap-4 sm:grid-cols-2">{CAPTURE_STEPS.map((step, i) => { const Icon = icons[i]; return <section key={step.id} className={panel}><div className="flex items-center gap-3"><Icon size={23} className="text-violet-800" /><h2 className="text-lg font-black">{i + 1}. {step.title}</h2></div><p className="my-3 text-sm text-slate-600">{step.detail}</p><Link href={step.href} className="inline-flex min-h-11 items-center gap-2 font-bold text-violet-800">Open {step.title.toLowerCase()}<ArrowRight size={16} /></Link><label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 border-t pt-3 text-sm"><input type="checkbox" disabled={!interactive || busy} checked={Boolean(reviewed[step.id])} onChange={e => review(step.id, e.target.checked)} className="h-5 w-5 accent-violet-800" />Reviewed, or nothing to add</label></section> })}</div>
      <p className="text-sm text-slate-600">Income is saved once. <Link href="/budget" className="font-bold text-violet-800 underline">Update it only when it changes.</Link></p>
      <button className={button} onClick={finish} disabled={!interactive || busy || !CAPTURE_STEPS.every(s => reviewed[s.id]) || !plan.ready}>{busy ? 'Analyzing your records…' : 'Analyze my data and show my plan'}<ArrowRight size={17} /></button>
      {!plan.ready && <p className="text-sm text-amber-800">Save your income information before starting your plan.</p>}
    </> : null}
    <>
      <PlanProgress data={data} plan={plan} date={date} onSave={saveProgress} />
      <section className={`${panel} flex flex-wrap items-center justify-between gap-4`}><div><h2 className="text-xl font-black">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)}</h2><p className="mt-1 text-sm text-slate-600">All five targets run together. Results update as you capture; review progress each month.</p></div><button className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold" onClick={() => { if (!now) setDate(new Date()); router.refresh() }}><RefreshCw size={16} />Refresh results</button></section>
      <div className="grid gap-3 sm:grid-cols-3">{[['Captured expenses this month', plan.monthPaidCents], ['Monthly take-home income', plan.incomeCents], ['Debt balances · not expenses', plan.debtCents]].map(([label, value]) => <div key={label} className={panel}><p className="text-sm text-slate-600">{label}</p><strong className="mt-2 block text-2xl font-black text-violet-900">{money(value)}</strong></div>)}</div>
      <p className="text-sm text-slate-600">Based on {plan.receiptsCount} purchase records and recorded bill payments this month. Captured totals may be incomplete. Targets and comparisons are not confirmed savings.</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section id="cut" className={panel}><p className="text-xs font-bold text-violet-800">TARGET 1 · ONGOING</p><h2 className="mt-2 text-xl font-black">Reduce everyday spending</h2>{plan.categories.length ? <><p className="mt-2 text-sm text-slate-600">Start by reviewing the categories taking the largest share of your captured spending.</p><ul className="my-4 divide-y">{plan.categories.slice(0, 5).map(c => <li className="flex justify-between gap-3 py-3 text-sm" key={c.name}><span>{c.name}</span><strong>{money(c.amountCents)}</strong></li>)}</ul></> : <p className="my-4 text-sm text-slate-600">Keep capturing receipts to identify spending patterns.</p>}{plan.previousPaidCents > 0 && <p className="mb-4 rounded-xl bg-violet-50 p-3 text-sm">A 10% reduction on the {money(plan.previousPaidCents)} captured in {plan.previousMonth} would be {money(plan.spendingScenarioCents)}. This is a scenario, not a verified opportunity or a complete monthly budget.</p>}<Link href="/receipts" className="font-bold text-violet-800">Review receipts →</Link></section>
        <section id="cheaper" className={panel}><p className="text-xs font-bold text-cyan-800">TARGET 2 · ONGOING</p><h2 className="mt-2 text-xl font-black">Shop for less</h2><p className="my-3 text-sm text-slate-600">Compare what you actually buy, using itemized receipts and saved offers.</p>{opportunities.shopping.length ? <ul className="divide-y">{opportunities.shopping.slice(0, 5).map(item => <li key={item.id} className="py-3 text-sm"><strong>{item.title} · {money(item.differenceCents)} / unit difference</strong><p className="mt-1 text-slate-600">{money(item.alternativeCents)} at {item.store} on {item.checkedAt}. Historical price; check today’s price and package size.</p><Link href={item.href} className="inline-flex min-h-11 items-center font-bold text-violet-700">Source receipt →</Link></li>)}</ul> : <p className="my-3 text-sm text-slate-600">Capture the same product at different stores to build a personal price comparison.</p>}{opportunities.promotions.length > 0 && <div className="mt-3"><h3 className="font-bold">Your saved, verified offers</h3>{opportunities.promotions.slice(0, 4).map(p => <Link key={p.id} href="/promotions" className="my-2 block rounded-xl bg-cyan-50 p-3 text-sm"><strong>{p.merchant_name} · {p.title}</strong><span className="mt-1 block">{p.benefit_text} · Expires {new Date(p.expires_at).toLocaleDateString()}</span></Link>)}</div>}<div className="mt-3 flex flex-wrap gap-3"><Link href="/shopping" className="inline-flex min-h-11 items-center font-bold text-violet-700">Shopping list & comparisons →</Link><Link href="/promotions" className="inline-flex min-h-11 items-center font-bold text-violet-700">Coupons & offers →</Link><Link href="/car-miles" className="inline-flex min-h-11 items-center font-bold text-violet-700">Plan combined trips →</Link></div></section>
        <section id="bills" className={panel}><p className="text-xs font-bold text-violet-800">TARGET 3 · ONGOING</p><h2 className="mt-2 text-xl font-black">Lower your bills</h2><p className="my-3 text-sm text-slate-600">Review price increases, unused services and plan options with each provider.</p>{plan.billReviews.length ? <ul className="divide-y">{plan.billReviews.map(b => <li key={b.id} className="py-3 text-sm"><strong>{b.title} · {money(b.amountCents)}</strong><p className="mt-1 text-slate-600">{b.increaseCents > 0 ? `${money(b.increaseCents)} above the previous captured statement. Check usage, fees and period length before treating this as a price increase.` : 'Check the service you use, renewal terms and available provider plans.'}</p></li>)}</ul> : <p className="my-4 text-sm text-slate-600">No bills captured for this month yet.</p>}<Link href="/bills" className="inline-flex min-h-11 items-center font-bold text-violet-800">Review bills →</Link></section>
        <section id="earn" className={panel}><p className="text-xs font-bold text-orange-800">TARGET 4 · ONGOING</p><h2 className="mt-2 text-xl font-black">Make your money work</h2><p className="my-3 text-sm text-slate-600">{money(plan.cashCents)} recorded in checking and savings. Keep essentials and a cash cushion in view before setting money aside.</p>{opportunities.debt.length > 0 && <div><h3 className="font-bold">Understand your borrowing costs</h3><ul className="divide-y">{opportunities.debt.map(d => <li key={d.id} className="py-3 text-sm"><strong>{d.name} · {Number(d.apr).toFixed(2)}% APR</strong><p className="mt-1 text-slate-600">About {money(d.monthlyInterestCents)} interest per month at the recorded balance, before payments and compounding. This estimate is not a statement charge.</p></li>)}</ul></div>}<p className="my-3 text-sm text-slate-600">Compare insured savings account APY, fees, minimums and access. No rate is assumed or counted as savings without a sourced comparison and later evidence.</p><div className="flex flex-wrap gap-3"><Link href="/wealth" className="inline-flex min-h-11 items-center font-bold text-violet-700">Manage accounts & debt →</Link><Link href="/calculators" className="inline-flex min-h-11 items-center font-bold text-violet-700">Compare a scenario →</Link><Link href="/guacwizard" className="inline-flex min-h-11 items-center font-bold text-violet-700">Review statement fees →</Link></div></section>
      </div><section id="learn" className={panel}><p className="text-xs font-bold text-violet-800">TARGET 5 · EDUCATION ONLY</p><details><summary className="min-h-11 cursor-pointer text-xl font-black">Learn to build wealth</summary><PlanWealthEducation /><Link href="/learn" className="inline-flex min-h-11 items-center font-bold text-violet-700">Continue learning in GetGuac →</Link></details></section><section className={panel}><h2 className="text-xl font-black">Keep your plan growing</h2><p className="my-2 text-sm text-slate-600">Continue capturing throughout the month. Next month starts a fresh analysis period using your saved income and new records.</p><div className="flex flex-wrap gap-3">{CAPTURE_STEPS.map(s => <Link key={s.id} href={s.href} className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold text-violet-800">{s.title}</Link>)}</div></section>
    </>
    {userId && <PlanFamily />}
  </div>
}
