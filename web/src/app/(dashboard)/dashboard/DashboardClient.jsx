'use client'
import { formatDateShort } from '../../../lib/dateFormat'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '../../../store'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Receipt, Gift, TrendingUp, TrendingDown, ArrowRight, Sparkles, Flame, PiggyBank, Wand2, CreditCard, Percent, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import GuacoScoreCard from '../../../components/GuacoScoreCard'
import UpcomingReturnsBanner from '../../../components/UpcomingReturnsBanner'
import AnomaliesPanel from '../../../components/AnomaliesPanel'
import { ActivityFeed } from '../../../components/ActivityFeed'
import { computeSmashDays } from '../../../lib/smashDays'
import { fetchTotal as fetchGuacMoneyTotal, formatGuacMoney } from '../../../lib/guacMoney'
import { generateInsights } from '../../../lib/financeInsights'
import { computeWizardScore } from '../../../lib/wizardScore'
import { createClient as createSbClient } from '../../../lib/supabase/client'
import { subDays, subWeeks, subMonths, subYears } from 'date-fns'
import { normalizeStoreName, canonicalStoreName, displayStoreName, storeGroupKey } from '../../../lib/store-name-normalize'
import { periodToReceiptsChip, buildReceiptsUrl } from '../../../lib/receipts-deeplink'
import { isPaymentReceipt } from '../../../lib/payment-rows'
import { computeSpendingTrend, formatTrend } from '../../../lib/spending-trends'
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']

// Dropdown options for "how many <period>s back to include"
const COUNT_OPTIONS = {
  daily:   [1, 3, 7, 14, 30, 60, 90],
  weekly:  [1, 2, 4, 8, 12, 26, 52],
  monthly: [1, 3, 6, 12, 24, 36],
  yearly:  [1, 2, 3, 5, 10],
}
const DEFAULT_COUNT = { daily: 7, weekly: 4, monthly: 3, yearly: 1 }
const UNIT_LABEL = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }

function periodStart(period, count) {
  const now = new Date()
  if (period === 'daily')   return subDays(now,  count)
  if (period === 'weekly')  return subWeeks(now, count)
  if (period === 'monthly') return subMonths(now, count)
  if (period === 'yearly')  return subYears(now, count)
  return now
}

