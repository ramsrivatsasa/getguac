// Subscription detector.
//
// Looks at the user's receipts and identifies merchants with a
// recurring charge pattern — monthly, quarterly, semi-annual, or
// annual. Surfaces each as a subscription with its average amount,
// estimated monthly-equivalent cost, last charge date, and a price-
// change flag.
//
// Used by:
//   - /reports page → Subscriptions panel
//   - future GuacWizard insight ("$X/mo of subscriptions, sorted")
//   - future cancellation reminders ("Netflix renews in 4 days")
//
// Pure function — no DB. Caller pulls receipts and hands them in.

import { storeGroupKey, canonicalStoreName } from './store-name-normalize'
import { isPaymentReceipt } from './payment-rows'

const MS_DAY = 86400000

// Interval shapes we recognize. Each has a tolerant range so a charge
// 3 days late still counts. Monthly is the most common.
const INTERVAL_KINDS = [
  { name: 'monthly',     daysMin: 25,  daysMax: 40,  perYear: 12,  label: 'monthly' },
  { name: 'quarterly',   daysMin: 80,  daysMax: 105, perYear: 4,   label: 'quarterly' },
  { name: 'semiannual',  daysMin: 170, daysMax: 200, perYear: 2,   label: 'every 6 months' },
  { name: 'annual',      daysMin: 340, daysMax: 395, perYear: 1,   label: 'annual' },
]

// Minimum receipts at a merchant before we consider it recurring.
// 3 is enough to spot a pattern; 2 is too noisy (could be two
// unrelated one-offs).
const MIN_OCCURRENCES = 3

// Allow this much amount variance across the recurring charges.
// Subscriptions often jump $1-$2 for tax or a 10% price hike.
// Anything wilder than 25% suggests these aren't actually the same
// charge.
const MAX_AMOUNT_VARIANCE = 0.25

/**
 * @param {Array<{
 *   id?: string, store_name?: string, date?: string, total_amount?: number,
 *   category?: string, is_return?: boolean
 * }>} receipts
 * @returns {Array<{
 *   merchant: string,
 *   storeKey: string,
 *   category: string | null,
 *   interval: 'monthly'|'quarterly'|'semiannual'|'annual',
 *   intervalLabel: string,
 *   occurrences: number,
 *   avgAmount: number,
 *   lastAmount: number,
 *   lastDate: string,
 *   monthlyCost: number,         // estimated monthly equivalent
 *   priceChanged: boolean,       // last charge differs from prior avg by >5%
 *   priceChangePct: number|null, // signed % change of last charge vs prior avg
 * }>}
 */
export function detectSubscriptions(receipts = []) {
  if (!Array.isArray(receipts) || receipts.length === 0) return []

  // Group by canonical merchant key.
  const byMerchant = new Map()
  for (const r of receipts) {
    if (!r || r.is_return) continue
    if (isPaymentReceipt(r)) continue
    const amt = parseFloat(r.total_amount || 0)
    if (!Number.isFinite(amt) || amt <= 0) continue
    const d = String(r.date || '')
    if (d.length < 10) continue
    const key = storeGroupKey(r.store_name)
    if (!key) continue
    let entry = byMerchant.get(key)
    if (!entry) {
      entry = { key, rawName: r.store_name, category: r.category || null, rows: [] }
      byMerchant.set(key, entry)
    }
    entry.rows.push({ date: d, amount: amt, category: r.category })
  }

  const out = []
  for (const e of byMerchant.values()) {
    if (e.rows.length < MIN_OCCURRENCES) continue
    e.rows.sort((a, b) => a.date.localeCompare(b.date))

    // Compute intervals (days) between consecutive receipts.
    const intervals = []
    for (let i = 1; i < e.rows.length; i++) {
      const t0 = new Date(e.rows[i - 1].date).getTime()
      const t1 = new Date(e.rows[i].date).getTime()
      const d = Math.round((t1 - t0) / MS_DAY)
      if (d > 0) intervals.push(d)
    }
    if (intervals.length < MIN_OCCURRENCES - 1) continue

    // Pick the kind that best fits the majority of intervals.
    let bestKind = null
    let bestFit = 0
    for (const kind of INTERVAL_KINDS) {
      const fit = intervals.filter(d => d >= kind.daysMin && d <= kind.daysMax).length
      if (fit > bestFit) { bestFit = fit; bestKind = kind }
    }
    // Need at least half the intervals to fit the same kind.
    if (!bestKind || bestFit < Math.ceil(intervals.length / 2)) continue

    // Amount-variance gate. Drop merchants where prices wander too
    // much to plausibly be the same subscription.
    const amounts = e.rows.map(r => r.amount)
    const avg = amounts.reduce((s, x) => s + x, 0) / amounts.length
    const variance = amounts.reduce((s, x) => s + Math.abs(x - avg) / avg, 0) / amounts.length
    if (variance > MAX_AMOUNT_VARIANCE) continue

    const last = e.rows[e.rows.length - 1]
    const priorRows = e.rows.slice(0, -1)
    const priorAvg = priorRows.reduce((s, r) => s + r.amount, 0) / priorRows.length
    const priceChangePct = priorAvg > 0 ? ((last.amount - priorAvg) / priorAvg) * 100 : null
    const priceChanged = priceChangePct != null && Math.abs(priceChangePct) >= 5

    out.push({
      merchant: canonicalStoreName(e.rawName),
      storeKey: e.key,
      category: e.category,
      interval: bestKind.name,
      intervalLabel: bestKind.label,
      occurrences: e.rows.length,
      avgAmount: avg,
      lastAmount: last.amount,
      lastDate: last.date,
      monthlyCost: avg * (bestKind.perYear / 12),
      priceChanged,
      priceChangePct,
    })
  }

  // Highest monthly-equivalent cost first — that's the lever the user
  // most likely wants to pull.
  return out.sort((a, b) => b.monthlyCost - a.monthlyCost)
}

/**
 * Totals across a detected-subscription list. Cheap roll-up the panel
 * + future digest emails share.
 */
export function summarizeSubscriptions(subs = []) {
  let monthlyTotal = 0
  let annualTotal = 0
  let priceIncreaseCount = 0
  for (const s of subs) {
    monthlyTotal += s.monthlyCost
    annualTotal  += s.monthlyCost * 12
    if (s.priceChanged && (s.priceChangePct ?? 0) > 0) priceIncreaseCount += 1
  }
  return {
    count: subs.length,
    monthlyTotal,
    annualTotal,
    priceIncreaseCount,
  }
}
