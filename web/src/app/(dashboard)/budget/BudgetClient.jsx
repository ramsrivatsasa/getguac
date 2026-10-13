'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { incomeReady } from '../../../lib/find-your-10/recurring.mjs'
import { AlertTriangle, ChevronDown, ChevronRight, CircleDollarSign, Pencil, Plus, Trash2 } from 'lucide-react'
import { summarizeMoneyFlow } from '../../../lib/budget-engine'
import { UNCATEGORIZED } from '../../../lib/allocate-expenses'
import { projectBills } from '../../../lib/billsCalendar'

const money = value => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0))

export default function BudgetClient({ userId, incomeOnly = false }) {
  const [data, setData] = useState({ incomeSources: [], receipts: [], historyReceipts: [], billCycles: [], savings: [], categories: [], allocations: [] })
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [incomeOpen, setIncomeOpen] = useState(incomeOnly)
  const [incomeSaving, setIncomeSaving] = useState(false)
  const [income, setIncome] = useState({ name: 'Paycheck', amount: '', cadence: 'monthly' })
  const [editingIncomeId, setEditingIncomeId] = useState(null)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [category, setCategory] = useState({ name: '', limit: '' })
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [openFlow, setOpenFlow] = useState('')
  const [reviewChoice, setReviewChoice] = useState({})
  const [savingOpen, setSavingOpen] = useState(false)
  const [savingPlan, setSavingPlan] = useState({ name: '', amount: '' })
  const [editingSavingsId, setEditingSavingsId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setNotice('')
    if (!userId) { setNotice('Your session expired. Sign in again to edit your budget.'); setLoading(false); return }
    try {
    const response = await fetch('/api/budget', { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setNotice(payload.error || 'Budget data could not be loaded.')
    else {
      setData(payload)
      // Say which part is stale rather than showing a confident zero (spec §13).
      if (payload.schemaMissing) setNotice('Budget tables are not set up on this database yet. Apply migration 084 to save income, budgets, and bills.')
      else if (payload.allocationSyncError) setNotice('Your receipts could not be matched to categories just now, so category spend may be behind.')
    }
    } catch { setNotice('Your income and budget could not be loaded. Check your connection and reload to retry.') }
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])
  const inferredBillCycles = useMemo(() => {
    if (!data.period?.from || !data.period?.to) return []
    const existing = new Set(data.billCycles.map(cycle => String(cycle.bill_series?.name || cycle.bill_series?.provider || '').trim().toLowerCase()))
    return projectBills(data.historyReceipts || [], { from: new Date(`${data.period.from}T00:00:00`), monthsAhead: 1 })
      .filter(bill => bill.dateIso >= data.period.from && bill.dateIso <= data.period.to)
      .filter(bill => !existing.has(String(bill.merchant || '').trim().toLowerCase()))
      .map(bill => ({
        id: `detected-${bill.merchant}-${bill.dateIso}`,
        due_date: bill.dateIso,
        expected_amount: bill.amount,
        statement_amount: null,
        paid_amount: 0,
        status: 'upcoming',
        inferred: true,
        bill_payment_links: [],
        bill_series: { name: bill.merchant, provider: bill.merchant, category: bill.category || 'bills', cadence: bill.interval, source: 'receipts' },
      }))
  }, [data.period, data.historyReceipts, data.billCycles])
  const effectiveData = useMemo(() => ({ ...data, billCycles: [...data.billCycles, ...inferredBillCycles] }), [data, inferredBillCycles])
  const flow = useMemo(() => summarizeMoneyFlow(effectiveData), [effectiveData])

  // Spec §13 — a remaining balance is only trustworthy once income is confirmed.
  const incomeConfirmed = flow.income > 0

  const dueSoonCutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 7); return isoDate(d) }, [])
  const todayIso = useMemo(() => isoDate(new Date()), [])

  // Spec §9.5 — a bill paid through a receipt is already in the receipt totals.
  // Only an unmatched payment is spending in its own right.
  const paidBills = useMemo(() => {
    const receiptIds = new Set(data.receipts.map(r => r.id))
    return effectiveData.billCycles
      .filter(cycle => ['paid', 'partially_paid'].includes(cycle.status))
      .map(cycle => {
        const matched = (cycle.bill_payment_links || []).reduce((sum, link) => (
          link.receipt_id && receiptIds.has(link.receipt_id) ? sum + Number(link.amount || 0) : sum
        ), 0)
        return { ...cycle, unmatched: Math.max(0, Number(cycle.paid_amount || 0) - matched) }
      })
  }, [data.receipts, effectiveData.billCycles])

  const billGroups = useMemo(() => {
    const open = effectiveData.billCycles.filter(c => !['paid', 'partially_paid', 'skipped', 'canceled'].includes(c.status))
    return {
      overdue: open.filter(c => c.due_date < todayIso),
      dueSoon: open.filter(c => c.due_date >= todayIso && c.due_date <= dueSoonCutoff),
      later: open.filter(c => c.due_date > dueSoonCutoff),
      paid: paidBills,
    }
  }, [effectiveData.billCycles, paidBills, todayIso, dueSoonCutoff])

  // Category spend combines allocated receipt money with bill payments that
  // have no receipt behind them, so each expense counts exactly once.
  const spendByCategory = useMemo(() => {
    const map = new Map()
    const add = (category, amount) => {
      const key = String(category || UNCATEGORIZED).toLowerCase()
      map.set(key, Number((map.get(key) || 0) + Number(amount || 0)))
    }
    for (const allocation of data.allocations) if (!allocation.needs_review) add(allocation.category, allocation.amount)
    for (const cycle of paidBills) if (cycle.unmatched > 0) add(cycle.bill_series?.category || 'bills', cycle.unmatched)
    return map
  }, [data, paidBills])
  const displayedCategories = useMemo(() => {
    const manualKeys = new Set(data.categories.map(category => String(category.category).toLowerCase()))
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const elapsedDays = Math.max(1, now.getDate())
    const automatic = [...spendByCategory.entries()]
      .filter(([name, spent]) => name !== UNCATEGORIZED && spent > 0 && !manualKeys.has(name))
      .map(([name, spent]) => ({
        id: `automatic-${name}`,
        category: name,
        limit_amount: Math.ceil(Math.max(spent, spent / elapsedDays * daysInMonth) / 10) * 10,
        automatic: true,
      }))
    return [...data.categories, ...automatic].sort((a, b) => String(a.category).localeCompare(String(b.category)))
  }, [data.categories, spendByCategory])

  const needsReview = useMemo(() => data.allocations.filter(a => a.needs_review), [data])
  const needsReviewTotal = useMemo(() => needsReview.reduce((sum, a) => sum + Number(a.amount || 0), 0), [needsReview])
  const categoryOptions = useMemo(() => {
    const names = new Set(displayedCategories.map(c => String(c.category).toLowerCase()))
    for (const key of spendByCategory.keys()) if (key !== UNCATEGORIZED) names.add(key)
    return [...names].sort()
  }, [displayedCategories, spendByCategory])

  async function resolveReview(allocation) {
    const category = reviewChoice[allocation.id]
    if (!category) return setNotice('Pick a category for this expense first.')
    setNotice('')
    const error = await save('resolve-review', { id: allocation.id, category })
    if (error) return setNotice(error)
    setReviewChoice(prev => { const next = { ...prev }; delete next[allocation.id]; return next })
    await load(); setNotice('Expense categorized.')
  }

  async function setBillStatus(cycle, status) {
    setNotice('')
    const error = await save('bill-status', { id: cycle.id, status })
    if (error) return setNotice(error)
    await load(); setNotice(status === 'paid' ? 'Bill marked paid.' : status === 'skipped' ? 'Bill cycle skipped.' : 'Bill moved back to upcoming.')
  }

  async function save(action, values) {
    try {
    const response = await fetch('/api/budget', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...values }) })
    const payload = await response.json().catch(() => ({}))
    return response.ok ? null : (payload.error || 'Could not save. Try again.')
    } catch { return 'Your change could not be saved. Check your connection and retry.' }
  }

  async function addIncome(e) {
    e.preventDefault(); setNotice('')
    if (incomeSaving) return
    const amount = Number(income.amount)
    if (!income.name.trim() || income.amount === '' || !Number.isFinite(amount) || amount < 0) return setNotice('Enter a valid income name and amount.')
    if (!userId) return setNotice('Your session expired. Sign in again to save income.')
    setIncomeSaving(true)
    const error = await save(editingIncomeId ? 'update-income' : 'income', editingIncomeId ? { id: editingIncomeId, ...income } : income)
    setIncomeSaving(false)
    if (error) return setNotice(error)
    setIncomeOpen(false); setEditingIncomeId(null); setIncome({ name: 'Paycheck', amount: '', cadence: 'monthly' }); await load(); setNotice(editingIncomeId ? 'Income updated.' : 'Income saved.')
  }

  function editIncome(source) {
    setEditingIncomeId(source.id)
    setIncome({ name: source.name || '', amount: String(source.amount ?? ''), cadence: source.cadence || 'monthly' })
    setIncomeOpen(true); setNotice('')
  }

  async function deleteIncome(source) {
    if (!window.confirm(`Remove ${source.name}?`)) return
    setNotice('')
    const error = await save('delete-income', { id: source.id })
    if (error) return setNotice(error)
    if (editingIncomeId === source.id) { setEditingIncomeId(null); setIncomeOpen(false); setIncome({ name: 'Paycheck', amount: '', cadence: 'monthly' }) }
    await load(); setNotice('Income source removed.')
  }

  async function addCategory(e) {
    e.preventDefault(); setNotice('')
    const limit = Number(category.limit)
    if (!category.name.trim() || !Number.isFinite(limit) || limit < 0) return setNotice('Enter a category name and valid monthly limit.')
    if (!userId) return setNotice('Your session expired. Sign in again to save a category.')
    const error = await save(editingCategoryId ? 'update-category' : 'category', { ...(editingCategoryId ? { id: editingCategoryId } : {}), name: category.name, limit })
    if (error) return setNotice(error)
    const updated = Boolean(editingCategoryId)
    setCategory({ name: '', limit: '' }); setCategoryOpen(false); setEditingCategoryId(null); await load(); setNotice(updated ? 'Category budget updated.' : 'Category budget saved.')
  }

  async function addSavings(e) {
    e.preventDefault(); setNotice('')
    const amount = Number(savingPlan.amount)
    if (!savingPlan.name.trim() || !Number.isFinite(amount) || amount < 0) return setNotice('Enter a savings goal and valid monthly amount.')
    if (!userId) return setNotice('Your session expired. Sign in again to save a goal.')
    const error = await save(editingSavingsId ? 'update-savings' : 'savings', editingSavingsId ? { id: editingSavingsId, ...savingPlan } : savingPlan)
    if (error) return setNotice(error)
    const updated = Boolean(editingSavingsId)
    setSavingPlan({ name: '', amount: '' }); setSavingOpen(false); setEditingSavingsId(null); await load(); setNotice(updated ? 'Savings goal updated.' : 'Savings goal saved.')
  }

  async function removeItem(action, id, label) {
    if (!window.confirm(`Remove ${label}?`)) return
    setNotice(''); const error = await save(action, { id })
    if (error) return setNotice(error)
    await load(); setNotice(`${label} removed.`)
  }

  const usedPct = flow.income > 0 ? Math.min(100, Math.max(0, flow.actualExpenses / flow.income * 100)) : 0
  return <div className="mx-auto max-w-6xl space-y-5 pb-10">
    {incomeOnly && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Registration · Income information</p><h1 className="mt-2 text-2xl font-black">Tell us what comes in.</h1><p className="mt-2 text-sm text-slate-600">Save your take-home income once. Update it in Budget only when it changes. Then your dashboard will guide you through capturing expenses.</p></section>}
    {!incomeOnly && <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Manual · private · no bank connection</p><h1 className="mt-1 text-2xl font-black text-slate-950">Budget & money flow</h1><p className="mt-1 text-sm text-slate-500">Tell GetGuac what comes in. Receipts and bills show where it goes.</p></div>
      <button onClick={() => { setEditingIncomeId(null); setIncome({ name: 'Paycheck', amount: '', cadence: 'monthly' }); setIncomeOpen(v => !v) }} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/> Add income</button>
    </header>}
    {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{notice}</div>}
    {incomeOpen && <form onSubmit={addIncome} className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-4">
      <input aria-label="Income name" className="input" value={income.name} onChange={e => setIncome(v => ({...v, name:e.target.value}))} placeholder="Income name"/>
      <input aria-label="Take-home amount" className="input" type="number" min="0" step="0.01" value={income.amount} onChange={e => setIncome(v => ({...v, amount:e.target.value}))} placeholder="Amount"/>
      <select aria-label="Income frequency" className="input" value={income.cadence} onChange={e => setIncome(v => ({...v, cadence:e.target.value}))}><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="semimonthly">Twice monthly</option><option value="monthly">Monthly</option><option value="irregular">Variable monthly</option><option value="one_time">One time</option></select>
      <button disabled={incomeSaving} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">{editingIncomeId ? 'Update income' : 'Save income'}</button>
    </form>}

    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">Income sources</h2><p className="text-xs text-slate-500">Review every amount included in your monthly total.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{money(flow.income)}/mo</span></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{data.incomeSources.length ? data.incomeSources.map(source => <div key={source.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{source.name}</p><p className="text-xs text-slate-500">{money(source.amount)} · {cadenceLabel(source.cadence)} · <strong>{money(monthlyContribution(source))}/mo</strong></p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => editIncome(source)} aria-label={`Edit ${source.name}`} title="Edit income" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-emerald-700"><Pencil size={16}/></button><button type="button" onClick={() => deleteIncome(source)} aria-label={`Delete ${source.name}`} title="Delete income" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"><Trash2 size={16}/></button></div></div>) : <p className="text-sm text-slate-500">No income sources yet.</p>}</div>
    </section>

    {incomeOnly && incomeReady(data.incomeSources) && <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full bg-emerald-800 px-5 py-3 font-bold text-white">Continue to my dashboard →</Link>}
    {!incomeOnly && <><div className="grid gap-4 md:grid-cols-2">
      <section className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-bold text-slate-600">Monthly expenses</p>
        <p className="mt-1 text-4xl font-black text-blue-800">{loading ? '—' : money(flow.actualExpenses)}</p>
        <p className="mt-1 text-xs text-slate-500">Calculated automatically from {data.receipts.length} scanned receipt{data.receipts.length === 1 ? '' : 's'}{flow.paidBills > 0 ? ' and unmatched bill payments' : ''} this month.</p>
      </section>
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-600">Remaining this month</p><p className={`mt-1 text-4xl font-black ${!incomeConfirmed ? 'text-slate-400' : flow.projectedRemaining < 0 ? 'text-red-600' : 'text-emerald-800'}`}>{loading ? '—' : incomeConfirmed ? money(flow.projectedRemaining) : 'Not yet'}</p><p className="mt-1 text-xs text-slate-500">{incomeConfirmed ? 'After spending, upcoming bills, and planned savings' : 'Confirm your income and GetGuac can show what is left.'}</p></div><CircleDollarSign className="text-emerald-700" size={34}/></div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${usedPct > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width:`${usedPct}%`}}/></div>
      </section>
    </div>

    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div><h2 className="font-black text-slate-900">Money flow</h2><p className="text-xs text-slate-500">How much came in, where it went, and what is left. Open any amount to see what it is made of.</p></div>
      <div className="mt-4 space-y-2">
        <FlowRow label="Income" amount={flow.income} tone="in" open={openFlow === 'income'} onToggle={() => setOpenFlow(v => v === 'income' ? '' : 'income')} count={data.incomeSources.length} money={money}
          rows={data.incomeSources.map(source => ({ key: source.id, title: source.name, meta: `${money(source.amount)} · ${cadenceLabel(source.cadence)}`, amount: monthlyContribution(source) }))}
          empty="No confirmed income yet. Add a source above."/>
        <FlowRow label="Purchases" amount={flow.receiptExpenses} tone="out" open={openFlow === 'receipts'} onToggle={() => setOpenFlow(v => v === 'receipts' ? '' : 'receipts')} count={data.receipts.length} money={money}
          rows={[...data.receipts].sort((a, b) => Math.abs(Number(b.total_amount || 0)) - Math.abs(Number(a.total_amount || 0))).slice(0, 12).map(receipt => ({ key: receipt.id, href: `/receipts/${receipt.id}`, title: receipt.store_name || 'Receipt', meta: `${receipt.date}${receipt.is_return ? ' · return' : ''}`, amount: Number(receipt.total_amount || 0) }))}
          empty="No receipts recorded in this period."/>
        <FlowRow label="Bills paid" amount={flow.paidBills} tone="out" open={openFlow === 'paid'} onToggle={() => setOpenFlow(v => v === 'paid' ? '' : 'paid')} count={billGroups.paid.length} money={money}
          rows={billGroups.paid.map(cycle => ({ key: cycle.id, title: cycle.bill_series?.name || 'Bill', meta: cycle.unmatched > 0 ? `Paid ${cycle.due_date}` : `Paid ${cycle.due_date} · already counted on a receipt`, amount: cycle.unmatched }))}
          empty="No bill payments recorded yet."/>
        <FlowRow label="Savings set aside" amount={flow.plannedSavings} tone="out" open={openFlow === 'savings'} onToggle={() => setOpenFlow(v => v === 'savings' ? '' : 'savings')} count={data.savings.length} money={money}
          rows={data.savings.map(goal => ({ key: goal.id, title: goal.name, meta: goal.is_planned ? 'Planned' : 'Transferred', amount: Number(goal.amount || 0) }))}
          empty="No savings planned this month."/>
        <FlowRow label="Bills still due" amount={flow.upcomingBills} tone="forecast" open={openFlow === 'due'} onToggle={() => setOpenFlow(v => v === 'due' ? '' : 'due')} count={billGroups.overdue.length + billGroups.dueSoon.length + billGroups.later.length} money={money}
          rows={[...billGroups.overdue, ...billGroups.dueSoon, ...billGroups.later].map(cycle => ({ key: cycle.id, title: cycle.bill_series?.name || 'Bill', meta: `Due ${cycle.due_date}${cycle.due_date < todayIso ? ' · overdue' : ''}`, amount: Math.max(0, Number(cycle.statement_amount ?? cycle.expected_amount ?? 0) - Number(cycle.paid_amount || 0)) }))}
          empty="Nothing else is due this month."/>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-bold text-slate-800">Available cash</span>
          <span className={`text-sm font-black ${!incomeConfirmed ? 'text-slate-400' : flow.projectedRemaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{incomeConfirmed ? money(flow.projectedRemaining) : 'Add income'}</span>
        </div>
      </div>
    </section>

    {needsReview.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><AlertTriangle size={18} className="text-amber-600"/><div><h2 className="font-black text-slate-900">Needs review</h2><p className="text-xs text-slate-600">These expenses are not in any category yet, so they are left out of your budgets.</p></div></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800">{money(needsReviewTotal)}</span></div>
      <div className="mt-4 space-y-2">{needsReview.slice(0, 15).map(allocation => <div key={allocation.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2.5">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{allocation.receipts?.store_name || 'Receipt'}</p><p className="text-xs text-slate-500">{allocation.receipts?.date} · {money(allocation.amount)}</p></div>
        <input list="budget-category-options" className="input h-9 w-full py-1 sm:w-44" placeholder="Category" value={reviewChoice[allocation.id] || ''} onChange={e => setReviewChoice(prev => ({ ...prev, [allocation.id]: e.target.value }))} aria-label={`Category for ${allocation.receipts?.store_name || 'receipt'}`}/>
        <button type="button" onClick={() => resolveReview(allocation)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Save</button>
      </div>)}</div>
      <datalist id="budget-category-options">{categoryOptions.map(name => <option key={name} value={name}/>)}</datalist>
      {needsReview.length > 15 && <p className="mt-3 text-xs font-semibold text-slate-600">Showing 15 of {needsReview.length}. Categorize these and the rest will appear.</p>}
    </section>}

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">Category budgets</h2><p className="text-xs text-slate-500">Automatically projected from this month’s scanned receipts. Add a limit to override any estimate.</p></div><button onClick={() => { setEditingCategoryId(null); setCategory({ name: '', limit: '' }); setCategoryOpen(v => !v) }} className="inline-flex shrink-0 items-center text-xs font-bold text-emerald-700"><Plus size={14}/> Add limit</button></div>
        {categoryOpen && <form onSubmit={addCategory} className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px_auto]"><input className="input" placeholder="e.g. Groceries" value={category.name} onChange={e => setCategory(v => ({...v,name:e.target.value}))}/><input className="input" type="number" min="0" step="0.01" placeholder="Monthly limit" value={category.limit} onChange={e => setCategory(v => ({...v,limit:e.target.value}))}/><button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">{editingCategoryId ? 'Update' : 'Save'}</button></form>}
        {displayedCategories.length === 0 ? <Empty text="Scan a receipt and GetGuac will build your category budgets automatically."/> : <div className="mt-4 space-y-4">{displayedCategories.map(c => {
          const spent = spendByCategory.get(String(c.category).toLowerCase()) || 0
          const pct = Number(c.limit_amount) > 0 ? Math.min(100, spent / Number(c.limit_amount) * 100) : 0
          const over = spent > Number(c.limit_amount)
          return <div key={c.id}><div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2 font-bold capitalize text-slate-800">{c.category}{c.automatic && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-700">Auto</span>}</span><div className="flex items-center gap-1"><span className={over ? 'font-bold text-red-600' : 'text-slate-500'}>{money(spent)} of {money(c.limit_amount)}</span>{c.automatic ? <button type="button" onClick={() => { setEditingCategoryId(null); setCategory({ name: c.category, limit: String(c.limit_amount) }); setCategoryOpen(true) }} className="rounded-md px-2 py-1 text-[10px] font-bold text-emerald-700">Set limit</button> : <><button type="button" aria-label={`Edit ${c.category} budget`} title="Edit budget" onClick={() => { setEditingCategoryId(c.id); setCategory({ name: c.category, limit: String(c.limit_amount) }); setCategoryOpen(true) }} className="rounded-md p-1 text-slate-400 hover:text-emerald-700"><Pencil size={14}/></button><button type="button" aria-label={`Delete ${c.category} budget`} title="Delete budget" onClick={() => removeItem('delete-category', c.id, `${c.category} budget`)} className="rounded-md p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button></>}</div></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${over ? 'bg-red-500' : c.automatic ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{width:`${pct}%`}}/></div></div>
        })}</div>}
      </section>
      <div className="space-y-5">
        <Panel title="Bills this month" action="Open bills" href="/bills">
          {effectiveData.billCycles.length === 0
            ? <Empty text="Scan recurring receipts and GetGuac will forecast bills automatically. You can still add a bill manually."/>
            : <div className="mt-4 space-y-4">
                <BillGroup title="Overdue" tone="overdue" cycles={billGroups.overdue} onStatus={setBillStatus} money={money}/>
                <BillGroup title="Due soon" tone="soon" cycles={billGroups.dueSoon} onStatus={setBillStatus} money={money}/>
                <BillGroup title="Later this month" tone="later" cycles={billGroups.later} onStatus={setBillStatus} money={money}/>
                <BillGroup title="Paid" tone="paid" cycles={billGroups.paid} onStatus={setBillStatus} money={money}/>
              </div>}
        </Panel>
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-black text-slate-900">Planned savings</h2><button onClick={() => { setEditingSavingsId(null); setSavingPlan({ name: '', amount: '' }); setSavingOpen(v => !v) }} className="inline-flex items-center text-xs font-bold text-emerald-700"><Plus size={14}/> Add goal</button></div>
          {savingOpen && <form onSubmit={addSavings} className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px_auto]"><input className="input" placeholder="Emergency fund" value={savingPlan.name} onChange={e => setSavingPlan(v => ({...v,name:e.target.value}))}/><input className="input" type="number" min="0" step="0.01" placeholder="Amount" value={savingPlan.amount} onChange={e => setSavingPlan(v => ({...v,amount:e.target.value}))}/><button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">{editingSavingsId ? 'Update' : 'Save'}</button></form>}
          <div className="mt-3 space-y-2">{data.savings.length ? data.savings.map(s => <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-700">{s.name}</span><div className="flex items-center gap-1"><span className="font-black text-emerald-700">{money(s.amount)}</span><button type="button" aria-label={`Edit ${s.name}`} title="Edit goal" onClick={() => { setEditingSavingsId(s.id); setSavingPlan({ name: s.name, amount: String(s.amount) }); setSavingOpen(true) }} className="rounded-md p-1 text-slate-400 hover:text-emerald-700"><Pencil size={14}/></button><button type="button" aria-label={`Delete ${s.name}`} title="Delete goal" onClick={() => removeItem('delete-savings', s.id, s.name)} className="rounded-md p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button></div></div>) : <p className="text-sm text-slate-500">Set aside money for goals without connecting an account.</p>}</div>
        </section>
      </div>
    </div>
    </>}
  </div>
}

const FLOW_TONE = {
  in: 'text-emerald-700',
  out: 'text-slate-900',
  forecast: 'text-violet-700',
}

// Every money-flow amount opens the records behind it (spec 11).
function FlowRow({ label, amount, tone, open, onToggle, rows = [], count, empty, money }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-100">
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-800">{open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}{label}{typeof count === 'number' && <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500">{count}</span>}</span>
      <span className={`text-sm font-black ${FLOW_TONE[tone] || 'text-slate-900'}`}>{money(amount)}</span>
    </button>
    {open && <div className="divide-y divide-slate-100 bg-white">
      {rows.length === 0
        ? <p className="px-4 py-3 text-xs text-slate-500">{empty}</p>
        : rows.map(row => <div key={row.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              {row.href
                ? <a href={row.href} className="truncate text-sm font-semibold text-slate-800 underline-offset-2 hover:underline">{row.title}</a>
                : <p className="truncate text-sm font-semibold text-slate-800">{row.title}</p>}
              <p className="text-xs text-slate-500">{row.meta}</p>
            </div>
            <span className={`shrink-0 text-sm font-bold ${Number(row.amount) < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{money(row.amount)}</span>
          </div>)}
    </div>}
  </div>
}

