'use client'
import { formatDateShort } from '../../../lib/dateFormat'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '../../../store'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Gift, ArrowRight, Sparkles, PiggyBank, Wand2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import GuacoScoreCard from '../../../components/GuacoScoreCard'
import UpcomingReturnsBanner from '../../../components/UpcomingReturnsBanner'
import AnomaliesPanel from '../../../components/AnomaliesPanel'
import { ActivityFeed } from '../../../components/ActivityFeed'
import { fetchTotal as fetchGuacMoneyTotal, formatGuacMoney } from '../../../lib/guacMoney'
import { generateInsights } from '../../../lib/financeInsights'
import { computeWizardScore } from '../../../lib/wizardScore'
import { createClient as createSbClient } from '../../../lib/supabase/client'
import { subDays, subWeeks, subMonths, subYears } from 'date-fns'
import { displayStoreName, storeGroupKey } from '../../../lib/store-name-normalize'
import { periodToReceiptsChip, buildReceiptsUrl } from '../../../lib/receipts-deeplink'
import { isPaymentReceipt } from '../../../lib/payment-rows'
import PaymentTile, { PAYMENT_TILE_CONFIGS } from '../../../components/PaymentTile'
import { computeDashboardAnalysis } from '../../../lib/analysisEngine'
import { periodStartDate } from '../../../lib/timeframe'
import { useBankData } from '../../../lib/useBankData'
import TimeframePicker from '../../../components/TimeframePicker'
import PostSignupReferralApply from '../../../components/PostSignupReferralApply'
import { computeSmashDays } from '../../../lib/smashDays'
import mascotBus from '../../../lib/mascotEventBus'
import { CountUp, FadeUpStagger } from '../../../components/animated'
import LottieAnimation from '../../../components/LottieAnimation'
import emptyListLottie from '../../../lottie/empty-list.json'
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
  // Time-frame state lives in the Zustand store with localStorage
  // persistence so every page (GuacWizard, reports, …) sees the same
  // window the dashboard is on. Changing it here updates the cached
  // value; the next page navigation reads the updated value.
  const { spendingPeriod, setSpendingPeriod, spendingPeriodCount, setSpendingPeriodCount } = useStore()
  const router = useRouter()
  const period = PERIODS.includes(spendingPeriod) ? spendingPeriod : 'monthly'
  const periodCount = spendingPeriodCount || DEFAULT_COUNT[period] || 1
  const setPeriodCount = setSpendingPeriodCount

  function selectPeriod(p) {
    setSpendingPeriod(p)
    setSpendingPeriodCount(DEFAULT_COUNT[p] || 1)
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

  // Referral bonus — adds to the Smash-days streak count (migration_064
  // writes profiles.smash_days_bonus when a referral is credited).
  // Fetched once per dashboard mount; cheap.
  const sb = createSbClient()
  const { data: smashBonus = 0 } = useQuery({
    queryKey: ['profile_smash_days_bonus'],
    queryFn: async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return 0
      const { data } = await sb.from('profiles').select('smash_days_bonus').eq('id', user.id).maybeSingle()
      return Number(data?.smash_days_bonus ?? 0)
    },
    staleTime: 60_000,
  })

  // Smash-days milestone — celebrate every 7-day stretch (7, 14, 21…).
  // mascotBus.celebrateOnce uses a stable key backed by localStorage so
  // each milestone fires exactly once across reloads. Effect (not in
  // render path) so it dispatches AFTER the first paint.
  useEffect(() => {
    const days = computeSmashDays(spendingReceipts, smashBonus).smashDays
    if (days > 0 && days % 7 === 0) {
      mascotBus.celebrateOnce(`smash_days_${days}`, `${days} Smash days`)
    }
  }, [spendingReceipts, smashBonus])
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
      {/* If the user signed up via /?ref=<CODE>, this fires once on
          first dashboard load to credit 3 Smash days to both sides.
          Renders nothing — pure side-effect island. */}
      <PostSignupReferralApply />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Good day, {firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your financial snapshot</p>
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

      {/* Standard time-frame picker — shared with /guacwizard and
          every other internal page. */}
      <TimeframePicker
        trailing={
          <span className="text-xs text-gray-400">
            {filtered.length} transaction{filtered.length === 1 ? '' : 's'} • {rangeLabel}
          </span>
        }
      />

      {/* Return-window banner — surfaces items expiring within 7
          days so the user can act before the window closes. Self-
          hides when nothing is urgent; session-dismissable. */}
      <UpcomingReturnsBanner />

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
      {/* Stat tiles — GuacScore leads, then GuacWizard right next
          to it (paired engagement scores), then GuacMoney, then
          financial tiles, then Smash days last per user request. */}
      {/* Engagement strip — single horizontal scroll so the row
          reads as a swipeable carousel (matching the mobile
          dashboard's behaviour). Each tile is the same fixed
          width so the layout doesn't reflow as data lands; each
          carries an onTap routed to its detail surface
          (GuacScore → /guacanomics, GuacWizard → /guacwizard,
          GuacMoney → /shopping, Rewards → /rewards). */}
      <div className="-mx-2 px-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Engagement strip — FadeUpStagger gives each tile a 40ms
            offset entrance on initial paint. Each tile carries its
            own CountUp internally for hero numbers, so timeframe
            flips also smooth-retally inside without needing a key. */}
        <FadeUpStagger className="flex gap-3 min-w-max" delayMs={50}>
          {/* GuacScore reads lifetime rated purchases, not just the
              current period filter — otherwise a 3-month dashboard
              window with no rated purchases inside it shows score=0
              even when the user has rated items further back. The
              big card on /guacanomics already uses a wider window;
              this matches that behavior. */}
          <Link href="/guacanomics" className="w-64 shrink-0 block">
            <GuacScoreTileWithBankBite receipts={spendingReceipts} />
          </Link>
          <div className="w-64 shrink-0"><GuacWizardTile /></div>
          <Link href="/shopping" className="w-64 shrink-0 block"><GuacMoneyTile /></Link>
          <div className="w-64 shrink-0"><RewardsTile count={initialRewards.length} /></div>
        </FadeUpStagger>
      </div>

      {/* Spending anomalies sits ABOVE the financial-tile scroll so
          warning state is visible before the user scans the row of
          numbers. Self-hides when nothing is off; session-
          dismissable; collapsed-by-default. */}
      <AnomaliesPanel receipts={spendingReceipts} />

      {/* Financial-tile horizontal scroll — eight tiles driven by
          the centralized analysisEngine (web/src/lib/analysisEngine).
          Each tile shows current value + a delta vs the prior
          time-frame of the same shape. Same engine powers the
          /api/analysis endpoint that mobile consumes. */}
      <AllPaymentsScroll
        spendingReceipts={spendingReceipts}
        period={period}
        periodCount={periodCount}
      />

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
            <div className="text-sm text-gray-400 text-center py-6 flex flex-col items-center gap-2">
              <LottieAnimation data={emptyListLottie} size={100} fallback="💰" />
              <p>No rewards yet</p>
            </div>
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
              {filtered.slice(0, 8).map((r, idx) => (
                <tr
                  key={r.id}
                  style={{ animationDelay: `${idx * 35}ms`, animationDuration: '220ms' }}
                  className="hover:bg-gray-50/50 anim-fadeup">
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
// Vibrant 8-tile horizontal scroll: 4 receipt-side totals + 4
// bank-statement totals. Receipt-side numbers come in as props
// from the dashboard period window; bank-side numbers are fetched
// here via the same useQuery keys as BankTile so cache is shared.
// Bank tiles silently render as $0 when no statements exist — the
// row still shows transactions/spend/tax so it never disappears.
// Dashboard GuacScore tile — wraps GuacoScoreCard.
//
// Scope: LIFETIME, on both sides. Receipts come in unfiltered
// (`spendingReceipts` is lifetime) so the bank-bite has to be
// lifetime too — otherwise we'd be applying (this-period fees) /
// (lifetime spend) as the penalty ratio, which is artificially
// tiny and makes the dashboard score look higher than the
// /guacanomics page when the user switches to "All time" there.
//
// This now matches /guacanomics in "All time" mode exactly. Other
// ranges on the detail page are by-design scope-scoped views and
// will read differently — that's not a bug.
function GuacScoreTileWithBankBite({ receipts }) {
  const { fees: bankFees } = useBankData()
  let interest = 0, fees = 0
  for (const f of bankFees) {
    const v = Math.abs(Number(f.amount || 0))
    if (f.kind === 'interest') interest += v
    else if (f.kind === 'fee' || f.kind === 'penalty') fees += v
  }
  const bankBite = { interest, fees, total: interest + fees }
  return <GuacoScoreCard receipts={receipts} bankBite={bankBite} size="sm" />
}

// 8-tile financial scroll. Pulls bank data via the same useQuery
// keys the rest of the dashboard uses (TanStack dedups by key, so
// this doesn't fire duplicate fetches) and hands the raw rows + the
// receipts + the current period to `computeDashboardAnalysis`. The
// engine does all the math; we just render. Same engine runs server-
// side at /api/analysis for mobile consumption.
//
// Each metric carries a `deltaGoodWhen` hint that drives the color
// of the delta chip:
//   - 'down' for cost metrics (Total Spent, Tax, Interest, Bank Fees,
//      Fees Paid) — green when the number went DOWN
//   - 'up' for income-shaped metrics (Payments) — green when UP
//   - 'neutral' for purely informational metrics (Transactions,
//      Purchases) — chip stays gray regardless of direction
const METRIC_DIRECTIONS = {
  transactions: 'neutral',
  totalSpent:   'down',
  taxPaid:      'down',
  purchases:    'neutral',
  payments:     'up',
  interestPaid: 'down',
  feesPaid:     'down',
  bankFees:     'down',
}

function AllPaymentsScroll({ spendingReceipts, period, periodCount }) {
  const scrollRef = useRef(null)
  const { statements, fees, transactions } = useBankData()

  const analysis = computeDashboardAnalysis({
    receipts: spendingReceipts,
    statements,
    fees,
    transactions,
    period,
    periodCount,
  })

  const money = (n) => `$${Number(n || 0).toFixed(2)}`
  // Tiles in user's requested order. Each entry carries:
  //   - the raw numeric value (drives the CountUp tween inside
  //     PaymentTile so timeframe flips smooth-retally instead of
  //     flash-cutting)
  //   - a display prefix ('$' for money, '' for the integer count)
  // The string fallback `format(value)` is still passed as `value`
  // so SSR / no-JS / reduced-motion users see a correctly formatted
  // number on first paint.
  const TILES = [
    { key: 'transactions', value: analysis.metrics.transactions.current, format: (v) => v,    prefix: '' },
    { key: 'totalSpent',   value: analysis.metrics.totalSpent.current,   format: money,       prefix: '$' },
    { key: 'taxPaid',      value: analysis.metrics.taxPaid.current,      format: money,       prefix: '$' },
    { key: 'purchases',    value: analysis.metrics.purchases.current,    format: money,       prefix: '$' },
    { key: 'payments',     value: analysis.metrics.payments.current,     format: money,       prefix: '$' },
    { key: 'interestPaid', value: analysis.metrics.interestPaid.current, format: money,       prefix: '$' },
    { key: 'feesPaid',     value: analysis.metrics.feesPaid.current,     format: money,       prefix: '$' },
    { key: 'bankFees',     value: analysis.metrics.bankFees.current,     format: money,       prefix: '$' },
  ]

  // Smooth-scroll the row by roughly one tile (~172px = w-40 + gap).
  // Multiplied by 3 so each click moves a meaningful chunk on wide
  // screens. behavior:'smooth' = the "auto"-feeling slide.
  const scrollBy = (dir) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 236 * 2, behavior: 'smooth' })
  }

  return (
    // Outer wrapper has px-12 padding so the absolutely-positioned
    // arrows sit *outside* the scroll area instead of on top of the
    // first/last tile (which was the original overlap bug).
    <div className="relative group px-12">
      <style jsx>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div ref={scrollRef} className="no-scrollbar overflow-x-auto scroll-smooth pb-1">
        {/* FadeUpStagger gives the financial scroll a 1-shot
            entrance on mount; subsequent timeframe flips animate
            the numeric values inside each PaymentTile via CountUp. */}
        <FadeUpStagger className="flex gap-3 min-w-max" delayMs={45}>
          {TILES.map(({ key, value, format, prefix }) => {
            const m = analysis.metrics[key]
            return (
              <PaymentTile
                key={key}
                {...PAYMENT_TILE_CONFIGS[key]}
                value={format(value)}
                numericValue={Number(value) || 0}
                prefix={prefix}
                deltaLabel={m.deltaLabel}
                deltaArrow={m.deltaArrow}
                deltaGoodWhen={METRIC_DIRECTIONS[key]}
              />
            )
          })}
        </FadeUpStagger>
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-emerald-700 opacity-70 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-emerald-700 opacity-70 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// GuacWizard health-score tile — same 0-100 score the /guacwizard
// page renders, distilled into a single tile. Pulls bank_statements
// + bank_fees + bank_transactions (only the user's own rows via
// RLS); when no bank data exists yet the tile shows "Set up →" and
// links to /guacwizard so the user can connect statements.
function GuacWizardTile() {
  // Time-frame from the dashboard's selector + bank data both come
  // from shared sources (`useStore` + `useBankData`) so this tile
  // and /guacwizard score against identical inputs.
  const { spendingPeriod, spendingPeriodCount } = useStore()
  const { statements, fees, transactions, isLoading } = useBankData()
  const score = (() => {
    if (isLoading) return undefined
    const hasData = statements.length > 0 || fees.length > 0 || transactions.length > 0
    if (!hasData) return null
    const since = periodStartDate(spendingPeriod, spendingPeriodCount)
    return computeWizardScore(generateInsights({ statements, fees, transactions }, since)).score
  })()
  // Score-band tone applied to the WHOLE tile (bg + ring + chip +
  // every text color) — if green means "healthy", commit to it
  // everywhere on the card, not just a tiny dot. While loading,
  // use a neutral slate palette so we never flash through a wrong
  // color before the real score lands.
  const tone =
    score === undefined ? { bg: 'from-slate-50 to-slate-100',     ring: 'ring-slate-200',   chip: 'from-slate-300 to-slate-400',     label: 'text-slate-600',   value: 'text-slate-700',   sub: 'text-slate-500' } :
    score === null      ? { bg: 'from-violet-50 to-purple-100',   ring: 'ring-violet-200',  chip: 'from-violet-400 to-violet-600',   label: 'text-violet-700',  value: 'text-violet-900',  sub: 'text-violet-600' } :
    score >= 65         ? { bg: 'from-emerald-50 to-lime-100',    ring: 'ring-emerald-200', chip: 'from-emerald-400 to-lime-600',    label: 'text-emerald-700', value: 'text-emerald-900', sub: 'text-emerald-700' } :
    score >= 35         ? { bg: 'from-amber-50 to-orange-100',    ring: 'ring-amber-200',   chip: 'from-amber-400 to-orange-600',    label: 'text-amber-700',   value: 'text-amber-900',   sub: 'text-amber-700' } :
                          { bg: 'from-rose-50 to-red-100',        ring: 'ring-rose-200',    chip: 'from-rose-400 to-red-600',        label: 'text-rose-700',    value: 'text-rose-900',    sub: 'text-rose-700' }

  return (
    <Link
      href="/guacwizard"
      className={`payment-tile-card stat-card relative overflow-hidden bg-gradient-to-br ${tone.bg} ring-1 ${tone.ring} hover:shadow-md transition-all`}
      title="GuacWizard health score"
    >
      {/* 🥑 brand watermark + 🧙‍♂️ theme watermark — same proportions
          as the PaymentTile row so the engagement strip and the
          financial scroll feel like one design system. */}
      <span aria-hidden className="tile-watermark-avocado absolute select-none pointer-events-none leading-none" style={{ top: '-4px', right: '6px', '--wm-rot': '-12deg', fontSize: '30px', opacity: 0.22 }}>🥑</span>
      <span aria-hidden className="tile-watermark-theme absolute select-none pointer-events-none leading-none" style={{ bottom: '4px', right: '8px', '--wm-rot': '8deg', fontSize: '18px', opacity: 0.26 }}>🧙‍♂️</span>
      <div className={`tile-chip-host shrink-0 w-11 h-11 rounded-xl flex items-center justify-center relative z-10 bg-gradient-to-br ${tone.chip} shadow-md text-white`}>
        <Wand2 size={20} className="tile-chip-icon text-white" />
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className={`text-[10px] uppercase tracking-wider font-bold ${tone.label}`}>GuacWizard</p>
        {score === undefined ? (
          <>
            <p className={`text-xl font-black ${tone.value} tabular-nums leading-tight`}>—</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${tone.sub}`}>loading…</p>
          </>
        ) : score != null ? (
          <>
            <p className={`text-xl font-black ${tone.value} tabular-nums leading-tight`}>
              <CountUp value={score} duration={520} />
              <span className="text-xs font-bold opacity-60 ml-0.5">/ 100</span>
            </p>
            <p className={`text-[10px] font-semibold mt-0.5 ${tone.sub}`}>health score</p>
          </>
        ) : (
          <p className={`text-sm font-bold ${tone.sub} mt-0.5`}>Set up →</p>
        )}
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
  // Emerald palette throughout — the brand colour. Active = strong
  // gradient chip + filled bg; idle = same shape with paler tints so
  // a fresh account still feels designed.
  const active = total > 0
  return (
    <div className={`payment-tile-card stat-card relative overflow-hidden bg-gradient-to-br ${active ? 'from-emerald-50 to-lime-100' : 'from-emerald-50/60 to-lime-50/60'} ring-1 ring-emerald-200 hover:shadow-md transition-all`}>
      <span aria-hidden className="tile-watermark-avocado absolute select-none pointer-events-none leading-none" style={{ top: '-4px', left: '52px', '--wm-rot': '16deg', fontSize: '30px', opacity: 0.22 }}>🥑</span>
      <span aria-hidden className="tile-watermark-theme absolute select-none pointer-events-none leading-none" style={{ top: '2px', right: '6px', '--wm-rot': '-8deg', fontSize: '20px', opacity: 0.28 }}>💰</span>
      <div className={`tile-chip-host shrink-0 w-11 h-11 rounded-xl flex items-center justify-center relative z-10 bg-gradient-to-br ${active ? 'from-emerald-400 via-emerald-500 to-lime-600' : 'from-emerald-200 to-lime-300'} shadow-md text-white`}>
        <PiggyBank size={20} className="tile-chip-icon text-white" />
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">GuacMoney</p>
        <p className="text-xl font-black text-emerald-900 tabular-nums leading-tight">
          {isLoading ? '—' : <CountUp value={Number(total) || 0} duration={520} format={formatGuacMoney} />}
        </p>
        <p className="text-[10px] font-semibold mt-0.5 text-emerald-700">
          {active ? 'saved' : 'tap Cheapest →'}
        </p>
      </div>
    </div>
  )
}

// Rewards tile — count of unredeemed rewards available, lime/emerald
// palette to match the brand. Treated like the other engagement
// tiles so the row reads as one design system.
function RewardsTile({ count }) {
  const active = count > 0
  // Rose/pink palette gives Rewards its own visual identity so the
  // 4-tile engagement row doesn't read as three-quarters green.
  // GuacScore (amber band) · GuacWizard (violet) · GuacMoney
  // (emerald) · Rewards (rose) → four distinct color homes.
  return (
    <Link
      href="/rewards"
      className={`payment-tile-card stat-card relative overflow-hidden bg-gradient-to-br ${active ? 'from-rose-50 to-pink-100' : 'from-gray-50 to-gray-100/40'} ring-1 ${active ? 'ring-rose-200' : 'ring-gray-200'} hover:shadow-md transition-all`}
      title="Rewards available"
    >
      <span aria-hidden className="tile-watermark-avocado absolute select-none pointer-events-none leading-none" style={{ bottom: '-4px', right: '4px', '--wm-rot': '-18deg', fontSize: '30px', opacity: 0.22 }}>🥑</span>
      <span aria-hidden className="tile-watermark-theme absolute select-none pointer-events-none leading-none" style={{ top: '2px', right: '6px', '--wm-rot': '12deg', fontSize: '20px', opacity: 0.28 }}>🎁</span>
      <div className={`tile-chip-host shrink-0 w-11 h-11 rounded-xl flex items-center justify-center relative z-10 bg-gradient-to-br ${active ? 'from-rose-400 to-pink-600' : 'from-gray-300 to-gray-400'} shadow-md text-white`}>
        <Gift size={20} className="tile-chip-icon text-white" />
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className={`text-[10px] uppercase tracking-wider font-bold ${active ? 'text-rose-700' : 'text-gray-500'}`}>Rewards</p>
        <p className={`text-xl font-black ${active ? 'text-rose-900' : 'text-gray-900'} tabular-nums leading-tight`}>
          <CountUp value={count} duration={420} />
        </p>
        <p className={`text-[10px] font-semibold mt-0.5 ${active ? 'text-rose-700' : 'text-gray-500'}`}>
          {active ? 'available' : 'none yet'}
        </p>
      </div>
    </Link>
  )
}
