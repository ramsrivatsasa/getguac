'use client'
import {donutCategoryColor} from '../../../lib/donut-style.mjs'
import { formatDateShort } from '../../../lib/dateFormat'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '../../../store'
import Link from 'next/link'
import { ArrowRight, Wand2, SlidersHorizontal, ArrowLeft, Eye, RotateCcw, Save, Search, X, Plus, Check, Settings2, Gift, Undo2, CalendarDays, TriangleAlert, BookOpen, TrendingUp, CircleGauge, Scale, Landmark, Newspaper, BriefcaseBusiness, Activity, PiggyBank, Monitor, Smartphone, Copy, ShieldCheck, Home, Plane, GraduationCap, Car, CreditCard, Receipt as ReceiptIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Expenses30DayCard from '../../../components/Expenses30DayCard'
import GuacoScoreCard from '../../../components/GuacoScoreCard'
import DashboardSavedSearches from '../../../components/DashboardSavedSearches'
import DashboardSteals from '../../../components/DashboardSteals'
import PersonalizedSavingsFeed from '../../../components/PersonalizedSavingsFeed'
import AnomaliesPanel from '../../../components/AnomaliesPanel'
import GuacMascot from '../../../components/GuacMascot'
import { generateInsights } from '../../../lib/financeInsights'
import { computeWizardScore } from '../../../lib/wizardScore'
import { createClient as createSbClient } from '../../../lib/supabase/client'
import { subDays, subWeeks, subMonths, subYears } from 'date-fns'
import { displayStoreName, storeGroupKey } from '../../../lib/store-name-normalize'
import { StoreLogo } from '../../../components/StoreLogo'
import { periodToReceiptsChip, buildReceiptsUrl } from '../../../lib/receipts-deeplink'
import { isPaymentReceipt } from '../../../lib/payment-rows'
import FirstReceiptPanel from './FirstReceiptPanel'
import Find10DashboardExperience from '../../../components/Find10DashboardExperience'
import { computeDashboardAnalysis } from '../../../lib/analysisEngine'
import { periodStartDate } from '../../../lib/timeframe'
import { useBankData } from '../../../lib/useBankData'
import TimeframePicker from '../../../components/TimeframePicker'
import PostSignupReferralApply from '../../../components/PostSignupReferralApply'
import { computeSmashDays } from '../../../lib/smashDays'
import mascotBus from '../../../lib/mascotEventBus'
import { CountUp, FadeUpStagger } from '../../../components/animated'
import { summarizeMoneyFlow } from '../../../lib/budget-engine'
import AdSlot from '../../../components/AdSlot'
import { fetchGuacMoneyPoints } from '../../../lib/guacMoney'
import {useHydrationCalendar} from '../../../lib/use-hydration-calendar'
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']
const SHOW_LEGACY_DASHBOARD = false
const DASHBOARD_WIDGETS = [
  ['guacscore', 'GuacScore', 'free'], ['worthit', 'Worth It', 'free'], ['guacwizard', 'GuacWizard', 'free'], ['guacmoney', 'GuacMoney', 'free'], ['rewards', 'Rewards', 'free'], ['returns', 'Returns', 'free'], ['bills', 'Bills', 'free'], ['moneyOverview', 'Money overview', 'free'], ['goals', 'Goals & Wealth Path', 'free'], ['bestMove', 'Best move', 'free'], ['saveNext', 'Save next', 'free'], ['wealth', 'Net worth & debt', 'free'], ['economic', 'Economic pressure', 'premium'],
  ['saved', 'Saved searches', 'premium'], ['categories', 'Spending by category', 'free'],
  ['expenses30', 'Expenses over time', 'free'], ['stores', 'Spending by store', 'free'], ['details', 'Save for you', 'free'], ['transactions', 'Recent transactions', 'free'], ['anomalies', 'Spending anomalies', 'free'],
  ['income', 'Income', 'free'], ['subscriptions', 'Subscriptions', 'free'], ['personalInflation', 'Personal inflation', 'free'],
  ['shrinkflation', 'Shrinkflation', 'free'], ['productRecalls', 'Product recalls', 'free'], ['economicNews', 'Economic news', 'free'],
  ['jobMarket', 'Job market', 'free'], ['marketSentiment', 'Market sentiment', 'free'], ['guides', 'Guides', 'free'], ['recentActivity', 'Recent activity', 'free'],
  ['steals', 'Steals for you', 'free'],
]
const OPTIONAL_WIDGETS = new Set(['wealth','economic','saved','anomalies','income','subscriptions','personalInflation','shrinkflation','productRecalls','economicNews','jobMarket','marketSentiment','guides','recentActivity'])
const defaultWidgetVisibility = () => Object.fromEntries(DASHBOARD_WIDGETS.map(([key]) => [key, !OPTIONAL_WIDGETS.has(key)]))
const PREMIUM_WIDGETS = new Set(DASHBOARD_WIDGETS.filter(([, , tier]) => tier === 'premium').map(([key]) => key))
// Spending-by-Store uses the same logo-first circular merchant treatment as
// mobile. The amount remains visible below each logo and the whole tile opens
// the matching receipts.

// Dropdown options for "how many <period>s back to include"
const COUNT_OPTIONS = {
  daily:   [1, 3, 7, 14, 30, 60, 90],
  weekly:  [1, 2, 4, 8, 12, 26, 52],
  monthly: [1, 3, 6, 12, 24, 36],
  yearly:  [1, 2, 3, 5, 10],
}
const DEFAULT_COUNT = { daily: 7, weekly: 4, monthly: 1, yearly: 1 }
const UNIT_LABEL = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }
const GOAL_IDEA_POOL = [
  { name: 'Emergency cushion', goal_type: 'emergency' }, { name: 'Debt-free sprint', goal_type: 'debt' },
  { name: 'First home fund', goal_type: 'home' }, { name: 'Retirement boost', goal_type: 'retirement' },
  { name: 'Dream trip', goal_type: 'travel' }, { name: 'Education fund', goal_type: 'education' },
  { name: 'Next vehicle', goal_type: 'vehicle' }, { name: 'Family milestone', goal_type: 'family' },
  { name: 'Major purchase fund', goal_type: 'purchase' }, { name: 'Home repair reserve', goal_type: 'other' },
]

function rotatingGoalIdeas(goals, count = 3) {
  const existingTypes = new Set(goals.map(goal => goal.goal_type))
  const available = GOAL_IDEA_POOL.filter(idea => !existingTypes.has(idea.goal_type))
  const pool = available.length >= count ? available : GOAL_IDEA_POOL
  const daySeed = Math.floor(Date.now() / 86_400_000) + goals.length * 7
  return [...pool].sort((a, b) => ((GOAL_IDEA_POOL.indexOf(a) + daySeed) % pool.length) - ((GOAL_IDEA_POOL.indexOf(b) + daySeed) % pool.length)).slice(0, count)
}

function periodStart(period, count, now) {
  if (period === 'daily')   return subDays(now,  count)
  if (period === 'weekly')  return subWeeks(now, count)
  if (period === 'monthly') return subMonths(now, count)
  if (period === 'yearly')  return subYears(now, count)
  return now
}

