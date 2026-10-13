export const MARKET_SYMBOLS = ['^IXIC', '^GSPC', '^DJI', '^FTSE', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'SBUX', 'NKE', 'BA']
export const PERIODS = { '1D': ['1d', '5m'], '1W': ['5d', '30m'], '1M': ['1mo', '1d'], '6M': ['6mo', '1d'], YTD: ['ytd', '1d'], '1Y': ['1y', '1wk'], '5Y': ['5y', '1mo'], '10Y': ['10y', '1mo'], ALL: ['max', '1mo'] }
export const validSymbol = value => typeof value === 'string' && /^[A-Z^][A-Z0-9.^=-]{0,14}$/.test(value)
export function symbolFromPath(value) {
  if (typeof value !== 'string') return ''
  try { return decodeURIComponent(value).toUpperCase() } catch { return value.toUpperCase() }
}
const finite = n => typeof n === 'number' && Number.isFinite(n) ? n : null
export function normalizeChart(result, period) {
  const meta = result?.meta
  if (!meta?.symbol) throw new Error('No quote available')
  const quote = result.indicators?.quote?.[0] || {}
  const points = (result.timestamp || []).map((time, i) => ({ time: time * 1000, value: finite(quote.close?.[i]) })).filter(p => p.value !== null)
  const first = points[0]?.value
  const last = points.at(-1)?.value
  const baseline = period === '1D' ? finite(meta.previousClose) ?? finite(meta.chartPreviousClose) : first
  const change = baseline != null && last != null ? last - baseline : null
  return { symbol: meta.symbol, name: meta.longName || meta.shortName || meta.symbol,
    instrumentType: meta.instrumentType || null, currency: meta.currency || null, exchange: meta.fullExchangeName || meta.exchangeName || null,
    price: finite(meta.regularMarketPrice), asOf: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
    period, points, change, changePercent: baseline && change !== null ? change / baseline * 100 : null,
    open: finite(quote.open?.find(v => finite(v) !== null)), high: finite(meta.regularMarketDayHigh),
    low: finite(meta.regularMarketDayLow), volume: finite(meta.regularMarketVolume),
    weekHigh: finite(meta.fiftyTwoWeekHigh), weekLow: finite(meta.fiftyTwoWeekLow),
    source: 'Yahoo Finance', sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(meta.symbol)}/`,
  }
}
const cache = new Map()
export async function getMarketChart(symbol, period = '1D') {
  if (!validSymbol(symbol) || !PERIODS[period]) throw new Error('Invalid market request')
  const key = `${symbol}:${period}`, existing = cache.get(key)
  if (existing && Date.now() - existing.time < 60000) return existing.data
  const [range, interval] = PERIODS[period]
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`, { signal: AbortSignal.timeout(9000), cache: 'no-store', headers: { 'User-Agent': 'GetGuac/1.0' } })
  if (!response.ok) throw new Error('Market data is temporarily unavailable')
  const payload = await response.json()
  const data = normalizeChart(payload.chart?.result?.[0], period)
  if (cache.size > 200) cache.clear()
  cache.set(key, { time: Date.now(), data })
  return data
}
