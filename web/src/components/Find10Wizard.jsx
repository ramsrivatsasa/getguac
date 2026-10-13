'use client'
import Link from 'next/link'
import styles from './Find10Plan.module.css'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PlanTargetLinks from './PlanTargetLinks'
import PlanPageHeader from './PlanPageHeader'
import { PLAN_TARGETS } from '../lib/find-your-10/definition.mjs'
import { money } from '../lib/find-your-10/wizard.mjs'
import { recurringAnalysis } from '../lib/find-your-10/recurring.mjs'
import PlanProgress from './PlanProgress'
import Find10Purchases from './Find10Purchases'
import Find10OtherTargets from './Find10OtherTargets'
import { planButton, planSecondary, planPanel, planField, PlanEmpty } from './Find10Primitives'

export default function Find10Wizard({ data, target, step, selected }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('')
  const definition = PLAN_TARGETS.find(t => t.id === target)
  const date = new Date(), plan = recurringAnalysis(data, date), state = data.progress
  const actions = (state?.actions || []).filter(a => target === 'cut' ? ['purchase', 'spending'].includes(a.type) : target === 'cheaper' ? a.type === 'shopping' : target === 'bills' ? !a.type || a.type === 'bill' : false)
  async function save(type, input, destination) {
    if (!state) { setError('Progress storage is unavailable. Please refresh and retry.'); return }
    setBusy(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/find-your-10/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: crypto.randomUUID(), version: state.version, type, data: input }) })
      const result = await response.json(); if (!response.ok) throw Error(result.error || 'Could not save. Your page is still here.')
      setStatus('Saved to your plan.'); router.refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <div className="space-y-5"><PlanPageHeader title={definition.title} subtitle="Compare options, choose what fits, and save it to your plan."/>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error} <button className="underline" onClick={() => router.refresh()}>Refresh</button></p>}{status && <p role="status" className="text-sm font-bold text-emerald-800">{status}</p>}
    {['cut', 'cheaper'].includes(target) && ['story', 'review', 'choices'].includes(step) && <Find10Purchases {...{ data, target, step, selected, busy, save }} />}
    {['bills', 'earn', 'learn'].includes(target) && <Find10OtherTargets {...{ data, target, step, busy, save, plan }} />}
    {['cut', 'cheaper', 'bills'].includes(target) && step === 'action' && <section className="space-y-4"><h2 className="text-xl font-black">Your chosen actions</h2>{actions.map(a => <article className={planPanel} key={a.id}><h3 className="font-black">{a.title}</h3><p className="mt-2 text-xl font-bold text-violet-900">{money(a.estimateCents)} estimated / month</p><p className="mt-1 text-sm">{a.switchingCents>0?`${money(a.switchingCents)} one-time cost; first year ${money(a.estimateCents*12-a.switchingCents)} at unchanged prices.`:null}</p><p className="mt-2 text-sm text-slate-600">{a.type === 'purchase' ? `${a.choice === 'skip' ? 'Skip' : 'Reduce by'} ${a.units} recorded unit(s); ${money(a.feeCents || 0)} allowed for replacement and other costs.` : a.type === 'shopping' ? `Check the current price at ${a.store}, confirm the same pack size, and include extra travel or shipping.` : a.type === 'spending' ? 'Previously chosen category goal. Review complete month records before confirming results.' : 'Contact the provider using your statement comparison. Confirm service, fees and contract terms before changing.'}</p><button className={planSecondary + ' mt-3'} disabled={busy} onClick={() => save(a.accepted ? 'undo' : 'resume', { id: a.id })}>{a.accepted ? 'Undo this choice' : 'Choose again'}</button></article>)}{!actions.length && <PlanEmpty href={`/my-plan/${target}/choices`} label="Compare choices">Nothing chosen yet. Keeping an expense or deciding later is okay.</PlanEmpty>}</section>}
    {['cut', 'cheaper', 'bills'].includes(target) && step === 'results' && <section className="space-y-4">{actions.filter(a => a.type === 'purchase' && a.accepted).map(a => <article className={planPanel} key={a.id}><h2 className="text-lg font-black">Verify {a.title}</h2><p className="my-3 text-sm">Compare your complete later month with {money(a.periodBaselineCents)} in the original 30-day sample. Savings are capped at {money(a.estimateCents)}. Your completeness confirmation is part of the evidence.</p><form className="space-y-3" onSubmit={e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); save('confirm-purchase', { ...values, id: a.id, completePeriod: values.completePeriod === 'on' }) }}><label className="grid gap-2 text-sm">Full completed month after choosing this action<input className={planField} type="month" name="period" max={plan.previousMonth} required /></label><label className="grid gap-2 text-sm">Replacement purchases, travel and other costs ($)<input className={planField} type="number" name="fees" min="0" step="0.01" required defaultValue="0" /></label><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="completePeriod" required />All purchases are captured, including other stores. I included replacement and extra costs.</label><button disabled={busy} className={planButton}>Verify against records</button></form></article>)}<PlanProgress data={{ ...data, progress: state ? { ...state, actions, ledger: state.ledger.filter(l => actions.some(a => a.id === l.actionId)) } : null }} plan={plan} date={date} resultsOnly /></section>}
    <footer className="flex flex-wrap gap-3 border-t pt-5"><Link className={planSecondary} href="/my-plan/details">View saved plan →</Link>{target==='learn'&&step==='review'&&<Link className={planButton} href="/my-plan/learn/choices">Try the knowledge check →</Link>}{target==='learn'&&!['story','results'].includes(step)&&<Link className={planSecondary} href="/my-plan/learn/results">Investment options →</Link>}</footer>
  </div>
}