export default function DashboardClient({ userId, initialToday, initialReceipts, firstName, initialPlanning, isPremium = false, initialDashboardPreferences = null, find10 = null }) {
  const today=useHydrationCalendar(initialToday)
  // Time-frame state lives in the Zustand store with localStorage
  // persistence so every page (GuacWizard, reports, …) sees the same
  // window the dashboard is on. Changing it here updates the cached
  // value; the next page navigation reads the updated value.
  const { spendingPeriod, setSpendingPeriod, spendingPeriodCount, setSpendingPeriodCount } = useStore()
  const router = useRouter()
  // Zustand restores the saved timeframe from localStorage on the client.
  // The server cannot see that value, so both sides must use the same stable
  // default for the hydration render; the saved selection is applied on the
  // next paint. Without this gate React sees e.g. "Last 3 months" from SSR
  // and "Last 1 year" from the first client render and rejects hydration.
  const [timeframeHydrated, setTimeframeHydrated] = useState(false)
  useEffect(() => setTimeframeHydrated(true), [])
  const period = timeframeHydrated && PERIODS.includes(spendingPeriod) ? spendingPeriod : 'monthly'
  const periodCount = timeframeHydrated ? (spendingPeriodCount || DEFAULT_COUNT[period] || 1) : DEFAULT_COUNT.monthly
  const setPeriodCount = setSpendingPeriodCount
  const [customizing, setCustomizing] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [librarySearch, setLibrarySearch] = useState('')
  const [customSnapshot, setCustomSnapshot] = useState(null)
  const [deviceScope, setDeviceScope] = useState('web')
  const [customizationTarget, setCustomizationTarget] = useState('web')
  const [widgetProfiles, setWidgetProfiles] = useState(() => {
    const legacy = initialDashboardPreferences?.visible || {}
    const normalize = source => ({
      ...defaultWidgetVisibility(),
      ...(source || {}),
      ...(source?.scores === false ? { guacscore: false, guacwizard: false } : {}),
    })
    return {
      web: normalize(initialDashboardPreferences?.web?.visible || legacy),
      mobile: normalize(initialDashboardPreferences?.mobile?.visible || legacy),
    }
  })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setDeviceScope(media.matches ? 'mobile' : 'web')
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    try {
      const savedProfiles = JSON.parse(localStorage.getItem('getguac_dashboard_widgets_v2') || 'null')
      const legacySaved = JSON.parse(localStorage.getItem('getguac_dashboard_widgets') || '{}')
      setWidgetProfiles(current => {
        if (savedProfiles?.web && savedProfiles?.mobile) return {
          web: { ...current.web, ...savedProfiles.web },
          mobile: { ...current.mobile, ...savedProfiles.mobile },
        }
        if (legacySaved && typeof legacySaved === 'object' && Object.keys(legacySaved).length) {
          const migrated = { ...legacySaved, ...(legacySaved.scores === false ? { guacscore: false, guacwizard: false } : {}) }
          return { web: { ...current.web, ...migrated }, mobile: { ...current.mobile, ...migrated } }
        }
        return current
      })
    } catch {}
  }, [])

  const activeScope = customizing ? customizationTarget : deviceScope
  const visibleWidgets = activeScope === 'both'
    ? Object.fromEntries(DASHBOARD_WIDGETS.map(([key]) => [key, widgetProfiles.web[key] !== false && widgetProfiles.mobile[key] !== false]))
    : widgetProfiles[activeScope] || defaultWidgetVisibility()

  function setWidgetVisible(key, visible) {
    const scope = customizing ? customizationTarget : deviceScope
    setWidgetProfiles(current => {
      const next = scope === 'both'
        ? { web: { ...current.web, [key]: visible }, mobile: { ...current.mobile, [key]: visible } }
        : { ...current, [scope]: { ...current[scope], [key]: visible } }
      if (!customizing) {
        localStorage.setItem('getguac_dashboard_widgets_v2', JSON.stringify(next))
        void syncDashboardPreferences(next)
      }
      return next
    })
  }

  function beginCustomizing() {
    setCustomizationTarget(deviceScope)
    setCustomSnapshot({ web: { ...widgetProfiles.web }, mobile: { ...widgetProfiles.mobile } })
    setLibraryOpen(true)
    setCustomizing(true)
  }

  function undoCustomization() {
    if (customSnapshot) setWidgetProfiles({ web: { ...customSnapshot.web }, mobile: { ...customSnapshot.mobile } })
  }

  function saveLayout() {
    localStorage.setItem('getguac_dashboard_widgets_v2', JSON.stringify(widgetProfiles))
    void syncDashboardPreferences(widgetProfiles)
    setCustomSnapshot({ web: { ...widgetProfiles.web }, mobile: { ...widgetProfiles.mobile } })
    setCustomizing(false)
  }

  function resetWidgets() {
    const scope = customizing ? customizationTarget : deviceScope
    const next = scope === 'both'
      ? { web: defaultWidgetVisibility(), mobile: defaultWidgetVisibility() }
      : { ...widgetProfiles, [scope]: defaultWidgetVisibility() }
    localStorage.setItem('getguac_dashboard_widgets_v2', JSON.stringify(next))
    setWidgetProfiles(next)
    void syncDashboardPreferences(next)
  }

  async function syncDashboardPreferences(profiles) {
    if (!userId) return
    try {
      const sb = createSbClient()
      await sb.from('profiles').update({ dashboard_preferences: { version: 2, web: { visible: profiles.web }, mobile: { visible: profiles.mobile } } }).eq('id', userId)
    } catch {}
  }

  const canShow = key => visibleWidgets[key] !== false && (!PREMIUM_WIDGETS.has(key) || isPremium)
  const hasCardsAvailableToAdd = DASHBOARD_WIDGETS.some(([key, , tier]) =>
    visibleWidgets[key] === false && (tier !== 'premium' || isPremium)
  )

  // Fixed greeting — same regardless of time of day.
  const greeting = 'Hello!!'

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
    if(!today)return receipts
    const cutoffDate = periodStart(period, periodCount, today)
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
    queryKey: ['profile_smash_days_bonus', userId],
    queryFn: async () => {
      if (!userId) return 0
      const { data } = await sb.from('profiles').select('smash_days_bonus').eq('id', userId).maybeSingle()
      return Number(data?.smash_days_bonus ?? 0)
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
  const { data: guacMoney = 0 } = useQuery({
    queryKey: ['guac-money-points'],
    queryFn: fetchGuacMoneyPoints,
    staleTime: 60_000,
  })
  const { data: economicNews = null } = useQuery({
    queryKey: ['economic-news'],
    queryFn: async () => {
      const response = await fetch('/api/economic-news')
      if (!response.ok) throw new Error('Economic news unavailable')
      return response.json()
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
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
  const heroMetric = computeDashboardAnalysis({ receipts: spendingReceipts, period, periodCount }).metrics.totalSpent
  const categoryTotals = filtered.reduce((map, receipt) => {
    const key = receipt.category || 'uncategorized'
    map.set(key, (map.get(key) || 0) + Number(receipt.total_amount || 0))
    return map
  }, new Map())
  const leadingCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <div className={`dashboard-canvas space-y-3 transition-[padding] ${customizing ? 'dashboard-customizing' : ''} ${customizing && libraryOpen ? 'xl:pr-[302px]' : ''}`}>
      {/* Soft neutral gradient behind the whole dashboard screen. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-gradient-to-b from-[#FAFAFA] via-[#F5F5F4] to-[#EEEEEC]" />
      {/* If the user signed up via /?ref=<CODE>, this fires once on
          first dashboard load to credit 3 Smash days to both sides.
          Renders nothing — pure side-effect island. */}
      <PostSignupReferralApply />
      {/* First-run only: zero receipts means every tile below reads $0 and there
          is nothing to interpret yet. Replaced by nothing at all once the first
          receipt exists — the tiles themselves are untouched either way. */}
      {!find10 && initialReceipts.length === 0 && <FirstReceiptPanel firstName={firstName} />}
      {!customizing ? <header className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div><h1 className="text-2xl font-black tracking-tight text-[#08142D]">Welcome back, {firstName}!</h1><p className="text-sm text-slate-500">Here’s your money story.</p></div>
        <button type="button" onClick={beginCustomizing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition-colors hover:border-violet-300 hover:text-violet-700"><Settings2 size={15} /> Customize</button>
      </header> : <header className="sticky top-0 z-30 -mx-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-[#FAFAFA]/95 px-2 py-3 backdrop-blur">
        <div><h1 className="text-xl font-black text-[#08142D]">Customize dashboard</h1><p className="text-xs text-slate-500">Choose different cards for web and mobile.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Dashboard layout target">
            {[['both','Both',Copy],['web','Web',Monitor],['mobile','Mobile',Smartphone]].map(([scope,label,Icon])=><button key={scope} type="button" onClick={()=>setCustomizationTarget(scope)} aria-pressed={customizationTarget===scope} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${customizationTarget===scope?'bg-violet-600 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'}`}><Icon size={13}/>{label}</button>)}
          </div>
          <button type="button" onClick={undoCustomization} className="dashboard-edit-button"><ArrowLeft size={14} /> Undo</button>
          <button type="button" onClick={() => setCustomizing(false)} className="dashboard-edit-button"><Eye size={14} /> Preview</button>
          <button type="button" onClick={resetWidgets} className="dashboard-edit-button"><RotateCcw size={14} /> Reset</button>
          <button type="button" onClick={saveLayout} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"><Save size={14} /> Save layout</button>
        </div>
      </header>}

      {find10 && !customizing && <Find10DashboardExperience data={find10} userId={userId} />}
      {!customizing && <DashboardNewsTicker news={economicNews?.items || []} />}

      {customizing && libraryOpen && <aside className="fixed bottom-3 right-3 top-[72px] z-40 hidden w-[286px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(20,25,60,.18)] xl:flex xl:flex-col">
        <div className="flex items-start justify-between border-b border-slate-100 p-4"><div><h2 className="font-black text-[#08142D]">Card library</h2><p className="mt-1 text-[11px] text-slate-500">Editing {customizationTarget === 'both' ? 'both dashboards' : `the ${customizationTarget} dashboard`}.</p></div><button type="button" onClick={() => setLibraryOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close card library"><X size={17} /></button></div>
        <div className="p-3"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Search cards" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></div><div className="mt-2 flex flex-wrap gap-1">{['All','Money','Spending','Insights','Lifestyle'].map((label,index)=><button key={label} type="button" className={`rounded-lg border px-2 py-1 text-[9px] font-black ${index===0?'border-violet-200 bg-violet-50 text-violet-700':'border-slate-200 text-slate-500'}`}>{label}</button>)}</div></div>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">{DASHBOARD_WIDGETS.filter(([, label]) => label.toLowerCase().includes(librarySearch.toLowerCase())).map(([key, label, tier], index) => { const locked = tier === 'premium' && !isPremium; const added = visibleWidgets[key] !== false && !locked; const iconTones = ['bg-violet-50 text-violet-600','bg-orange-50 text-orange-600','bg-blue-50 text-blue-600','bg-rose-50 text-rose-600','bg-cyan-50 text-cyan-600','bg-fuchsia-50 text-fuchsia-600']; return <div key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconTones[index % iconTones.length]}`}><Settings2 size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-slate-800">{label}</p><p className="text-[10px] text-slate-400">{tier === 'premium' ? 'Premium insight' : 'Dashboard card'}</p></div><button type="button" disabled={locked} onClick={() => setWidgetVisible(key, !added)} className={`inline-flex h-8 min-w-[48px] items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-black ${added ? 'border-violet-200 bg-violet-50 text-violet-700' : locked ? 'cursor-not-allowed border-slate-100 text-slate-300' : 'border-violet-200 text-violet-700 hover:bg-violet-50'}`}>{added ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}</button></div> })}</div>
        <div className="border-t border-violet-100 bg-violet-50 p-3 text-[10px] leading-4 text-violet-700">Hiding a card does not remove the feature. You can always add it back.</div>
      </aside>}
      {customizing && !libraryOpen && <button type="button" onClick={() => setLibraryOpen(true)} className="fixed right-4 top-24 z-40 hidden rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-lg xl:inline-flex">Open card library</button>}

      <CustomizationCanvas
        editing={customizing}
        metric={heroMetric}
        receipts={filtered}
        planning={initialPlanning}
        chartPeriod={period}
        today={today}
        chartPeriodCount={periodCount}
        stores={chartData}
        rangeLabel={rangeLabel}
        guacMoney={guacMoney}
        economicNews={economicNews}
        canShow={canShow}
        setWidgetVisible={setWidgetVisible}
        hasCardsAvailableToAdd={hasCardsAvailableToAdd}
        onAddCard={() => customizing ? setLibraryOpen(true) : beginCustomizing()}
      />
      {canShow('steals') && <DashboardSteals />}

      {SHOW_LEGACY_DASHBOARD && <>

      <SpendingHero metric={heroMetric} transactionCount={filtered.length} rangeLabel={rangeLabel} leadingCategory={leadingCategory} />

      {/* Standard time-frame picker — shared with /guacwizard and
          every other internal page. */}
      <TimeframePicker
        trailing={
          <span className="text-xs text-gray-400">
            {filtered.length} transaction{filtered.length === 1 ? '' : 's'} • {rangeLabel}
          </span>
        }
      />

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
      {/* Engagement strip — responsive grid so the four tiles always
          fit the screen (2×2 on mobile, 1×4 on desktop) instead of
          overflowing off the right edge. All tiles stretch to the
          same height. Each routes to its detail surface (GuacScore →
          /guacanomics, GuacWizard → /guacwizard, GuacMoney →
          /validate, Rewards → /rewards). FadeUpStagger gives each a
          40ms offset entrance; each tile carries its own CountUp so
          timeframe flips smooth-retally inside. */}
      {(canShow('guacscore') || canShow('guacwizard') || canShow('budget') || canShow('goals') || canShow('wealth')) && <div className="space-y-3">
      {canShow('budget') && <div><BudgetSnapshot receipts={spendingReceipts} data={initialPlanning} /></div>}
      {canShow('goals') && <GoalsSnapshot goals={initialPlanning?.goals || []} />}
      {canShow('wealth') && <WealthSnapshot assets={initialPlanning?.wealthAccounts || []} debts={initialPlanning?.debtAccounts || []} />}
      {(canShow('guacscore') || canShow('guacwizard')) && <FadeUpStagger className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3" delayMs={50}>
        {/* GuacScore reads lifetime rated purchases, not just the
            current period filter — otherwise a 3-month dashboard
            window with no rated purchases inside it shows score=0
            even when the user has rated items further back. The
            big card on /guacanomics already uses a wider window;
            this matches that behavior. */}
        {canShow('guacscore') && <Link href="/guacanomics" className="block h-[96px] min-w-0">
          <GuacScoreTileWithBankBite receipts={spendingReceipts} />
        </Link>}
        {canShow('guacwizard') && <div className="h-[96px] min-w-0"><GuacWizardTile /></div>}
      </FadeUpStagger>}

      {/* Mobile parity: the monthly money-flow snapshot is the primary
          planning card, immediately after the compact score strip. */}
      </div>}

      {/* Marketplace searches the user saved (claims any anonymous cookie
          saves into the account on load). Self-hides when none. */}
      {canShow('saved') && <DashboardSavedSearches />}

      {(canShow('categories') || canShow('stores')) && <div className="grid gap-3 xl:grid-cols-2">
        {canShow('categories') && <SpendingByCategory receipts={filtered} rangeLabel={rangeLabel} />}

      {canShow('stores') && <div className="min-w-0">
        {/* Spending chart */}
        <div className="card rounded-[20px] p-4 sm:p-5">
          <h3 className="gg-h2 mb-1">Spending by Store</h3>
          <p className="text-xs text-gray-500 mb-3">Tap a store to see its receipts.</p>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No transactions for this period
            </div>
          ) : (
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {chartData.map((d, i) => (
                <button
                  key={i}
                  onClick={() => router.push(buildReceiptsUrl({
                    store: d.fullName,
                    period: periodToReceiptsChip(period, periodCount),
                  }))}
                  className="group flex w-[112px] shrink-0 snap-start flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/70 px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md"
                  title={`${d.fullName} — $${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                >
                  <span className="rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200 transition group-hover:ring-emerald-300">
                    <StoreLogo storeName={d.fullName} size={48} className="!rounded-full !shadow-none !ring-0" />
                  </span>
                  <span className="mt-2 w-full truncate text-[11px] font-bold text-slate-600">{d.fullName}</span>
                  <span className="mt-0.5 gg-num text-sm font-black text-guac-ink">${Math.round(d.amount).toLocaleString('en-US')}</span>
                  <span className="text-[10px] text-slate-400">{d.count} purchase{d.count === 1 ? '' : 's'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>}
      </div>}

      {canShow('economic') && <EconomicPressure data={initialPlanning} />}

      {/* Dashboard ad inventory is deliberately independent from the user's
          card preferences. AdSlot stays at zero height until Google confirms
          a fill, collapses after a no-fill/timeout, is suppressed in the
          native WebView, and never requests an ad for premium subscribers. */}
      {!isPremium && <AdSlot
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD || process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'}
        minHeight={90}
        className="mx-auto w-full max-w-4xl"
        tier={2}
      />}

      {/* Same sequence as mobile: store analysis, then detailed metrics. */}
      {canShow('details') && <AllPaymentsScroll
        spendingReceipts={spendingReceipts}
        period={period}
        periodCount={periodCount}
      />}

      {/* Recent transactions table */}
      {canShow('transactions') && <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="gg-h2">Recent Transactions</h3>
          <Link href="/receipts" title="All receipts" aria-label="All receipts"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm">
            <ArrowRight size={14} />
          </Link>
        </div>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No transactions this period</div>
        ) : (
          <table className="gg-tbl">
            <thead>
              <tr>
                <th className="text-left">Merchant</th>
                <th className="text-left">Date</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 8).map((r, idx) => (
                <tr
                  key={r.id}
                  style={{ animationDelay: `${idx * 35}ms`, animationDuration: '220ms' }}
                  className="hover:bg-gray-50 anim-fadeup">
                  <td>
                    <Link href={`/receipts/${r.id}`} className="flex items-center gap-2.5 group">
                      <StoreLogo storeName={r.store_name} size={28} />
                      <span className="font-semibold text-guac-ink group-hover:text-gray-900">{displayStoreName(r.store_name)}</span>
                    </Link>
                  </td>
                  <td className="gg-num text-guac-muted whitespace-nowrap">{formatDateShort(r.date)}</td>
                  <td className="text-right gg-num font-extrabold text-guac-ink">${parseFloat(r.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="text-right gg-num text-guac-faint">${parseFloat(r.tax_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="text-right">
                    <span className={r.business_purchase ? 'badge bg-slate-200 text-slate-700' : 'badge-gray'}>
                      {r.business_purchase ? 'Business' : 'Personal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>}

      {/* "Steals for you" — moved to the dashboard's bottom slot (the former
          Recent Activity position). Deals the Steals job found, grouped by the
          user's saved searches (top 5 each, best discount first). Self-hides
          when no steals have been found yet. */}
      {canShow('steals') && <DashboardSteals />}
      </>}
      <style jsx global>{`
        .dashboard-edit-button {
          display:inline-flex; align-items:center; gap:.45rem; border:1px solid #dbe2ea;
          border-radius:.75rem; background:#fff; padding:.625rem .85rem; color:#475569;
          font-size:.75rem; font-weight:800; transition:all .16s ease;
        }
        .dashboard-edit-button:hover { border-color:#c4b5fd; color:#6d28d9; background:#faf8ff; }
        .dashboard-edit-card {
          position:relative; overflow:hidden; border:0;
          border-radius:0; background:transparent; box-shadow:none;
        }
        .dashboard-customizing .dashboard-edit-card { border:0; }
        .dashboard-canvas:not(.dashboard-customizing) .edit-card-control { display:none; }
        .dashboard-customizing > section,
        .dashboard-customizing > div:not(.fixed):not(.sticky),
        .dashboard-customizing > section + div {
          position:relative; outline:1.5px dashed rgba(124,58,237,.34); outline-offset:3px;
        }
        .dashboard-customizing > section::before,
        .dashboard-customizing > div:not(.fixed):not(.sticky)::before {
          content:'⋮⋮'; position:absolute; z-index:20; left:6px; top:6px; color:#6d28d9;
          font-size:12px; font-weight:900; letter-spacing:-4px; opacity:.75; pointer-events:none;
        }
        @media (max-width:1279px) {
          .dashboard-customizing { padding-right:0 !important; }
        }
      `}</style>
    </div>
  )
}

function CustomizationCanvas({ editing, metric, receipts, today, chartPeriod, chartPeriodCount, planning, stores, rangeLabel, guacMoney, economicNews, canShow, setWidgetVisible, hasCardsAvailableToAdd, onAddCard }) {
  const [categoryBasis, setCategoryBasis] = useState('receipt')
  const money = (value, digits = 0) => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })
  const periodSpent = receipts.reduce((sum, receipt) => sum + Number(receipt.total_amount || 0), 0)
  // Income, bills and savings are monthly by nature, so cash flow is computed
  // over the planning month — not the dashboard's selected timeframe, which can
  // span years and used to be subtracted from one month of income. Same engine
  // and same period as /budget, so the two screens cannot disagree.
  const flow = summarizeMoneyFlow({
    incomeSources: planning?.incomeSources || [],
    receipts: planning?.monthReceipts || [],
    billCycles: planning?.billCycles || [],
    savings: planning?.savings || [],
  })
  const spent = flow.actualExpenses
  const bills = flow.upcomingBills
  const savings = flow.plannedSavings
  const remaining = flow.projectedRemaining
  const goals = planning?.goals || []
  const dashboardGoalCards = [
    ...goals.slice(0, 3).map(goal => ({ goal, key: goal.id })),
    ...rotatingGoalIdeas(goals).map(idea => ({ suggestion: idea, key: `idea-${idea.goal_type}` })),
  ]
  const categoryMap = new Map()
  if (categoryBasis === 'item') {
    const visibleReceiptIds = new Set(receipts.map(receipt => receipt.id))
    for (const item of planning?.items || []) {
      if (item.receipt_id && !visibleReceiptIds.has(item.receipt_id)) continue
      const key = item.category || 'Other'
      const amount = Number(item.price || 0)
      if (amount <= 0) continue
      categoryMap.set(key, (categoryMap.get(key) || 0) + amount)
    }
  } else {
    for (const receipt of receipts) {
      if (receipt.is_return) continue
      const key = receipt.category || 'Other'
      categoryMap.set(key, (categoryMap.get(key) || 0) + Number(receipt.total_amount || 0))
    }
  }
  const categoryRows = [...categoryMap.entries()].sort((a,b) => b[1] - a[1]).slice(0,6)
  const categoryTotal = categoryRows.reduce((sum,row) => sum + row[1], 0)
  let cursor = 0
  const palette = categoryRows.map(([name])=>donutCategoryColor(name))
  const segments = categoryRows.map(([,amount],index) => { const start = cursor; cursor += categoryTotal ? amount / categoryTotal * 100 : 0; return `${palette[index]} ${start}% ${cursor}%` }).join(',')
  const compactCards = [
    ['guacscore','GuacScore',CircleGauge,'Review','See your calculated score','/guacanomics','bg-blue-50 text-blue-700'],
    ['worthit','Worth It',Scale,'Review','Rate your purchases','/validate','bg-orange-50 text-orange-700'],
    ['guacwizard','GuacWizard',Wand2,'Scan receipts','Get smarter suggestions','/guacwizard','bg-violet-50 text-violet-700'],
    ['guacmoney','GuacMoney',Landmark,Number(guacMoney||0).toLocaleString(),'value tracked','/goals/guacmoney.html','bg-amber-50 text-amber-700'],
    ['rewards','Rewards',Gift,'Review','Check saved rewards','/rewards','bg-fuchsia-50 text-fuchsia-700'],
    ['returns','Returns',Undo2,'Review','Check return eligibility','/returns','bg-cyan-50 text-cyan-700'],
    ['bills','Bills',CalendarDays,String((planning?.billCycles || []).length),'bills due soon','/bills','bg-rose-50 text-rose-700'],
  ]
  const assetTotal = (planning?.wealthAccounts || []).reduce((sum,row)=>sum+Number(row.balance||0),0)
  const debtTotal = (planning?.debtAccounts || []).reduce((sum,row)=>sum+Number(row.balance||0),0)
  const subscriptionCount = (planning?.billCycles || []).length
  const latestReceipt = receipts[0]
  const leadEconomicNews = economicNews?.items?.[0]
  const recentTransactions = [...receipts].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,8)
  const topGoal = goals[0]
  const topGoalCurrent = Number(topGoal?.current_amount || 0)
  const topGoalTarget = Number(topGoal?.target_amount || 0)
  const topGoalRemaining = Math.max(0, topGoalTarget - topGoalCurrent)
  const suggestedSave = remaining > 0 && topGoalRemaining > 0 ? Math.min(topGoalRemaining, Math.max(1, Math.min(5, Math.floor(remaining * 0.02)))) : 0
  const topGoalProgress = topGoalTarget > 0 ? Math.min(100, topGoalCurrent / topGoalTarget * 100) : 0
  const optionalCards = [
    ['wealth','Net worth & debt',Landmark,money(assetTotal-debtTotal),`${money(assetTotal)} assets · ${money(debtTotal)} debt`,'/wealth','bg-blue-50 text-blue-700'],
    ['economic','Economic pressure',Scale,'Pressure map','See how prices, debt costs, housing, and recurring obligations affect your plan','/guacanomics','bg-orange-50 text-orange-700'],
    ['income','Income',TrendingUp,money(flow.income),'Income sources and monthly cash flow','/budget','bg-cyan-50 text-cyan-700'],
    ['subscriptions','Subscriptions',CalendarDays,String(subscriptionCount),subscriptionCount===1?'recurring bill tracked':'recurring bills tracked','/bills','bg-violet-50 text-violet-700'],
    ['personalInflation','Personal inflation',Activity,'Price trend','Compare what repeat purchases cost you','/reports','bg-fuchsia-50 text-fuchsia-700'],
    ['shrinkflation','Shrinkflation',Scale,'Size watch','Compare package size against unit price','/reports','bg-orange-50 text-orange-700'],
    ['productRecalls','Product recalls',TriangleAlert,'Purchase check','Review recall matches from saved receipts','/returns','bg-rose-50 text-rose-700'],
    ['economicNews','Economic news',Newspaper,leadEconomicNews?.title||'Economic brief',leadEconomicNews?.impact||'Rates, inflation, debt, jobs, and prices translated into personal impact','/news?tab=news','bg-indigo-50 text-indigo-700'],
    ['jobMarket','Job market',BriefcaseBusiness,'Jobs & wages','Employment signals that affect your plan','/guacanomics','bg-purple-50 text-purple-700'],
    ['marketSentiment','Market sentiment',TrendingUp,'Market pulse','See the signals behind borrowing and saving','/guacanomics','bg-sky-50 text-sky-700'],
    ['guides','Guides',BookOpen,'Money guides','Practical next steps for your goals','/learn','bg-teal-50 text-teal-700'],
    ['recentActivity','Recent activity',ReceiptIcon,latestReceipt?.store_name||'No recent receipt',latestReceipt?`${money(latestReceipt.total_amount)} · ${formatDateShort(latestReceipt.date)}`:'Add a receipt to begin','/receipts','bg-amber-50 text-amber-700'],
  ]
  return <div className="space-y-3">
    <div className="px-1 pb-1">
      <TimeframePicker
        trailing={
          <span className="whitespace-nowrap text-xs text-slate-400">
            {receipts.length} transaction{receipts.length === 1 ? '' : 's'} • {rangeLabel}
          </span>
        }
      />
    </div>
    {canShow('moneyOverview') && <section className="dashboard-edit-card p-4">
      <EditCardHeader title="Money overview" widgetKey="moneyOverview" setWidgetVisible={setWidgetVisible} />
      <div className="mt-3">
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[130px_minmax(260px,1fr)_300px_190px] 2xl:divide-x 2xl:divide-slate-100">
          <div><p className="text-[11px] font-bold text-slate-500">Spending trend</p><p className="mt-2 text-2xl font-black text-[#08142D]">{money(periodSpent)}</p><p className="text-[11px] text-slate-500">spent · {rangeLabel}</p><p className={`mt-3 text-xs font-black ${remaining >= 0 ? 'text-cyan-600' : 'text-rose-600'}`}>{money(remaining)} {rangeLabel.toLowerCase()} safe to spend</p></div>
          <div className="px-3"><svg viewBox="0 0 520 125" preserveAspectRatio="none" className="h-[130px] w-full"><defs><linearGradient id="editChart" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2563eb" stopOpacity=".18"/><stop offset="1" stopColor="#2563eb" stopOpacity="0"/></linearGradient></defs><path d="M5 105 C50 96 76 88 110 80 S170 64 205 68 S260 48 302 52 S350 49 390 35 S455 28 515 10 L515 120 L5 120Z" fill="url(#editChart)"/><path d="M5 105 C50 96 76 88 110 80 S170 64 205 68 S260 48 302 52 S350 49 390 35 S455 28 515 10" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke"/><g fill="#2563eb">{[5,110,205,302,390,515].map((x,i)=><circle key={x} cx={x} cy={[105,80,68,52,35,10][i]} r="4" vectorEffect="non-scaling-stroke"/>)}</g></svg></div>
          <div className="px-6"><p className="text-xs font-black text-slate-700">{rangeLabel} budget</p><div className="mt-2 flex items-center gap-4"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{background:segments ? `conic-gradient(${segments})` : '#e2e8f0'}}><div className="grid h-[70%] w-[70%] place-items-center rounded-full bg-white text-center"><div><p className="text-sm font-black text-slate-700">{money(categoryTotal)}</p><p className="text-[8px] text-slate-400">total</p></div></div></div><div className="min-w-0 flex-1 space-y-1">{categoryRows.length ? categoryRows.map(([name], index) => <div key={name} className="flex items-center gap-2 text-[9px] text-slate-600"><span className="h-2 w-2 shrink-0 rounded-full" style={{background:palette[index]}}/><span className="truncate">{categoryLabel(name)}</span></div>) : <p className="text-[9px] leading-4 text-slate-400">Scan receipts to build categories for this period.</p>}</div></div></div>
          <div className="space-y-2 px-5 text-xs"><p className="font-black text-slate-700">{rangeLabel} cash flow</p>{[['Income',flow.income,'text-blue-600'],['Bills',bills,'text-orange-600'],['Spending',spent,'text-rose-600'],['Savings',savings,'text-violet-600'],['Remaining',remaining,remaining < 0 ? 'text-rose-600' : 'text-cyan-700']].map(([label,value,tone])=><div key={label} className="flex justify-between gap-4"><span className="text-slate-500">{label}</span><strong className={Number(value) < 0 ? 'text-rose-600' : tone}>{money(value)}</strong></div>)}</div>
        </div>
      </div>
    </section>}

    {canShow('anomalies') && <section className="dashboard-edit-card p-4"><EditCardHeader title="Spending anomalies" widgetKey="anomalies" setWidgetVisible={setWidgetVisible}/><div className="mt-3"><AnomaliesPanel receipts={receipts} showEmpty /></div></section>}

    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">{compactCards.filter(([key])=>canShow(key)).map(([key,title,Icon,value,detail,href,tone])=><Link href={href} key={title} className="dashboard-edit-card min-h-[112px] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</p><button type="button" onClick={event=>{event.preventDefault();setWidgetVisible(key,false)}} className="edit-card-control rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label={`Hide ${title}`}><X size={12}/></button></div><div className="mt-3 flex items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-sm ${tone}`}><Icon size={21}/></span><div className="min-w-0"><p className="truncate text-lg font-black text-slate-900">{value}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{detail}</p></div></div></Link>)}</div>

    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {canShow('categories') && <section className="dashboard-edit-card min-w-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <EditCardHeader title="Spending by Category" widgetKey="categories" setWidgetVisible={setWidgetVisible}/>
          <div className="inline-flex rounded-lg bg-violet-50 p-1" role="group" aria-label="Category breakdown basis">
            <button type="button" onClick={() => setCategoryBasis('receipt')} aria-pressed={categoryBasis === 'receipt'} className={`rounded-md px-2.5 py-1 text-[10px] font-black transition ${categoryBasis === 'receipt' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>By receipt</button>
            <button type="button" onClick={() => setCategoryBasis('item')} aria-pressed={categoryBasis === 'item'} className={`rounded-md px-2.5 py-1 text-[10px] font-black transition ${categoryBasis === 'item' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>By item</button>
          </div>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">{categoryBasis === 'receipt' ? 'Receipt totals grouped by receipt category.' : 'Line-item prices grouped by item category.'}</p>
        <div className="mt-3 flex items-center gap-5">
          <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{background:segments?`conic-gradient(${segments})`:'#e2e8f0'}}><div className="grid h-[70%] w-[70%] place-items-center rounded-full bg-white text-center"><div><p className="text-sm font-black">{money(categoryTotal)}</p><p className="text-[9px] text-slate-400">total</p></div></div></div>
          <div className="min-w-0 flex-1 space-y-1.5">{categoryRows.length ? categoryRows.map(([name,amount],index)=><div key={name} className="flex items-center gap-2 text-[10px]"><span className="h-2 w-2 rounded-full" style={{background:palette[index]}}/><span className="flex-1 truncate">{categoryLabel(name)}</span><strong>{money(amount)}</strong><span className="w-8 text-right text-slate-400">{categoryTotal?Math.round(amount/categoryTotal*100):0}%</span></div>) : <p className="text-xs text-slate-400">No categorized {categoryBasis === 'item' ? 'items' : 'receipts'} in this period.</p>}</div>
        </div>
      </section>}
    {canShow('stores') && <section className="dashboard-edit-card p-4"><EditCardHeader title="Stores & activity" widgetKey="stores" setWidgetVisible={setWidgetVisible}/><div className="mt-5 flex gap-4 overflow-hidden">{stores.slice(0,6).map(store=><Link href={buildReceiptsUrl({store:store.fullName})} key={store.fullName} className="min-w-[70px] text-center"><StoreLogo storeName={store.fullName} size={45} className="mx-auto !rounded-full"/><p className="mt-2 text-xs font-black">{money(store.amount)}</p><p className="text-[9px] text-slate-400">{store.count} buys</p></Link>)}</div><p className="mt-4 text-[10px] text-slate-400">{rangeLabel}</p></section>}</div>

    {canShow('expenses30') && <Expenses30DayCard receipts={receipts} today={today} period={chartPeriod} periodCount={chartPeriodCount} rangeLabel={rangeLabel} header={<EditCardHeader title="Expenses over time" widgetKey="expenses30" setWidgetVisible={setWidgetVisible}/>} />}

    {canShow('transactions') && <section className="dashboard-edit-card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-4"><EditCardHeader title="Recent transactions" widgetKey="transactions" setWidgetVisible={setWidgetVisible}/><Link href="/receipts" className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600" aria-label="View all transactions"><ArrowRight size={15}/></Link></div><div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Merchant</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Tax</th><th className="px-4 py-3 text-right">Type</th></tr></thead><tbody>{recentTransactions.length?recentTransactions.map(receipt=><tr key={receipt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="px-4 py-2.5"><Link href={`/receipts/${receipt.id}`} className="flex items-center gap-3"><StoreLogo storeName={receipt.store_name} size={28}/><span className="max-w-[260px] truncate text-xs font-black text-slate-800">{displayStoreName(receipt.store_name||'Unknown merchant')}</span></Link></td><td className="px-4 py-2.5 text-xs font-bold text-slate-500">{formatDateShort(receipt.date)}</td><td className="px-4 py-2.5 text-right text-xs font-black text-slate-900">{money(receipt.total_amount,2)}</td><td className="px-4 py-2.5 text-right text-xs font-bold text-slate-400">{money(receipt.tax_paid,2)}</td><td className="px-4 py-2.5 text-right"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${receipt.business_purchase?'bg-violet-50 text-violet-700':'bg-slate-100 text-slate-500'}`}>{receipt.business_purchase?'Business':'Personal'}</span></td></tr>):<tr><td colSpan="5" className="px-4 py-8 text-center text-xs text-slate-400">Your recent receipts will appear here.</td></tr>}</tbody></table></div></section>}

    {optionalCards.some(([key])=>canShow(key)) && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{optionalCards.filter(([key])=>canShow(key)).map(([key,title,Icon,value,detail,href,tone])=><Link href={href} key={key} className="dashboard-edit-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-2"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={19}/></span><button type="button" onClick={event=>{event.preventDefault();setWidgetVisible(key,false)}} className="edit-card-control rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-500">Hide</button></div><p className="mt-3 text-[11px] font-black text-slate-600">{title}</p><p className="mt-1 text-base font-black text-slate-950">{value}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</p></Link>)}</div>}

    {canShow('saved') && <section className="dashboard-edit-card p-4"><EditCardHeader title="Saved searches" description="Keep the products you are watching close and jump back into price comparisons." widgetKey="saved" setWidgetVisible={setWidgetVisible}/><div className="mt-3"><DashboardSavedSearches embedded showEmpty /></div></section>}

    {(canShow('goals') || canShow('bestMove') || canShow('saveNext')) && <div className="goals-actions-layout grid gap-4">
      {canShow('goals') && <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-black text-[#08142D]">Goals for you</h2>
          <Link href="/wealth" className="text-sm font-black text-violet-700 hover:text-violet-900">See more</Link>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">{dashboardGoalCards.map((card, index) => <DashboardGoalCard key={card.key} goal={card.goal} suggestion={card.suggestion} index={index} money={money}/>)}</div>
      </section>}
      {(canShow('bestMove') || canShow('saveNext')) && <aside className="grid min-w-0 content-start gap-2 xl:border-l xl:border-slate-100 xl:pl-3">
        {canShow('bestMove') && <BestMoveCard topGoal={topGoal} setWidgetVisible={setWidgetVisible} />}
        {canShow('saveNext') && <SaveNextCard topGoal={topGoal} suggestedSave={suggestedSave} topGoalCurrent={topGoalCurrent} topGoalTarget={topGoalTarget} topGoalProgress={topGoalProgress} money={money} setWidgetVisible={setWidgetVisible} />}
      </aside>}
    </div>}

    {canShow('details') && <div className="relative"><button type="button" onClick={()=>setWidgetVisible('details',false)} className="edit-card-control absolute right-4 top-4 z-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">Hide</button><PersonalizedSavingsFeed receipts={receipts} goals={goals} bills={planning?.billCycles || []} items={planning?.items || []} stores={stores}/></div>}
    {hasCardsAvailableToAdd && <button
      type="button"
      onClick={onAddCard}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-white py-3 text-sm font-black text-violet-600"
    ><Plus size={18}/> Add a card to your dashboard</button>}
  </div>
}

function DashboardNewsTicker({ news }) {
  const items = news.slice(0, 8)
  if (!items.length) return null
  return <section aria-label="Overall market watch and financial news" className="flex min-h-12 items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <Link href="/news" className="flex h-12 shrink-0 items-center gap-2 bg-[#08142D] px-4 text-xs font-black text-white"><TrendingUp size={16}/> Market Watch</Link>
    <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto px-3 [scrollbar-width:none]">
      {items.map(item => <Link key={`${item.source}-${item.link}`} href={`/news?story=${encodeURIComponent(item.link)}`} className="flex shrink-0 items-center gap-2 py-2 text-sm font-bold text-slate-700 hover:text-violet-700"><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase text-violet-700">{item.topic}</span><span className="max-w-[420px] truncate">{item.title}</span><span className="text-xs font-medium text-slate-400">{item.source}</span></Link>)}
    </div>
    <Link href="/news" className="shrink-0 px-4 text-xs font-black text-violet-700">View all →</Link>
  </section>
}

function BestMoveCard({ topGoal, setWidgetVisible }) {
  return <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-violet-50 p-3.5">
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><TrendingUp size={20}/></span>
      <div className="min-w-0 flex-1">
        <EditCardHeader title="Best move" widgetKey="bestMove" setWidgetVisible={setWidgetVisible} compact />
        <p className="mt-1 text-xs font-black leading-4 text-slate-900">Put the next extra dollar toward your top goal.</p>
        <Link href={topGoal?.id ? `/wealth?planGoal=${encodeURIComponent(topGoal.id)}#goal-action-plan` : '/wealth?newGoal=1'} className="mt-1 inline-flex text-[10px] font-black text-violet-700">View action plan →</Link>
      </div>
    </div>
  </div>
}

function SaveNextCard({ topGoal, suggestedSave, topGoalCurrent, topGoalTarget, topGoalProgress, money, setWidgetVisible }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  async function saveNext() {
    if (!topGoal?.id || saving) return
    setSaving(true)
    setSaveError('')
    const response = await fetch('/api/goals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'contribute', id: topGoal.id, amount: suggestedSave }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) { setSaveError(payload.error || 'Could not add the contribution.'); setSaving(false); return }
    router.push(`/wealth?planGoal=${encodeURIComponent(topGoal.id)}&contributed=${encodeURIComponent(payload.added)}#goal-action-plan`)
  }
  return <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-cyan-50 p-3.5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><GuacMascot expression="thumbsup" size={32}/></div>
      <div className="min-w-0 flex-1">
        <EditCardHeader title="Save next" widgetKey="saveNext" setWidgetVisible={setWidgetVisible} compact />
        <p className="mt-1 text-xs font-black leading-4 text-slate-900">{topGoal ? (suggestedSave > 0 ? `Try ${money(suggestedSave)} toward ${topGoal.name}.` : `${topGoal.name} is your next savings focus.`) : 'Build your first cushion.'}</p>
        {topGoal && <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500" style={{width:`${topGoalProgress}%`}}/></div><p className="mt-1 text-[9px] font-bold text-slate-500">{money(topGoalCurrent)} of {money(topGoalTarget)} · {Math.round(topGoalProgress)}%</p></>}
        {topGoal ? <button type="button" onClick={saveNext} disabled={saving || suggestedSave <= 0} className="mt-1 inline-flex text-[10px] font-black text-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Adding…' : `Add ${money(suggestedSave)} & open goal`} →</button> : <Link href="/wealth?newGoal=1" className="mt-1 inline-flex text-[10px] font-black text-violet-700">Start a goal →</Link>}
        {saveError && <p role="alert" className="mt-1 text-[9px] font-bold text-red-600">{saveError}</p>}
      </div>
    </div>
  </div>
}

const GOAL_VISUALS = {
  emergency: { surface: 'bg-blue-700', image: '/images/goals/emergency-cushion.png', overlay: 'from-blue-950/95 via-blue-900/72 to-blue-700/12', promise: 'Breathing room for the unexpected' },
  home: { surface: 'bg-violet-700', image: '/images/goals/first-home.png', overlay: 'from-violet-950/95 via-violet-900/72 to-violet-700/12', promise: 'Bring the front door closer' },
  travel: { surface: 'bg-orange-600', image: '/images/goals/japan-trip.png', overlay: 'from-orange-950/95 via-orange-900/70 to-orange-600/10', promise: 'Fund the experience before it arrives' },
  debt: { surface: 'bg-rose-700', overlay: 'from-rose-950/95 via-rose-800/80 to-rose-600/40', promise: 'Turn every payment into more room' },
  education: { surface: 'bg-cyan-700', overlay: 'from-cyan-950/95 via-cyan-800/80 to-cyan-600/40', promise: 'Put tomorrow’s learning within reach' },
  vehicle: { surface: 'bg-amber-600', overlay: 'from-amber-950/95 via-amber-800/80 to-amber-500/40', promise: 'Make the road ahead more affordable' },
  retirement: { surface: 'bg-fuchsia-700', overlay: 'from-fuchsia-950/95 via-fuchsia-800/80 to-fuchsia-600/40', promise: 'Give your future dollars more time' },
  other: { surface: 'bg-slate-800', overlay: 'from-slate-950/95 via-slate-800/80 to-slate-600/40', promise: 'Make the next milestone visible' },
}

function DashboardGoalCard({ goal, suggestion, index, money }) {
  const defaults = [
    { name: 'Emergency cushion', goal_type: 'emergency' },
    { name: 'First home fund', goal_type: 'home' },
    { name: 'Dream goal', goal_type: 'travel' },
  ]
  const data = goal || suggestion || defaults[index] || defaults[0]
  const visual = GOAL_VISUALS[data.goal_type] || GOAL_VISUALS.other
  const current = Number(data.current_amount || 0)
  const target = Number(data.target_amount || 0)
  const monthly = Number(data.monthly_contribution || 0)
  const remaining = Math.max(0, target - current)
  const pct = target > 0 ? Math.min(100, Math.max(0, current / target * 100)) : 0
  const months = monthly > 0 && remaining > 0 ? Math.ceil(remaining / monthly) : null
  const targetDate = data.target_date ? new Date(`${data.target_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null
  const goalHref = goal?.id
    ? `/wealth?editGoal=${encodeURIComponent(goal.id)}`
    : `/wealth?newGoal=1&goalType=${encodeURIComponent(data.goal_type)}&goalName=${encodeURIComponent(data.name)}`

  return <Link href={goalHref} className={`group relative h-[190px] w-[72vw] shrink-0 snap-start overflow-hidden rounded-xl text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:w-[230px] xl:min-w-[220px] xl:flex-1 ${visual.surface}`}>
    {visual.image && <img src={visual.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
    <div className={`absolute inset-0 bg-gradient-to-r ${visual.overlay}`} />
    <div className="relative z-10 flex h-full flex-col p-3.5">
      <p className="max-w-[72%] text-[9px] font-bold leading-3.5 text-white/80">{visual.promise}</p>
      <div className="mt-2"><h3 className="max-w-[78%] text-base font-black leading-tight">{data.name}</h3>{target > 0 ? <div className="mt-1 flex items-end gap-1"><p className="text-xl font-black">{money(current)}</p><p className="pb-0.5 text-[8px] font-bold text-white/75">of {money(target)}</p></div> : <p className="mt-1 text-base font-black">Choose your target</p>}</div>
      {target > 0 ? <div className="mt-auto"><div className="flex items-center justify-between gap-3"><p className="text-[8px] font-bold text-white/75">{targetDate ? `Target ${targetDate}` : months ? `About ${months} months` : 'Set your pace'}</p><strong className="text-[10px]">{Math.round(pct)}%</strong></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-white" style={{width:`${pct}%`}}/></div><div className="mt-2 flex items-end justify-between border-t border-white/25 pt-2 text-[8px]"><div><p className="text-white/65">Remaining</p><p className="font-black">{money(remaining)}</p></div><div><p className="text-white/65">Pace</p><p className="font-black">{monthly > 0 ? `${money(monthly)}/mo` : 'Add pace'}</p></div><span className="font-black">Open →</span></div></div> : <div className="mt-auto border-t border-white/25 pt-2"><p className="text-[10px] font-black">Choose an amount and pace</p><span className="mt-1 inline-block text-[9px] font-black">Set up goal →</span></div>}
    </div>
  </Link>
}

const SECTION_DESCRIPTIONS = {
  'Money overview': 'See spending pace and the amount still available after your income, bills, and savings plan.',
  'Goals & progress': 'Track the goals your next dollars are working toward and the strongest next move.',
  'Save next': 'Turn available money into one small, optional action connected to your highest-priority goal.',
  'Spending by Category': 'Switch between receipt totals and individual items to understand what is driving each category.',
  'Stores & activity': 'Compare the merchants receiving the most money and open the receipts behind each total.',
  'Recent transactions': 'Review the latest purchases, taxes, and personal or business classification.',
  'Spending anomalies': 'Compare recent merchants and categories with your own history to surface unusual changes.',
  'Your information cards': 'Add focused views for net worth, subscriptions, inflation, recalls, economic context, and activity.',
  'Discover for you': 'Explore receipt-based price changes, product protection, and guidance relevant to your purchases.',
}

function EditCardHeader({ title, description, widgetKey, setWidgetVisible, compact = false, inverted = false }) {
  const copy = compact ? null : (description || SECTION_DESCRIPTIONS[title])
  const controlBorder = inverted ? 'border-white/30 text-white' : 'border-slate-200 text-slate-500'
  return <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`edit-card-control ${inverted?'text-white/80':'text-violet-600'}`}>⠿</span><h2 className={`text-lg font-black leading-6 ${inverted?'text-white':'text-[#08142D]'}`}>{title}</h2>{!compact && <span className={`text-sm ${inverted?'text-white/70':'text-slate-500'}`}>ⓘ</span>}</div>{copy && <p className={`mt-1 hidden max-w-3xl text-sm leading-6 lg:block ${inverted?'text-white/90':'text-slate-700'}`}>{copy}</p>}</div><div className="edit-card-control flex items-center gap-1"><button type="button" onClick={()=>widgetKey&&setWidgetVisible?.(widgetKey,false)} className={`rounded-lg border px-2 py-1 text-xs font-black ${controlBorder}`}>Hide</button><div className={`inline-flex overflow-hidden rounded-lg border ${inverted?'border-white/30':'border-slate-200'}`}>{['S','M','L'].map(size=><button type="button" key={size} className={`px-2 py-1 text-xs font-black ${size==='L'?(inverted?'bg-white text-violet-700':'bg-violet-50 text-violet-700'):(inverted?'text-white':'text-slate-600')}`}>{size}</button>)}</div><button type="button" className={`rounded-lg border p-1 ${controlBorder}`}><Settings2 size={15}/></button></div></div>
}

function BudgetCashFlowStrip({ income, bills, spending, available, money, setWidgetVisible }) {
  const safeIncome = Math.max(0, Number(income || 0))
  const safeBills = Math.max(0, Number(bills || 0))
  const safeSpending = Math.max(0, Number(spending || 0))
  const safeAvailable = Math.max(0, Number(available || 0))
  const combinedOutflow = safeBills + safeSpending
  const scale = Math.max(safeIncome, combinedOutflow + safeAvailable, 1)
  const spendingWidth = Math.min(100, safeSpending / scale * 100)
  const billWidth = Math.min(100 - spendingWidth, safeBills / scale * 100)
  const availableWidth = Math.min(100 - spendingWidth - billWidth, safeAvailable / scale * 100)
  const unassignedWidth = Math.max(0, 100 - spendingWidth - billWidth - availableWidth)
  return <section className="dashboard-edit-card border-violet-100 bg-gradient-to-r from-violet-50/70 via-white to-blue-50/60 p-4">
    <EditCardHeader title="Budget & cash flow" description="This month: how income is allocated across everyday spending, bills, available money, and anything still unassigned." widgetKey="budget" setWidgetVisible={setWidgetVisible}/>
    <div className="mt-3 grid grid-cols-3 divide-x divide-violet-100">
      <div className="pr-3"><p className="text-[10px] font-bold text-slate-500">Income</p><p className="mt-1 text-xl font-black text-cyan-600">{money(safeIncome)}</p></div>
      <div className="px-3"><p className="text-[10px] font-bold text-slate-500">Bills & spending</p><p className="mt-1 text-xl font-black text-rose-500">{money(combinedOutflow)}</p></div>
      <div className="pl-3"><p className="text-[10px] font-bold text-slate-500">Available</p><p className="mt-1 text-xl font-black text-blue-600">{money(safeAvailable)}</p></div>
    </div>
    <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200 ring-1 ring-white">
      <span className="bg-cyan-500" style={{width:`${spendingWidth}%`}} title="Everyday spending" />
      <span className="bg-rose-500" style={{width:`${billWidth}%`}} title="Bills" />
      <span className="bg-blue-600" style={{width:`${availableWidth}%`}} title="Available" />
      <span className="bg-slate-300" style={{width:`${unassignedWidth}%`}} title="Unassigned" />
    </div>
  </section>
}

function SpendingHero({ metric, transactionCount, rangeLabel, leadingCategory }) {
  const current = Number(metric?.current || 0)
  const prior = Number(metric?.prior || 0)
  const change = current - prior
  const increased = change > 0
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const explanation = prior > 0
    ? `${increased ? 'Up' : 'Down'} ${money(Math.abs(change))}${leadingCategory ? `, led by ${categoryLabel(leadingCategory).toLowerCase()}` : ''}.`
    : leadingCategory ? `${categoryLabel(leadingCategory)} is your largest category.` : 'Add more activity to build a comparison.'

  return <section className="relative overflow-hidden rounded-[22px] border border-emerald-700/20 bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 p-5 text-white shadow-sm sm:p-6">
    <div className="relative z-10 max-w-[62%] sm:max-w-[55%]">
      <p className="text-sm font-semibold text-emerald-100">Total spent</p>
      <p className="mt-1 text-4xl font-black tracking-tight gg-num sm:text-5xl">{money(current)}</p>
      <p className="mt-3 text-xs text-emerald-100">{transactionCount} transaction{transactionCount === 1 ? '' : 's'} · {rangeLabel}</p>
      <p className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-black ${increased ? 'bg-red-50 text-red-700' : 'bg-white/15 text-white'}`}>{metric?.deltaLabel === '—' ? 'Building comparison' : `${metric?.deltaLabel} vs prior`}</p>
      <p className="mt-3 text-xs font-semibold text-emerald-50">{explanation}</p>
    </div>
    <svg aria-hidden viewBox="0 0 320 150" className="absolute -right-5 bottom-2 h-[75%] w-[50%] opacity-95">
      <path d="M5 130 C40 112 48 125 73 90 S112 115 139 72 S184 94 210 57 S250 72 275 37 S302 34 315 12" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="5" strokeLinecap="round" />
      <path d="M73 90 C94 50 112 115 139 72 M210 57 C234 26 250 72 275 37 M275 37 C295 19 304 24 315 12" fill="none" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
      <circle cx="315" cy="12" r="8" fill="#047857" stroke="white" strokeWidth="5" />
    </svg>
    <Link href="/reports" className="absolute bottom-5 right-5 z-20 rounded-xl bg-black/20 px-3 py-2 text-xs font-black backdrop-blur hover:bg-black/30">View insights →</Link>
  </section>
}

function BudgetSnapshot({ receipts, data }) {
  const month = new Date().toISOString().slice(0, 7)
  const monthlyReceipts = receipts.filter(receipt => String(receipt.date || '').startsWith(month))
  const flow = summarizeMoneyFlow({ incomeSources: data?.incomeSources || [], receipts: monthlyReceipts, billCycles: data?.billCycles || [], savings: data?.savings || [] })
  const configured = flow.income > 0
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const used = configured ? Math.min(100, Math.max(0, flow.actualExpenses / flow.income * 100)) : 0

  return (
    <Link href="/budget" className="block rounded-[20px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md">
      {configured ? <>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative mx-auto h-32 w-32 shrink-0 rounded-full sm:mx-0" style={{ background: `conic-gradient(${used > 90 ? '#ef4444' : '#22c55e'} ${used}%, #e2e8f0 0)` }}>
            <div className="absolute inset-[15%] grid place-items-center rounded-full bg-white text-center shadow-inner">
              <div><p className="text-xl font-black text-slate-900 gg-num">{Math.round(used)}%</p><p className="text-[10px] font-bold text-slate-500">spent</p></div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold text-slate-500">Remaining this month</p><p className={`mt-1 text-3xl font-black gg-num ${flow.projectedRemaining < 0 ? 'text-red-600' : 'text-emerald-800'}`}>{money(flow.projectedRemaining)}</p></div>
              <ArrowRight size={18} className="mt-1 text-emerald-700" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
              {[["Income", flow.income], ["Spent", flow.actualExpenses], ["Bills", flow.upcomingBills], ["Savings", flow.plannedSavings]].map(([label, value]) => <div key={label}><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-0.5 text-base font-black text-slate-900 gg-num">{money(value)}</p></div>)}
            </div>
          </div>
        </div>
        {data?.categories?.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2">{data.categories.slice(0, 4).map(category => { const spent = data.allocations.filter(a => !a.needs_review && String(a.category).toLowerCase() === String(category.category).toLowerCase()).reduce((sum, a) => sum + Number(a.amount || 0), 0); const limit = Number(category.limit_amount || 0); const pct = limit > 0 ? Math.min(100, spent / limit * 100) : 0; return <div key={category.id}><div className="mb-1 flex justify-between text-[11px]"><span className="font-bold text-slate-700">{categoryLabel(category.category)}</span><span className="text-slate-500">{money(spent)} / {money(limit)}</span></div><div className="h-2 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full ${spent > limit ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div></div> })}</div>}
      </> : <div className="flex items-center gap-3"><div className="flex-1"><p className="font-black text-slate-900">Set up your monthly budget</p><p className="mt-1 text-xs text-slate-500">Enter income manually—no bank connection.</p></div><ArrowRight size={18} className="text-emerald-700" /></div>}
    </Link>
  )
}

const categoryLabel = value => String(value || 'uncategorized').split('-').map(part => part ? part[0].toUpperCase() + part.slice(1) : part).join(' ')

function SpendingByCategory({ receipts, rangeLabel }) {
  const totals = new Map()
  for (const receipt of receipts) {
    if (receipt.is_return || Number(receipt.total_amount || 0) <= 0) continue
    const category = receipt.category || 'uncategorized'
    totals.set(category, (totals.get(category) || 0) + Number(receipt.total_amount || 0))
  }
  const data = [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6)
  const total = data.reduce((sum, item) => sum + item.amount, 0)
  let cursor = 0
  const segments = data.map((item, index) => { const start = cursor; cursor += total ? item.amount / total * 100 : 0; return `${donutCategoryColor(item.category)} ${start}% ${cursor}%` }).join(', ')
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  return (
    <section className="card rounded-[20px] p-4 sm:p-5">
      <h3 className="gg-h2">Spending by Category</h3>
      <p className="mt-1 text-xs text-gray-500">{rangeLabel} · receipts</p>
      {data.length === 0 ? <div className="grid h-32 place-items-center text-sm text-gray-400">No categorized spending for this period</div> : <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${segments})` }}><div className="absolute inset-[15%] grid place-items-center rounded-full bg-white text-center"><div><p className="text-sm font-black text-slate-900 gg-num">{money(total)}</p><p className="text-[10px] text-slate-500">Total</p></div></div></div>
        <div className="w-full min-w-0 flex-1 space-y-2">{data.map((item, index) => <div key={item.category} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: donutCategoryColor(item.category) }} /><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{categoryLabel(item.category)}</span><span className="font-black text-slate-900 gg-num">{money(item.amount)}</span></div>)}</div>
      </div>}
    </section>
  )
}

function GoalsSnapshot({ goals = [] }) {
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const goal = goals[0]
  if (!goal) return <Link href="/wealth" className="flex items-center justify-between gap-4 rounded-[20px] border border-dashed border-emerald-300 bg-emerald-50/60 p-4 transition hover:bg-emerald-50"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Wealth Path</p><h3 className="mt-1 text-base font-black text-slate-950">Give your next dollar a goal</h3><p className="mt-1 text-xs text-slate-500">Build safety, pay debt, and fund what matters.</p></div><span className="rounded-full bg-emerald-700 px-3 py-2 text-xs font-black text-white">Start →</span></Link>
  const current = Number(goal.current_amount || 0); const target = Number(goal.target_amount || 0); const monthly = Number(goal.monthly_contribution || 0)
  const pct = target > 0 ? Math.min(100, Math.max(0, current / target * 100)) : 0
  const months = monthly > 0 ? Math.ceil(Math.max(0, target - current) / monthly) : null
  return <Link href="/wealth" className="block rounded-[20px] border border-emerald-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Next goal · Priority {goal.priority}</p><h3 className="mt-1 text-base font-black text-slate-950">{goal.name}</h3></div><p className="text-lg font-black text-emerald-800">{Math.round(pct)}%</p></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: `${pct}%` }}/></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{money(current)} of {money(target)}</span><span>{money(monthly)}/month{months != null ? ` · about ${months} months left` : ''}</span></div></Link>
}

function WealthSnapshot({ assets = [], debts = [] }) {
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const assetTotal = assets.reduce((sum, item) => sum + Number(item.balance || 0), 0)
  const debtTotal = debts.reduce((sum, item) => sum + Number(item.balance || 0), 0)
  const focus = [...debts].sort((a, b) => Number(b.apr || 0) - Number(a.apr || 0))[0]
  return <Link href="/wealth" className="block rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Wealth snapshot</p><h3 className="mt-1 text-base font-black text-slate-950">Net worth {money(assetTotal - debtTotal)}</h3></div>{focus && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">Focus: {focus.name} · {Number(focus.apr).toFixed(2)}%</span>}</div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase text-emerald-700">Assets</p><p className="font-black text-slate-950">{money(assetTotal)}</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-[10px] font-bold uppercase text-rose-700">Debt</p><p className="font-black text-slate-950">{money(debtTotal)}</p></div></div></Link>
}

function EconomicPressure({ data }) {
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const income = summarizeMoneyFlow({ incomeSources: data?.incomeSources || [] }).income
  const obligations = (data?.billCycles || []).map(row => ({
    name: row.bill_series?.name || 'Bill',
    category: String(row.bill_series?.category || ''),
    amount: Math.max(0, Number(row.statement_amount ?? row.expected_amount ?? row.bill_series?.expected_amount ?? 0) - Number(row.paid_amount || 0)),
  }))
  const bucket = pattern => obligations.filter(item => pattern.test(`${item.name} ${item.category}`)).reduce((sum, item) => sum + item.amount, 0)
  const housing = bucket(/mortgage|rent|housing|property/i)
  const loans = bucket(/loan|debt|credit|student|auto finance/i)
  const insurance = bucket(/insurance|premium/i)
  const fixed = obligations.reduce((sum, item) => sum + item.amount, 0)
  const interest = (data?.bankFees || []).filter(row => row.kind === 'interest').reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0)
  const bankFees = (data?.bankFees || []).filter(row => row.kind === 'fee' || row.kind === 'penalty').reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0)

  const histories = new Map()
  for (const item of data?.items || []) {
    const key = String(item.sku || item.item_name || '').trim().toLowerCase()
    if (!key) continue
    const unit = Number(item.price || 0) / Math.max(1, Number(item.qty || 1))
    if (unit <= 0) continue
    const rows = histories.get(key) || []
    rows.push({ unit, name: item.item_name || item.sku })
    histories.set(key, rows)
  }
  const changes = [...histories.values()].filter(rows => rows.length > 1).map(rows => ({ name: rows.at(-1).name, pct: (rows.at(-1).unit / rows[0].unit - 1) * 100 })).filter(row => Number.isFinite(row.pct))
  const rising = changes.filter(row => row.pct > 0).sort((a, b) => b.pct - a.pct)
  const averageRise = rising.length ? rising.reduce((sum, row) => sum + row.pct, 0) / rising.length : null
  const fixedPct = income > 0 ? fixed / income * 100 : null

  const cards = [
    { label: 'Personal inflation', value: averageRise == null ? 'Building history' : `+${averageRise.toFixed(1)}%`, detail: averageRise == null ? 'Repeat purchases will reveal your real price trend.' : `${rising.length} repeated item${rising.length === 1 ? '' : 's'} cost more.`, href: '/reports' },
    { label: 'Shrinkflation watch', value: changes.length ? `${changes.length} tracked` : 'Needs item history', detail: 'Compares unit cost—not just the shelf price.', href: '/receipts' },
    { label: 'Interest & bank fees', value: money(interest + bankFees), detail: `${money(interest)} interest · ${money(bankFees)} fees`, href: '/bank' },
    { label: 'Housing & mortgage', value: money(housing), detail: 'Rent or mortgage and property-related commitments.', href: '/bills' },
    { label: 'Loan payments', value: money(loans), detail: 'Auto, student, personal, and credit obligations.', href: '/calculators#dti' },
    { label: 'Insurance', value: money(insurance), detail: 'Home, auto, health, life, and other premiums.', href: '/bills' },
  ]

  return <section className="card rounded-[20px] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="gg-h2">Economic pressure on your budget</h3><p className="mt-1 text-xs text-gray-500">Your prices, debt costs, insurance, housing, and recurring obligations.</p></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fixed commitments</p><p className="font-black text-slate-900 gg-num">{fixedPct == null ? money(fixed) : `${fixedPct.toFixed(0)}% of income`}</p><Link href="/guacanomics" className="text-xs font-black text-emerald-700">Open Guacanomics →</Link></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(card => <Link href={card.href} key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{card.label}</p><p className="mt-1 text-lg font-black text-slate-950 gg-num">{card.value}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{card.detail}</p></Link>)}</div></section>
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
  const runDays = computeSmashDays(receipts).smashDays
  return <GuacoScoreCard receipts={receipts} bankBite={bankBite} size="sm" runDays={runDays} className="h-full" />
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
const METRIC_LABELS = {
  transactions: 'Transactions', totalSpent: 'Total spent', taxPaid: 'Tax paid', purchases: 'Purchases',
  payments: 'Payments', interestPaid: 'Interest paid', feesPaid: 'Fees paid', bankFees: 'Bank fees',
}

function AllPaymentsScroll({ spendingReceipts, period, periodCount }) {
  const { statements, fees, transactions } = useBankData()

  const analysis = computeDashboardAnalysis({
    receipts: spendingReceipts,
    statements,
    fees,
    transactions,
    period,
    periodCount,
  })

  // Tiles in user's requested order. Each entry carries:
  //   - the raw numeric value (drives the CountUp tween inside
  //     PaymentTile so timeframe flips smooth-retally instead of
  //     flash-cutting)
  //   - a display prefix ('$' for money, '' for the integer count)
  // The string fallback `format(value)` is still passed as `value`
  // so SSR / no-JS / reduced-motion users see a correctly formatted
  // number on first paint.
  const TILES = [
    { key: 'taxPaid',      value: analysis.metrics.taxPaid.current,      prefix: '$' },
    { key: 'purchases',    value: analysis.metrics.purchases.current,    prefix: '$' },
    { key: 'payments',     value: analysis.metrics.payments.current,     prefix: '$' },
    { key: 'interestPaid', value: analysis.metrics.interestPaid.current, prefix: '$' },
    { key: 'feesPaid',     value: analysis.metrics.feesPaid.current,     prefix: '$' },
    { key: 'bankFees',     value: analysis.metrics.bankFees.current,     prefix: '$' },
  ]

  return <section className="rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-end justify-between gap-3"><div><h3 className="gg-h2">Expense details</h3><p className="mt-1 text-xs text-slate-500">Swipe through activity and money costs.</p></div></div><div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">{TILES.map(({ key, value, prefix }, index) => { const m = analysis.metrics[key]; const colors = ['bg-rose-50 text-rose-700','bg-orange-50 text-orange-700','bg-amber-50 text-amber-700','bg-yellow-50 text-yellow-700','bg-emerald-50 text-emerald-700','bg-cyan-50 text-cyan-700','bg-blue-50 text-blue-700','bg-violet-50 text-violet-700']; return <div key={key} className="w-[150px] shrink-0 snap-start rounded-2xl border border-slate-100 bg-slate-50/70 p-3"><div className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${colors[index]}`}>{index + 1}</div><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{METRIC_LABELS[key]}</p><CountUp value={Number(value) || 0} prefix={prefix} format={n => prefix ? Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : Math.round(n).toLocaleString()} as="p" className="mt-1 truncate text-lg font-black text-slate-900 gg-num" /><p className="mt-0.5 truncate text-[10px] text-slate-400">{m.deltaLabel && m.deltaLabel !== '—' ? `${m.deltaLabel} vs prior` : 'Current period'}</p></div> })}</div></section>
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
  // Neutral tone — a single slate palette for every score band so the
  // tile stays neutral (no green "healthy" state). The score number
  // still communicates health; the chrome no longer colors it.
  const tone = { chip: 'from-slate-500 to-slate-600', label: 'text-gray-500', value: 'text-gray-900', sub: 'text-gray-500' }

  return (
    <Link
      href="/guacwizard"
      className="payment-tile-card stat-card relative overflow-hidden h-full hover:shadow-md transition-all"
      title="GuacWizard health score"
    >
      <div className={`tile-chip-host shrink-0 w-11 h-11 rounded-xl flex items-center justify-center relative z-10 bg-gradient-to-br ${tone.chip} shadow-md text-white`}>
        <Wand2 size={20} className="tile-chip-icon text-white" />
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className={`text-[10px] uppercase tracking-wider font-bold ${tone.label}`}>GuacWizard</p>
        {score === undefined ? (
          <>
            <p className={`text-xl font-black ${tone.value} gg-num leading-tight`}>—</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${tone.sub}`}>loading…</p>
          </>
        ) : score != null ? (
          <>
            <p className={`text-xl font-black ${tone.value} gg-num leading-tight`}>
              <CountUp value={score} duration={520} />
              <span className="text-xs font-bold opacity-60 ml-0.5">/ 100</span>
            </p>
            <p className={`text-[10px] font-semibold mt-0.5 ${tone.sub}`}>health score</p>
            <p className={`text-[10px] font-bold mt-0.5 ${tone.sub} inline-flex items-center gap-1`}>▲ Beating ~{Math.min(99, Math.round(40 + score * 0.6))}% of savers</p>
          </>
        ) : (
          <p className={`text-sm font-bold ${tone.sub} mt-0.5`}>Set up →</p>
        )}
      </div>
    </Link>
  )
}
