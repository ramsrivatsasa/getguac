'use client'
import Link from 'next/link'
import NewsDesktop from './NewsDesktop'
import EarningsCalendar from './EarningsCalendar'
import { storyMatchesSymbols } from '../lib/news-notifications.mjs'
import GuacMascot from './GuacMascot'
import { useEffect, useId, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Search, Share2, Star } from 'lucide-react'
import { MARKET_SYMBOLS, PERIODS, validSymbol } from '../lib/market-data.mjs'
import { NEWS_CATEGORIES, selectNews, newsCategory } from '../lib/news-selection.mjs'

const fmt = (n, digits = 2) => n == null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
const compact = n => n == null ? '—' : new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(n)
const signed = n => n == null ? '—' : `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`
const date = n => n && Number.isFinite(new Date(n).getTime()) ? new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unavailable'
async function json(url, options) { const r = await fetch(url, options); const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Unable to load data'); return data }
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600'

function Chart({ points = [], large = false, currency, change }) {
  const id = useId().replaceAll(':', '')
  const [hover, setHover] = useState(null)
  useEffect(() => setHover(null), [points])
  if (points.length < 2) return <div className={large ? 'grid h-56 place-items-center text-sm text-guac-muted' : 'text-xs text-guac-muted'}>Chart unavailable</div>
  const values = points.map(p => p.value), low = Math.min(...values), high = Math.max(...values)
  const range = high - low || Math.max(high * .01, 1), width = 600, height = 220
  const x = i => 8 + i / (points.length - 1) * 584, y = v => 204 - (v - low) / range * 186
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')
  const color = (change ?? values.at(-1) - values[0]) >= 0 ? '#16834a' : '#c24157'
  const selected = hover == null ? null : points[hover]
  return <div className="min-w-0">
    {large && <div className="mb-1 min-h-6 text-sm text-guac-muted" aria-live="polite">{selected ? `${date(selected.time)} · ${fmt(selected.value)} ${currency || ''}` : 'Move over the chart or use arrow keys to explore'}</div>}
    <svg viewBox={`0 0 ${width} ${height}`} className={large ? 'h-56 w-full focus-visible:outline-violet-500' : 'h-10 w-full'} preserveAspectRatio="none" role="img" aria-label={`Price trend from ${fmt(values[0])} to ${fmt(values.at(-1))}`} tabIndex={large ? 0 : undefined}
      onPointerMove={large ? e => { const rect = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(points.length - 1, Math.round((e.clientX - rect.left) / rect.width * (points.length - 1))))) } : undefined}
      onPointerLeave={() => setHover(null)} onKeyDown={large ? e => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); setHover(Math.max(0, Math.min(points.length - 1, (hover ?? points.length - 1) + (e.key === 'ArrowRight' ? 1 : -1)))) } } : undefined}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity=".16"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {large && [18, 111, 204].map(v => <line key={v} x1="0" x2="600" y1={v} y2={v} stroke="#e9e6ef" strokeDasharray="3 4"/>)}
      <path d={`${line} L592,220 L8,220 Z`} fill={`url(#${id})`}/><path d={line} fill="none" stroke={color} strokeWidth={large ? 2.5 : 2} vectorEffect="non-scaling-stroke"/>
      {selected && <><line x1={x(hover)} x2={x(hover)} y1="0" y2="220" stroke={color} strokeDasharray="4 4"/><circle cx={x(hover)} cy={y(selected.value)} r="4" fill={color}/></>}
    </svg>
    {large && <><div className="mt-2 flex justify-between text-xs text-guac-muted"><span>{date(points[0].time)}</span><span>{date(points.at(-1).time)}</span></div><p className="mt-2 text-xs text-guac-muted">Period low {fmt(low)} · high {fmt(high)} {currency}</p></>}
  </div>
}

function Stories({ items, empty = 'No stories are available in this category yet.' }) {
  return items.length ? <div className="divide-y divide-violet-100">{items.map(item => <a key={item.link || item.url} href={item.link || item.url} target="_blank" rel="noreferrer" className="group flex gap-3 py-4 focus-visible:outline-violet-600">
    <div className="min-w-0 flex-1"><p className="mb-1 text-xs text-guac-muted">{item.source} · {date(item.date)}</p><h3 className="font-display text-base font-bold leading-snug group-hover:text-violet-700">{item.title}</h3>{item.summary && <p className="mt-1 line-clamp-2 text-sm text-guac-body">{item.summary}</p>}<span className="mt-2 block text-xs text-violet-700">{newsCategory(item)} · Read original</span></div><ArrowUpRight size={17} className="mt-6 shrink-0 text-violet-600"/>
  </a>)}</div> : <p className="py-6 text-sm text-guac-muted">{empty}</p>
}

