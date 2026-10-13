'use client'
import { useState, useMemo } from 'react'
import useCurrencySymbol from '../../../hooks/useCurrencySymbol'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useReceipts } from '../../../hooks/useReceipts'
import { createClient } from '../../../lib/supabase/client'
import { isPaymentReceipt } from '../../../lib/payment-rows'
import { DollarSign, TrendingUp, Undo2, Receipt as ReceiptIcon, Banknote, ExternalLink } from 'lucide-react'
import GuacoScoreCard from '../../../components/GuacoScoreCard'
import MascotLoading from '../../../components/MascotLoading'
import FeatureHeader from '../../../components/FeatureHeader'
import { CATEGORY_BY_SLUG } from '../../../lib/categories'
// Lazy-load the chart-heavy section (~all of recharts) so the initial
// Guacanomics shell doesn't ship the chart bundle to viewers who bounce.
const Charts = dynamic(() => import('./Charts'), {
  ssr: false,
  loading: () => <div className="card py-12 text-center text-gray-400">Loading charts…</div>,
})

// Money formatters — mockup renders every amount with thousands separators in
// Bricolage (never monospace). money2 → cents ($1,234.56); money0 → whole
// dollars ($1,235). Mirrors the app-wide pattern in validate/receipts pages.
const money2 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

const CATEGORY_COLORS = {
  emerald:  '#10b981', orange: '#f97316', sky: '#0ea5e9', indigo: '#6366f1',
  amber:    '#f59e0b', lime:   '#84cc16', fuchsia: '#d946ef', rose: '#e11d48',
  red:      '#dc2626', violet: '#8b5cf6', pink: '#ec4899', gray: '#9ca3af',
}

const RATING_META = {
  5: { label: 'Essential', emoji: '💎', color: '#10b981' },
  4: { label: 'Important', emoji: '✅', color: '#84cc16' },
  3: { label: 'OK',        emoji: '🙂', color: '#facc15' },
  2: { label: 'Splurge',   emoji: '🍿', color: '#f97316' },
  1: { label: 'Regret',    emoji: '🙈', color: '#e11d48' },
}

const RANGES = [
  { key: '30d',   label: '30 days', days: 30 },
  { key: '90d',   label: '90 days', days: 90 },
  { key: '12mo',  label: '12 months', days: 365 },
  { key: 'all',   label: 'All time', days: null },
]

