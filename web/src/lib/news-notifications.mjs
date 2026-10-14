export const NEWS_FREQUENCIES = ['off', 'daily', 'weekly', 'important']
const COMPANY_NAMES = { AAPL: ['Apple'], MSFT: ['Microsoft'], GOOGL: ['Alphabet', 'Google'], GOOG: ['Alphabet', 'Google'], AMZN: ['Amazon'], NVDA: ['Nvidia'], SBUX: ['Starbucks'], NKE: ['Nike'], BA: ['Boeing'] }
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export function storyMatchesSymbols(item, symbols) {
  const text = `${item.title || ''} ${item.summary || ''}`
  return symbols.some(symbol => (item.symbols || []).includes(symbol) || [symbol, ...(COMPANY_NAMES[symbol] || [])].some(name => new RegExp(`(^|[^A-Z0-9])\\$?${escape(name)}([^A-Z0-9]|$)`, 'i').test(text)))
}
export function importantNews(item) {
  if (item.important === true) return true
  try {
    const host = new URL(item.link || item.url).hostname
    return (host === 'www.federalreserve.gov' || host === 'federalreserve.gov') && /fomc|monetary policy|federal funds/i.test(item.title) || (host === 'www.bls.gov' || host === 'bls.gov') && /consumer price index|employment situation/i.test(item.title)
  } catch { return false }
}
export function newsFrequency(prefs = {}) { return NEWS_FREQUENCIES.includes(prefs.news_frequency) ? prefs.news_frequency : 'daily' }
export function newsQuietHours(prefs, now) {
  if (!prefs.quiet_hours) return false
  const hour = now.getUTCHours(), start = Number(prefs.quiet_start ?? 22), end = Number(prefs.quiet_end ?? 7)
  return start === end || (start < end ? hour >= start && hour < end : hour >= start || hour < end)
}
export function newsDigestKey(prefs, now = new Date()) {
  const frequency = newsFrequency(prefs)
  if (frequency === 'off' || newsQuietHours(prefs, now)) return null
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (frequency === 'weekly') day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7)
  return `news:${frequency}:${day.toISOString().slice(0, 10)}`
}
export function selectDigestStories(items, prefs = {}, symbols = [], now = new Date()) {
  const seen = new Set()
  return (items || []).filter(item => {
    const link = item.link || item.url
    const time = Date.parse(item.date)
    if (!item.title || !/^https:\/\//i.test(link || '') || seen.has(link) || !Number.isFinite(time) || time > now.getTime() || now - time > (newsFrequency(prefs) === 'weekly' ? 7 : 1) * 86400000) return false
    if (newsFrequency(prefs) === 'important' && !importantNews(item)) return false
    if (prefs.news_watchlist_only === true && !storyMatchesSymbols(item, symbols)) return false
    seen.add(link)
    return true
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5).map(item => ({ title: String(item.title).slice(0, 240), source: String(item.source || '').slice(0, 100), date: item.date, url: item.link || item.url }))
}
