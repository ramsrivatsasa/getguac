'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { MARKET_SYMBOLS } from '../lib/market-data.mjs'
const value = (n, revenue = false) => n == null ? 'Unavailable' : new Intl.NumberFormat(undefined, { notation: revenue ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(n)
export default function EarningsCalendar({ symbols, watchlist = false }) {
  const selected = [...new Set((symbols || MARKET_SYMBOLS).filter(s => !s.startsWith('^')))].slice(0, 50)
  const earnings = useQuery({ queryKey: ['earnings-calendar', selected.join(',')], enabled: selected.length > 0, staleTime: 900000, retry: false, queryFn: async () => {
    const res = await fetch(`/api/markets/earnings?symbols=${encodeURIComponent(selected.join(','))}`)
    if (!res.ok) throw new Error('Earnings could not load')
    return res.json()
  } })
  return <section aria-label="Company earnings" className="mb-4 rounded-xl border border-violet-100 bg-white p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">{watchlist ? 'Watchlist earnings' : 'Company earnings'}</h2><span className="text-xs text-guac-muted">Past 7 days · next 30 days</span></div>
    {!selected.length ? <p className="py-3 text-sm text-guac-muted">Add a stock to follow its earnings.</p> : earnings.isLoading ? <p role="status" className="py-3 text-sm">Loading earnings…</p> : earnings.isError || earnings.data?.unavailable ? <p className="py-2 text-sm text-guac-muted">{earnings.data?.unavailable || 'Earnings could not load.'} <button className="min-h-11 text-violet-700 underline" onClick={() => earnings.refetch()}>Refresh</button></p> : !earnings.data?.items?.length ? <p className="py-3 text-sm text-guac-muted">No scheduled reports returned for these companies in this period.</p> : <div className="divide-y divide-violet-100">{earnings.data.items.map(item => <article key={`${item.symbol}:${item.date}`} className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/news/stocks/${item.symbol}`} className="min-h-11 inline-flex items-center font-bold text-violet-800">{item.symbol}</Link><p className="text-xs text-guac-muted">{item.date}{item.quarter && item.year ? ` · Q${item.quarter} ${item.year}` : ''} · {item.timing}</p></div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">{[['Expected EPS', value(item.expectedEPS)], ['Reported EPS', value(item.actualEPS)], ['Expected revenue', value(item.expectedRevenue, true)], ['Reported revenue', value(item.actualRevenue, true)]].map(([label, amount]) => <div key={label}><dt className="text-xs text-guac-muted">{label}</dt><dd className="font-semibold">{amount}</dd></div>)}</dl>
    </article>)}</div>}
    {earnings.data?.asOf && <p className="mt-2 text-xs text-guac-muted">Finnhub · Updated {new Date(earnings.data.asOf).toLocaleString()} · Analyst estimates are not guaranteed results. Currency is not specified by this feed. <a href={earnings.data.sourceUrl} className="underline" target="_blank" rel="noreferrer">Source</a></p>}
  </section>
}
