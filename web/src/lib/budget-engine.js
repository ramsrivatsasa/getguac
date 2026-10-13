import { isPaymentReceipt } from './payment-rows.js'

const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const round2 = (value) => Math.round((n(value) + Number.EPSILON) * 100) / 100

export function monthlyIncome(source) {
  if (!source?.is_active || !source?.is_confirmed) return 0
  const amount = Math.max(0, n(source.amount))
  switch (source.cadence) {
    case 'weekly': return round2(amount * 52 / 12)
    case 'biweekly': return round2(amount * 26 / 12)
    case 'semimonthly': return round2(amount * 2)
    case 'monthly': return round2(amount)
    case 'irregular': return round2(source.expected_monthly_amount)
    case 'one_time': return round2(source.expected_monthly_amount ?? amount)
    default: return 0
  }
}

// A bill and its payment are ONE obligation, not two expenses (spec §9). A cycle
// that was paid through a receipt is already counted in `receipts`; only the
// paid amount with no matched receipt is an expense of its own.
export function unmatchedPaidBillAmount(cycle, countedReceiptIds) {
  if (!['paid', 'partially_paid'].includes(cycle?.status)) return 0
  const links = Array.isArray(cycle.bill_payment_links) ? cycle.bill_payment_links : []
  const matched = links.reduce((sum, link) => (
    link?.receipt_id && countedReceiptIds.has(link.receipt_id) ? sum + n(link.amount) : sum
  ), 0)
  return Math.max(0, round2(n(cycle.paid_amount) - matched))
}

export function summarizeMoneyFlow({ incomeSources = [], receipts = [], billCycles = [], savings = [] } = {}) {
  const income = round2(incomeSources.reduce((sum, source) => sum + monthlyIncome(source), 0))
  const countedReceipts = receipts.filter(receipt => !isPaymentReceipt(receipt))
  const countedReceiptIds = new Set(countedReceipts.map(receipt => receipt.id).filter(Boolean))
  const receiptExpenses = round2(countedReceipts.reduce((sum, receipt) => sum + n(receipt.total_amount), 0))
  const paidBills = round2(billCycles.reduce((sum, cycle) => sum + unmatchedPaidBillAmount(cycle, countedReceiptIds), 0))
  const actualExpenses = round2(receiptExpenses + paidBills)
  const plannedSavings = round2(savings.filter(s => s.is_planned !== false).reduce((sum, s) => sum + n(s.amount), 0))
  const upcomingBills = round2(billCycles.reduce((sum, cycle) => {
    if (['paid', 'skipped', 'canceled'].includes(cycle.status)) return sum
    const obligation = cycle.statement_amount ?? cycle.expected_amount
    return sum + Math.max(0, n(obligation) - n(cycle.paid_amount))
  }, 0))
  return {
    income,
    receiptExpenses,
    paidBills,
    actualExpenses,
    plannedSavings,
    upcomingBills,
    availableNow: round2(income - actualExpenses - plannedSavings),
    projectedRemaining: round2(income - actualExpenses - plannedSavings - upcomingBills),
  }
}

export function summarizeCategoryBudget({ limit = 0, allocations = [] } = {}) {
  const spent = round2(allocations.filter(a => !a.needs_review).reduce((sum, a) => sum + n(a.amount), 0))
  const budget = round2(limit)
  return {
    budget,
    spent,
    remaining: round2(budget - spent),
    percentUsed: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0,
  }
}

export function reconcileReceiptAmounts(receipt = {}) {
  const known = ['subtotal', 'tax_paid', 'tip_amount', 'service_charge', 'other_fees', 'discount_amount']
    .some(key => receipt[key] !== null && receipt[key] !== undefined && receipt[key] !== '')
  if (!known) return { calculatedTotal: null, difference: null, reconciles: null }
  const calculatedTotal = round2(
    n(receipt.subtotal) + n(receipt.tax_paid) + n(receipt.tip_amount) +
    n(receipt.service_charge) + n(receipt.other_fees) - n(receipt.discount_amount)
  )
  const difference = round2(n(receipt.total_amount) - calculatedTotal)
  return { calculatedTotal, difference, reconciles: Math.abs(difference) <= 0.01 }
}
