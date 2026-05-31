// Centralized financial analysis engine. Single source of truth for
// the dashboard's eight summary metrics — current values, prior-
// window values, and percent deltas — so the same numbers can be
// rendered by web's DashboardClient and the mobile app (via the
// /api/analysis HTTP endpoint).
//
// Inputs:
//   receipts      — public.receipts rows
//   statements    — public.bank_statements rows (or [])
//   fees          — public.bank_fees rows (or [])
//   transactions  — public.bank_transactions rows (or [])
//   period        — 'daily' | 'weekly' | 'monthly' | 'yearly'
//   periodCount   — number of period units (e.g. 3 = "last 3 months")
//
// Output:
//   {
//     period, periodCount,
//     rangeStart, rangeEnd,                  (YYYY-MM-DD strings)
//     metrics: {
//       transactions, totalSpent, taxPaid, bankFees,    (receipt-side)
//       purchases, payments, interestPaid, feesPaid,    (bank-side)
//     }
//   }
// Each metric: { current, prior, deltaPct, deltaArrow, deltaLabel }
//   deltaPct    — number | null (null when prior is 0, can't divide)
//   deltaArrow  — '↑' | '↓' | '→' | null
//   deltaLabel  — short human badge like '↑ 12%' or '—' for zero prior

import { subDays, subWeeks, subMonths, subYears } from 'date-fns'
import { isPaymentReceipt } from './payment-rows'

// ── Period helpers ──────────────────────────────────────────────────
function periodStart(period, count) {
  const now = new Date()
  if (period === 'daily')   return subDays(now,  count)
  if (period === 'weekly')  return subWeeks(now, count)
  if (period === 'monthly') return subMonths(now, count)
  if (period === 'yearly')  return subYears(now, count)
  return now
}

function toIsoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Delta calculation ───────────────────────────────────────────────
function buildDelta(current, prior) {
  if (!prior) {
    return { deltaPct: null, deltaArrow: null, deltaLabel: '—' }
  }
  const pct = ((current - prior) / prior) * 100
  const arrow = pct > 1 ? '↑' : pct < -1 ? '↓' : '→'
  const label = arrow === '→' ? '—' : `${arrow} ${Math.abs(pct).toFixed(0)}%`
  return { deltaPct: pct, deltaArrow: arrow, deltaLabel: label }
}

function metric(current, prior) {
  return { current, prior, ...buildDelta(current, prior) }
}

// ── Range filters ───────────────────────────────────────────────────
function filterByDateStr(rows, dateField, startStr, endStr) {
  return rows.filter(r => {
    const d = String(r[dateField] || '')
    if (d.length < 10) return false
    if (startStr && d < startStr) return false
    if (endStr   && d >= endStr)  return false
    return true
  })
}

// ── Bank-side aggregation for a single window ────────────────────────
// Mirrors the categorisation logic in financeInsights.bankAccountTotals
// but works on a date-string range so we can compute current and prior
// windows in one place without touching that function's period-key API.
function bankWindowTotals({ fees, transactions }, startStr, endStr) {
  const feeRows = filterByDateStr(fees, 'date', startStr, endStr)
  const txnRows = filterByDateStr(transactions, 'date', startStr, endStr)

  const sumAbs = (rows) => rows.reduce((n, x) => n + Math.abs(Number(x.amount || 0)), 0)
  const sumPos = (rows) => rows.reduce((n, x) => n + Number(x.amount || 0), 0)

  const paymentRows = txnRows.filter(t => t.is_payment)

  return {
    interest: sumAbs(feeRows.filter(f => f.kind === 'interest')) + sumAbs(txnRows.filter(t => t.is_interest)),
    fees:     sumAbs(feeRows.filter(f => f.kind === 'fee' || f.kind === 'penalty')) + sumAbs(txnRows.filter(t => t.is_fee)),
    payments: sumAbs(paymentRows),
    purchases: sumPos(txnRows.filter(t => !t.is_payment && !t.is_fee && !t.is_interest && !t.is_refund && t.amount > 0)),
  }
}

// ── Receipt-side window totals ──────────────────────────────────────
function receiptWindowTotals(receipts, startStr, endStr) {
  const rows = filterByDateStr(receipts, 'date', startStr, endStr)
  return {
    transactions: rows.length,
    totalSpent:   rows.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0),
    taxPaid:      rows.reduce((s, r) => s + parseFloat(r.tax_paid || 0),     0),
    bankFees:     rows
                    .filter(r => r.category === 'bank-fees')
                    .reduce((s, r) => s + parseFloat(r.total_amount || 0), 0),
  }
}

// ── Public API ──────────────────────────────────────────────────────
export function computeDashboardAnalysis({
  receipts = [],
  statements = [],
  fees = [],
  transactions = [],
  period = 'monthly',
  periodCount = 3,
} = {}) {
  // Drop card-payment + transfer receipts before any spending math —
  // same filter the dashboard already applies. Mirroring it here means
  // mobile gets the same numbers without re-implementing the rule.
  const spendingReceipts = receipts.filter(r => !isPaymentReceipt(r))

  const currentStart = toIsoDate(periodStart(period, periodCount))
  const priorStart   = toIsoDate(periodStart(period, periodCount * 2))
  // No upper bound for the current window — anything from currentStart
  // forward (including today) counts. The prior window ends where the
  // current one starts.

  const curr = receiptWindowTotals(spendingReceipts, currentStart, null)
  const prev = receiptWindowTotals(spendingReceipts, priorStart, currentStart)

  const currBank = bankWindowTotals({ fees, transactions }, currentStart, null)
  const prevBank = bankWindowTotals({ fees, transactions }, priorStart, currentStart)

  return {
    period,
    periodCount,
    rangeStart: currentStart,
    rangeEnd:   null,
    priorRangeStart: priorStart,
    priorRangeEnd:   currentStart,
    metrics: {
      transactions: metric(curr.transactions, prev.transactions),
      totalSpent:   metric(curr.totalSpent,   prev.totalSpent),
      taxPaid:      metric(curr.taxPaid,      prev.taxPaid),
      bankFees:     metric(curr.bankFees,     prev.bankFees),
      purchases:    metric(currBank.purchases, prevBank.purchases),
      payments:     metric(currBank.payments,  prevBank.payments),
      interestPaid: metric(currBank.interest,  prevBank.interest),
      feesPaid:     metric(currBank.fees,      prevBank.fees),
    },
  }
}
