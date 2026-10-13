'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GOAL_PERCENTAGES } from '../lib/find-your-10/definition.mjs'
export default function PlanPreferences({ plan, lastCheckIn, onSave }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function save(body) {
    setBusy(true); setMessage('')
    try {
      if (onSave) await onSave(body)
      else { const response = await fetch('/api/find-your-10', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw Error(result.error || 'Could not save.'); router.refresh() }
      window.dispatchEvent(new Event('plan-updated'))
      setMessage(body.action === 'goal' ? 'Your goal is saved.' : 'Monthly check-in saved. Keep capturing as you go.')
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><div className="flex flex-wrap items-end justify-between gap-4"><label className="grid gap-2 text-sm font-bold text-violet-950">Your monthly income goal<select aria-label="Your monthly income goal" value={plan.goalPct} disabled={busy} onChange={e => save({ action: 'goal', pct: Number(e.target.value) })} className="min-h-11 rounded-xl border border-violet-200 bg-white px-3">{GOAL_PERCENTAGES.map(pct => <option key={pct} value={pct}>{pct}% of take-home income</option>)}</select></label><strong className="text-3xl font-black text-violet-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(plan.incomeTargetCents / 100)}<span className="ml-1 text-sm font-semibold">/ month</span></strong></div><p className="mt-3 text-sm text-slate-600">A goal, not promised savings. Essentials and existing obligations come first.</p>{plan.captureComplete && <div className="mt-4 border-t border-violet-200 pt-4"><h2 className="font-bold">Monthly check-in · {plan.month}</h2><p className="my-2 text-sm text-slate-600">Review what held, what slipped, and new opportunities. Confirming this review does not mark any savings as Kept.</p><button onClick={() => save({ action: 'check-in', month: plan.month })} disabled={busy || lastCheckIn === plan.month} className="min-h-11 rounded-full bg-violet-800 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{lastCheckIn === plan.month ? 'Reviewed this month' : 'I’ve reviewed this month’s results'}</button></div>}<p role="status" className="mt-2 text-sm">{message}</p></section>
}
