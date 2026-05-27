// /reports — aggregate views over the user's receipts:
//   1. Spending by category (donut chart + category breakdown)
//   2. Top stores by spend (table)
//   3. Repeat purchases (items bought 2+ times — pantry essentials)
//   4. One-time orders (items bought exactly once — impulse / try-it buys)
//
// Single supabase round-trip pulls receipts + embedded receipt_items, then
// we aggregate client-side. Fast enough for users with <10k receipts; for
// power users we'd swap to a server-side SQL aggregate.

'use client'
import { useMemo, useState, Fragment } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '../../../lib/supabase/client'
import { CATEGORIES, categoryLabel, categoryClass } from '../../../lib/categories'
import { formatDateShort } from '../../../lib/dateFormat'
import { BarChart3, PieChart as PieIcon, Repeat, Award, Store as StoreIcon, X } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const PERIODS = [
  { id: '1m',  label: '1 month',  days: 30  },
  { id: '3m',  label: '3 months', days: 90  },
  { id: '1y',  label: '1 year',   days: 365 },
  { id: 'all', label: 'All time', days: null },
]
const DEFAULT_PERIOD = '1y'

// Recharts donut colors — matches CATEGORIES palette as closely as Tailwind lets.
const CATEGORY_COLORS = {
  grub: '#10b981', eats: '#f97316', bars: '#d946ef', tea: '#10b981',
  drinks: '#ef4444',
  subs: '#8b5cf6', bills: '#0ea5e9', 'bank-fees': '#dc2626', cloud: '#38bdf8', tech: '#0ea5e9',
  'big-stuff': '#6366f1', 'fix-it': '#f59e0b', outdoors: '#84cc16',
  supplies: '#6366f1', fits: '#d946ef',
  pharmacy: '#f43f5e', health: '#10b981',
  'personal-care': '#ec4899', household: '#f59e0b',
  'gas-up': '#ef4444', fun: '#8b5cf6',
  gifting: '#ec4899', charity: '#f43f5e', misc: '#94a3b8',
}