export default function DashboardClient({ initialReceipts, initialRewards, firstName }) {
  const { spendingPeriod, setSpendingPeriod } = useStore()
  const router = useRouter()
  const period = PERIODS.includes(spendingPeriod) ? spendingPeriod : 'monthly'
  const [periodCount, setPeriodCount] = useState(() => DEFAULT_COUNT[period] || 1)

  function selectPeriod(p) {
    setSpendingPeriod(p)
    setPeriodCount(DEFAULT_COUNT[p] || 1)
  }

  function filterByPeriod(receipts) {
    // Compare on date STRING (YYYY-MM-DD), not parsed Date objects.
    // `new Date('2026-02-27')` parses as UTC midnight; periodStart()
    // returns a local-time Date. Comparing those across timezones
    // shifts the boundary by ~a day, so mobile and web ended up
    // counting different rows for the same "Last 3 months" window.
    // Lexicographic string compare on ISO dates is timezone-free.
    const cutoffDate = periodStart(period, periodCount)
    const yyyy = cutoffDate.getFullYear()
    const mm = String(cutoffDate.getMonth() + 1).padStart(2, '0')
    const dd = String(cutoffDate.getDate()).padStart(2, '0')
    const cutoffStr = `${yyyy}-${mm}-${dd}`
    return receipts.filter(r => {
      const d = String(r.date || '')
      return d.length >= 10 && d >= cutoffStr
    })
  }

  // Drop card-payment + transfer rows BEFORE any spending math runs. These
  // came from statement imports (pre-v0.2.71) and aren't actual purchases
  // — they're paying down the card balance. They live in /bank instead.
  const spendingReceipts = initialReceipts.filter(r => !isPaymentReceipt(r))
  const filtered = filterByPeriod(spendingReceipts)
  const rangeLabel = `Last ${periodCount} ${UNIT_LABEL[period]}${periodCount === 1 ? '' : 's'}`
  const totalSpend = filtered.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
  const totalTax = filtered.reduce((s, r) => s + parseFloat(r.tax_paid || 0), 0)
  // Bank fees — interest charges, annual / late / ATM fees, etc.
  // Categorized as 'bank-fees' by auto-categorize.js. Surfaces the
  // hidden cost most users never tally on their own.
  const bankFees = filtered
    .filter(r => r.category === 'bank-fees')
    .reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
  const today = new Date().toISOString().split('T')[0]

  // Period-over-period trend: total spend vs the avg of the prior 3
  // windows of the same shape. Surfaces a small badge next to the
  // Total Spent stat — "up 18% vs last 3M" style. Lives in the
  // central spending-trends lib so future surfaces (weekly digest,
  // category drill-down) share the math.
  const trend = computeSpendingTrend(spendingReceipts, period, periodCount)
  const trendBadge = formatTrend(trend.deltaPct)

  // True "Spending by Store" — sum every receipt's total per merchant, take
  // the top 8 spenders, sort descending. Previously this chart plotted the
  // last 8 receipts one-per-bar, which showed "Amazon" 4 times for someone
  // with 4 recent Amazon purchases instead of one tall Amazon bar.
  //
  // Grouping uses the SHARED normalizeStoreName helper so "COSTCO WHOLESALE",
  // "Costco", "Costco #123", "amazon.com" and "AMAZON.COM, INC." all roll up
  // into a single bar — the same dedup logic the stores table uses, so this
  // chart can't disagree with the per-store drilldown.
  const chartData = (() => {
    const byStore = new Map()
    for (const r of filtered) {
      const raw = (r.store_name || '').trim()
      if (!raw) continue
      // Bucket by CANONICAL display name (lowercased) — not just normalized
      // form. Without this, "Costco" and "Costco Wholesale" hash to different
      // keys but both DISPLAY as "Costco" via the alias map, producing two
      // separate bars that look like duplicates to the user.
      const key = storeGroupKey(raw)
      if (!key) continue
      const amount = parseFloat(r.total_amount || 0)
      const entry = byStore.get(key) || { name: displayStoreName(raw), amount: 0, count: 0, samples: [] }
      // Track every raw variant we saw so the click-through can filter on
      // "store_name in (...)" instead of an arbitrary one — otherwise the
      // bar showing "Costco" $234 navigates to receipts page filtered on
      // exactly "Costco" and misses the "COSTCO WHOLESALE #218" rows.
      if (!entry.samples.includes(raw)) entry.samples.push(raw)
      entry.amount += amount
      entry.count += 1
      byStore.set(key, entry)
    }
    return [...byStore.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map(e => ({
        // Truncated label for the X axis so long names don't overflow.
        name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name,
        // Untruncated original — passed through so the bar's onClick handler
        // can navigate /receipts?store=<fullName> and the receipts page can
        // do a substring match against the parsed store_name without the
        // ellipsis breaking the filter.
        fullName: e.name,
        // All raw variants that rolled into this bar (e.g. "Costco",
        // "COSTCO WHOLESALE", "Costco #218"). The receipts page filter
        // needs the variants list to show every grouped receipt.
        sourceNames: e.samples,
        amount: e.amount,
        count: e.count,
      }))
  })()

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Good day, {firstName} 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's your financial snapshot</p>
          </div>
          {/* GuacScore lives inline with the greeting — same row as
              "Good day, Ramya 👋" so the score is the first thing
              the user reads, not a tile competing with five others. */}
          <GuacoScoreCard receipts={filtered} size="sm" className="!min-w-[200px]" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/validate"
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-rose-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all group">
            <span className="text-xl leading-none">🥑</span>
            <div className="text-left">
              <p className="font-extrabold text-sm leading-tight">Worth It?</p>
              <p className="text-[11px] text-amber-50/90 leading-tight">Rate every purchase</p>
            </div>
            <ArrowRight size={16} className="text-amber-100 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="/guacanomics"
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all group">
            <Sparkles size={18} className="text-green-100" />
            <div className="text-left">
              <p className="font-extrabold text-sm leading-tight">Guacanomics</p>
              <p className="text-[11px] text-green-100/90 leading-tight">Money's wingman</p>
            </div>
            <ArrowRight size={16} className="text-green-100 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex bg-emerald-50 rounded-full p-1 gap-1 border border-emerald-100">
          {PERIODS.map(p => (
            <button key={p} onClick={() => selectPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${
                period === p ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-200' : 'text-emerald-700/70 hover:text-emerald-900'
              }`}>
              {p}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 bg-white rounded-full pl-4 pr-2 py-1 border border-emerald-100 shadow-sm">
          <span className="text-xs font-semibold text-gray-500">Last</span>
          <select
            value={periodCount}
            onChange={e => setPeriodCount(parseInt(e.target.value, 10))}
            className="bg-transparent text-sm font-bold text-emerald-800 focus:outline-none cursor-pointer font-sans">
            {(COUNT_OPTIONS[period] || [1]).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-xs font-semibold text-gray-500">{UNIT_LABEL[period]}{periodCount === 1 ? '' : 's'}</span>
        </div>
        <span className="text-xs text-gray-400">{filtered.length} transaction{filtered.length === 1 ? '' : 's'} • {rangeLabel}</span>
      </div>

      {/* Return-window banner — surfaces items expiring within 7
          days so the user can act before the window closes. Self-
          hides when nothing is urgent; session-dismissable. */}
      <UpcomingReturnsBanner />

      {/* Spending anomalies — surfaces merchants/categories spiking
          ≥2× their usual + any monthly recurring that stopped showing
          up. Self-hides when nothing's off; session-dismissable. */}
      <AnomaliesPanel receipts={spendingReceipts} />

      {/* Stats — GuacScore first, then Smash days, then the spend
          tiles. Total Spent gets an inline trend badge ("up 18% vs
          prior 3 windows") using the central spending-trends lib.
          The Smash-days chip pulses when active to reward consistent
          engagement and goes flat-gray once it breaks. */}
      {/* Stat grid — reordered: GuacScore first, financial tiles
          (transactions / spend / tax / bank fees), then engagement
          tiles (rewards / GuacMoney), with Smash days at the end as
          requested. Eight tiles total — flows 4×2 on lg, 2×4 on
          mobile. */}
      {/* Stat tiles — GuacScore now lives in the header beside the
          greeting, so the row leads with GuacWizard. Ordering per
          user request: GuacWizard → GuacMoney → financial tiles
          (Transactions / Spent / Tax / Bank Fees / Rewards) →
          Smash days last. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <GuacWizardTile />
        <GuacMoneyTile />
        {[
          { label: 'Transactions', value: filtered.length, icon: Receipt, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Total Spent', value: `$${totalSpend.toFixed(2)}`, icon: DollarSign, color: 'bg-gradient-to-br from-rose-400 via-rose-600 to-rose-800 text-white shadow-sm', trend: trendBadge },
          { label: 'Tax Paid', value: `$${totalTax.toFixed(2)}`, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
          { label: 'Bank Fees', value: `$${bankFees.toFixed(2)}`, icon: TrendingUp, color: bankFees > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-400' },
          { label: 'Rewards', value: initialRewards.length, icon: Gift, color: 'bg-lime-100 text-lime-700' },
        ].map(({ label, value, icon: Icon, color, trend }) => (
          <div key={label} className="stat-card">
            <div className={`p-2 rounded-lg ${color}`}><Icon size={16} /></div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500 font-medium leading-tight">{label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-base font-bold text-gray-900">{value}</p>
                {trend && trend.label !== '—' && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      trend.tone === 'up'   ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : trend.tone === 'down' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                    }`}
                    title={`vs avg of prior 3 ${UNIT_LABEL[period]} window${periodCount === 1 ? '' : 's'}`}
                  >
                    {trend.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {(() => {
          const { smashDays } = computeSmashDays(filtered)
          return (
            <div className="stat-card">
              <div className={`p-2 rounded-lg ${smashDays > 0 ? 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                <Flame size={16} className={smashDays > 0 ? 'animate-pulse' : ''} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 font-medium leading-tight">Smash days</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-base font-bold text-gray-900 tabular-nums">{smashDays}</p>
                  <span className="text-[10px] text-gray-500">
                    {smashDays === 0 ? 'scan to start' : `day${smashDays === 1 ? '' : 's'}`}
                  </span>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Bank summary row — payments / interest / fees / purchases /
          refunds across all the user's bank statements. Mirrors the
          row on /guacwizard so the user sees the same five numbers
          without leaving the dashboard. Self-hides when no bank
          data exists yet. */}
      <BankSummaryRow />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Spending chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-1">Spending by Store</h3>
          <p className="text-xs text-gray-500 mb-3">Tap a bar to see that store&apos;s receipts.</p>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No transactions for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
                barCategoryGap="25%"
                // Recharts surfaces the clicked datum on chart-level onClick.
                // Bar-level onClick fires twice on some versions; chart-level
                // is the reliable path.
                onClick={(state) => {
                  const datum = state?.activePayload?.[0]?.payload
                  if (datum?.fullName) {
                    // Build the deep-link via the shared helper so the URL
                    // shape + chip mapping live in one place (used by every
                    // dashboard-to-receipts transfer, present and future).
                    router.push(buildReceiptsUrl({
                      store: datum.fullName,
                      period: periodToReceiptsChip(period, periodCount),
                    }))
                  }
                }}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                  formatter={v => [`$${v.toFixed(2)}`, 'Amount']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <Bar
                  dataKey="amount"
                  fill="#e11d48"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={56}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rewards expiring soon */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Rewards</h3>
            <Link href="/rewards" title="View all rewards" aria-label="View all rewards"
              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
              <ArrowRight size={14} />
            </Link>
          </div>
          {initialRewards.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No rewards yet</p>
          ) : (
            <div className="space-y-3">
              {initialRewards.slice(0, 4).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium leading-tight">{r.reward_title}</p>
                    <p className="text-xs text-gray-400">{displayStoreName(r.store_name)}</p>
                  </div>
                  <span className={`badge ${r.expiry_date < today ? 'badge-red' : 'badge-green'} ml-2 flex-shrink-0`}>
                    {r.expiry_date < today ? 'Expired' : r.expiry_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
          <Link href="/receipts" title="All receipts" aria-label="All receipts"
            className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
            <ArrowRight size={14} />
          </Link>
        </div>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No transactions this period</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                {['Merchant','Date','Amount','Tax','Business'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(0, 8).map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/receipts/${r.id}`} className="hover:text-blue-700">{displayStoreName(r.store_name)}</Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDateShort(r.date)}</td>
                  <td className="px-5 py-3 font-semibold">${parseFloat(r.total_amount || 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-gray-500">${parseFloat(r.tax_paid || 0).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={r.business_purchase ? 'badge-blue' : 'badge-gray'}>
                      {r.business_purchase ? 'Business' : 'Personal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent activity — chronological "what just happened" rail.
          Lives at the bottom so the dashboard's primary signals
          (GuacScore, spend tiles, charts, recent receipts table)
          read first. Empty state self-renders when the user has
          nothing yet, so the dashboard never looks blank for new
          accounts. */}
      <ActivityFeed receipts={spendingReceipts} />
    </div>
  )
}

// GuacMoney tile — total dollars NOT spent because GetGuac routed
// the user to a cheaper option. Pulls from the SQL aggregate
// (guac_money_total) so we don't fetch every event row. Loading
// state shows a subtle dash, empty state shows "$0" + a "start
// saving" prompt.
// Bank summary row — five tiles aggregated across all bank
// statements: payments made, interest paid, fees paid, purchases,
// refunds. Re-uses the same TanStack Query keys the GuacWizardTile
// uses so we don't fire duplicate fetches; TanStack dedups by key.
// Self-hides entirely when the user has no bank data yet.
const TILE_TONE = {
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-800',     icon: 'text-sky-600',     border: 'border-sky-100' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-800',  icon: 'text-orange-600',  border: 'border-orange-200' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-800',   icon: 'text-amber-600',   border: 'border-amber-200' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-800',    icon: 'text-rose-600',    border: 'border-rose-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-800', icon: 'text-emerald-600', border: 'border-emerald-100' },
}
function BankTile({ icon: Icon, tone, label, value }) {
  const t = TILE_TONE[tone] || TILE_TONE.sky
  return (
    <div className={`stat-card border ${t.border} ${t.bg}`}>
      <div className={`p-2 rounded-lg bg-white shadow-sm`}><Icon size={16} className={t.icon} /></div>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wider font-bold ${t.text} opacity-80`}>{label}</p>
        <p className={`text-base font-bold ${t.text} tabular-nums`}>${Number(value || 0).toFixed(2)}</p>
      </div>
    </div>
  )
}
function BankSummaryRow() {
  const sb = createSbClient()
  const { data: statements = [] } = useQuery({
    queryKey: ['bank_statements'],
    queryFn: async () => { const { data } = await sb.from('bank_statements').select('*'); return data || [] },
    staleTime: 5 * 60_000,
  })
  const { data: fees = [] } = useQuery({
    queryKey: ['bank_fees'],
    queryFn: async () => { const { data } = await sb.from('bank_fees').select('*'); return data || [] },
    staleTime: 5 * 60_000,
  })
  const { data: transactions = [] } = useQuery({
    queryKey: ['bank_transactions'],
    queryFn: async () => { const { data } = await sb.from('bank_transactions').select('*'); return data || [] },
    staleTime: 5 * 60_000,
  })
  const hasData = statements.length > 0 || fees.length > 0 || transactions.length > 0
  if (!hasData) return null
  const { summary } = generateInsights({ statements, fees, transactions }, 'ytd')
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <BankTile icon={CreditCard}     tone="sky"     label="Payments made" value={summary.totalPayments} />
      <BankTile icon={Percent}        tone="orange"  label="Interest paid" value={summary.totalInterest} />
      <BankTile icon={AlertTriangle}  tone="amber"   label="Fees paid"     value={summary.totalFees} />
      <BankTile icon={TrendingUp}     tone="rose"    label="Purchases"     value={summary.totalPurch} />
      <BankTile icon={TrendingDown}   tone="emerald" label="Refunds"       value={summary.totalRefunds} />
    </div>
  )
}

// GuacWizard health-score tile — same 0-100 score the /guacwizard
// page renders, distilled into a single tile. Pulls bank_statements
// + bank_fees + bank_transactions (only the user's own rows via
// RLS); when no bank data exists yet the tile shows "Set up →" and
// links to /guacwizard so the user can connect statements.
function GuacWizardTile() {
  const sb = createSbClient()
  const { data: statements = [] } = useQuery({
    queryKey: ['bank_statements'],
    queryFn: async () => { const { data } = await sb.from('bank_statements').select('*'); return data || [] },
    staleTime: 5 * 60_000,
  })
  const { data: fees = [] } = useQuery({
    queryKey: ['bank_fees'],
    queryFn: async () => { const { data } = await sb.from('bank_fees').select('*'); return data || [] },
    staleTime: 5 * 60_000,
  })
  const { data: transactions = [] } = useQuery({
    queryKey: ['bank_transactions'],
    queryFn: async () => { const { data } = await sb.from('bank_transactions').select('*'); return data || [] },
    staleTime: 5 * 60_000,
  })
  const score = (() => {
    const hasData = statements.length > 0 || fees.length > 0 || transactions.length > 0
    if (!hasData) return null
    const result = generateInsights({ statements, fees, transactions }, 'ytd')
    return computeWizardScore(result).score
  })()
  return (
    <Link href="/guacwizard" className="stat-card hover:bg-emerald-50/40 transition-colors" title="GuacWizard health score">
      <div className={`p-2 rounded-lg ${score != null && score >= 65 ? 'bg-gradient-to-br from-emerald-400 to-lime-500 text-white shadow-sm' : score != null && score >= 35 ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-sm' : score != null ? 'bg-gradient-to-br from-rose-400 to-red-600 text-white shadow-sm' : 'bg-violet-100 text-violet-700'}`}>
        <Wand2 size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 font-medium leading-tight">GuacWizard 🧙‍♂️</p>
        <div className="flex items-baseline gap-1.5">
          {score != null ? (
            <>
              <p className="text-base font-bold text-gray-900 tabular-nums">{score}</p>
              <span className="text-[10px] text-gray-500">/ 100</span>
            </>
          ) : (
            <p className="text-xs text-violet-700 font-bold">Set up →</p>
          )}
        </div>
      </div>
    </Link>
  )
}

function GuacMoneyTile() {
  const { data: total = 0, isLoading } = useQuery({
    queryKey: ['guac-money-total'],
    queryFn: fetchGuacMoneyTotal,
    staleTime: 60_000,
  })
  return (
    <div className="stat-card">
      <div className={`p-2 rounded-lg ${total > 0 ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-lime-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700'}`}>
        <PiggyBank size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 font-medium leading-tight">GuacMoney 🥑</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-base font-bold text-emerald-700 tabular-nums">
            {isLoading ? '—' : formatGuacMoney(total)}
          </p>
          <span className="text-[10px] text-gray-500">
            {total > 0 ? 'saved' : 'tap Cheapest'}
          </span>
        </div>
      </div>
    </div>
  )
}
