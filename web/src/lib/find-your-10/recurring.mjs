// Analysis uses the application's existing records, never a second capture store.
import { goalPercentage } from './definition.mjs'
const cents = value => Math.round((Number(value) || 0) * 100)
const multipliers = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, irregular: 12 }
export const CAPTURE_STEPS = [
  { id: 'receipts', title: 'Receipts', href: '/receipts', detail: 'Scan, upload or enter your purchases using Receipts.' },
  { id: 'bills', title: 'Bills', href: '/bills', detail: 'Review recurring bills, amounts and due dates in Bills.' },
  { id: 'payments', title: 'Additional payments', href: '/receipts', detail: 'Enter other expenses in Receipts. Link bill payments in Bills to avoid counting them twice.' },
  { id: 'debt', title: 'Debt', href: '/wealth', detail: 'Add balances, interest rates and minimum payments in Wealth Path.' },
]
export function incomeReady(sources = []) {
  return sources.some(s => {
    const amount = s.cadence === 'irregular' ? s.expected_monthly_amount : s.amount
    return s.is_active && s.is_confirmed && amount != null && amount !== '' && Number.isFinite(Number(amount)) && Number(amount) >= 0
  })
}
export function recurringAnalysis(data = {}, date = new Date()) {
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const previousDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`
  const today = `${month}-${String(date.getDate()).padStart(2, '0')}`
  const unique = rows => [...new Map(rows.filter(r => r.id).map(r => [r.id, r])).values()]
  const receipts = unique(data.receipts || []).filter(r => r.status !== 'draft' && !r.needs_review && !r.is_payment && !/^\[card payment\]/i.test(r.store_name || '') && String(r.date || '') <= today)
  const current = receipts.filter(r => String(r.date).startsWith(month))
  const previous = receipts.filter(r => String(r.date).startsWith(previousMonth))
  const categories = new Map()
  for (const r of current) { const key = r.category || 'Uncategorized'; categories.set(key, (categories.get(key) || 0) + cents(r.total_amount)) }
  const bills = unique(data.billCycles || []).filter(b => !['needs_review', 'skipped', 'canceled'].includes(b.status))
  const currentBills = bills.filter(b => String(b.due_date).startsWith(month))
  const unmatchedPaid = (cycles, purchases) => {
    const ids = new Set(purchases.map(r => r.id))
    return cycles.filter(b => ['paid', 'partially_paid'].includes(b.status)).reduce((sum, b) => sum + Math.max(0, cents(b.paid_amount) - (b.bill_payment_links || []).reduce((n, l) => n + (ids.has(l.receipt_id) ? cents(l.amount) : 0), 0)), 0)
  }
  const monthPaidCents = current.reduce((n, r) => n + cents(r.total_amount), 0) + unmatchedPaid(currentBills, current)
  const previousPaidCents = previous.reduce((n, r) => n + cents(r.total_amount), 0) + unmatchedPaid(bills.filter(b => String(b.due_date).startsWith(previousMonth)), previous)
  const numerator = (data.incomeSources || []).filter(s => incomeReady([s])).reduce((sum, s) => sum + cents(s.cadence === 'irregular' ? s.expected_monthly_amount : s.amount) * (multipliers[s.cadence] || 0), 0)
  const incomeCents = Math.round(numerator / 12)
  const billReviews = currentBills.map(b => {
    const earlier = bills.filter(old => old.bill_series_id === b.bill_series_id && old.due_date < b.due_date && old.statement_amount != null).sort((a, z) => z.due_date.localeCompare(a.due_date))[0]
    const amountCents = cents(b.statement_amount ?? b.expected_amount)
    return { id: b.id, title: b.bill_series?.name || 'Bill', cadence: b.bill_series?.cadence, amountCents, increaseCents: earlier && b.statement_amount != null ? Math.max(0, amountCents - cents(earlier.statement_amount)) : null }
  }).sort((a, b) => (b.increaseCents || 0) - (a.increaseCents || 0))
  const stores = [...new Set(current.map(r => r.store_name).filter(Boolean))]
  return {
    month, previousMonth, goalPct: goalPercentage(data.goalPct), incomeCents,
    incomeTargetCents: Math.round(numerator * goalPercentage(data.goalPct) / 1200), monthPaidCents, previousPaidCents,
    // This is explicitly a scenario on captured prior-month expenses, not Found.
    spendingScenarioCents: Math.round(Math.max(0, previousPaidCents) / 10),
    categories: [...categories].map(([name, amountCents]) => ({ name, amountCents })).sort((a, b) => b.amountCents - a.amountCents),
    billReviews, stores, receiptsCount: current.length,
    cashCents: (data.wealthAccounts || []).filter(a => a.is_active !== false && ['checking', 'savings'].includes(a.account_type)).reduce((n, a) => n + cents(a.balance), 0),
    debtCents: (data.debtAccounts || []).filter(a => a.is_active !== false).reduce((n, a) => n + cents(a.balance), 0),
    captureComplete: Boolean(data.captureCompletedAt),
    ready: incomeReady(data.incomeSources),
  }
}
