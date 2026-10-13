import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { isMissingBudgetSchema, syncAllocationsForPeriod } from '../../../lib/sync-allocations'
import { visibleReceipt } from '../../../lib/receipt-visibility.mjs'

const startOfMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const endOfMonth = () => { const n = new Date(); const d = new Date(n.getFullYear(), n.getMonth() + 1, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

async function context() {
  const sb = createClient()
  const { data: { user }, error } = await sb.auth.getUser()
  return { sb, user, error }
}

export async function GET() {
  const { sb, user } = await context()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const from = startOfMonth(); const to = endOfMonth()
  const historyStart = new Date(`${from}T00:00:00`)
  historyStart.setMonth(historyStart.getMonth() - 13)
  const historyFrom = `${historyStart.getFullYear()}-${String(historyStart.getMonth() + 1).padStart(2, '0')}-${String(historyStart.getDate()).padStart(2, '0')}`
  // Category budgets are only meaningful once the period's receipts have been
  // split into allocations (spec §6). Reconcile first, then read.
  const allocationSync = await syncAllocationsForPeriod(sb, user.id, from, to)
  const results = await Promise.all([
    sb.from('income_sources').select('*').eq('is_active', true),
    sb.from('receipts').select('id,total_amount,date,category,store_name,is_return,source,receipt_items(id),email_messages(email_classification)').gte('date', from).lte('date', to),
    sb.from('bill_cycles').select('*,bill_series(name,category,provider,autopay,cadence),bill_payment_links(receipt_id,amount)').gte('due_date', from).lte('due_date', to),
    sb.from('savings_allocations').select('*').lte('period_start', to).gte('period_end', from),
    sb.from('budget_categories').select('*,budgets!inner(period_start,period_end,is_active)').eq('budgets.is_active', true).lte('budgets.period_start', to).gte('budgets.period_end', from),
    sb.from('expense_allocations').select('id,receipt_id,category,amount,needs_review,allocation_mode,receipts!inner(date,store_name,total_amount)').gte('receipts.date', from).lte('receipts.date', to),
    sb.from('receipts').select('id,total_amount,date,category,store_name,is_return,source,receipt_items(id),email_messages(email_classification)').gte('date', historyFrom).lte('date', to),
  ])
  // Before migration 084 is applied these tables are absent. The budget page
  // should render empty and say so, not fail the whole request.
  const error = results.find(result => result.error && !isMissingBudgetSchema(result.error))?.error
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const schemaMissing = results.some(result => isMissingBudgetSchema(result.error))
  const receipts = (results[1].data || []).filter(visibleReceipt)
  const visibleIds = new Set(receipts.map(receipt => receipt.id))
  return NextResponse.json({
    period: { from, to },
    incomeSources: results[0].data || [],
    receipts,
    billCycles: results[2].data || [],
    savings: results[3].data || [],
    categories: results[4].data || [],
    allocations: (results[5].data || []).filter(allocation => visibleIds.has(allocation.receipt_id)),
    historyReceipts: (results[6].data || []).filter(visibleReceipt),
    allocationSyncError: allocationSync.error,
    schemaMissing,
  })
}

export async function POST(request) {
  const { sb, user } = await context()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  let error
  if (body.action === 'bill-statement') {
    const amount = Number(body.amount), date = String(body.date || ''), seriesId = String(body.seriesId || '')
    if (body.amount === '' || !Number.isFinite(amount) || amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Enter a statement amount and due date.' }, { status: 400 })
    const series = await sb.from('bill_series').select('id').eq('id', seriesId).eq('user_id', user.id).single()
    if (series.error) return NextResponse.json({ error: 'Choose one of your saved bills.' }, { status: 400 })
    const existing = await sb.from('bill_cycles').select('id').eq('bill_series_id', seriesId).eq('due_date', date).eq('user_id', user.id).maybeSingle()
    if (existing.error) return NextResponse.json({ error: 'The saved bill could not be read.' }, { status: 400 })
    const values = { statement_amount: amount, updated_at: new Date().toISOString() }
    ;({ error } = existing.data ? await sb.from('bill_cycles').update(values).eq('id', existing.data.id).eq('user_id', user.id) : await sb.from('bill_cycles').insert({ ...values, user_id: user.id, bill_series_id: seriesId, due_date: date, status: 'upcoming' }))
  } else if (body.action === 'income') {
    const amount = Number(body.amount)
    const cadence = body.cadence
    const multipliers = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1, irregular: 1, one_time: 1 }
    if (!String(body.name || '').trim() || !Number.isFinite(amount) || amount < 0 || !multipliers[cadence]) return NextResponse.json({ error: 'Invalid income.' }, { status: 400 })
    ;({ error } = await sb.from('income_sources').insert({ user_id: user.id, name: body.name.trim(), amount, cadence, expected_monthly_amount: amount * multipliers[cadence], income_type: cadence === 'irregular' ? 'variable' : cadence === 'one_time' ? 'one_time' : 'fixed' }))
  } else if (body.action === 'update-income') {
    const amount = Number(body.amount); const cadence = body.cadence; const id = String(body.id || '')
    const multipliers = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1, irregular: 1, one_time: 1 }
    if (!id || !String(body.name || '').trim() || !Number.isFinite(amount) || amount < 0 || !multipliers[cadence]) return NextResponse.json({ error: 'Invalid income.' }, { status: 400 })
    ;({ error } = await sb.from('income_sources').update({ name: body.name.trim(), amount, cadence, expected_monthly_amount: amount * multipliers[cadence], income_type: cadence === 'irregular' ? 'variable' : cadence === 'one_time' ? 'one_time' : 'fixed' }).eq('id', id).eq('user_id', user.id))
  } else if (body.action === 'delete-income') {
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'Invalid income.' }, { status: 400 })
    ;({ error } = await sb.from('income_sources').delete().eq('id', id).eq('user_id', user.id))
  } else if (body.action === 'category') {
    const limit = Number(body.limit); const name = String(body.name || '').trim(); const from = startOfMonth(); const to = endOfMonth()
    if (!name || !Number.isFinite(limit) || limit < 0) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    let { data: budget, error: budgetError } = await sb.from('budgets').select('id').eq('is_active', true).lte('period_start', to).gte('period_end', from).maybeSingle()
    if (!budget && !budgetError) { const created = await sb.from('budgets').insert({ user_id: user.id, name: 'Monthly budget', period_start: from, period_end: to }).select('id').single(); budget = created.data; budgetError = created.error }
    error = budgetError
    if (!error) ({ error } = await sb.from('budget_categories').insert({ user_id: user.id, budget_id: budget.id, category: name, limit_amount: limit }))
  } else if (body.action === 'update-category') {
    const limit = Number(body.limit); const name = String(body.name || '').trim(); const id = String(body.id || '')
    if (!id || !name || !Number.isFinite(limit) || limit < 0) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    ;({ error } = await sb.from('budget_categories').update({ category: name, limit_amount: limit }).eq('id', id).eq('user_id', user.id))
  } else if (body.action === 'delete-category') {
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    ;({ error } = await sb.from('budget_categories').delete().eq('id', id).eq('user_id', user.id))
  } else if (body.action === 'savings') {
    const amount = Number(body.amount); const name = String(body.name || '').trim()
    if (!name || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Invalid savings goal.' }, { status: 400 })
    ;({ error } = await sb.from('savings_allocations').insert({ user_id: user.id, name, amount, period_start: startOfMonth(), period_end: endOfMonth(), is_planned: true }))
  } else if (body.action === 'update-savings') {
    const amount = Number(body.amount); const name = String(body.name || '').trim(); const id = String(body.id || '')
    if (!id || !name || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'Invalid savings goal.' }, { status: 400 })
    ;({ error } = await sb.from('savings_allocations').update({ name, amount }).eq('id', id).eq('user_id', user.id))
  } else if (body.action === 'delete-savings') {
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'Invalid savings goal.' }, { status: 400 })
    ;({ error } = await sb.from('savings_allocations').delete().eq('id', id).eq('user_id', user.id))
  } else if (body.action === 'resolve-review') {
    // A user-assigned category is authoritative: it becomes a manual allocation
    // so the derived sync (spec §6) never overwrites the correction.
    const id = String(body.id || ''); const category = String(body.category || '').trim().toLowerCase()
    if (!id || !category) return NextResponse.json({ error: 'Pick a category for this expense.' }, { status: 400 })
    ;({ error } = await sb.from('expense_allocations').update({ category, allocation_mode: 'manual', needs_review: false, confidence: 1 }).eq('id', id).eq('user_id', user.id))
  } else if (body.action === 'bill-status') {
    // Only a matched payment moves a bill from forecast to actual (spec §9.3).
    const id = String(body.id || ''); const status = String(body.status || '')
    if (!id || !['paid', 'upcoming', 'skipped'].includes(status)) return NextResponse.json({ error: 'Invalid bill update.' }, { status: 400 })
    const { data: cycle, error: readError } = await sb.from('bill_cycles').select('id,expected_amount,statement_amount').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (readError || !cycle) return NextResponse.json({ error: readError?.message || 'Bill not found.' }, { status: 400 })
    const due = Math.max(0, Number(cycle.statement_amount ?? cycle.expected_amount ?? 0))
    const patch = status === 'paid'
      ? { status: 'paid', paid_amount: due, paid_at: new Date().toISOString() }
      : { status, paid_amount: 0, paid_at: null }
    ;({ error } = await sb.from('bill_cycles').update(patch).eq('id', id).eq('user_id', user.id))
  } else return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