export default function FinanceHub({ symbol: routeSymbol, publicView = false }) {
  const params = useSearchParams(), queryClient = useQueryClient()
  const [tab, setTab] = useState(params.get('story') || params.get('article') || params.get('tab') === 'news' ? 'News' : params.get('tab') === 'watchlist' ? 'My watchlist' : 'Markets')
  useEffect(() => { if (!params.get('tab') && !params.get('story') && !params.get('article') && window.matchMedia('(min-width: 1024px)').matches) setTab('News') }, [params])
  const [search, setSearch] = useState(''), [submitted, setSubmitted] = useState(''), [period, setPeriod] = useState('1D')
  const [category, setCategory] = useState(params.get('category') === 'recalls' ? 'Recalls' : 'All news'), [saving, setSaving] = useState(false), [message, setMessage] = useState('')
  const [newsSearch, setNewsSearch] = useState(''), [storyLimit, setStoryLimit] = useState(12), [savingPreference, setSavingPreference] = useState(false)
  const [creatingWatchlist, setCreatingWatchlist] = useState(false), [firstSymbol, setFirstSymbol] = useState(''), [createError, setCreateError] = useState('')
  const [watchlistName, setWatchlistName] = useState(''), [editingWatchlist, setEditingWatchlist] = useState(false)
  const [addError, setAddError] = useState('')
  useEffect(() => setStoryLimit(12), [category, newsSearch])
  const watch = useQuery({ queryKey: ['market-watchlist'], queryFn: () => json('/api/watchlist'), enabled: !publicView })
  const watchlist = publicView ? [] : watch.data?.symbols || []
  const lists = publicView ? [] : watch.data?.lists || []
  const activeList = lists.find(list => list.id === watch.data?.activeId)
  const symbols = routeSymbol ? [routeSymbol.toUpperCase()] : submitted ? [submitted] : tab === 'My watchlist' ? watchlist : MARKET_SYMBOLS
  const quotes = useQuery({ queryKey: ['market-quotes', symbols.join(','), routeSymbol ? period : '1D'], queryFn: () => json(`/api/markets?symbols=${encodeURIComponent(symbols.join(','))}&period=${routeSymbol ? period : '1D'}`), enabled: symbols.length > 0, staleTime: 60000, refetchInterval: 60000, retry: 1 })
  const trending = useQuery({ queryKey: ['trending-tickers'], queryFn: () => json('/api/markets/trending'), staleTime: 300000, retry: false, enabled: !routeSymbol && tab === 'News' })
  const news = useQuery({ queryKey: ['economic-news', publicView ? 'public' : 'member'], queryFn: () => json('/api/economic-news'), staleTime: 900000, refetchInterval: 900000 })
  const recalls = useQuery({ queryKey: ['news-recalls'], queryFn: () => json('/api/news-recalls'), staleTime: 900000, enabled: tab === 'News' })
  const quote = quotes.data?.quotes?.[0]
  async function createWatchlist(e) {
    e.preventDefault()
    if (saving || !watch.data) return
    const symbol = firstSymbol.trim().toUpperCase()
    if (!watchlistName.trim()) { setCreateError('Enter a name for this watchlist.'); return }
    if (symbol && !validSymbol(symbol)) { setCreateError('Enter a stock or ETF symbol, such as AAPL or SPY.'); return }
    setSaving(true); setCreateError('')
    try {
      if (symbol) {
        const market = await json(`/api/markets?symbols=${encodeURIComponent(symbol)}&period=1D`)
        if (!market.quotes?.[0] || market.quotes[0].error || market.quotes[0].price == null) throw new Error('We could not verify that symbol. Check the symbol or try again shortly.')
      }
      const result = await json('/api/watchlist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: watchlistName, symbols: symbol ? [symbol] : [] }) })
      queryClient.setQueryData(['market-watchlist'], result)
      setSubmitted(''); setSearch(''); setFirstSymbol(''); setCreatingWatchlist(false)
      setMessage(`${watchlistName.trim()} created${symbol ? ` with ${symbol}` : ''}.`)
    } catch (error) { setCreateError(error.message) } finally { setSaving(false) }
  }
  async function manageWatchlist(action, listId = activeList?.id) {
    if (saving) return
    setSaving(true); setCreateError('')
    try {
      const result = await json('/api/watchlist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, listId, name: watchlistName }) })
      queryClient.setQueryData(['market-watchlist'], result)
      setSubmitted(''); setSearch(''); setEditingWatchlist(false); setCreatingWatchlist(false)
      setMessage(action === 'rename' ? 'Watchlist name saved.' : action === 'delete' ? 'Watchlist deleted.' : '')
    } catch (error) { setCreateError(error.message); setMessage(error.message) } finally { setSaving(false) }
  }
  async function toggle(symbol) {
    if (saving || !watch.data) return
    setSaving(true); setMessage('')
    try {
      const symbols = watchlist.includes(symbol) ? watchlist.filter(s => s !== symbol) : [...watchlist, symbol]
      const result = await json('/api/watchlist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbols, listId: activeList?.id }) })
      queryClient.setQueryData(['market-watchlist'], result)
      setMessage(result.symbols.includes(symbol) ? `${symbol} added to ${activeList?.name || 'My watchlist'}` : `${symbol} removed from ${activeList?.name || 'My watchlist'}`)
    } catch (error) { setMessage(error.message) } finally { setSaving(false) }
  }
  async function addSymbol() {
    if (saving || !activeList) return
    const symbol = search.trim().toUpperCase()
    setAddError(''); setMessage('')
    if (!validSymbol(symbol)) { setAddError('Enter a stock or ETF symbol, such as AAPL or SPY.'); return }
    if (watchlist.includes(symbol)) { setAddError(`${symbol} is already in ${activeList.name}.`); return }
    setSaving(true)
    try {
      const market = await json(`/api/markets?symbols=${encodeURIComponent(symbol)}&period=1D`)
      const match = market.quotes?.find(quote => quote.symbol === symbol)
      if (!match || match.error || match.price == null) throw new Error('We could not verify that symbol. Check the symbol or try again shortly.')
      const result = await json('/api/watchlist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add-symbol', symbol, listId: activeList.id }) })
      queryClient.setQueryData(['market-watchlist'], result)
      setSubmitted(''); setSearch('')
      setMessage(`${symbol} added to ${activeList.name}.`)
    } catch (error) { setAddError(error.message) } finally { setSaving(false) }
  }
  const star = symbol => publicView ? <Link href="/login?next=%2Fnews%3Ftab%3Dwatchlist" className={`${button} shrink-0 px-2 text-violet-700`} aria-label={`Sign in to follow ${symbol}`}><Star size={19}/></Link> : <button className={`${button} shrink-0 px-2 text-violet-700`} aria-label={`${watchlist.includes(symbol) ? 'Remove' : 'Add'} ${symbol} ${watchlist.includes(symbol) ? 'from' : 'to'} watchlist`} aria-pressed={watchlist.includes(symbol)} disabled={saving || !watch.data} onClick={() => toggle(symbol)}><Star size={19} fill={watchlist.includes(symbol) ? 'currentColor' : 'none'}/></button>
  const allNews = [...(news.data?.items || []), ...(recalls.data?.notices || []).map(n => ({ ...n, link: n.url, topic: 'Recalls' }))]
  const linkedStory = params.get('story') || (params.get('article') !== null ? news.data?.items?.[Number(params.get('article'))]?.link : null)
  const visibleNews = selectNews(allNews, { preferences: news.data?.preferences, watchlist, category, query: newsSearch })
  if (linkedStory) visibleNews.sort((a, b) => Number(b.link === linkedStory) - Number(a.link === linkedStory))
  async function savePreference(vote) {
    setSavingPreference(true)
    try { await json('/api/agents/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'news', topic: category, vote }) }); await news.refetch(); setMessage('News preference saved. All stories remain available.') }
    catch (error) { setMessage(error.message) } finally { setSavingPreference(false) }
  }
  async function share() {
    try { if (navigator.share) await navigator.share({ title: `${routeSymbol} · GetGuac`, url: location.href }); else { await navigator.clipboard.writeText(location.href); setMessage('Stock link copied') } } catch (e) { if (e.name !== 'AbortError') setMessage('Sharing is unavailable. Copy this page’s address to share it.') }
  }
  return <div className="w-full max-w-5xl pb-8 text-guac-ink">
    <header className="mb-5 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><GuacMascot size={40} expression="happy"/><h1 className="font-display text-2xl font-extrabold sm:text-3xl">News &amp; Finance</h1></div>{routeSymbol && <button onClick={share} className={`${button} border border-violet-100 bg-white`} aria-label="Share stock"><Share2 size={18}/></button>}</header>
    <p role="status" className={message ? 'mb-3 rounded-lg bg-violet-50 p-3 text-sm text-violet-800' : 'sr-only'}>{message}</p>
    {!publicView && watch.isError && <p role="alert" className="mb-3 text-sm text-rose-700">Your watchlist could not load. <button className="underline" onClick={() => watch.refetch()}>Retry</button></p>}
      {!!lists.length && <div className="mb-3 flex flex-wrap items-center gap-2"><label className="flex min-w-0 items-center gap-2 text-sm font-semibold">Watchlist<select aria-label="Selected watchlist" value={watch.data?.activeId || ''} disabled={saving} onChange={e => manageWatchlist('select', e.target.value)} className="min-h-11 min-w-0 max-w-[220px] rounded-xl border border-violet-100 bg-white px-3">{lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>{tab === 'My watchlist' && <button className={`${button} text-violet-700`} disabled={saving} onClick={() => { setEditingWatchlist(true); setCreatingWatchlist(false); setWatchlistName(activeList?.name || ''); setCreateError('') }}>Edit watchlist</button>}</div>}
    {routeSymbol ? <>
      <EarningsCalendar symbols={[routeSymbol.toUpperCase()]}/>
      <Link href="/news" className={`${button} mb-3 pl-0 text-violet-700`}><ArrowLeft size={18}/>All markets</Link>
      {quotes.isLoading ? <p className="py-12" role="status">Loading stock…</p> : quotes.isError || quote?.error ? <div className="rounded-2xl border bg-white p-6"><h2 className="font-display text-xl font-bold">{routeSymbol}</h2><p className="my-3">Quote unavailable. Try again shortly.</p><button className={`${button} bg-violet-50`} onClick={() => quotes.refetch()}>Retry</button></div> : quote && <section className="rounded-2xl border border-violet-100 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2"><div><h2 className="font-display text-3xl font-extrabold">{quote.symbol}</h2><p className="text-sm text-guac-muted">{quote.name}</p></div>{star(quote.symbol)}</div>
        <p className="mt-4 font-display text-3xl font-extrabold">{fmt(quote.price)} <span className="font-sans text-sm font-normal text-guac-muted">{quote.currency}</span></p>
        <p className={`mt-1 text-sm font-bold ${quote.change < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{signed(quote.change)} ({signed(quote.changePercent)}%) <span className="font-normal text-guac-muted">· {period === '1D' ? 'vs. previous close' : `${period} chart change`}</span></p>
        <p className="mt-2 text-xs text-guac-muted">{quote.exchange} · {quote.asOf ? new Date(quote.asOf).toLocaleString() : 'Timestamp unavailable'} · Quotes may be delayed</p>
        <nav aria-label="Chart period" className="my-4 flex flex-wrap gap-1">{Object.keys(PERIODS).map(p => <button key={p} aria-pressed={p === period} onClick={() => setPeriod(p)} className={`${button} ${period === p ? 'bg-violet-100 text-violet-800' : 'text-guac-body hover:bg-violet-50'}`}>{p}</button>)}</nav>
        <Chart points={quote.points} change={quote.change} large currency={quote.currency}/>
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-violet-100 pt-4 sm:grid-cols-3">{[['Day high', fmt(quote.high)], ['Day low', fmt(quote.low)], ['Volume', compact(quote.volume)], ['52-week high', fmt(quote.weekHigh)], ['52-week low', fmt(quote.weekLow)], ['Currency', quote.currency || '—']].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-2 text-sm"><dt className="text-guac-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
        <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className={`${button} mt-3 pl-0 text-violet-700`}>Data from Yahoo Finance<ArrowUpRight size={15}/></a>
        <h3 className="mt-4 font-display text-lg font-bold">Related news</h3><Stories items={(news.data?.items || []).filter(n => storyMatchesSymbols(n, [quote.symbol])).slice(0, 6)} empty="No matching stories in the current news feed."/>
      </section>}
    </> : <>
      <nav aria-label="News and finance sections" className="mb-4 flex gap-1 border-b border-violet-100 pb-2">{['Markets', 'My watchlist', 'News'].map(t => <button key={t} aria-pressed={tab === t} onClick={() => { setTab(t); setSubmitted(''); setSearch('') }} className={`${button} ${tab === t ? 'bg-violet-100 text-violet-800' : 'hover:bg-violet-50'}`}>{t}</button>)}</nav>
      {(tab === 'News' || tab === 'My watchlist' && !publicView) && <EarningsCalendar symbols={tab === 'My watchlist' ? watchlist : undefined} watchlist={tab === 'My watchlist'}/>}
      {tab === 'News' && <div className="mb-4 space-y-2">
        <nav aria-label="News categories" className="flex flex-wrap gap-1">{NEWS_CATEGORIES.map(c => <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={`${button} ${category === c ? 'bg-violet-100 text-violet-800' : 'hover:bg-violet-50'}`}>{c}</button>)}</nav>
        <div className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-violet-100 bg-white px-3"><Search size={17}/><input aria-label="Search news" value={newsSearch} onChange={e => setNewsSearch(e.target.value)} placeholder="Search news, refunds, recalls…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label>
          {!publicView && category !== 'All news' && category !== 'Recalls' && <label className="text-xs text-guac-muted">Show this topic <select aria-label="Topic preference" disabled={savingPreference} value={news.data?.preferences?.[category] || 0} onChange={e => savePreference(Number(e.target.value))} className="ml-2 min-h-11 rounded-lg border border-violet-100 bg-white px-2 text-sm text-guac-ink"><option value="0">Normally</option><option value="1">More often</option><option value="-1">Less often</option></select></label>}
        </div>
        {(news.isError || recalls.isError || news.data?.partial || recalls.data?.unavailable?.length > 0) && <p className="text-xs text-guac-muted">Some sources are unavailable; available stories are shown. <button className="min-h-11 underline" onClick={() => { news.refetch(); recalls.refetch() }}>Refresh news</button></p>}
      </div>}
      {tab === 'News' && <NewsDesktop trending={trending.data} items={visibleNews} quotes={quotes.data?.quotes || []} Chart={Chart} star={star} loading={news.isLoading} onWatchlist={() => setTab('My watchlist')} onSearch={value => { const v = String(value || '').trim().toUpperCase(); if (validSymbol(v)) { setSearch(v); setSubmitted(v); setTab('Markets') } else setMessage('Enter a valid stock symbol.') }}/>}
      {tab === 'My watchlist' && publicView && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-violet-50 p-3"><p className="text-sm">Save your stocks and personalize your news.</p><Link className={`${button} bg-violet-700 text-white`} href="/login?next=%2Fnews%3Ftab%3Dwatchlist">Sign in for watchlists</Link></div>}
      {tab === 'My watchlist' && !publicView && <div className="mb-4">
        {!creatingWatchlist && !editingWatchlist && <button className={`${button} bg-violet-700 text-white disabled:opacity-50`} disabled={saving || !watch.data} onClick={() => { setCreatingWatchlist(true); setWatchlistName(''); setFirstSymbol(''); setCreateError(''); setMessage('') }}>{lists.length ? 'New watchlist' : 'Create watchlist'}</button>}
        {(creatingWatchlist || editingWatchlist) && <form onSubmit={e => { if (editingWatchlist) { e.preventDefault(); manageWatchlist('rename') } else createWatchlist(e) }} className="max-w-md space-y-3 rounded-xl border border-violet-100 bg-white p-4">
          <label className="block text-sm font-semibold" htmlFor="watchlist-name">Watchlist name</label><input id="watchlist-name" autoFocus maxLength={40} value={watchlistName} onChange={e => setWatchlistName(e.target.value)} disabled={saving} className="min-h-11 w-full rounded-xl border border-violet-200 px-3"/>
          {creatingWatchlist && <><label className="block text-sm font-semibold" htmlFor="first-watchlist-symbol">First stock or ETF symbol (optional)</label><input id="first-watchlist-symbol" value={firstSymbol} onChange={e => setFirstSymbol(e.target.value)} placeholder="e.g. AAPL or SPY" autoComplete="off" disabled={saving} className="min-h-11 w-full rounded-xl border border-violet-200 px-3"/></>}
          {editingWatchlist && <p className="text-sm text-guac-muted">Enter a symbol below and choose Add. A filled star removes a symbol from this list.</p>}
          {createError && <p role="alert" className="text-sm text-rose-700">{createError}</p>}
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className={`${button} bg-violet-700 text-white`}>{saving ? 'Saving…' : editingWatchlist ? 'Save changes' : 'Create watchlist'}</button><button type="button" disabled={saving} className={button} onClick={() => { setCreatingWatchlist(false); setEditingWatchlist(false); setCreateError('') }}>Cancel</button>{editingWatchlist && <button type="button" disabled={saving} className={`${button} text-rose-700`} onClick={() => { if (window.confirm(`Delete ${activeList.name}? Other watchlists will stay unchanged.`)) manageWatchlist('delete') }}>Delete watchlist</button>}</div>
        </form>}
      </div>}
      {tab !== 'News' && !(publicView && tab === 'My watchlist') ? <section className="rounded-2xl border border-violet-100 bg-white p-3 sm:p-5">
        <form className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3" onSubmit={e => { e.preventDefault(); const value = search.trim().toUpperCase(); setAddError(''); if (!value || validSymbol(value)) { setSubmitted(value); setMessage('') } else setMessage('Enter a stock symbol, for example SBUX.') }}><Search size={18} className="shrink-0 text-guac-muted"/><input aria-label="Search stock or ETF symbol" value={search} onChange={e => { setSearch(e.target.value); setAddError('') }} placeholder="Search stock or ETF symbol" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"/><button className={`${button} px-1 text-violet-700`} type="submit">Search</button>{tab === 'My watchlist' && activeList && <button type="button" aria-label="Add stock or ETF to watchlist" disabled={saving || !watch.data} onClick={addSymbol} className={`${button} shrink-0 bg-violet-700 px-3 text-white disabled:opacity-50`}>{saving ? 'Adding…' : 'Add'}</button>}</form>
        {addError && <p role="alert" className="mb-3 text-sm text-rose-700">{addError}</p>}
        {submitted && <button onClick={() => { setSubmitted(''); setSearch('') }} className={`${button} mb-2 pl-0 text-violet-700`}>Clear search</button>}
        {tab === 'My watchlist' && !symbols.length ? <div className="py-7 text-center"><Star className="mx-auto mb-3 text-violet-500"/><h2 className="font-display text-xl font-bold">{activeList ? `${activeList.name} is empty` : 'Your markets, in one place'}</h2><p className="mt-2 text-sm text-guac-muted">{activeList ? 'Search a stock or ETF above, then use its star to add it to this list.' : 'Create a named watchlist to follow stocks and ETFs.'}</p>{watch.isLoading && <p role="status" className="mt-4 text-sm">Loading your watchlists…</p>}</div> : quotes.isLoading ? <p role="status" className="py-10 text-center text-sm">Loading market data…</p> : quotes.isError ? <p className="py-8 text-sm">Market data is unavailable. <button className="text-violet-700 underline" onClick={() => quotes.refetch()}>Retry</button></p> : <div className="divide-y divide-violet-100">{(quotes.data?.quotes || []).map(q => <div key={q.symbol} className="flex items-center gap-1">
          <Link href={`/news/stocks/${encodeURIComponent(q.symbol)}`} className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_60px_88px] items-center gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
            <div className="min-w-0"><h2 className="font-display text-base font-extrabold">{({ '^IXIC': 'NASDAQ', '^GSPC': 'S&P 500', '^DJI': 'Dow Jones', '^FTSE': 'FTSE 100' })[q.symbol] || q.symbol}</h2><p className="truncate text-xs text-guac-muted">{q.name || 'Quote unavailable'}</p></div>
            <Chart points={q.points} change={q.change}/><div className="text-right"><p className="font-display text-base font-bold">{fmt(q.price)}</p><p className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-semibold ${q.change == null ? 'bg-slate-50 text-guac-muted' : q.change < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{q.change == null ? 'Unavailable' : `${signed(q.changePercent)}%`}</p></div>
          </Link>{star(q.symbol)}
        </div>)}</div>}
        <p className="mt-3 text-xs leading-5 text-guac-muted">Yahoo Finance · Quotes may be delayed. Changes are relative to the previous close. Open a symbol for its currency and quote time.</p>
      </section> : tab === 'News' ? <section className="rounded-2xl border border-violet-100 bg-white p-4 sm:p-5 lg:hidden">
        {news.isLoading || recalls.isLoading ? <p role="status" className="py-8 text-sm">Loading news…</p> : <><Stories items={visibleNews.slice(0, storyLimit)}/>{visibleNews.length > storyLimit && <button className={`${button} text-violet-700`} onClick={() => setStoryLimit(n => n + 12)}>Show more stories</button>}</>}
      </section> : null}
    </>}
  </div>
}