// Pull receipts + items in a single query. Date filter on receipts is server-side;
// items come along as an embedded array per receipt.
async function getReportsData({ dateFrom }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not signed in')
  let q = sb.from('receipts')
    .select('id, store_name, store_id, date, total_amount, tax_paid, category, is_return, from_statement, receipt_items(id, item_name, sku, qty, price, returned, category)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(5000)
  if (dateFrom) q = q.gte('date', dateFrom)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export default function ReportsPage() {
  const [periodId, setPeriodId] = useState(DEFAULT_PERIOD)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const period = PERIODS.find(p => p.id === periodId) || PERIODS[0]
  const dateFrom = period.days
    ? new Date(Date.now() - period.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['reports', periodId],
    queryFn: () => getReportsData({ dateFrom }),
    staleTime: 60_000,
  })

  // Aggregate everything in one pass: category totals, store totals, per-item history.
  const { byCategory, byStore, itemHistory, totalSpent, totalReceipts } = useMemo(() => {
    const cat = new Map()
    const store = new Map()
    const items = new Map()  // key = lower(item_name)|sku, value = { name, sku, count, qty, spent, lastDate, stores }
    let sum = 0
    for (const r of receipts) {
      if (r.is_return) continue                      // refunds don't count as spend
      const amt = parseFloat(r.total_amount || 0)
      if (amt <= 0) continue                         // skip $0 / negative-but-not-marked-return rows so they don't drag category totals negative (was producing "Misc -169%" on the donut)
      sum += amt
      const ck = r.category || 'misc'
      cat.set(ck, (cat.get(ck) || 0) + amt)
      const sk = r.store_id || `name:${r.store_name || '—'}`
      const sentry = store.get(sk) || { id: r.store_id, name: r.store_name || '—', count: 0, spent: 0 }
      sentry.count++
      sentry.spent += amt
      store.set(sk, sentry)
      for (const it of (r.receipt_items || [])) {
        if (it.returned) continue
        const key = `${(it.item_name || '').toLowerCase().trim()}|${(it.sku || '').trim()}`
        if (!key.replace('|', '')) continue
        const ie = items.get(key) || {
          name: it.item_name, sku: it.sku, count: 0, qty: 0, spent: 0,
          lastDate: null, lastReceiptId: null, stores: new Set(),
        }
        ie.count++
        ie.qty += parseInt(it.qty || 1, 10)
        ie.spent += parseFloat(it.price || 0)
        if (!ie.lastDate || r.date > ie.lastDate) {
          ie.lastDate = r.date
          ie.lastReceiptId = r.id
        }
        if (r.store_name) ie.stores.add(r.store_name)
        items.set(key, ie)
      }
    }
    return {
      byCategory: [...cat.entries()].map(([slug, amount]) => ({ slug, amount })).sort((a, b) => b.amount - a.amount),
      byStore: [...store.values()].sort((a, b) => b.spent - a.spent),
      itemHistory: [...items.values()].map(it => ({ ...it, stores: [...it.stores] })),
      totalSpent: sum,
      totalReceipts: receipts.filter(r => !r.is_return).length,
    }
  }, [receipts])

  const oneTime = useMemo(() => itemHistory.filter(it => it.count === 1).sort((a, b) => b.spent - a.spent), [itemHistory])
  const repeats = useMemo(() => itemHistory.filter(it => it.count >= 2).sort((a, b) => b.count - a.count || b.spent - a.spent), [itemHistory])

  // Receipts in the user-selected category. Tagging is on the receipt itself
  // (r.category) — receipt_items have their own category but the donut groups
  // by receipt-level, so we keep this consistent. Returns are excluded to match
  // the donut totals.
  const categoryReceipts = useMemo(() => {
    if (!selectedCategory) return []
    return receipts
      .filter(r => !r.is_return && (r.category || 'misc') === selectedCategory)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [receipts, selectedCategory])

  function toggleCategory(slug) {
    setSelectedCategory(prev => prev === slug ? null : slug)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <GuacMascot expression="celebrating" size={64} />
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-semibold text-gray-700">${totalSpent.toFixed(2)}</span> across <span className="font-semibold text-gray-700">{totalReceipts}</span> receipt{totalReceipts === 1 ? '' : 's'} · {period.label}
            </p>
          </div>
        </div>
        <div className="inline-flex bg-white rounded-full border border-gray-200 p-0.5 text-xs">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodId(p.id)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                periodId === p.id ? 'bg-emerald-100 text-emerald-900' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-400 py-10 text-center">Loading reports…</div>
      ) : receipts.length === 0 ? (
        <div className="card py-16 text-center flex flex-col items-center gap-3">
          <GuacMascot expression="relaxing" size={120} />
          <p className="text-gray-500">No receipts in this window. Try a wider period.</p>
        </div>
      ) : (
        <>
          {/* 1. Spending by category */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <PieIcon size={14} className="text-emerald-700" />
              <h2 className="font-semibold text-gray-800 text-sm">Spending by category</h2>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <CategoryDonut data={byCategory} total={totalSpent} colors={CATEGORY_COLORS} />
              {/* Right column: a 3-col grid so the amount + % columns line up
                  vertically. The category chip lives in the first (auto) col
                  and absorbs the variable label width. First grid row is the
                  column headers (Category / Amount / Share). */}
              <div className="flex-1 min-w-0 text-xs grid gap-y-1 w-full" style={{ gridTemplateColumns: 'minmax(0,1fr) auto auto', columnGap: '12px' }}>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 pb-1 border-b border-gray-100">Category</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 pb-1 border-b border-gray-100 text-right">Amount</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 pb-1 border-b border-gray-100 text-right w-10">Share</span>
                {byCategory.slice(0, 10).map(c => {
                  const isSelected = selectedCategory === c.slug
                  return (
                    <Fragment key={c.slug}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(c.slug)}
                        title={isSelected ? 'Hide records' : 'Show records'}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border self-center justify-self-start max-w-fit transition-all hover:scale-105 ${categoryClass(c.slug)} ${isSelected ? 'ring-2 ring-emerald-400 shadow-sm' : ''}`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[c.slug] || '#94a3b8' }} />
                        <span>{categoryLabel(c.slug)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCategory(c.slug)}
                        className={`font-semibold self-center text-right tabular-nums hover:text-emerald-700 ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}
                      >${c.amount.toFixed(2)}</button>
                      <button
                        type="button"
                        onClick={() => toggleCategory(c.slug)}
                        className={`self-center text-right tabular-nums w-10 hover:text-emerald-600 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}
                      >{((c.amount / totalSpent) * 100).toFixed(0)}%</button>
                    </Fragment>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 1b. Drill-down: receipts in the selected category */}
          {selectedCategory && (
            <div className="card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs ${categoryClass(selectedCategory)}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[selectedCategory] || '#94a3b8' }} />
                    <span>{categoryLabel(selectedCategory)}</span>
                  </span>
                  <h2 className="font-semibold text-gray-800 text-sm">
                    {categoryReceipts.length} receipt{categoryReceipts.length === 1 ? '' : 's'} in {period.label.toLowerCase()}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                  title="Close drill-down"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              {categoryReceipts.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No receipts tagged with this category in the selected period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b text-gray-500">
                      <tr>
                        <th className="px-3 py-1 text-left">Date</th>
                        <th className="px-3 py-1 text-left">Store</th>
                        <th className="px-3 py-1 text-left">Items</th>
                        <th className="px-3 py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {categoryReceipts.map(r => {
                        const itemCount = (r.receipt_items || []).filter(i => !i.returned).length
                        const preview = (r.receipt_items || []).filter(i => !i.returned).slice(0, 3).map(i => i.item_name).filter(Boolean).join(', ')
                        return (
                          <tr key={r.id} className="hover:bg-emerald-50/30">
                            <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{formatDateShort(r.date)}</td>
                            <td className="px-3 py-1.5">
                              {r.store_id ? (
                                <Link href={`/stores/${r.store_id}`} className="text-blue-700 hover:underline">{r.store_name || '—'}</Link>
                              ) : <span>{r.store_name || '—'}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-gray-500 max-w-md truncate" title={preview}>
                              {itemCount > 0
                                ? <><span className="text-gray-700 font-medium">{itemCount}</span> {preview && <span className="text-gray-400">· {preview}{itemCount > 3 ? '…' : ''}</span>}</>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                              <Link href={`/receipts/${r.id}`} className="hover:text-emerald-700">${parseFloat(r.total_amount || 0).toFixed(2)}</Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. Top stores by spend */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <StoreIcon size={14} className="text-emerald-700" />
              <h2 className="font-semibold text-gray-800 text-sm">Top stores by spend</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b text-gray-500">
                  <tr>
                    <th className="px-3 py-1 text-left">Rank</th>
                    <th className="px-3 py-1 text-left">Store</th>
                    <th className="px-3 py-1 text-right">Receipts</th>
                    <th className="px-3 py-1 text-right">Total spend</th>
                    <th className="px-3 py-1 text-right">Avg basket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byStore.slice(0, 25).map((s, i) => (
                    <tr key={s.id || s.name} className="hover:bg-blue-50/40">
                      <td className="px-3 py-1 text-gray-400">#{i + 1}</td>
                      <td className="px-3 py-1">
                        {s.id ? (
                          <Link href={`/stores/${s.id}`} className="text-blue-700 hover:underline">{s.name}</Link>
                        ) : <span>{s.name}</span>}
                      </td>
                      <td className="px-3 py-1 text-right text-gray-500">{s.count}</td>
                      <td className="px-3 py-1 text-right font-semibold">${s.spent.toFixed(2)}</td>
                      <td className="px-3 py-1 text-right text-gray-500">${(s.spent / s.count).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Repeat purchases */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Repeat size={14} className="text-emerald-700" />
              <h2 className="font-semibold text-gray-800 text-sm">Repeat purchases <span className="text-gray-400 font-normal">— bought 2+ times</span></h2>
            </div>
            {repeats.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No repeat purchases yet in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b text-gray-500">
                    <tr>
                      <th className="px-3 py-1 text-left">Item</th>
                      <th className="px-3 py-1 text-right">Buys</th>
                      <th className="px-3 py-1 text-right">Total qty</th>
                      <th className="px-3 py-1 text-right">Total spend</th>
                      <th className="px-3 py-1 text-left">Stores</th>
                      <th className="px-3 py-1 text-left">Last bought</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {repeats.slice(0, 50).map(it => (
                      <tr key={(it.name || '') + '|' + (it.sku || '')} className="hover:bg-blue-50/40">
                        <td className="px-3 py-1 max-w-xs truncate" title={it.name}>{it.name || '—'}</td>
                        <td className="px-3 py-1 text-right font-semibold">{it.count}</td>
                        <td className="px-3 py-1 text-right text-gray-500">{it.qty}</td>
                        <td className="px-3 py-1 text-right">${it.spent.toFixed(2)}</td>
                        <td className="px-3 py-1 text-gray-500 max-w-xs truncate" title={it.stores.join(', ')}>{it.stores.join(', ') || '—'}</td>
                        <td className="px-3 py-1 text-gray-500 whitespace-nowrap">
                          {it.lastReceiptId
                            ? <Link href={`/receipts/${it.lastReceiptId}`} className="text-blue-700 hover:underline">{formatDateShort(it.lastDate)}</Link>
                            : formatDateShort(it.lastDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. One-time orders */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Award size={14} className="text-amber-600" />
              <h2 className="font-semibold text-gray-800 text-sm">One-time orders <span className="text-gray-400 font-normal">— bought exactly once</span></h2>
            </div>
            {oneTime.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Nothing bought just once in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b text-gray-500">
                    <tr>
                      <th className="px-3 py-1 text-left">Item</th>
                      <th className="px-3 py-1 text-right">Spend</th>
                      <th className="px-3 py-1 text-left">Store</th>
                      <th className="px-3 py-1 text-left">Bought</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {oneTime.slice(0, 100).map(it => (
                      <tr key={(it.name || '') + '|' + (it.sku || '')} className="hover:bg-blue-50/40">
                        <td className="px-3 py-1 max-w-md truncate" title={it.name}>{it.name || '—'}</td>
                        <td className="px-3 py-1 text-right">${it.spent.toFixed(2)}</td>
                        <td className="px-3 py-1 text-gray-500 max-w-xs truncate">{it.stores[0] || '—'}</td>
                        <td className="px-3 py-1 text-gray-500 whitespace-nowrap">
                          {it.lastReceiptId
                            ? <Link href={`/receipts/${it.lastReceiptId}`} className="text-blue-700 hover:underline">{formatDateShort(it.lastDate)}</Link>
                            : formatDateShort(it.lastDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Native SVG donut. Reliable across layouts — recharts silently fails to
// render when its parent has computed-zero width. Each segment is a circle
// with strokeDasharray sized to its fraction of the total.
function CategoryDonut({ data, total, colors, size = 240 }) {
  if (!data || data.length === 0 || !total) {
    return (
      <div className="shrink-0 flex items-center justify-center text-gray-300 text-xs" style={{ width: size, height: size }}>
        No data
      </div>
    )
  }
  const radius = 90
  const stroke = 50
  const circumference = 2 * Math.PI * radius
  let cursor = 0
  const cx = size / 2
  const cy = size / 2
  const center = `$${total.toFixed(0)}`
  return (
    <div className="shrink-0 relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        {data.map(d => {
          const frac = total > 0 ? d.amount / total : 0
          const arcLen = circumference * frac
          // Small gap between slices: shorten each arc by 2px, leave a 2px gap.
          const visible = Math.max(0, arcLen - 2)
          const segment = (
            <circle
              key={d.slug}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={colors[d.slug] || '#94a3b8'}
              strokeWidth={stroke}
              strokeDasharray={`${visible} ${circumference - visible}`}
              strokeDashoffset={-cursor}
            >
              <title>{`${d.slug}: $${d.amount.toFixed(2)} (${((d.amount / total) * 100).toFixed(0)}%)`}</title>
            </circle>
          )
          cursor += arcLen
          return segment
        })}
      </svg>
      {/* Center label — total spend so the donut isn't just a colour wheel. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total</span>
        <span className="text-lg font-extrabold text-gray-800">{center}</span>
      </div>
    </div>
  )
}
