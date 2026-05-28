// Period-over-period trend math.
//
// One function: given a list of receipts and the current window
// (period + count), compute how the current spend compares to the
// average of the PREVIOUS N windows of the same shape. Returns
// the absolute delta and the percentage change.
//
// Used by:
//   - /dashboard header (total spend +/-X% vs prior 3M avg)
//   - /dashboard donut category labels (per-category trend)
//   - future weekly digest email
//
// Pure function — no DB, no auth. Caller pulls receipts and hands them
// in. Mirrors the exclusion rules used everywhere else (payments out,
// returns out, $0 rows out).

import { isPaymentReceipt } from './payment-rows'

const MS_DAY = 86400000

/**
 * Window length in days for a (period, count) selection. Mirrors the
 * dashboard's periodStart()-via-date-fns but stays vanilla so this lib
 * has zero deps beyond payment-rows.
 */
function windowDays(period, count) {
  const n = Math.max(1, Number(count) || 1)
  switch (period) {
    case 'daily':   return n
    case 'weekly':  return n * 7
    case 'monthly': return n * 30
    case 'yearly':  return n * 365
    default:        return 30
  }
}

/**
 * Build a YYYY-MM-DD date cutoff `days` ago from `from` (defaults to
 * today). String-based so timezone never shifts the boundary.
 */
function cutoffDateStr(days, from = new Date()) {
  const d = new Date(from.getTime() - days * MS_DAY)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {Array<{date?: string, total_amount?: number, category?: string, is_return?: boolean}>} receipts
 * @param {'daily'|'weekly'|'monthly'|'yearly'} period
 * @param {number} count
 * @param {object} [opts]
 * @param {number} [opts.lookbackMultiplier=3]  How many prior windows to average over.
 *                                               3 = compare current to the avg of the
 *                                               last 3 same-length windows.
 * @returns {{
 *   current: number,           // total spend in the current window
 *   priorAvg: number,          // average per-window across the prior N windows
 *   deltaAbs: number,          // current - priorAvg (signed)
 *   deltaPct: number|null,     // (current - priorAvg) / priorAvg * 100, null if priorAvg = 0
 *   byCategory: Record<string, { current: number, priorAvg: number, deltaPct: number|null }>
 * }}
 */
export function computeSpendingTrend(receipts = [], period = 'monthly', count = 1, opts = {}) {
  const lookbackMultiplier = Math.max(1, Number(opts.lookbackMultiplier ?? 3))
  const winDays = windowDays(period, count)
  const now = new Date()

  // Current window: today - winDays..today
  const currentStart = cutoffDateStr(winDays, now)
  // Prior block: today - (winDays * (lookbackMultiplier + 1)) .. today - winDays
  const priorStart = cutoffDateStr(winDays * (lookbackMultiplier + 1), now)

  let current = 0
  let priorTotal = 0
  const curCat = new Map()
  const priorCat = new Map()

  for (const r of receipts) {
    if (!r || r.is_return) continue
    if (isPaymentReceipt(r)) continue
    const amt = parseFloat(r.total_amount || 0)
    if (!Number.isFinite(amt) || amt <= 0) continue
    const d = String(r.date || '')
    if (d.length < 10) continue
    const cat = r.category || 'misc'
    if (d >= currentStart) {
      current += amt
      curCat.set(cat, (curCat.get(cat) || 0) + amt)
    } else if (d >= priorStart) {
      priorTotal += amt
      priorCat.set(cat, (priorCat.get(cat) || 0) + amt)
    }
  }

  const priorAvg = priorTotal / lookbackMultiplier
  const deltaAbs = current - priorAvg
  const deltaPct = priorAvg > 0 ? (deltaAbs / priorAvg) * 100 : (current > 0 ? null : 0)

  const byCategory = {}
  const allCats = new Set([...curCat.keys(), ...priorCat.keys()])
  for (const slug of allCats) {
    const cur = curCat.get(slug) || 0
    const prAvg = (priorCat.get(slug) || 0) / lookbackMultiplier
    const d = cur - prAvg
    byCategory[slug] = {
      current: cur,
      priorAvg: prAvg,
      deltaPct: prAvg > 0 ? (d / prAvg) * 100 : (cur > 0 ? null : 0),
    }
  }

  return { current, priorAvg, deltaAbs, deltaPct, byCategory }
}

/**
 * Format a trend percentage for display. Returns a small object with
 * the styled text + tone so the caller doesn't reinvent the wheel per
 * surface.
 *
 *   { label: '+18%', tone: 'up'   } — current > prior, money out (concerning)
 *   { label: '-12%', tone: 'down' } — current < prior, money in (positive)
 *   { label: '—',    tone: 'flat' } — no prior data OR no change
 *
 * `inverseTone` flips up/down semantics for surfaces where "more"
 * is the GOOD signal (e.g. savings, refunds). Default = false
 * (spending: more is bad).
 */
export function formatTrend(deltaPct, { inverseTone = false } = {}) {
  if (deltaPct == null || !Number.isFinite(deltaPct)) {
    return { label: '—', tone: 'flat' }
  }
  const rounded = Math.round(deltaPct)
  if (rounded === 0) return { label: '0%', tone: 'flat' }
  const isUp = rounded > 0
  const tone = isUp
    ? (inverseTone ? 'down' : 'up')
    : (inverseTone ? 'up'   : 'down')
  const sign = isUp ? '+' : ''
  return { label: `${sign}${rounded}%`, tone }
}
