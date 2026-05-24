'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useReceipts } from '../../../hooks/useReceipts'
import { createClient } from '../../../lib/supabase/client'
import { DollarSign, TrendingUp, Undo2, Receipt as ReceiptIcon, Banknote } from 'lucide-react'
import GuacoScoreCard from '../../../components/GuacoScoreCard'
import { CATEGORY_BY_SLUG } from '../../../lib/categories'

// Lazy-load the chart-heavy section (~all of recharts) so the initial
// Guacanomics shell doesn't ship the chart bundle to viewers who bounce.
const Charts = dynamic(() => import('./Charts'), {
  ssr: false,
  loading: () => <div className="card py-12 text-center text-gray-400">Loading charts…</div>,
})

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
  const [range, setRange] = useState('90d')
  const { data: receipts = [], isLoading } = useReceipts()

  // Bank fees + interest — pulled separately because they're not on the receipts
  // table. Used for the "Bank Bite" tile and to pull down GuacScore.
  const sb = createClient()
  const { data: bankFees = [] } = useQuery({
    queryKey: ['bank_fees'],
    queryFn: async () => { const { data } = await sb.from('bank_fees').select('kind, amount, date'); return data || [] },
  })

  const bankBite = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range)
    const since = cfg.days ? new Date(Date.now() - cfg.days * 86400000) : null
    const inRange = (d) => !since || new Date(d) >= since
    let interest = 0, fees = 0
    for (const f of bankFees) {
      if (!inRange(f.date)) continue
      const v = Math.abs(Number(f.amount || 0))
      if (f.kind === 'interest') interest += v
      else if (f.kind === 'fee' || f.kind === 'penalty') fees += v
    }
    return { interest, fees, total: interest + fees }
  }, [bankFees, range])

  const insights = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range)
    const since = cfg.days ? new Date(Date.now() - cfg.days * 24 * 60 * 60 * 1000) : null
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
          slug, label: meta.label, emoji: meta.emoji,
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
      categoryBuckets,
    }
  }, [receipts, range])

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🥑</span>
          <div>
            <h1 className="page-title">Guacanomics</h1>
            <p className="text-sm text-gray-500">Where every dollar earns its smash.</p>
          </div>
        </div>
        <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                range === r.key ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card py-12 text-center text-gray-400">Loading insights…</div>
      ) : receipts.length === 0 ? (
        <div className="card py-12 text-center text-gray-400">
          No receipts yet. <Link href="/receipts" className="text-blue-600 hover:underline">Add some</Link> to unlock your spending picture.
        </div>
      ) : (
        <>
          <GuacoScoreCard
            receipts={receipts.filter(r => {
              const cfg = RANGES.find(x => x.key === range)
              const since = cfg.days ? new Date(Date.now() - cfg.days * 86400000) : null
              return !since || new Date(r.date) >= since
            })}
            bankBite={bankBite}
          />

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat icon={DollarSign} color="bg-gradient-to-br from-rose-400 via-rose-600 to-rose-800 text-white shadow" label="Net Spent (out)" value={`$${insights.netSpend.toFixed(2)}`} sub={`Gross $${insights.grossSpend.toFixed(2)}`} />
            <Stat icon={Undo2}      color="bg-gradient-to-br from-emerald-300 via-emerald-500 to-green-700 text-white shadow" label="Refunded (in)" value={`$${insights.refunded.toFixed(2)}`} sub={`${insights.returnCount} returned`} />
            <Stat icon={Banknote}   color="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 text-white shadow" label="🦷 Bank Bite" value={`$${bankBite.total.toFixed(2)}`} sub={`$${bankBite.interest.toFixed(2)} interest · $${bankBite.fees.toFixed(2)} fees`} />
            <Stat icon={ReceiptIcon} color="bg-amber-100 text-amber-700" label="Receipts" value={insights.purchaseCount} sub={`Avg $${insights.avgTicket.toFixed(2)}`} />
            <Stat icon={TrendingUp} color="bg-lime-100 text-lime-700"     label="Tax Paid" value={`$${insights.totalTax.toFixed(2)}`} sub={`Biz $${insights.businessSpend.toFixed(2)}`} />
          </div>

          <Charts insights={insights} />
        </>
      )}
    </div>
  )
}

function Stat({ icon: Icon, color, label, value, sub }) {
  return (
    <div className="stat-card">
      <div className={`p-3 rounded-xl ${color}`}><Icon size={20} /></div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