export default function GuacanomicsPage() {
  const __cur = useCurrencySymbol()
  const [range, setRange] = useState('90d')
  const { data: rawReceipts = [], isLoading } = useReceipts()

  // Strip payment-receipt rows (statement imports paying down a card)
  // exactly the way the dashboard does. Without this, /guacanomics
  // counted those imports in Net Spent / Tax Paid / GuacScore weights,
  // so the page disagreed with the dashboard tile for users with bank
  // statements imported. Mirrors `spendingReceipts` in DashboardClient.
  const receipts = useMemo(
    () => rawReceipts.filter(r => !isPaymentReceipt(r)),
    [rawReceipts]
  )

  // Bank fees + interest — pulled separately because they're not on the receipts
  // table. Used for the "Bank Bite" tile and to pull down GuacScore.
  const sb = createClient()
  const { data: bankFees = [] } = useQuery({
    queryKey: ['bank_fees'],
    queryFn: async () => { const { data } = await sb.from('bank_fees').select('kind, amount, date'); return data || [] },
  })
  const { data: goals = [] } = useQuery({
    queryKey: ['financial-goals', 'active'],
    queryFn: async () => {
      const { data } = await sb
        .from('financial_goals')
        .select('name, goal_type, priority, target_amount, current_amount, target_date')
        .eq('status', 'active')
        .order('priority', { ascending: true })
      return data || []
    },
  })

  // Single source of truth for the "since" cutoff. Snaps to midnight
  // so the boundary doesn't depend on the time-of-day the user opened
  // the page (was a real bug — a noon visit could include or exclude a
  // 90-day-old receipt depending on the hour). Reused by both the
  // GuacScore filter, the bankBite filter, and the insights compute.
  const since = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range)
    if (!cfg.days) return null
    const d = new Date(Date.now() - cfg.days * 86400000)
    d.setHours(0, 0, 0, 0)
    return d
  }, [range])

  const bankBite = useMemo(() => {
    const inRange = (d) => !since || new Date(d) >= since
    let interest = 0, fees = 0
    for (const f of bankFees) {
      if (!inRange(f.date)) continue
      const v = Math.abs(Number(f.amount || 0))
      if (f.kind === 'interest') interest += v
      else if (f.kind === 'fee' || f.kind === 'penalty') fees += v
    }
    return { interest, fees, total: interest + fees }
  }, [bankFees, since])

  const insights = useMemo(() => {
    const inRange = receipts.filter(r => !since || new Date(r.date) >= since)

    const purchases = inRange.filter(r => parseFloat(r.total_amount || 0) >= 0)
    const returns = inRange.filter(r => parseFloat(r.total_amount || 0) < 0)

    const grossSpend = purchases.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
    const refunded = Math.abs(returns.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0))
    const netSpend = grossSpend - refunded
    const totalTax = inRange.reduce((s, r) => s + parseFloat(r.tax_paid || 0), 0)
    const avgTicket = purchases.length ? grossSpend / purchases.length : 0
    const businessSpend = purchases.filter(r => r.business_purchase).reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)

    const byMonth = new Map()
    for (const r of inRange) {
      const m = (r.date || '').slice(0, 7)
      if (!m) continue
      if (!byMonth.has(m)) byMonth.set(m, { month: m, spent: 0, refunded: 0 })
      const v = parseFloat(r.total_amount || 0)
      if (v >= 0) byMonth.get(m).spent += v
      else byMonth.get(m).refunded += Math.abs(v)
    }
    const timeSeries = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))

    const byStore = new Map()
    for (const r of purchases) {
      const k = r.store_name || 'Unknown'
      if (!byStore.has(k)) byStore.set(k, { store: k, spent: 0, count: 0 })
      const e = byStore.get(k)
      e.spent += parseFloat(r.total_amount || 0)
      e.count += 1
    }
    const topStores = [...byStore.values()].sort((a, b) => b.spent - a.spent).slice(0, 8)

    const largest = [...purchases]
      .sort((a, b) => parseFloat(b.total_amount || 0) - parseFloat(a.total_amount || 0))
      .slice(0, 5)

    const rated = purchases.filter(r => r.rating != null)
    const unrated = purchases.length - rated.length
    const ratingBuckets = [5, 4, 3, 2, 1].map(n => {
      const rows = rated.filter(r => r.rating === n)
      const spend = rows.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
      return { rating: n, count: rows.length, spend, ...RATING_META[n] }
    })
    // Bank Bite (interest + fees) is ALWAYS counted as Regret in Worth It —
    // money lost to the bank is, by definition, not money well spent.
    const bankBiteTotal = (bankBite && bankBite.total) ? Number(bankBite.total) : 0
    if (bankBiteTotal > 0) {
      const regretRow = ratingBuckets.find(b => b.rating === 1)
      if (regretRow) regretRow.spend += bankBiteTotal
    }
    const avgRating = rated.length
      ? rated.reduce((s, r) => s + r.rating, 0) / rated.length
      : 0
    const regretSpend = ratingBuckets.filter(b => b.rating <= 2).reduce((s, b) => s + b.spend, 0)
    const tagCounts = new Map()
    for (const r of rated) for (const t of (r.validation_tags || [])) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
    }
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

    const byCategory = new Map()
    for (const r of purchases) {
      const slug = r.category || 'misc'
      if (!byCategory.has(slug)) {
        const meta = CATEGORY_BY_SLUG[slug] || CATEGORY_BY_SLUG['misc']
        byCategory.set(slug, {
          slug, label: CATEGORY_BY_SLUG[slug]?.label || slug, emoji: meta.emoji,
          color: CATEGORY_COLORS[meta.color] || CATEGORY_COLORS.gray,
          spend: 0, count: 0,
        })
      }
      const e = byCategory.get(slug)
      e.spend += parseFloat(r.total_amount || 0)
      e.count += 1
    }
    // Synthetic "Bank Bite" slice — interest + bank fees in this range, shown
    // alongside real spending categories so users see what their cards cost
    // them next to what they actually bought.
    if (bankBiteTotal > 0) {
      byCategory.set('bank-bite', {
        slug:  'bank-bite',
        label: 'Bank Bite',
        emoji: '🦷',
        color: '#9f1239',   // rose-800 — calls it out as a leak
        spend: bankBiteTotal,
        count: 0,
      })
    }
    const categoryBuckets = [...byCategory.values()].sort((a, b) => b.spend - a.spend)
    const categoryBucketsFor = rows => {
      const buckets = new Map()
      for (const r of rows) {
        const slug = r.category || 'misc'
        if (!buckets.has(slug)) {
          const meta = CATEGORY_BY_SLUG[slug] || CATEGORY_BY_SLUG.misc
          buckets.set(slug, { slug, label: CATEGORY_BY_SLUG[slug]?.label || slug, emoji: meta.emoji, color: CATEGORY_COLORS[meta.color] || CATEGORY_COLORS.gray, spend: 0, count: 0 })
        }
        const bucket = buckets.get(slug)
        bucket.spend += parseFloat(r.total_amount || 0)
        bucket.count += 1
      }
      return [...buckets.values()].sort((a, b) => b.spend - a.spend)
    }
    const businessCategoryBuckets = categoryBucketsFor(purchases.filter(r => r.business_purchase))
    const personalCategoryBuckets = categoryBucketsFor(purchases.filter(r => !r.business_purchase))

    return {
      grossSpend, refunded, netSpend, totalTax, avgTicket, businessSpend,
      purchaseCount: purchases.length, returnCount: returns.length,
      timeSeries, topStores, largest,
      purchaseVsReturn: [
        { name: 'Purchases', value: grossSpend },
        { name: 'Refunds', value: refunded },
      ],
      ratingBuckets, ratedCount: rated.length, unratedCount: unrated,
      avgRating, regretSpend, topTags,
      categoryBuckets, businessCategoryBuckets, personalCategoryBuckets,
    }
  }, [receipts, since, bankBite])

  return (
    <div className="space-y-6 max-w-7xl">
      <FeatureHeader
        theme="econ"
        title="Guacanomics"
        subtitle="Where every dollar earns its smash."
        action={
          <div className="flex flex-wrap bg-gray-100 rounded-xl p-1 gap-1">
            {RANGES.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  range === r.key ? 'bg-white text-guac-ink shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <MascotLoading label="Loading insights…" />
      ) : receipts.length === 0 ? (
        <div className="card py-12 text-center text-gray-400 flex flex-col items-center gap-3">
          <p>No receipts yet. <Link href="/receipts" className="text-guac-600 hover:underline">Add some</Link> to unlock your spending picture.</p>
        </div>
      ) : (
        <>
          <GuacoScoreCard
            receipts={receipts.filter(r => !since || new Date(r.date) >= since)}
            bankBite={bankBite}
          />

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat icon={DollarSign} color="bg-[#FDE3EA] text-[#E5194B]" label="Net Spent (out)" value={`${__cur}${money2(insights.netSpend)}`} sub={`Gross ${__cur}${money2(insights.grossSpend)}`} />
            <Stat icon={Undo2}      color="bg-[#E4F6E8] text-[#16A34A]" label="Refunded (in)" value={`${__cur}${money2(insights.refunded)}`} sub={`${insights.returnCount} returned`} />
            <Stat icon={Banknote}   color="bg-[#FDEBD5] text-[#EA7A0C]" label="🦷 Bank Bite" value={`${__cur}${money2(bankBite.total)}`} sub={`${__cur}${money2(bankBite.interest)} interest · ${__cur}${money2(bankBite.fees)} fees`} />
            <Stat icon={ReceiptIcon} color="bg-[#FCF0CE] text-[#B4791A]" label="Receipts" value={insights.purchaseCount.toLocaleString('en-US')} sub={`Avg ${__cur}${money2(insights.avgTicket)}`} />
            <Stat icon={TrendingUp} color="bg-[#E9F5DD] text-[#4D7C0F]" label="Tax Paid" value={`${__cur}${money2(insights.totalTax)}`} sub={`Biz ${__cur}${money2(insights.businessSpend)}`} />
          </div>

          <Charts insights={insights} />

          <EconomicNewsFeed insights={insights} goals={goals} bankBite={bankBite} />
        </>
      )}
    </div>
  )
}

