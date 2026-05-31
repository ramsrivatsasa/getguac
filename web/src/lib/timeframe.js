// Shared time-frame helpers. The dashboard owns the canonical
// (period, count) selection in the Zustand store; every other
// internal page (GuacWizard, reports, …) reads it from there and
// converts to a Date via `periodStartDate` so the same window is
// applied everywhere.

import { subDays, subWeeks, subMonths, subYears } from 'date-fns'

const UNIT_LABEL = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }

// (period, count) → Date marking the start of the window. `count`
// is the number of period units to look back; if missing falls back
// to 1.
//
// The returned Date is SNAPPED TO MIDNIGHT LOCAL — same calendar
// day across every render of the page, regardless of how many
// seconds elapsed between calls. Without this snap, two renders
// seconds apart compute `since` at different ms precisions and a
// transaction dated exactly on the boundary day can flip in/out
// of the window — which produced the dashboard-vs-/guacwizard
// score mismatch (66 vs 61).
export function periodStartDate(period, count = 1) {
  const now = new Date()
  const n = Math.max(1, Number(count) || 1)
  let d
  if (period === 'daily')        d = subDays(now,  n)
  else if (period === 'weekly')  d = subWeeks(now, n)
  else if (period === 'monthly') d = subMonths(now, n)
  else if (period === 'yearly')  d = subYears(now, n)
  else                           d = now
  d.setHours(0, 0, 0, 0)
  return d
}

// Short label for read-only displays ("Last 3 months", "Last 7 days").
export function timeframeLabel(period, count = 1) {
  const unit = UNIT_LABEL[period] || 'period'
  const n = Math.max(1, Number(count) || 1)
  return `Last ${n} ${unit}${n === 1 ? '' : 's'}`
}

// ISO YYYY-MM-DD for the start of the window. Useful when filters
// compare on date strings (faster + timezone-stable than Date math).
export function periodStartIsoDate(period, count = 1) {
  const d = periodStartDate(period, count)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
