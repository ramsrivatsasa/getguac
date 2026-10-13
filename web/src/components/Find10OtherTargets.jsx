'use client'
import {billCostEstimate,latestBillReviews} from '../lib/find-your-10/bill-comparison.mjs'
import PlanLearning from './PlanLearning'
import PlanCashComparison from './PlanCashComparison'
import WealthJourney from './WealthJourney'
import Link from 'next/link'
import { useState } from 'react'
import { money } from '../lib/find-your-10/wizard.mjs'
import { planButton as button, planSecondary as secondary, planPanel as panel, planField as field, PlanEmpty as Empty } from './Find10Primitives'
export default function Find10OtherTargets({ data, target, step, busy, save, plan }) {
  const state = data.progress
  const bills = latestBillReviews(plan.billReviews,data.billCycles || [],new Date().toISOString().slice(0,10))
  if (target === 'bills') return ['story', 'review', 'choices'].includes(step) ? <section className="space-y-4"><h2 className="text-xl font-black">{step === 'story' ? 'Start with what changed.' : step === 'review' ? 'Your recorded statements' : 'A conversation with real numbers'}</h2>{bills.map(b => <article key={b.id} className={panel}><h3 className="text-lg font-black">{b.title} · {money(b.amountCents)}</h3><p className="mt-2 text-sm">{b.increaseCents > 0 ? `${money(b.increaseCents)} above the previous captured statement.` : 'No increase established by these records.'}</p><Link className="inline-flex min-h-11 items-center font-bold text-violet-800" href="/bills">Review statements & renewal dates →</Link>{step === 'choices' && <><blockquote className="my-3 rounded-xl bg-orange-50 p-4 text-sm">My latest bill is {money(b.amountCents)}.{b.increaseCents > 0 ? ` My earlier statement was ${money(b.amountCents - b.increaseCents)}. What changed?` : ''} Which plans keep the service I use? Please itemize fees, optional add-ons, contract length and cancellation charges before I decide.</blockquote><p className="mb-3 text-sm text-slate-600">Check usage and billing-period length. Confirm whether you need a service before canceling. A lower price is subject to provider availability.</p>{b.cadence === 'monthly' && b.increaseCents > 0 && <><p className="mb-3 text-sm">If the provider restores the earlier price: {money(b.amountCents)} − {money(b.amountCents - b.increaseCents)} = {money(b.increaseCents)} / month before new fees. Verify later with a comparable statement.</p><BillChoice bill={b} busy={busy} chosen={state?.actions.some(a => a.id === b.id && a.accepted)} save={save} /></>}</>}</article>)}{!bills.length && <Empty href="/bills" label="Review bills">Capture current and prior statements to identify specific changes. No eligible statements are available yet.</Empty>}</section> : null
  if (target === 'earn') return step==='story'?<WealthJourney data={data}/>:<PlanCashComparison {...{data,plan,busy,save,step}}/>
  return <PlanLearning {...{data,step,busy,save}}/>

}

function BillChoice({ bill, busy, chosen, save }) {
  const [fees,setFees]=useState('0'),[switching,setSwitching]=useState('0')
  const valid=[fees,switching].every(v=>/^\d{1,7}(\.\d{1,2})?$/.test(v))
  const estimate=valid?billCostEstimate(bill.increaseCents,Math.round(Number(fees)*100),Math.round(Number(switching)*100)):null
  return <form className="space-y-3" onSubmit={e=>{e.preventDefault();if(valid)save('accept-bill',{id:bill.id,fees,switching})}}>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm">Extra monthly fees ($)<input className={field} type="number" min="0" step="0.01" required value={fees} onChange={e=>setFees(e.target.value)}/></label><label className="grid gap-2 text-sm">One-time switching cost ($)<input className={field} type="number" min="0" step="0.01" required value={switching} onChange={e=>setSwitching(e.target.value)}/></label></div>
    {estimate&&<p className="text-sm font-bold" aria-live="polite">{money(estimate.monthlyCents)}/month before one-time costs · {money(estimate.firstYearCents)} first year{estimate.breakEvenMonths>0?` · ${estimate.breakEvenMonths} months to cover switching costs`:''}</p>}
    <p className="text-xs text-slate-600">Scenario at the earlier rate for 12 months, subject to provider confirmation. Include actual switching costs when checking your result.</p>
    <button className={button} disabled={busy||chosen||!estimate||estimate.monthlyCents<=0}>{chosen?'Bill review chosen':'Choose this bill review'}</button>
  </form>
}
