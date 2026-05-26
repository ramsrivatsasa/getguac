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
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '../../../lib/supabase/client'
import { CATEGORIES, categoryLabel, categoryClass } from '../../../lib/categories'
import { formatDateShort } from '../../../lib/dateFormat'
import { BarChart3, PieChart as PieIcon, Repeat, Award, Store as StoreIcon } from 'lucide-react'
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
  grub: '#10b981', eats: '#f97316', subs: '#8b5cf6', bills: '#0ea5e9',
  tech: '#0ea5e9', 'big-stuff': '#6366f1', 'fix-it': '#f59e0b',
  outdoors: '#84cc16', supplies: '#6366f1', fits: '#d946ef',
  wellness: '#f43f5e', 'gas-up': '#ef4444', fun: '#8b5cf6',
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
      if (amt > 0) sum += amt
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory.map(c => ({ name: categoryLabel(c.slug), value: c.amount, slug: c.slug }))}
                      dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {byCategory.map(c => <Cell key={c.slug} fill={CATEGORY_COLORS[c.slug] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1">
                {byCategory.slice(0, 10).map(c => (
                  <li key={c.slug} className="flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${categoryClass(c.slug)}`}>
                      <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.slug] || '#94a3b8' }} />
                      {categoryLabel(c.slug)}
                    </span>
                    <span className="font-semibold text-gray-700">${c.amount.toFixed(2)}</span>
                    <span className="text-gray-400 w-14 text-right">{((c.amount / totalSpent) * 100).toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

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
