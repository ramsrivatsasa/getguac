'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './Find10DashboardCard.module.css'
import { accountingChoices, completedChoiceCents, quickPlanTotals } from '../lib/find-your-10/lifecycle.mjs'
import { goalProgress } from '../lib/find-your-10/goal-progress.mjs'
import { groupQuickOpportunities } from '../lib/find-your-10/quick-plan.mjs'
import { ArrowRight } from 'lucide-react'
import {DONUT,donutGeometry,donutCategoryColor} from '../lib/donut-style.mjs'
import GuacMascot from './GuacMascot'
import { recurringAnalysis } from '../lib/find-your-10/recurring.mjs'
import PlanTargetLinks from './PlanTargetLinks'
import { progressTotals } from '../lib/find-your-10/progress.mjs'

export default function Find10DashboardCard({ data = {}, href = '/my-plan/details', now, expanded = false, actionLabel }) {
  const ring=donutGeometry(120)
  const router=useRouter()
  const [pct,setPct]=useState(data.goalPct||10),[saving,setSaving]=useState(false),[error,setError]=useState('')
  useEffect(()=>setPct(data.goalPct||10),[data.goalPct])
  const plan = recurringAnalysis({...data,goalPct:pct}, now ? new Date(now) : new Date())
  async function saveGoal(value){
    if(saving||value===(data.goalPct||10))return
    setSaving(true);setError('')
    try {
      const response=await fetch('/api/find-your-10',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'goal',pct:value})})
      const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save goal.')
      window.dispatchEvent(new Event('plan-updated'));router.refresh()
    }catch(e){setError(e.message)}finally{setSaving(false)}
  }
  const progress = data.progress ? progressTotals(data.progress, plan.month) : null
  const choices=accountingChoices(data.progress).filter(c=>!c.needsReview)
  const forecast=quickPlanTotals(data.progress,plan.month)
  const planned=forecast.plannedCents
  const {contributions,completion,remainingCents}=goalProgress(groupQuickOpportunities(choices,data.items||[]).map(group=>({
    title:group.title,
    completed:group.options.reduce((sum,c)=>sum+completedChoiceCents(data.progress,c,plan.month),0),
    color:donutCategoryColor(group.title),
  })),plan.incomeTargetCents)
  const formatAmount=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value/100)
  const lastEntries=(data.progress?.ledger||[]).filter(entry=>entry.period===plan.previousMonth)
  const lastSaved=lastEntries.reduce((sum,entry)=>sum+entry.amountCents,0)
  return <section aria-label={`Find your ${plan.goalPct}%`} className={`${styles.card} flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-200 p-5 sm:p-6`}>

    <div className="shrink-0 self-start"><GuacMascot size={72} expression="happy" /></div><div className="min-w-0 flex-1">    <div className="w-full text-sm font-bold text-violet-900">{plan.ready ? `${plan.goalPct}% of your take-home income · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(plan.incomeTargetCents / 100)} / month` : 'Enter your income once to set your monthly goal.'}</div>
<p className="mt-2 text-xs font-bold uppercase tracking-widest text-violet-800">Your ongoing savings plan</p><div className="mt-1 flex flex-wrap items-center gap-4"><h2 className="text-2xl font-black text-slate-950">Find your {plan.goalPct}%</h2><label className="flex items-center gap-2 text-xs text-violet-800"><span>10%</span><input aria-label="Savings goal percentage" type="range" min="10" max="20" step="1" value={pct} disabled={saving} onChange={e=>setPct(Number(e.target.value))} onPointerUp={e=>saveGoal(Number(e.currentTarget.value))} onKeyUp={e=>saveGoal(Number(e.currentTarget.value))} onBlur={e=>saveGoal(Number(e.currentTarget.value))} className="h-11 w-36 accent-violet-700"/><span>20%</span></label>{saving&&<span role="status" className="text-xs">Saving…</span>}{error&&<span role="alert" className="text-xs text-red-700">{error}</span>}</div><p className="mt-2 text-sm text-slate-600">{plan.captureComplete ? 'Track your progress and discover new ways to save.' : 'Let’s bring your expenses together. We’ll guide you through receipts, bills, other payments and debt.'}</p></div>
    <div className={styles.dashboardData}><div className={styles.chartAction}><h3 className={styles.sectionTitle}>Your plan progress</h3><div className={styles.chartAndLegend}><div className={styles.donut} role="img" aria-label={`${Math.round(completion)}% of monthly savings goal covered by completed action estimates. ${contributions.map(c=>`${c.title}: ${formatAmount(c.completed)} completed`).join('. ')}`}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r={ring.radius} fill="none" stroke={DONUT.track} strokeWidth={ring.stroke}/>{contributions.filter(c=>c.share>0).map(c=><circle key={c.title} cx="60" cy="60" r={ring.radius} fill="none" stroke={c.color} strokeWidth={ring.stroke} pathLength="100" strokeDasharray={`${c.share} ${100-c.share}`} strokeDashoffset={-c.offset} transform="rotate(-90 60 60)"/>)}</svg><div><strong>{Math.round(completion)}%</strong><span>of goal</span></div></div><div className={styles.legend}>{contributions.map(c=><div key={c.title}><i style={{background:c.color}}/><span>{c.title}</span><b>{formatAmount(c.completed)}</b></div>)}<div><i style={{background:'#e5ddf5'}}/><span>Remaining</span><b>{formatAmount(remainingCents)}</b></div></div></div><p className={styles.chartNote}>{planned>0?'Completed actions · estimated savings':data.progress?.quickPlan?.savedAt?'Your choices are saved · no estimated savings yet':'Save a plan to start tracking'}</p><Link href={href} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-800 px-5 py-3 text-sm font-bold text-white">{actionLabel || (expanded ? 'Close plan details' : plan.captureComplete ? 'View my plan' : 'Start my plan')}<ArrowRight size={17} /></Link></div>
    <div className={styles.planSummary}><h3 className={styles.sectionTitle}>Your savings plan</h3>
      {[['Monthly planned', forecast.monthlyCents], ['One-time planned', forecast.oneTimeCents], ['Verified savings this month', progress?.keptCents]].map(([label, value]) => <div key={label} className={styles.summaryRow}><p className="text-xs font-semibold text-slate-600">{label}</p><strong className="mt-1 block break-words text-sm font-black text-violet-950 min-[390px]:text-lg sm:text-2xl">{value == null ? 'Not available' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)}</strong></div>)}
    </div>
    <div className={styles.monthSummary}><h3 className={styles.sectionTitle}>Last month · {plan.previousMonth}</h3><dl><div><dt>Recorded spending</dt><dd>{formatAmount(plan.previousPaidCents)}</dd></div><div><dt>Verified savings</dt><dd>{formatAmount(lastSaved)}</dd></div></dl></div></div>
    <div className="w-full"><PlanTargetLinks compact /><p className="mt-2 text-xs text-slate-600">Planned amounts are estimates. Verified savings use receipt evidence.</p></div>
  </section>
}
