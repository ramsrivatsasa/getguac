'use client'
import { useState, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatDateShort } from '../../../lib/dateFormat'
import {
  Search, ChevronDown, ChevronRight as ChevRight
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import GuacMascot from '../../../components/GuacMascot'
import { subDays, subWeeks, subMonths, subYears } from 'date-fns'
import { useReceipts, useReceipt } from '../../../hooks/useReceipts'
import { setReceiptValidation, setItemValidation } from '../../../lib/db'
import { displayStoreName } from '../../../lib/store-name-normalize'
const RATING_LABELS = {
  5: { label: 'Essential', emoji: '💎', color: 'emerald', fill: '#10b981' },
  4: { label: 'Important', emoji: '✅', color: 'lime',    fill: '#84cc16' },
  3: { label: 'OK',        emoji: '🙂', color: 'amber',   fill: '#facc15' },
  2: { label: 'Splurge',   emoji: '🍿', color: 'orange',  fill: '#f97316' },
  1: { label: 'Regret',    emoji: '🙈', color: 'rose',    fill: '#e11d48' },
}

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']
const COUNT_OPTIONS = {
  daily:   [1, 3, 7, 14, 30, 60, 90],
  weekly:  [1, 2, 4, 8, 12, 26, 52],
  monthly: [1, 3, 6, 12, 24, 36],
  yearly:  [1, 2, 3, 5, 10],
}
const DEFAULT_COUNT = { daily: 30, weekly: 4, monthly: 3, yearly: 1 }
const UNIT_LABEL = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }

function periodStart(period, count) {
  const now = new Date()
  if (period === 'daily')   return subDays(now,  count)
  if (period === 'weekly')  return subWeeks(now, count)
  if (period === 'monthly') return subMonths(now, count)
  if (period === 'yearly')  return subYears(now, count)
  return now
}

const SORT_OPTIONS = [
  { key: 'date_desc',   label: 'Newest first' },
  { key: 'date_asc',    label: 'Oldest first' },
  { key: 'rating_desc', label: 'Best rated first' },
  { key: 'rating_asc',  label: 'Worst rated first' },
  { key: 'unrated',     label: 'Unrated first' },
  { key: 'amount_desc', label: 'Highest amount' },
  { key: 'amount_asc',  label: 'Lowest amount' },
]

