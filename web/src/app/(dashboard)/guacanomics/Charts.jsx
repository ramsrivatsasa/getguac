'use client'
import { formatDateShort } from '../../../lib/dateFormat'
import Link from 'next/link'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Sparkles, TrendingDown, Tag, Calendar, ShoppingBag } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { displayStoreName } from '../../../lib/store-name-normalize'

const PIE_COLORS = ['#e11d48', '#10b981']
// Green→amber→red heat for the Top-Stores bars: the more a store's spend
// approaches the top spender's, the redder the bar (green = low, red = high).
function spendHeatHex(t) {
  t = Math.max(0, Math.min(1, t))
  const g = [34, 197, 94], a = [245, 158, 11], r = [220, 38, 38]
  const mix = (x, y, k) => Math.round(x + (y - x) * k)
  const c = t < 0.5
    ? [mix(g[0], a[0], t / 0.5), mix(g[1], a[1], t / 0.5), mix(g[2], a[2], t / 0.5)]
    : [mix(a[0], r[0], (t - 0.5) / 0.5), mix(a[1], r[1], (t - 0.5) / 0.5), mix(a[2], r[2], (t - 0.5) / 0.5)]
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export default function Charts({ insights }) {
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-gray-500" />
            Spending Trend
          </h3>
          {insights.timeSeries.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data in this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={insights.timeSeries} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                  formatter={v => `$${Number(v).toFixed(2)}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                <Line type="monotone" dataKey="spent" name="Spent" stroke="#e11d48" strokeWidth={2} dot={{ r: 2.5, fill: '#e11d48', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="refunded" name="Refunded" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card lg:col-span-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <GuacMascot expression="thumbsup" size={26} />
            Worth It?
          </h3>
          {insights.ratedCount === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-xs px-4">
              Nothing rated yet.<br />
              <Link href="/validate" className="text-guac-700 font-semibold hover:underline mt-1">Start rating →</Link>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={insights.ratingBuckets.filter(b => b.spend > 0).map(b => ({ name: `${b.emoji} ${b.label}`, value: b.spend, color: b.color }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                    {insights.ratingBuckets.filter(b => b.spend > 0).map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                    formatter={v => `$${Number(v).toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-around text-xs pt-2 border-t border-gray-100">
                <span><span className="text-gray-500">Avg</span> <span className="font-bold text-guac-700">{insights.avgRating.toFixed(1)} ★</span></span>
                <span><span className="text-gray-500">Regret</span> <span className="font-bold text-rose-700">${insights.regretSpend.toFixed(0)}</span></span>
              </div>
              <Link href="/validate" className="text-center text-xs text-guac-700 hover:underline mt-2 font-semibold">
                Rate {insights.unratedCount} pending →
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-gray-500" />
            Top Stores
          </h3>
          {insights.topStores.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">Nothing to show</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, insights.topStores.length * 36 + 40)}>
              <BarChart data={insights.topStores} layout="vertical" margin={{ top: 10, right: 24, left: 12, bottom: 8 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="store" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={120} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                  formatter={(v, name) => name === 'spent' ? `$${Number(v).toFixed(2)}` : v}
                />
                <Bar dataKey="spent" radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive={false}>
                  {(() => {
                    const max = Math.max(...insights.topStores.map(s => s.spent || 0)) || 1
                    return insights.topStores.map((s, i) => <Cell key={i} fill={spendHeatHex((s.spent || 0) / max)} />)
                  })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-gray-500" />
            Purchases vs Refunds
          </h3>
          {insights.grossSpend === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No purchases</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={insights.purchaseVsReturn} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                  {insights.purchaseVsReturn.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                  formatter={v => `$${Number(v).toFixed(2)}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {insights.categoryBuckets.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Tag size={16} className="text-guac-600" />
            Spend by Category
          </h3>
          <div className="grid lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={insights.categoryBuckets} dataKey="spend" nameKey="label"
                  cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                  {insights.categoryBuckets.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                  formatter={v => `$${Number(v).toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <table className="w-full text-sm">
              <thead className="border-b border-guac-line text-[10.5px] uppercase tracking-[0.05em] text-guac-label font-extrabold">
                <tr>
                  <th className="py-2 pr-2 text-left font-semibold">Category</th>
                  <th className="py-2 px-2 text-right font-semibold">Receipts</th>
                  <th className="py-2 px-2 text-right font-semibold">Spend</th>
                  <th className="py-2 pl-2 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-guac-line">
                {(() => {
                  // Use the pie's own total so the % column matches the slice
                  // sizes (Bank Bite is a synthetic slice that isn't in grossSpend).
                  const pieTotal = insights.categoryBuckets.reduce((n, c) => n + c.spend, 0)
                  return insights.categoryBuckets.map(c => {
                    const pct = pieTotal ? (c.spend / pieTotal) * 100 : 0
                    return (
                      <tr key={c.slug} className="hover:bg-guac-row">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="text-base leading-none">{c.emoji}</span>
                            <span className="font-medium text-gray-700">{c.label}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right text-gray-500">{c.count || ''}</td>
                        <td className="py-2 px-2 text-right font-semibold text-gray-800">${c.spend.toFixed(0)}</td>
                        <td className="py-2 pl-2 text-right text-gray-400">{pct.toFixed(0)}%</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg">🥑</span>
            Worth It? — Purchase Validation
          </h3>
          <Link href="/validate" className="btn-primary text-xs py-1.5 px-3">
            {insights.unratedCount > 0 ? `Rate ${insights.unratedCount} pending` : 'Re-rate'}
          </Link>
        </div>

        {insights.ratedCount === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            You haven&apos;t rated any purchases yet. <Link href="/validate" className="text-guac-700 font-semibold hover:underline">Start rating →</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 text-center">Spend by Rating</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={insights.ratingBuckets.filter(b => b.spend > 0).map(b => ({ name: `${b.emoji} ${b.label}`, value: b.spend, color: b.color }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={75} paddingAngle={3} isAnimationActive={false}
                  >
                    {insights.ratingBuckets.filter(b => b.spend > 0).map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-xs text-gray-500 mt-1">
                Avg <span className="font-bold text-guac-700">{insights.avgRating.toFixed(1)} ★</span>
                {' '}· Regret <span className="font-bold text-rose-700">${insights.regretSpend.toFixed(2)}</span>
              </p>
            </div>

            <div className="lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Breakdown</p>
              <div className="space-y-2">
                {insights.ratingBuckets.map(b => {
                  const pct = insights.grossSpend ? (b.spend / insights.grossSpend) * 100 : 0
                  return (
                    <div key={b.rating} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-28 shrink-0">
                        <span className="text-base">{b.emoji}</span>
                        <span className="text-[11px] font-bold text-gray-700">{b.label}</span>
                        <span className="text-[10px] text-gray-400">({b.count})</span>
                      </div>
                      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-600 w-16 text-right">${b.spend.toFixed(0)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <MiniStat label="Avg rating" value={`${insights.avgRating.toFixed(1)} ★`} />
                <MiniStat label="Rated" value={`${insights.ratedCount} / ${insights.purchaseCount}`} />
              </div>
            </div>

            <div className="lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                <Sparkles size={12} className="text-guac-600" /> Top Tags
              </p>
              {insights.topTags.length === 0 ? (
                <p className="text-sm text-gray-400">No tags yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {insights.topTags.map(([tag, count]) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-guac-50 text-guac-700 border border-guac-line2">
                      {tag} <span className="text-guac-600 ml-1">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles size={16} className="text-gray-500" />
            Biggest Spends
          </h3>
        </div>
        {insights.largest.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No purchases to spotlight</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-guac-line text-[10.5px] uppercase tracking-[0.05em] text-guac-label font-extrabold">
              <tr>{['Store','Date','Amount','Tax','Type'].map(h =>
                <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-guac-line">
              {insights.largest.map(r => (
                <tr key={r.id} className="hover:bg-guac-row">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/receipts/${r.id}`} className="text-guac-700 hover:underline">{displayStoreName(r.store_name)}</Link>
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
    </>
  )
}

function MiniStat({ label, value, negative }) {
  return (
    <div className={`rounded-2xl border p-3 ${negative ? 'border-rose-200 bg-rose-50/50' : 'border-guac-line bg-guac-50/40'}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{label}</p>
      <p className={`text-lg font-extrabold mt-0.5 ${negative ? 'text-rose-700' : 'text-guac-700'}`}>{value}</p>
    </div>
  )
}
