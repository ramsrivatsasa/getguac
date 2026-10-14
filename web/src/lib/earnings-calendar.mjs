const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null
export function normalizeEarnings(rows, symbols) {
  const wanted = new Set(symbols), seen = new Set()
  return (Array.isArray(rows) ? rows : []).filter(row => {
    const key = `${row.symbol}:${row.date}`
    if (!wanted.has(row.symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date || '') || !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date || seen.has(key)) return false
    seen.add(key); return true
  }).map(row => ({ symbol: row.symbol, date: row.date, quarter: Number.isInteger(row.quarter) && row.quarter >= 1 && row.quarter <= 4 ? row.quarter : null, year: Number.isInteger(row.year) ? row.year : null, timing: ({ bmo: 'Before market open', amc: 'After market close', dmh: 'During market hours' })[row.hour] || 'Time not confirmed', expectedEPS: number(row.epsEstimate), actualEPS: number(row.epsActual), expectedRevenue: number(row.revenueEstimate), actualRevenue: number(row.revenueActual) })).sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol))
}
let cache = null
export async function loadEarningsCalendar({ key = process.env.FINNHUB_API_KEY, now = new Date(), fetcher = fetch } = {}) {
  const unavailable = { rows: [], unavailable: 'Earnings estimates are unavailable.', asOf: null }
  if (!key) return unavailable
  if (cache && now.getTime() - cache.time < 900000) return cache.value
  try {
    const url = new URL('https://finnhub.io/api/v1/calendar/earnings')
    url.searchParams.set('from', new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10))
    url.searchParams.set('to', new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10))
    const res = await fetcher(url, { headers: { 'X-Finnhub-Token': key }, signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (!res.ok) return unavailable
    const data = await res.json()
    if (!Array.isArray(data.earningsCalendar)) return unavailable
    const value = { rows: data.earningsCalendar, asOf: now.toISOString(), unavailable: null }
    cache = { time: now.getTime(), value }; return value
  } catch { return unavailable }
}
