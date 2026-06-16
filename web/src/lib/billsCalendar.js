// Bills calendar — projects upcoming recurring charges (subscriptions) onto
// future due dates, PocketSmith-style. Built on detectSubscriptions(), which
// already infers each merchant's interval + last charge + amount; here we step
// forward from the last charge to lay out when the next ones land.

import { detectSubscriptions } from './subscription-tracker'

const INTERVAL_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }

function addMonths(d, n) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

export function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Returns projected bill occurrences from `from` through `monthsAhead` months
// ahead, sorted by date. Each: { dateIso, merchant, amount, interval,
// intervalLabel, category, priceChanged }.
export function projectBills(receipts, { from = new Date(), monthsAhead = 12 } = {}) {
  const subs = detectSubscriptions(receipts)
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = addMonths(start, monthsAhead)
  const out = []

  for (const s of subs) {
    if (!s.lastDate) continue
    const step = INTERVAL_MONTHS[s.interval] || 1
    let next = addMonths(new Date(`${s.lastDate}T00:00:00`), step)
    let guard = 0
    // Fast-forward to the first occurrence on/after `start`.
    while (next < start && guard++ < 480) next = addMonths(next, step)
    // Collect occurrences through `end`.
    while (next <= end && guard++ < 480) {
      out.push({
        dateIso: toIso(next),
        merchant: s.merchant,
        amount: s.lastAmount || s.avgAmount,
        interval: s.interval,
        intervalLabel: s.intervalLabel,
        category: s.category,
        priceChanged: s.priceChanged,
      })
      next = addMonths(next, step)
    }
  }

  return out.sort((a, b) => a.dateIso.localeCompare(b.dateIso))
}