export default function ValidatePage() {
  const [period, setPeriod] = useState('monthly')
  const [count, setCount] = useState(DEFAULT_COUNT.monthly)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('unrated')
  const [expandedId, setExpandedId] = useState(null)

  function selectPeriod(p) { setPeriod(p); setCount(DEFAULT_COUNT[p] || 1) }
  function toggleExpanded(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  const { data: receipts = [], isLoading } = useReceipts()

  const filtered = useMemo(() => {
    const cutoff = periodStart(period, count)
    const s = search.trim().toLowerCase()
    let list = receipts.filter(r => new Date(r.date) >= cutoff)
    if (s) {
      list = list.filter(r =>
        (r.store_name || '').toLowerCase().includes(s) ||
        (r.id || '').toLowerCase().includes(s)
      )
    }
    list = [...list].sort((a, b) => {
      const ra = a.rating ?? -1
      const rb = b.rating ?? -1
      switch (sort) {
        case 'date_asc':    return (a.date || '').localeCompare(b.date || '')
        case 'date_desc':   return (b.date || '').localeCompare(a.date || '')
        case 'rating_desc': return rb - ra
        case 'rating_asc':  return ra - rb
        case 'unrated':     return (a.rating == null ? 0 : 1) - (b.rating == null ? 0 : 1)
        case 'amount_desc': return Math.abs(parseFloat(b.total_amount || 0)) - Math.abs(parseFloat(a.total_amount || 0))
        case 'amount_asc':  return Math.abs(parseFloat(a.total_amount || 0)) - Math.abs(parseFloat(b.total_amount || 0))
        default: return 0
      }
    })
    return list
  }, [receipts, period, count, search, sort])

  const ratedCount = filtered.filter(r => r.rating != null).length

  // Build pie data from filtered receipts — spend by rating tier
  const pieData = useMemo(() => {
    const buckets = new Map([5, 4, 3, 2, 1].map(n => [n, { rating: n, ...RATING_LABELS[n], spend: 0, count: 0 }]))
    for (const r of filtered) {
      if (r.rating == null) continue
      const b = buckets.get(r.rating)
      if (!b) continue
      b.spend += Math.abs(parseFloat(r.total_amount || 0))
      b.count += 1
    }
    return [...buckets.values()].filter(b => b.spend > 0).map(b => ({
      name: `${b.emoji} ${b.label}`,
      value: b.spend,
      count: b.count,
      fill: b.fill,
    }))
  }, [filtered])

  const avgRating = useMemo(() => {
    const rated = filtered.filter(r => r.rating != null)
    return rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0
  }, [filtered])

  const regretSpend = useMemo(() =>
    filtered.filter(r => r.rating != null && r.rating <= 2)
      .reduce((s, r) => s + Math.abs(parseFloat(r.total_amount || 0)), 0),
    [filtered])

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center gap-3 flex-wrap">
        <GuacMascot expression="thumbsup" size={60} />
        <div className="flex-1 min-w-[200px]">
          <h1 className="page-title">Worth It?</h1>
          <p className="text-sm text-gray-500">Rate every purchase — high = must-have, low = adhoc</p>
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-bold text-emerald-700">{ratedCount}</span> of {filtered.length} rated
        </div>
      </div>

      {/* Period + count + sort + search */}
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
          <select value={count} onChange={e => setCount(parseInt(e.target.value, 10))}
            className="bg-transparent text-sm font-bold text-emerald-800 focus:outline-none cursor-pointer font-sans">
            {(COUNT_OPTIONS[period] || [1]).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-xs font-semibold text-gray-500">{UNIT_LABEL[period]}{count === 1 ? '' : 's'}</span>
        </div>

        <div className="inline-flex items-center gap-2 bg-white rounded-full pl-4 pr-2 py-1 border border-emerald-100 shadow-sm">
          <span className="text-xs font-semibold text-gray-500">Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="bg-transparent text-sm font-bold text-emerald-800 focus:outline-none cursor-pointer font-sans">
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Filter by store or item…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Worth It? pie chart summary */}
      {pieData.length > 0 && (
        <div className="card">
          <div className="grid lg:grid-cols-3 gap-4 items-center">
            <div className="lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 text-center">Spend by Rating</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <RTooltip formatter={(v, _n, p) => [`$${Number(v).toFixed(2)} (${p.payload.count})`, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-1 space-y-1.5">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="flex-1 font-semibold text-gray-700">{d.name}</span>
                  <span className="text-gray-500">{d.count}</span>
                  <span className="font-bold text-gray-700 w-16 text-right">${d.value.toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1 grid grid-cols-2 gap-2">
              <ValStat label="Avg Rating"   value={`${avgRating.toFixed(1)} ★`}                          tone="emerald" />
              <ValStat label="Regret Spend" value={`$${regretSpend.toFixed(0)}`}                          tone="rose" />
              <ValStat label="Rated"        value={`${ratedCount} / ${filtered.length}`}                  tone="gray" />
              <ValStat label="Period"       value={`${count} ${UNIT_LABEL[period]}${count === 1 ? '' : 's'}`} tone="amber" />
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <GuacMascot expression="relaxing" size={140} />
            <p className="text-gray-500">No transactions match. Try widening the period or clearing the filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <tr>{['', 'Date', 'Store', 'Amount', 'Worth It?', 'Tags', ''].map((h, i) =>
                <th key={i} className="px-4 py-3 text-left font-semibold">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <Fragment key={r.id}>
                  <ReceiptRow r={r} isExpanded={expandedId === r.id} onToggle={() => toggleExpanded(r.id)} />
                  {expandedId === r.id && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={7} className="px-6 py-3">
                        <ItemList receiptId={r.id} search={search} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ReceiptRow({ r, isExpanded, onToggle }) {
  const qc = useQueryClient()
  const rate = useMutation({
    mutationFn: (rating) => setReceiptValidation(r.id, { rating, validation_tags: r.validation_tags || [], validation_comment: r.validation_comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipts', r.id] })
    },
    onError: err => toast.error(err.message),
  })

  return (
    <tr className="hover:bg-emerald-50/30">
      <td className="px-4 py-3" onClick={onToggle}>
        <button type="button" className="text-emerald-600 hover:bg-emerald-100 rounded-full p-1">
          {isExpanded ? <ChevronDown size={14} /> : <ChevRight size={14} />}
        </button>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateShort(r.date)}</td>
      <td className="px-4 py-3 font-medium">
        <Link href={`/receipts/${r.id}`} className="text-emerald-800 hover:underline">{displayStoreName(r.store_name)}</Link>
      </td>
      <td className={`px-4 py-3 font-bold whitespace-nowrap ${parseFloat(r.total_amount) < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {parseFloat(r.total_amount) < 0 ? '+' : ''}${Math.abs(parseFloat(r.total_amount || 0)).toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(n => {
            const info = RATING_LABELS[n]
            const active = r.rating === n
            return (
              <button key={n} type="button" onClick={() => rate.mutate(n)} disabled={rate.isPending}
                title={info.label}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all ${
                  active ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'hover:bg-emerald-50 opacity-50 hover:opacity-100'
                }`}>
                {info.emoji}
              </button>
            )
          })}
        </div>
      </td>
      <td className="px-4 py-3">
        {r.validation_tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {r.validation_tags.slice(0, 2).map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">{t}</span>
            ))}
            {r.validation_tags.length > 2 && <span className="text-[10px] text-gray-400">+{r.validation_tags.length - 2}</span>}
          </div>
        ) : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        <Link href={`/receipts/${r.id}`} className="text-xs text-emerald-600 hover:underline">Details →</Link>
      </td>
    </tr>
  )
}

function ItemList({ receiptId, search }) {
  const { data, isLoading, error } = useReceipt(receiptId)
  if (isLoading) return <div className="text-xs text-gray-400">Loading items…</div>
  if (error) return <div className="text-xs text-rose-500">Failed: {error.message}</div>
  let items = data?.receipt_items || []
  const s = search.trim().toLowerCase()
  if (s) items = items.filter(it =>
    (it.item_name || '').toLowerCase().includes(s) ||
    (it.sku || '').toLowerCase().includes(s) ||
    (it.model || '').toLowerCase().includes(s)
  )
  if (items.length === 0) return <div className="text-xs text-gray-400 py-2">No items.</div>
  return (
    <div className="space-y-1.5">
      {items.map(it => <ItemRow key={it.id} item={it} />)}
    </div>
  )
}

const VAL_TONES = {
  emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50/50', text: 'text-emerald-800' },
  rose:    { border: 'border-rose-200',    bg: 'bg-rose-50/50',    text: 'text-rose-700' },
  gray:    { border: 'border-gray-200',    bg: 'bg-gray-50/50',    text: 'text-gray-800' },
  amber:   { border: 'border-amber-200',   bg: 'bg-amber-50/50',   text: 'text-amber-800' },
}
function ValStat({ label, value, tone }) {
  const t = VAL_TONES[tone] || VAL_TONES.gray
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-3`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold font-sans">{label}</p>
      <p className={`text-xl font-bold mt-0.5 font-sans tabular-nums ${t.text}`}>{value}</p>
    </div>
  )
}

function ItemRow({ item }) {
  const qc = useQueryClient()
  const rate = useMutation({
    mutationFn: (rating) => setItemValidation(item.id, { rating, validation_tags: item.validation_tags || [], validation_comment: item.validation_comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts', item.receipt_id] }),
    onError: err => toast.error(err.message),
  })
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.item_name}</p>
        <p className="text-[11px] text-gray-400">
          {item.qty}× · ${parseFloat(item.price || 0).toFixed(2)}
          {item.sku && <span className="ml-2 font-mono">SKU {item.sku}</span>}
          {item.model && <span className="ml-2 font-mono">Model {item.model}</span>}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => {
          const info = RATING_LABELS[n]
          const active = item.rating === n
          return (
            <button key={n} type="button" onClick={() => rate.mutate(n)} disabled={rate.isPending}
              title={info.label}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                active ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'hover:bg-emerald-50 opacity-50 hover:opacity-100'
              }`}>
              {info.emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}
