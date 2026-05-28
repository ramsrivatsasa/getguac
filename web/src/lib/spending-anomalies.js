// Spending-anomaly detector.
//
// Looks at the user's receipts and flags rows that deviate from their
// own baseline — without being preachy. Three classes of anomaly:
//
//   1. merchant-spike  — current-period spend at a merchant is ≥
//                         SPIKE_THRESHOLD × the avg of the prior N
//                         periods at that same merchant. Floor of
//                         MIN_AMOUNT to avoid "$5 → $20 is 4× lol"
//                         noise.
//
//   2. category-spike  — same idea, but rolled up by category. Useful
//                         for "your Eats budget tripled this month"
//                         vs a per-merchant blip.
//
//   3. missing-recurring — a merchant the user historically pays on
//                         a monthly cadence has not charged in the
//                         current period. Most often this means a
//                         subscription was canceled (intentionally or
//                         not) OR the bank statement hasn't dropped
//                         yet. Surfacing it gives the user a chance
//                         to investigate.
//
// Pure function — no DB. Hand it receipts, get back anomalies. Sorted
// by severity (flag > watch) then by absolute dollar impact.
//
// Used by:
//   - /dashboard anomaly panel (build now)
//   - future GuacWizard insights
//   - future weekly digest email

import { storeGroupKey, canonicalStoreName } from './store-name-normalize'
import { isPaymentReceipt } from './payment-rows'

const MS_DAY = 86400000

// Tunables. Conservative defaults so the panel doesn't false-positive
// every grocery run.
const SPIKE_THRESHOLD     = 2.0     // current vs prior-avg multiplier
const MIN_AMOUNT          = 25      // dollars; below this, multipliers are noise
const PRIOR_WINDOWS       = 3       // how many prior periods to average
const MISSING_GAP_DAYS    = 40      // monthly-cadence → no charge in 40d
const MIN_MISSING_HISTORY = 3       // need at least 3 prior monthly charges
const SEVERITY_FLAG_MULT  = 3.0     // ≥ 3× lifts to "flag"; below = "watch"

/**
 * Build a YYYY-MM-DD string for a date offset.
 */
function dayString(d) {
  return d.toISOString().slice(0, 10)
}

/**
 * @param {Array<{
 *   store_name?: string, date?: string, total_amount?: number,
 *   category?: string, is_return?: boolean
 * }>} receipts
 * @param {object} [opts]
 * @param {number} [opts.windowDays=30]  Length of the "current" period in days.
 * @param {number} [opts.priorWindows=3] Prior periods to average against.
 * @returns {Array<{
 *   kind: 'merchant-spike'|'category-spike'|'missing-recurring',
 *   severity: 'watch'|'flag',
 *   title: string,
 *   body: string,
 *   amount: number,       // current-period dollar value
 *   priorAvg: number,
 *   multiple: number|null,
 *   storeKey?: string,
 *   merchant?: string,
 *   category?: string,
 *   actionUrl: string,
 * }>}
 */
