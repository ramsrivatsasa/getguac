'use client'
import { formatDateShort } from '../../../lib/dateFormat'
import { useState } from 'react'
import { useStore } from '../../../store'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Receipt, Gift, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import GuacoScoreCard from '../../../components/GuacoScoreCard'
import { subDays, subWeeks, subMonths, subYears } from 'date-fns'
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
  const period = PERIODS.includes(spendingPeriod) ? spendingPeriod : 'monthly'
  const [periodCount, setPeriodCount] = useState(() => DEFAULT_COUNT[period] || 1)

  function selectPeriod(p) {
    setSpendingPeriod(p)
    setPeriodCount(DEFAULT_COUNT[p] || 1)
  }

  function filterByPeriod(receipts) {
    const cutoff = periodStart(period, periodCount)
    return receipts.filter(r => {
      const d = new Date(r.date)
      return d >= cutoff
    })
  }

  const filtered = filterByPeriod(initialReceipts)
  const rangeLabel = `Last ${periodCount} ${UNIT_LABEL[period]}${periodCount === 1 ? '' : 's'}`
  const totalSpend = filtered.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
  const totalTax = filtered.reduce((s, r) => s + parseFloat(r.tax_paid || 0), 0)
  const today = new Date().toISOString().split('T')[0]

  // True "Spending by Store" — sum every receipt's total per merchant, take
  // the top 8 spenders, sort descending. Previously this chart plotted the
  // last 8 receipts one-per-bar, which showed "Amazon" 4 times for someone
  // with 4 recent Amazon purchases instead of one tall Amazon bar.
  const chartData = (() => {
    const byStore = new Map()
    for (const r of filtered) {
      const raw = (r.store_name || '').trim()
      if (!raw) continue
      // Group case-insensitively + ignore trailing punctuation so "Amazon"
      // and "Amazon." don't split. Display the longest variant we see for
      // the group (usually the most readable one).
      const key = raw.toLowerCase().replace(/[.,\s]+$/, '')
      const amount = parseFloat(r.total_amount || 0)
      const entry = byStore.get(key) || { name: raw, amount: 0, count: 0 }
      if (raw.length > entry.name.length) entry.name = raw
      entry.amount += amount
      entry.count += 1
      byStore.set(key, entry)
    }
    return [...byStore.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
      .map(e => ({ name: e.name.length > 12 ? e.name.slice(0, 12) + '…' : e.name, amount: e.amount, count: e.count }))
  })()

  return (
    <div className="space-y-6 max-w-7xl">
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

      {/* Stats — GuacScore first, then the spend tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <GuacoScoreCard receipts={filtered} size="sm" />
        {[
          { label: 'Total Spent', value: `$${totalSpend.toFixed(2)}`, icon: DollarSign, color: 'bg-gradient-to-br from-rose-400 via-rose-600 to-rose-800 text-white shadow-sm' },
          { label: 'Tax Paid', value: `$${totalTax.toFixed(2)}`, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
          { label: 'Transactions', value: filtered.length, icon: Receipt, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Rewards', value: initialRewards.length, icon: Gift, color: 'bg-lime-100 text-lime-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`p-3 rounded-xl ${color}`}><Icon size={20} /></div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Spending chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Spending by Store</h3>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No transactions for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                  formatter={v => [`$${v.toFixed(2)}`, 'Amount']}
                />
                <Bar dataKey="amount" fill="#e11d48" radius={[8, 8, 0, 0]} maxBarSize={56} />
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
                    <p className="text-xs text-gray-400">{r.store_name}</p>
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
                    <Link href={`/receipts/${r.id}`} className="hover:text-blue-700">{r.store_name}</Link>
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
    </div>
  )
}
