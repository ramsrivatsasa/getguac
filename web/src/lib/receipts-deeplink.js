// Deep-link helpers for the Receipts surface.
//
// Two write sites (dashboard Spending-by-Store chart, future deep-links
// from other dashboards) and one read site (the /receipts page) all need
// to agree on:
//
//   - the set of chip ids: 1M / 3M / 6M / 1Y / All
//   - how to convert the dashboard's free-form (period, count) into a chip
//   - the URL shape `/receipts?store=X&period=Y`
//   - how to parse the URL params back into chip + filter
//
// Putting all of this in one file means a future chip-set change (say,
// adding "2Y") only happens here — both the dashboard's handoff and the
// receipts page's chip render pick it up automatically.

export const RECEIPT_CHIP_IDS = ['1M', '3M', '6M', '1Y', 'All']

// Days per chip. Used by the receipts page to compute dateFrom from the
// selected chip, and by periodToReceiptsChip() to round dashboard windows
// to the nearest chip.
export const RECEIPT_CHIP_DAYS = {
  '1M':  30,
  '3M':  90,
  '6M':  180,
  '1Y':  365,
  // 'All' has no day cap — handled by absence.
}

/**
 * Convert a dashboard (period, count) into the nearest receipts chip id.
 * Rounds UP so the receipts page never accidentally hides rows the user
 * could see on the dashboard.
 *
 * @param {'daily'|'weekly'|'monthly'|'yearly'} period
 * @param {number} count
 * @returns {string} one of RECEIPT_CHIP_IDS
 */
export function periodToReceiptsChip(period, count) {
  let days
  switch (period) {
    case 'daily':   days = count;       break
    case 'weekly':  days = count * 7;   break
    case 'monthly': days = count * 30;  break
    case 'yearly':  days = count * 365; break
    default:        days = 30
  }
  if (days <= 30)  return '1M'
  if (days <= 90)  return '3M'
  if (days <= 180) return '6M'
  if (days <= 365) return '1Y'
  return 'All'
}

/**
 * Compute the ISO date (YYYY-MM-DD) that a chip's window starts from.
 * Returns undefined for the 'All' chip (no lower bound).
 *
 * Uses UTC arithmetic deliberately. `new Date()` + `setDate(getDate() -
 * days)` is LOCAL time; toISOString() then formats as UTC. Across the
 * UTC midnight boundary the two disagree by a day, so a user in UTC+8
 * at 23:30 local got a cutoff anchored to "yesterday", silently shifting
 * the 1M window by one day. Compare against the DB strings, which are
 * UTC-stable.
 */
export function chipToDateFrom(chip) {
  const days = RECEIPT_CHIP_DAYS[chip]
  if (days == null) return undefined
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * Build a deep-link URL into the receipts page.
 *
 * @param {object} opts
 * @param {string} [opts.store]   optional store filter (display name)
 * @param {string} [opts.period]  chip id (1M / 3M / 6M / 1Y / All)
 * @returns {string} relative URL like "/receipts?store=Costco&period=3M"
 */
export function buildReceiptsUrl({ store, period } = {}) {
  const params = new URLSearchParams()
  if (store) params.set('store', store)
  if (period && RECEIPT_CHIP_IDS.includes(period)) params.set('period', period)
  const q = params.toString()
  return q ? `/receipts?${q}` : '/receipts'
}

/**
 * Parse the receipts-page deep-link params off a searchParams-like object.
 * Both Next.js useSearchParams() and URLSearchParams have .get(), so any
 * shape with that method works.
 *
 * @param {{ get: (key: string) => string | null }} searchParams
 * @returns {{ store: string, period: string }}
 *          period defaults to '1M' when missing or unrecognized.
 */
export function parseReceiptsUrlParams(searchParams) {
  const store = searchParams?.get?.('store') || ''
  const periodRaw = searchParams?.get?.('period')
  const period = RECEIPT_CHIP_IDS.includes(periodRaw) ? periodRaw : '1M'
  return { store, period }
}