export function detectAnomalies(receipts = [], opts = {}) {
  if (!Array.isArray(receipts) || receipts.length === 0) return []
  const windowDays = Math.max(1, Number(opts.windowDays ?? 30))
  const priorWindows = Math.max(1, Number(opts.priorWindows ?? PRIOR_WINDOWS))

  const now = new Date()
  const currentStart = dayString(new Date(now.getTime() - windowDays * MS_DAY))
  const priorStart   = dayString(new Date(now.getTime() - windowDays * (priorWindows + 1) * MS_DAY))

  // Aggregations:
  //   merchant: per storeKey → { name, category, current, prior }
  //   category: per category slug → { current, prior }
  //   merchantLastSeen: per storeKey → latest date string
  //   merchantHistory: per storeKey → array of {date, amount} for cadence check
  const merchant = new Map()
  const category = new Map()
  const merchantLastSeen = new Map()
  const merchantHistory = new Map()

  for (const r of receipts) {
    if (!r || r.is_return) continue
    if (isPaymentReceipt(r)) continue
    const amt = parseFloat(r.total_amount || 0)
    if (!Number.isFinite(amt) || amt <= 0) continue
    const d = String(r.date || '')
    if (d.length < 10) continue

    const skey = storeGroupKey(r.store_name)
    const cat  = r.category || 'misc'

    if (skey) {
      let me = merchant.get(skey)
      if (!me) {
        me = { key: skey, name: r.store_name, category: cat, current: 0, prior: 0 }
        merchant.set(skey, me)
      }
      const last = merchantLastSeen.get(skey)
      if (!last || d > last) {
        merchantLastSeen.set(skey, d)
        me.name = r.store_name  // keep most-recent raw name for display
      }
      if (!merchantHistory.has(skey)) merchantHistory.set(skey, [])
      merchantHistory.get(skey).push({ date: d, amount: amt })

      if (d >= currentStart) me.current += amt
      else if (d >= priorStart) me.prior += amt
    }

    let ce = category.get(cat)
    if (!ce) { ce = { slug: cat, current: 0, prior: 0 }; category.set(cat, ce) }
    if (d >= currentStart) ce.current += amt
    else if (d >= priorStart) ce.prior += amt
  }

  const out = []

  // 1. Merchant-spike anomalies.
  for (const me of merchant.values()) {
    if (me.current < MIN_AMOUNT) continue
    const priorAvg = me.prior / priorWindows
    if (priorAvg <= 0) continue
    const multiple = me.current / priorAvg
    if (multiple < SPIKE_THRESHOLD) continue
    const severity = multiple >= SEVERITY_FLAG_MULT ? 'flag' : 'watch'
    const niceName = canonicalStoreName(me.name).toUpperCase()
    out.push({
      kind: 'merchant-spike',
      severity,
      title: `${niceName} spend is ${multiple.toFixed(1)}× your usual`,
      body: `$${me.current.toFixed(2)} this period vs avg $${priorAvg.toFixed(2)} over the prior ${priorWindows} window${priorWindows === 1 ? '' : 's'}.`,
      amount: me.current,
      priorAvg,
      multiple,
      storeKey: me.key,
      merchant: niceName,
      category: me.category,
      actionUrl: `/receipts?store=${encodeURIComponent(canonicalStoreName(me.name))}&period=1M`,
    })
  }

  // 2. Category-spike anomalies. Skip 'misc' and 'bank-fees' (the former
  // is too vague to be actionable; the latter has its own surfacing on
  // /bank and /guacwizard).
  const NOISE_CATS = new Set(['misc', 'bank-fees'])
  for (const ce of category.values()) {
    if (NOISE_CATS.has(ce.slug)) continue
    if (ce.current < MIN_AMOUNT) continue
    const priorAvg = ce.prior / priorWindows
    if (priorAvg <= 0) continue
    const multiple = ce.current / priorAvg
    if (multiple < SPIKE_THRESHOLD) continue
    const severity = multiple >= SEVERITY_FLAG_MULT ? 'flag' : 'watch'
    out.push({
      kind: 'category-spike',
      severity,
      title: `${ce.slug.toUpperCase()} category is ${multiple.toFixed(1)}× your usual`,
      body: `$${ce.current.toFixed(2)} this period vs avg $${priorAvg.toFixed(2)} over the prior ${priorWindows} window${priorWindows === 1 ? '' : 's'}.`,
      amount: ce.current,
      priorAvg,
      multiple,
      category: ce.slug,
      actionUrl: `/receipts?period=1M`,
    })
  }

  // 3. Missing-recurring: merchants the user pays roughly monthly but
  // hasn't paid this period. Stronger signal than just "no charge" —
  // we want to catch silently-canceled subscriptions and forgotten
  // autopay failures.
  for (const [skey, rows] of merchantHistory) {
    if (rows.length < MIN_MISSING_HISTORY) continue
    rows.sort((a, b) => a.date.localeCompare(b.date))
    // Are at least half the consecutive intervals "monthly"-shaped?
    let monthlyHits = 0
    let totalIntervals = 0
    for (let i = 1; i < rows.length; i++) {
      const gap = Math.round((new Date(rows[i].date) - new Date(rows[i - 1].date)) / MS_DAY)
      if (gap <= 0) continue
      totalIntervals += 1
      if (gap >= 25 && gap <= 40) monthlyHits += 1
    }
    if (monthlyHits < Math.ceil(totalIntervals / 2)) continue

    // Has there been a charge in the current window?
    const last = rows[rows.length - 1]
    const daysSinceLast = Math.round((now - new Date(last.date)) / MS_DAY)
    if (daysSinceLast < MISSING_GAP_DAYS) continue

    const me = merchant.get(skey)
    const niceName = canonicalStoreName(me?.name || last.date).toUpperCase()
    const avgAmt = rows.reduce((s, r) => s + r.amount, 0) / rows.length
    out.push({
      kind: 'missing-recurring',
      severity: 'watch',  // not a flag — could be benign cancellation
      title: `No ${niceName} charge in ${daysSinceLast} days`,
      body: `Usually charged ~monthly (~$${avgAmt.toFixed(2)}). Either you canceled or autopay failed — worth a check.`,
      amount: 0,
      priorAvg: avgAmt,
      multiple: null,
      storeKey: skey,
      merchant: niceName,
      category: me?.category || null,
      actionUrl: `/receipts?store=${encodeURIComponent(canonicalStoreName(me?.name || ''))}&period=1Y`,
    })
  }

  // Sort: flag before watch; within each, biggest dollar impact first.
  out.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'flag' ? -1 : 1
    return (b.amount + (b.priorAvg || 0)) - (a.amount + (a.priorAvg || 0))
  })

  return out
}