const BILL_TONE = {
  overdue: 'bg-red-50 text-red-700',
  soon: 'bg-amber-50 text-amber-800',
  later: 'bg-slate-50 text-slate-600',
  paid: 'bg-emerald-50 text-emerald-800',
}

function BillGroup({ title, tone, cycles = [], onStatus, money }) {
  if (!cycles.length) return null
  return <div>
    <p className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${BILL_TONE[tone]}`}>{title} · {cycles.length}</p>
    <div className="mt-2 space-y-2">{cycles.map(cycle => {
      const due = Math.max(0, Number(cycle.statement_amount ?? cycle.expected_amount ?? 0) - Number(cycle.paid_amount || 0))
      const paid = tone === 'paid'
      return <div key={cycle.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{cycle.bill_series?.name || 'Bill'}{cycle.inferred && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-700">From receipts</span>}</p><p className="text-xs text-slate-500">{paid ? 'Paid' : 'Due'} {cycle.due_date}{cycle.bill_series?.autopay ? ' · autopay' : ''}</p></div>
        <span className="text-sm font-black text-slate-900">{money(paid ? cycle.paid_amount : due)}</span>
        {cycle.inferred ? <span className="text-[10px] font-bold text-slate-400">Automatically forecast</span> : paid
          ? <button type="button" onClick={() => onStatus(cycle, 'upcoming')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600">Undo</button>
          : <><button type="button" onClick={() => onStatus(cycle, 'paid')} className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white">Mark paid</button>
             <button type="button" onClick={() => onStatus(cycle, 'skipped')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600">Skip</button></>}
      </div>
    })}</div>
  </div>
}

function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

function Panel({ title, action, href, children }) { return <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black text-slate-900">{title}</h2><a href={href} className="inline-flex items-center text-xs font-bold text-emerald-700">{action}<ChevronRight size={15}/></a></div>{children}</section> }
function Empty({ text }) { return <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">{text}</p> }
function cadenceLabel(cadence) { return ({ weekly: 'weekly', biweekly: 'every 2 weeks', semimonthly: 'twice monthly', monthly: 'monthly', irregular: 'variable monthly', one_time: 'one time' })[cadence] || cadence }
function monthlyContribution(source) { const amount = Number(source.amount || 0); return ({ weekly: amount * 52 / 12, biweekly: amount * 26 / 12, semimonthly: amount * 2, monthly: amount, irregular: Number(source.expected_monthly_amount || 0), one_time: Number(source.expected_monthly_amount ?? amount) })[source.cadence] || 0 }
