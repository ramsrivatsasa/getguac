'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CAPTURE_STEPS } from '../lib/find-your-10/recurring.mjs'
export default function PlanCaptureReview({ data }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const reviewed = data.progress?.captureReview || {}
  async function review(id, checked) {
    setBusy(true); setError('')
    try {
      if (!data.progress) throw Error('Progress storage is unavailable. Refresh and retry.')
      const response = await fetch('/api/find-your-10/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'capture-review', version: data.progress.version, requestId: crypto.randomUUID(), data: { id, checked } }) })
      const result = await response.json(); if (!response.ok) throw Error(result.error)
      const next = { ...reviewed, [id]: checked }
      if (CAPTURE_STEPS.every(s => next[s.id])) {
        const done = await fetch('/api/find-your-10', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewed: next }) })
        const result = await done.json(); if (!done.ok) throw Error(result.error)
      }
      router.refresh()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Your source records</h2><p className="mt-2 text-sm text-slate-600">Use the records you already have. Review each area once to enable monthly check-ins.</p>{CAPTURE_STEPS.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><span className="font-semibold">{s.title}</span><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={busy || !!data.captureCompletedAt} checked={data.captureCompletedAt ? true : !!reviewed[s.id]} onChange={e => review(s.id, e.target.checked)} />Reviewed or nothing to add</label></div>)}{data.captureCompletedAt && <p className="mt-3 text-sm font-bold text-emerald-800">Initial review complete. Keep adding records as you go.</p>}{error && <p role="alert" className="mt-3 text-red-800">{error}</p>}</section>
}