const ECONOMIC_MATCHERS = {
  groceries: ['inflation', 'price', 'prices', 'food', 'consumer price'],
  housing: ['housing', 'mortgage', 'home', 'rent', 'rate'],
  transportation: ['auto', 'vehicle', 'fuel', 'gas', 'loan', 'rate'],
  utilities: ['energy', 'utility', 'utilities', 'price', 'inflation'],
  healthcare: ['health', 'insurance', 'premium', 'price'],
  insurance: ['insurance', 'premium', 'price'],
  debt: ['credit', 'debt', 'loan', 'interest', 'rate', 'lending'],
  home: ['housing', 'mortgage', 'home', 'rent', 'rate'],
  retirement: ['inflation', 'rate', 'interest', 'market'],
  travel: ['travel', 'fuel', 'gas', 'price', 'inflation'],
  education: ['education', 'student', 'loan', 'debt', 'rate'],
  vehicle: ['auto', 'vehicle', 'fuel', 'gas', 'loan', 'rate'],
  family: ['food', 'housing', 'insurance', 'price', 'inflation'],
  emergency: ['inflation', 'price', 'jobs', 'employment', 'consumer'],
}

function personalizeEconomicItems(items, insights, goals, bankBite) {
  const categories = (insights?.categoryBuckets || []).filter(row => row.slug !== 'bank-bite')
  const total = categories.reduce((sum, row) => sum + Number(row.spend || 0), 0)
  return items.map(item => {
    const text = `${item.topic} ${item.title} ${item.summary} ${item.impact}`.toLowerCase()
    let relevance = 0
    const matches = []
    for (const category of categories.slice(0, 5)) {
      const keywords = ECONOMIC_MATCHERS[category.slug] || [category.label?.toLowerCase()].filter(Boolean)
      if (keywords.some(keyword => text.includes(keyword))) {
        const share = total > 0 ? Math.round(Number(category.spend || 0) / total * 100) : 0
        relevance += 2 + share / 20
        matches.push(`${category.label}${share ? ` (${share}% of spending)` : ''}`)
      }
    }
    for (const goal of goals || []) {
      const keywords = ECONOMIC_MATCHERS[goal.goal_type] || []
      if (keywords.some(keyword => text.includes(keyword))) {
        relevance += 6 - Math.min(5, Number(goal.priority || 3))
        matches.push(`${goal.name || goal.goal_type} goal`)
      }
    }
    if (Number(bankBite?.total || 0) > 0 && ECONOMIC_MATCHERS.debt.some(keyword => text.includes(keyword))) {
      relevance += 4
      matches.push('interest and fee exposure')
    }
    return { ...item, relevance, matches: [...new Set(matches)].slice(0, 2) }
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || b.relevance - a.relevance)
}

function EconomicNewsFeed({ insights, goals, bankBite }) {
  const { data, isLoading } = useQuery({
    queryKey: ['economic-news'],
    queryFn: async () => {
      const response = await fetch('/api/economic-news')
      if (!response.ok) throw new Error('News unavailable')
      return response.json()
    },
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  })
  const items = useMemo(
    () => personalizeEconomicItems(data?.items || [], insights, goals, bankBite),
    [data?.items, insights, goals, bankBite]
  )
  const personalized = items.some(item => item.relevance > 0)
  return <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
    <div className="flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Economic pulse</p><h2 className="mt-1 gg-h2">What the economy means for your money</h2><p className="mt-1 text-xs text-slate-600">Current official data and broad financial news, ranked using your spending, bank costs, and goals.</p></div>{data?.updatedAt && <p className="text-xs font-bold text-slate-500">Updated {new Date(data.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>}</div>
    {isLoading ? <div className="m-4 h-28 animate-pulse rounded-2xl bg-slate-100" /> : items.length === 0 ? <p className="m-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No current economic updates are available.</p> : <>
      <p className="border-t border-slate-100 px-4 py-2 text-xs font-bold text-slate-600">{personalized ? 'Most relevant to you first' : 'Latest updates first'}</p>
      <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[980px] text-left"><thead className="sticky top-0 z-10"><tr className="border-y border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-600 shadow-sm"><th className="px-4 py-3">Published</th><th className="px-4 py-3">Topic</th><th className="px-4 py-3">Headline</th><th className="px-4 py-3">Why it matters</th><th className="px-4 py-3">Relevant to you</th></tr></thead><tbody>{items.slice(0, 100).map((item, index) => <tr key={`${item.source}-${item.link}`} className="border-b border-slate-100 align-top last:border-0 hover:bg-emerald-50/40"><td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-600">{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td><td className="px-4 py-3"><span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{item.topic}</span><p className="mt-1 max-w-[150px] truncate text-xs text-slate-500">{item.source}</p></td><td className="px-4 py-3"><Link href={`/news?article=${index}`} className="line-clamp-2 text-sm font-black leading-5 text-slate-950 hover:text-violet-700">{item.title}</Link></td><td className="max-w-[360px] px-4 py-3 text-sm leading-5 text-slate-600">{item.impact}</td><td className="px-4 py-3 text-xs font-bold text-emerald-800">{item.matches.length ? item.matches.join(' · ') : 'General money outlook'}</td></tr>)}</tbody></table></div>
      <div className="flex justify-end border-t border-slate-100 p-3"><Link href="/news" className="text-sm font-black text-violet-700">Open GetGuac News →</Link></div>
    </>}
  </section>
}

function Stat({ icon: Icon, color, label, value, sub }) {
  return (
    <div className="stat-card !rounded-[18px] items-start !gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon size={18} /></div>
      <div>
        <p className="text-[11px] text-guac-faint font-bold">{label}</p>
        <p className="gg-stat gg-num !text-xl mt-0.5">{value}</p>
        {sub && <p className="gg-sub gg-num !text-guac-faint mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
