'use client'
// Bills calendar — a PocketSmith-style month view of upcoming recurring bills.
// Projects detected subscriptions onto their due dates so the user can see
// what's coming and when. Pure client: pulls receipts, runs the projector.

import { useEffect, useMemo, useState } from 'react'
import useCurrencySymbol from '../hooks/useCurrencySymbol'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Repeat, Plus, X } from 'lucide-react'
import { getReceipts } from '../lib/db'
import { projectBills, toIso } from '../lib/billsCalendar'
import { createClient } from '../lib/supabase/client'
import { BILL_TYPES, saveReadableBill } from '../lib/bill-creation.mjs'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const moneyWith = (sym) => (n) => `${sym}${(Number(n) || 0).toFixed(2)}`
const money0With = (sym) => (n) => `${sym}${Math.round(Number(n) || 0)}`

export default function BillsCalendar() {
  const sb = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const __cur = useCurrencySymbol()
  const money = useMemo(() => moneyWith(__cur), [__cur])
  const money0 = useMemo(() => money0With(__cur), [__cur])
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => getReceipts(),
    staleTime: 5 * 60 * 1000,
  })
  const { data: manualCycles = [], isLoading: manualLoading } = useQuery({
    queryKey: ['bill-cycles'],
    queryFn: async () => {
      const { data, error } = await sb.from('bill_cycles')
        .select('id,bill_series_id,due_date,expected_amount,statement_amount,paid_amount,status,bill_series(name,cadence,bill_type)')
        .not('status', 'in', '(skipped,canceled)')
        .order('due_date')
      if (error && !/does not exist|schema cache/i.test(error.message || '')) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const emptyForm = { name: '', amount: '', dueDate: '', cadence: 'monthly', autopay: false, billType: 'other' }
  const [form, setForm] = useState(emptyForm)
  const [pendingSeries, setPendingSeries] = useState(null)
  const [lastSavedSeries, setLastSavedSeries] = useState(null)
  useEffect(() => {
    let cancelled = false
    sb.auth.getUser().then(({data}) => {
      if (!data.user || cancelled) return
      try {
        const pending = JSON.parse(sessionStorage.getItem(`pending-bill:${data.user.id}`) || 'null')
        if (pending?.seriesId && pending.form) { setPendingSeries(pending.seriesId); setForm(pending.form); setFormOpen(true) }
      } catch { /* Invalid local draft cannot alter saved financial records. */ }
    })
    return () => { cancelled = true }
  }, [sb])
  const [billMessage, setBillMessage] = useState('')
  const [statementMessage, setStatementMessage] = useState('')
  async function saveStatement(event) {
    event.preventDefault(); setSaving(true); setStatementMessage('')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const response = await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bill-statement', ...values }) })
      const result = await response.json()
      if (!response.ok) throw Error(result.error || 'Statement was not saved.')
      await queryClient.invalidateQueries({ queryKey: ['bill-cycles'] })
      setStatementMessage('Statement saved. Your dashboard plan will use this amount.')
    } catch (error) { setStatementMessage(error.message) } finally { setSaving(false) }
  }

  const today = useMemo(() => new Date(), [])
  const todayIso = toIso(today)
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState(todayIso)

  const bills = useMemo(() => {
    const detected = projectBills(receipts, { from: today, monthsAhead: 12 })
    const manual = manualCycles.map(c => ({
      id: c.id,
      merchant: c.bill_series?.name || 'Bill',
      dateIso: c.due_date,
      amount: Number(c.statement_amount ?? c.expected_amount ?? 0) - Number(c.paid_amount || 0),
      totalDue: Number(c.statement_amount ?? c.expected_amount ?? 0),
      intervalLabel: c.bill_series?.cadence || 'manual',
      status: c.status,
      manual: true,
      billType: BILL_TYPES.find(([type])=>type===c.bill_series?.bill_type)?.[1] || 'Other',
    }))
    const keyed = new Map()
    for (const b of [...manual, ...detected]) {
      const key = `${String(b.merchant).toLowerCase()}|${b.dateIso}`
      if (!keyed.has(key)) keyed.set(key, b)
    }
    return [...keyed.values()].sort((a, b) => a.dateIso.localeCompare(b.dateIso))
  }, [receipts, manualCycles, today])

  async function addBill(e) {
    e.preventDefault(); setFormError('')
    const amount = Number(form.amount)
    if (!form.name.trim() || !form.dueDate || !Number.isFinite(amount) || amount < 0) return setFormError('Enter a bill name, amount, and due date.')
    setSaving(true)
    try {
      const { data: auth } = await sb.auth.getUser()
      if (!auth.user) throw new Error('Please sign in again.')
      const saved = await saveReadableBill(sb,auth.user.id,form,{seriesId:pendingSeries,onSeries:id => { setPendingSeries(id); sessionStorage.setItem(`pending-bill:${auth.user.id}`, JSON.stringify({seriesId:id,form})) }})
      queryClient.setQueryData(['bill-cycles'], old=>[...(old||[]).filter(c=>c.bill_series_id!==saved.seriesId),...saved.cycles])
      const due = new Date(`${form.dueDate}T12:00:00`)
      setCursor({y:due.getFullYear(),m:due.getMonth()});setSelected(form.dueDate)
      setBillMessage(`${form.name.trim()} saved. Calendar entries are ready.`)
      sessionStorage.removeItem(`pending-bill:${auth.user.id}`); setLastSavedSeries(saved.seriesId)
      setPendingSeries(null);setForm(emptyForm);setFormOpen(false)
    } catch (error) {
      setFormError(/does not exist|schema cache/i.test(error?.message || '') ? 'Bill setup needs an update. Please retry after the update is complete.' : (error?.message || 'Could not save this bill.'))
    } finally { setSaving(false) }
  }

  async function updateCycle(cycle, action) {
    if (!cycle?.manual) return
    const amount = Math.max(0, Number(cycle.totalDue ?? cycle.amount ?? 0))
    const patch = action === 'paid'
      ? { status: 'paid', paid_amount: amount, paid_at: new Date().toISOString() }
      : { status: 'skipped' }
    const { error } = await sb.from('bill_cycles').update(patch).eq('id', cycle.id)
    if (error) return setFormError(error.message)
    await queryClient.invalidateQueries({ queryKey: ['bill-cycles'] })
  }

  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`
  const byDay = useMemo(() => {
    const map = {}
    for (const b of bills) if (b.dateIso.startsWith(monthPrefix)) (map[b.dateIso] ||= []).push(b)
    return map
  }, [bills, monthPrefix])
  const monthTotal = useMemo(
    () => Object.values(byDay).reduce((s, list) => s + list.reduce((a, b) => a + b.amount, 0), 0),
    [byDay],
  )
  const upcoming = useMemo(() => {
    const future = bills.filter(b => b.dateIso >= todayIso)
    const rows = future.slice(0, 10)
    const newlySaved = manualCycles.find(c => c.bill_series_id === lastSavedSeries && c.due_date >= todayIso)
    const first = newlySaved && future.find(b => b.id === newlySaved.id)
    return first && !rows.some(b => b.id === first.id) ? [...rows.slice(0,9),first].sort((a,b)=>a.dateIso.localeCompare(b.dateIso)) : rows
  }, [bills, todayIso, manualCycles, lastSavedSeries])

  // Calendar grid cells (leading blanks + day numbers).
  const startWeekday = new Date(cursor.y, cursor.m, 1).getDay()
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const shiftMonth = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const selectedBills = selected ? bills.filter((b) => b.dateIso === selected) : []
  const noBills = !isLoading && !manualLoading && bills.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="gg-h2 inline-flex items-center gap-2">
            <CalendarDays className="text-guac-600" /> Bills calendar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your recurring bills, laid out on the days they’re due.</p>
        </div>
        <button onClick={() => setFormOpen(v => !v)} className="btn-primary inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap"><Plus size={16}/> Add bill</button>
      </div>

      {formOpen && <form onSubmit={addBill} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        {pendingSeries && <p role="status" className="mb-3 text-sm text-amber-800">Finish saving your bill and loading its calendar entries. Retry keeps the same bill.</p>}
        <div className="mb-3 flex items-center justify-between"><h2 className="font-black text-gray-900">Add a recurring bill</h2><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={17}/></button></div>
        <fieldset disabled={saving || Boolean(pendingSeries)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="input" placeholder="Bill or provider" value={form.name} onChange={e => setForm(v => ({...v, name:e.target.value}))}/>
          <input className="input" type="number" min="0" step="0.01" placeholder="Expected amount" value={form.amount} onChange={e => setForm(v => ({...v, amount:e.target.value}))}/>
          <input aria-label="First due date" className="input" type="date" value={form.dueDate} onChange={e => setForm(v => ({...v, dueDate:e.target.value}))}/>
          <select className="input" value={form.cadence} onChange={e => setForm(v => ({...v, cadence:e.target.value}))}><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semiannual">Twice yearly</option><option value="annual">Yearly</option><option value="irregular">Irregular</option></select>
          <label className="grid gap-1 text-sm">Bill type<select aria-label="Bill type" className="input" value={form.billType} onChange={e=>setForm(v=>({...v,billType:e.target.value}))}>{BILL_TYPES.map(([type,label])=><option key={type} value={type}>{label}</option>)}</select></label>
        </fieldset>
        <div className="mt-3">
          <button disabled={saving} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save bill'}</button>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><input type="checkbox" disabled={saving || Boolean(pendingSeries)} checked={form.autopay} onChange={e => setForm(v => ({...v, autopay:e.target.checked}))}/> Scheduled for autopay</label>
        {formError && <p className="mt-2 text-sm font-semibold text-red-600">{formError}</p>}
      </form>}
      {billMessage && <p role="status" className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-800">{billMessage}</p>}

      {manualCycles.length > 0 && <details className="rounded-2xl border border-violet-100 bg-white p-4"><summary className="min-h-11 cursor-pointer font-bold">Record an actual bill statement</summary><p className="my-3 text-sm text-slate-600">Save the amount from each statement for the same service. Your plan compares these amounts; forecasts alone are not savings evidence.</p><form onSubmit={saveStatement} className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm">Saved bill<select name="seriesId" className="input min-h-11" required>{[...new Map(manualCycles.map(c => [c.bill_series_id, c])).values()].map(c => <option key={c.bill_series_id} value={c.bill_series_id}>{c.bill_series?.name || 'Bill'}</option>)}</select></label><label className="grid gap-1 text-sm">Statement due date<input name="date" type="date" className="input min-h-11" required /></label><label className="grid gap-1 text-sm">Statement amount ($)<input name="amount" type="number" min="0" step="0.01" className="input min-h-11" required /></label><button disabled={saving} className="min-h-11 rounded-full bg-violet-700 px-4 font-bold text-white sm:col-span-3">Save statement</button></form><p role="status" className="mt-2 text-sm">{statementMessage}</p></details>}
      {noBills ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-5xl mb-3">🗓️</div>
          <p className="font-bold text-gray-800">No recurring bills detected yet.</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Add bills manually, or let GetGuac detect recurring charges from receipts and statements. No bank connection is required.
          </p>
          <button onClick={() => setFormOpen(true)} className="btn-primary inline-flex mt-4">Add your first bill</button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-guac-50 text-gray-600"><ChevronLeft size={18} /></button>
              <div className="text-center">
                <div className="font-black text-gray-900">{monthName}</div>
                <div className="text-[11px] font-semibold text-guac-700">{money(monthTotal)} due this month</div>
              </div>
              <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-guac-50 text-gray-600"><ChevronRight size={18} /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-[10px] font-bold uppercase tracking-wider text-gray-400 py-1">{w[0]}</div>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <div key={`b${i}`} />
                const iso = `${monthPrefix}-${String(day).padStart(2, '0')}`
                const dayBills = byDay[iso] || []
                const total = dayBills.reduce((s, b) => s + b.amount, 0)
                const isToday = iso === todayIso
                const isSel = iso === selected
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(iso)}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 text-xs transition-all ${
                      isSel ? 'border-guac-600 bg-guac-50' : 'border-transparent hover:bg-guac-row'
                    }`}
                  >
                    <span className={`font-bold ${isToday ? 'w-5 h-5 rounded-full bg-guac-700 text-white flex items-center justify-center' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {total > 0 && (
                      <span className="text-[9px] font-extrabold text-guac-700 leading-none">{money0(total)}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Side panel: selected day + upcoming */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="gg-h2 mb-2">
                {selected === todayIso ? 'Due today' : new Date(`${selected}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </h3>
              {selectedBills.length === 0 ? (
                <p className="text-sm text-gray-400">No bills due.</p>
              ) : (
                <div className="space-y-2">
                  {selectedBills.map((b, i) => <BillRow key={i} b={b} onAction={updateCycle} />)}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="gg-h2 mb-2 inline-flex items-center gap-1.5"><Repeat size={14} className="text-guac-600" /> Upcoming bills</h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing coming up.</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((b, i) => <BillRow key={i} b={b} showDate onAction={updateCycle} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BillRow({ b, showDate, onAction }) {
  const __cur = useCurrencySymbol()
  const money = useMemo(() => moneyWith(__cur), [__cur])
  const when = new Date(`${b.dateIso}T00:00:00`)
  const days = Math.round((when - new Date(new Date().toDateString())) / 86400000)
  const rel = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg py-1">
      <div className="min-w-0">
        <p className="font-semibold text-gray-800 text-sm break-words">{b.merchant}</p>
        <p className="text-[11px] text-gray-400">
          {showDate ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${rel}` : b.intervalLabel}
          {b.billType && <> · {b.billType}</>}
          {b.priceChanged && <span className="ml-1 text-amber-600 inline-flex items-center gap-0.5"><AlertTriangle size={9} /> price changed</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-black text-guac-700 tabular-nums text-sm">{money(b.amount)}</span>
        {b.manual && b.status !== 'paid' && <>
          <button onClick={() => onAction?.(b, 'paid')} className="min-h-11 rounded-md bg-violet-50 px-2 text-xs font-bold text-violet-700 hover:bg-violet-100">Paid</button>
          <button onClick={() => onAction?.(b, 'skip')} className="min-h-11 rounded-md bg-slate-50 px-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Skip</button>
        </>}
      </div>
    </div>
  )
}

