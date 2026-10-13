'use client'
import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { newsCategory } from '../lib/news-selection.mjs'
const names = { '^IXIC': 'NASDAQ', '^GSPC': 'S&P 500', '^DJI': 'Dow Jones', '^FTSE': 'FTSE 100' }
const num = n => n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 })
const stamp = item => `${item.source} · ${new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
function Headline({ item }) {
  return <a href={item.link || item.url} target="_blank" rel="noreferrer" className="block border-b border-violet-100 py-3 hover:text-violet-700"><h3 className="font-display text-base font-bold leading-snug">{item.title}</h3><p className="mt-2 text-xs font-normal text-guac-muted">{stamp(item)}</p></a>
}
export default function NewsDesktop({ items, quotes, trending, Chart, star, onSearch, onWatchlist, loading }) {
  const [limit, setLimit] = useState(12)
  const itemKey = items.map(n => n.link).join('|')
  useEffect(() => setLimit(12), [itemKey])
  quotes = quotes.filter(q => q.price != null)
  const groups = [['Trending stocks', (trending?.quotes || []).filter(q => q.instrumentType !== 'ETF')], ['Trending ETFs', (trending?.quotes || []).filter(q => q.instrumentType === 'ETF')]].filter(([, rows]) => rows.length)
  const lead = items.find(n => newsCategory(n) !== 'Recalls') || items[0]
  const top = items.filter(n => n !== lead).slice(0, 3)
  const remaining = items.filter(n => n !== lead && !top.includes(n))
  const columns = [
    ['Top stories', top],
    ['Markets & economy', remaining.filter(n => ['Markets', 'Economy'].includes(newsCategory(n))).slice(0, 5)],
    ['Recalls & consumer news', remaining.filter(n => ['Recalls', 'Consumer finance'].includes(newsCategory(n))).slice(0, 5)],
  ]
  const displayed = new Set([lead, ...columns.flatMap(([, rows]) => rows)])
  const more = items.filter(n => !displayed.has(n))
  return <div className="hidden lg:block">
    <section aria-label="Market snapshot" className="mb-6 flex divide-x divide-violet-100 overflow-x-auto border-y border-violet-100 py-3">
      {quotes.slice(0, 6).map(q => <Link key={q.symbol} href={`/news/stocks/${encodeURIComponent(q.symbol)}`} className="flex min-w-40 flex-1 items-center gap-3 px-3"><div className="shrink-0"><p className="text-xs font-bold text-violet-700">{names[q.symbol] || q.symbol}</p><p className="mt-1 text-sm font-bold">{num(q.price)}</p><p className={`text-xs ${q.change < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{q.changePercent == null ? 'Unavailable' : `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`}</p></div><div className="min-w-12 flex-1"><Chart points={q.points} change={q.change}/></div></Link>)}
    </section>
    <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6">
      <section className="min-w-0">
        {loading && !lead ? <p role="status" className="py-10 text-guac-muted">Loading today’s stories…</p> : lead ? <a href={lead.link || lead.url} target="_blank" rel="noreferrer" className="block border-b border-violet-100 pb-6 hover:text-violet-700">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-violet-700">Lead story · {newsCategory(lead)}</p>
          <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight xl:text-4xl">{lead.title}</h2>
          {lead.summary && !/Historical Data/.test(lead.summary) && <p className="mt-4 max-w-3xl text-base leading-relaxed text-guac-body">{lead.summary}</p>}
          <p className="mt-4 text-xs text-guac-muted">{stamp(lead)} <ArrowUpRight className="ml-2 inline" size={14}/></p>
        </a> : <p className="py-8 text-guac-muted">News is temporarily unavailable.</p>}
        <div className="mt-5 grid gap-5 xl:grid-cols-3">{columns.filter(([, rows]) => rows.length).map(([label, rows]) => <section key={label} className="min-w-0"><h2 className="font-display text-lg font-extrabold">{label}</h2>{rows.length ? rows.map(item => <Headline key={item.link || item.url} item={item}/>) : <p className="py-4 text-sm text-guac-muted">No current stories.</p>}</section>)}</div>
        {!!more.length && <section className="mt-6 border-t border-violet-100 pt-4"><h2 className="font-display text-lg font-bold">More stories</h2><div className="grid gap-x-5 xl:grid-cols-2">{more.slice(0, limit).map(item => <Headline key={item.link || item.url} item={item}/>)}</div>{more.length > limit && <button className="mt-3 min-h-11 text-sm font-semibold text-violet-700" onClick={() => setLimit(n => n + 12)}>Show more stories</button>}</section>}
      </section>
      <aside className="h-fit rounded-xl border border-violet-100 bg-white p-4">
        <form className="mb-4 flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-2" onSubmit={e => { e.preventDefault(); onSearch(new FormData(e.currentTarget).get('symbol')) }}><Search size={15}/><input name="symbol" aria-label="Quote lookup" placeholder="Quote lookup" className="w-full min-w-0 bg-transparent py-3 text-sm outline-none"/><button className="text-sm font-bold text-violet-700" type="submit">Go</button></form>
        <button onClick={onWatchlist} className="mb-3 min-h-11 text-sm font-semibold text-violet-700">Open my watchlist →</button>
        {groups.map(([title, rows]) => <section key={title} className="mb-5">
          <h2 className="font-display text-lg font-extrabold">{title}</h2>
          <p className="mt-1 text-xs text-guac-muted">{rows.length} symbols · US feed</p>
          <div className="divide-y divide-dashed divide-violet-100">{rows.slice(0, 8).map(q => <div key={q.symbol} className="flex items-center gap-1 py-2">
            <Link className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_48px_76px] items-center gap-1" href={`/news/stocks/${encodeURIComponent(q.symbol)}`}>
              <div className="min-w-0"><p className="truncate text-xs font-bold text-violet-700">{q.symbol}</p><p className="truncate text-[11px] text-guac-muted">{q.name}</p></div>
              <Chart points={q.points} change={q.change}/>
              <div className="text-right"><p className="text-xs font-semibold">{num(q.price)}</p><p className={`text-[11px] ${q.change < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{q.change == null ? '' : `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}`}<br/>{q.changePercent == null ? '' : `(${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`}</p></div>
            </Link>{star(q.symbol)}
          </div>)}</div>
        </section>)}
        <p className="mt-3 text-xs leading-5 text-guac-muted">Yahoo Finance{trending?.asOf ? ` · ${new Date(trending.asOf).toLocaleString()}` : ''} · Quotes may be delayed. Open a symbol for its timestamp.</p>
      </aside>
    </div>
  </div>
}
