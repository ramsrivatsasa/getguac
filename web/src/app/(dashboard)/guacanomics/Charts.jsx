'use client'
import { formatDateShort } from '../../../lib/dateFormat'
import useCurrencySymbol from '../../../hooks/useCurrencySymbol'
import Link from 'next/link'
import {
  ComposedChart, Area, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Sparkles, TrendingDown, Tag, Calendar, ShoppingBag } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import { displayStoreName } from '../../../lib/store-name-normalize'

// Money formatters — thousands separators, Bricolage (never mono), matching
// the KPI cards on the page. money2 → cents; money0 → whole dollars.
const money2 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
// Space-separated date (DD MMM YYYY) to match the mockup, without touching the
// hyphenated shared formatDateShort helper used elsewhere.
const formatDateSpaced = (input) => formatDateShort(input).replace(/-/g, ' ')

const PIE_COLORS = ['#e11d48', '#10b981']
// Site-wide bar style: every bar carries the full green→amber→red heat
// gradient along its own length (matches the dashboard + tour deck).
const HEAT_GRADIENT = 'linear-gradient(90deg,#16a34a,#f59e0b,#dc2626)'

export default function Charts({ insights }) {
  const __cur = useCurrencySymbol()
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="gg-h2 mb-4 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-lg bg-guac-50 text-guac-700 shrink-0">
              <Calendar size={14} />
            </span>
            Spending Trend
          </h3>
          {insights.timeSeries.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data in this range</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={insights.timeSeries} margin={{ top: 16, right: 16, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="spentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E5194B" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#E5194B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: 14, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                  formatter={v => `${__cur}${money2(v)}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                <Area type="monotone" dataKey="spent" name="Spent" stroke="#E5194B" strokeWidth={2} fill="url(#spentFill)" dot={{ r: 2.5, fill: '#E5194B', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="refunded" name="Refunded" stroke="#22C55E" strokeWidth={2} dot={{ r: 2.5, fill: '#22C55E', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card lg:col-span-1 flex flex-col">
          <h3 className="gg-h2 mb-2 flex items-center gap-2">
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
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={insights.ratingBuckets.filter(b => b.spend > 0).map(b => ({ name: `${b.emoji} ${b.label}`, value: b.spend, color: b.color }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                      {insights.ratingBuckets.filter(b => b.spend > 0).map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 14, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                      formatter={v => `${__cur}${money2(v)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="gg-num text-2xl font-extrabold text-guac-ink leading-none">{insights.avgRating.toFixed(1)}</span>
                  <span className="text-[10px] text-guac-muted mt-0.5">avg ★</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-guac-line text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-guac-muted font-bold">Avg rating</p>
                  <p className="gg-num text-sm font-bold text-guac-700 mt-0.5">{insights.avgRating.toFixed(1)} ★</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-guac-muted font-bold">Regret</p>
                  <p className="gg-num text-sm font-bold text-rose-700 mt-0.5">{__cur}{money0(insights.regretSpend)}</p>
                </div>
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
          <h3 className="gg-h2 mb-4 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-lg bg-guac-50 text-guac-700 shrink-0">
              <ShoppingBag size={14} />
            </span>
            Top Stores
          </h3>
          {insights.topStores.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">Nothing to show</div>
          ) : (
            // v2 mockup renders Top Stores as a CSS horizontal-bar list (not a
            // recharts chart): store name · pale track with a heat-colored
            // rounded bar · $ total, plus a 0…max scale footer.
            (() => {
              const max = Math.max(...insights.topStores.map(s => s.spent || 0)) || 1
              return (
                <div>
                  <div className="flex flex-col gap-[11px]">
                    {insights.topStores.map((s, i) => {
                      const pct = Math.max(3, Math.round((s.spent || 0) / max * 100))
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-[132px] shrink-0 truncate text-right text-[13px] font-semibold text-guac-ink" title={s.store}>{s.store}</span>
                          <div className="flex-1 h-[15px] rounded-[5px] bg-[#F0F4EA] overflow-hidden">
                            <div className="h-full rounded-[5px]" style={{ width: `${pct}%`, background: HEAT_GRADIENT }} />
                          </div>
                          <span className="gg-num w-20 shrink-0 text-right text-[13px] font-extrabold text-guac-ink">{__cur}{money0(s.spent)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between ml-[144px] mr-[92px] mt-3 gg-num text-[10px] font-semibold text-guac-faint">
                    <span>{money0(0)}</span>
                    <span>{money0(max * 0.25)}</span>
                    <span>{money0(max * 0.5)}</span>
                    <span>{money0(max * 0.75)}</span>
                    <span>{money0(max)}</span>
                  </div>
                </div>
              )
            })()
          )}
        </div>

        <div className="card">
          <h3 className="gg-h2 mb-4 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-lg bg-guac-50 text-guac-700 shrink-0">
              <TrendingDown size={14} />
            </span>
            Purchases vs Refunds
          </h3>
          {insights.grossSpend === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No purchases</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={insights.purchaseVsReturn} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                    {insights.purchaseVsReturn.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                    formatter={v => `${__cur}${money2(v)}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 bottom-8 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider text-guac-muted font-bold">Net out</span>
                <span className="gg-num text-xl font-extrabold text-guac-ink leading-tight">{__cur}{money0(insights.netSpend)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {insights.categoryBuckets.length > 0 && (
        <div className="card !rounded-[22px]">
          <h3 className="gg-h2 mb-4 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[9px] bg-guac-50 text-guac-700 shrink-0">
              <Tag size={15} />
            </span>
            Spend by Category
          </h3>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={insights.categoryBuckets} dataKey="spend" nameKey="label"
                    cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                    {insights.categoryBuckets.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: '1px solid #d1fae5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 12 }}
                    formatter={v => `${__cur}${money2(v)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider text-guac-muted font-bold">Total</span>
                <span className="gg-num text-xl font-extrabold text-guac-ink leading-tight">{__cur}{money0(insights.categoryBuckets.reduce((n, c) => n + c.spend, 0))}</span>
                <span className="text-[10px] text-guac-muted mt-0.5">this range</span>
              </div>
            </div>
            <table className="gg-tbl w-full text-sm">
              <thead className="border-b border-guac-line gg-colhead">
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
                            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="text-base leading-none">{c.emoji}</span>
                            <span className="font-semibold text-guac-ink">{c.label}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right text-guac-faint">{c.count || ''}</td>
                        <td className="py-2 px-2 text-right gg-num font-semibold text-guac-ink">{__cur}{money0(c.spend)}</td>
                        <td className="py-2 pl-2 text-right text-guac-faint">{pct.toFixed(0)}%</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card !rounded-[22px]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="gg-h2 flex items-center gap-2">
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
              <p className="text-xs font-bold uppercase tracking-wider text-guac-faint mb-2 text-center">Spend by Rating</p>
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
                  <Tooltip formatter={v => `${__cur}${money2(v)}`} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-xs text-guac-muted mt-1">
                Avg <span className="gg-num font-bold text-guac-700">{insights.avgRating.toFixed(1)} ★</span>
                {' '}· Regret <span className="gg-num font-bold text-rose-700">{__cur}{money2(insights.regretSpend)}</span>
              </p>
            </div>

            <div className="lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-guac-faint mb-2">Breakdown</p>
              <div className="space-y-2">
                {insights.ratingBuckets.map(b => {
                  const pct = insights.grossSpend ? (b.spend / insights.grossSpend) * 100 : 0
                  return (
                    <div key={b.rating} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-28 shrink-0">
                        <span className="text-base">{b.emoji}</span>
                        <span className="text-[11px] font-bold text-guac-body">{b.label}</span>
                        <span className="text-[10px] text-guac-label">({b.count})</span>
                      </div>
                      <div className="flex-1 h-[9px] rounded-[5px] bg-[#F0F4EA] overflow-hidden">
                        <div className="h-full rounded-[5px] transition-all" style={{ width: `${pct}%`, background: HEAT_GRADIENT }} />
                      </div>
                      <span className="gg-num text-[11px] font-semibold text-guac-ink w-16 text-right">{__cur}{money0(b.spend)}</span>
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
              <p className="text-xs font-bold uppercase tracking-wider text-guac-faint mb-2 flex items-center gap-1">
                <Sparkles size={12} className="text-guac-600" /> Top Tags
              </p>
              {insights.topTags.length === 0 ? (
                <p className="text-sm text-guac-faint">Rate a few purchases and the reasons you tag them — &lsquo;on sale&rsquo;, &lsquo;impulse&rsquo;, &lsquo;needed it&rsquo; — show up here.</p>
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
        <div className="px-6 py-4 border-b border-guac-line">
          <h3 className="gg-h2 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[9px] bg-guac-50 text-guac-700 shrink-0">
              <Sparkles size={15} />
            </span>
            Biggest Spends
          </h3>
        </div>
        {insights.largest.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No purchases to spotlight</div>
        ) : (
          <table className="gg-tbl w-full text-sm">
            <thead className="border-b border-guac-line gg-colhead">
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
                  <td className="px-5 py-3 gg-num text-guac-muted">{formatDateSpaced(r.date)}</td>
                  <td className="px-5 py-3 gg-num font-semibold text-guac-ink">{__cur}{money2(r.total_amount)}</td>
                  <td className="px-5 py-3 gg-num text-guac-faint">{__cur}{money2(r.tax_paid)}</td>
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
