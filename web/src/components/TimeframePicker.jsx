'use client'
// Standard time-frame selector — the dashboard's daily/weekly/
// monthly/yearly pill bar + "Last N <unit>" dropdown, reusable on
// every internal page that filters by date. Reads/writes from the
// shared Zustand store so changing the time-frame on any page
// updates it for all pages (and persists across reloads via
// localStorage).
//
// Optional props:
//   trailing  — node rendered after the dropdown (e.g. "92
//               transactions • Last 3 months" hint on the dashboard)
//   compact   — drops the pill+dropdown horizontal padding for use
//               inside narrower headers

import { useStore } from '../store'

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']
const COUNT_OPTIONS = {
  daily:   [1, 3, 7, 14, 30, 60, 90],
  weekly:  [1, 2, 4, 8, 12, 26, 52],
  monthly: [1, 3, 6, 12, 24, 36],
  yearly:  [1, 2, 3, 5, 10],
}
const DEFAULT_COUNT = { daily: 7, weekly: 4, monthly: 3, yearly: 1 }
const UNIT_LABEL = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }

export default function TimeframePicker({ trailing = null, compact = false }) {
  const {
    spendingPeriod, setSpendingPeriod,
    spendingPeriodCount, setSpendingPeriodCount,
  } = useStore()

  const period = PERIODS.includes(spendingPeriod) ? spendingPeriod : 'monthly'
  const periodCount = spendingPeriodCount || DEFAULT_COUNT[period] || 1

  function selectPeriod(p) {
    setSpendingPeriod(p)
    // Re-anchor the count to a sensible default for the new unit so
    // "Last 90 days" doesn't become "Last 90 years" when the user
    // flips to Yearly.
    setSpendingPeriodCount(DEFAULT_COUNT[p] || 1)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex bg-emerald-50 rounded-full p-1 gap-1 border border-emerald-100">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => selectPeriod(p)}
            className={`${compact ? 'px-3' : 'px-4'} py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${
              period === p
                ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-200'
                : 'text-emerald-700/70 hover:text-emerald-900'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="inline-flex items-center gap-2 bg-white rounded-full pl-4 pr-2 py-1 border border-emerald-100 shadow-sm">
        <span className="text-xs font-semibold text-gray-500">Last</span>
        <select
          value={periodCount}
          onChange={e => setSpendingPeriodCount(parseInt(e.target.value, 10))}
          className="bg-transparent text-sm font-bold text-emerald-800 focus:outline-none cursor-pointer font-sans"
        >
          {(COUNT_OPTIONS[period] || [1]).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="text-xs font-semibold text-gray-500">
          {UNIT_LABEL[period]}{periodCount === 1 ? '' : 's'}
        </span>
      </div>
      {trailing}
    </div>
  )
}
