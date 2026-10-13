'use client'
import { useEffect, useState } from 'react'
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100)
export default function PlanFamily() {
  const [family, setFamily] = useState(null), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function load() {
    setError('')
    try {
      const response = await fetch('/api/find-your-10/family', { cache: 'no-store' }), result = await response.json()
      if (!response.ok) throw Error(result.error)
      setFamily(result.family); setLoaded(true)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])
  async function save(body) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/find-your-10/family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), result = await response.json()
      if (!response.ok) throw Error(result.error)
      await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const submit = (event, action) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); save({ ...values, action, shareTotals: values.shareTotals === 'on' }) }
  return <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="min-h-11 cursor-pointer text-lg font-black">Family goal · optional</summary><p className="my-3 text-sm text-slate-600">Share combined Found and Kept totals. Income, receipts, stores, bills and debts stay private. This does not enable household record sharing.</p>{error && <p role="alert" className="my-3 text-sm text-red-700">{error} <button className="underline" onClick={load}>Retry</button></p>}{loaded && (family ? <div className="space-y-3"><h3 className="font-bold">{family.name}</h3><p className="text-sm">{family.sharingMembers} of {family.members} members sharing · {family.month}</p><div className="grid gap-3 sm:grid-cols-2"><p className="rounded-xl bg-violet-50 p-4">Found <strong className="block text-2xl">{money(family.foundCents)}</strong></p><p className="rounded-xl bg-cyan-50 p-4">Verified savings this month <strong className="block text-2xl">{money(family.keptCents)}</strong></p></div><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={family.sharing} disabled={busy} onChange={e => save({ action: 'sharing', enabled: e.target.checked })} />Include my Found and Kept totals</label>{family.inviteCode && <div><p className="text-sm">Share this invitation code yourself with family members:</p><code className="my-2 block break-all rounded-lg bg-slate-100 p-3 text-sm">{family.inviteCode}</code></div>}<button disabled={busy} onClick={() => save({ action: 'leave' })} className="min-h-11 rounded-full border px-4 text-sm font-bold">{family.inviteCode ? 'Close family sharing for this group' : 'Leave family group'}</button><p className="text-xs text-slate-500">Your personal plan and financial records are kept.</p></div> : <div className="grid gap-4 sm:grid-cols-2">{[['create', 'Start a family goal', 'name', 'Family goal name'], ['join', 'Join a family goal', 'code', 'Invitation code']].map(([action, title, name, label]) => <form key={action} onSubmit={e => submit(e, action)} className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">{title}</h3><label className="grid gap-1 text-sm">{label}<input name={name} required maxLength={name === 'name' ? 60 : 24} className="min-h-11 rounded-lg border px-3" /></label><label className="flex min-h-11 items-center gap-2 text-sm"><input name="shareTotals" type="checkbox" required />I choose to share my Found and Kept totals.</label><button disabled={busy} className="min-h-11 rounded-full bg-violet-700 px-4 text-sm font-bold text-white">{title}</button></form>)}</div>)}</details>
}
