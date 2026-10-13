// Shared retrieval/display rules. Explicit preferences change order, never access.
export const NEWS_CATEGORIES = ['All news', 'Markets', 'Economy', 'Consumer finance', 'Recalls', 'Business & policy']
export function newsCategory(item) {
  const topic = item.topic || ''
  const text = `${item.title || ''} ${item.summary || ''}`
  if (/recall|safety/i.test(topic) || /\brecalls?|recalled|safety alert\b/i.test(text)) return 'Recalls'
  if (/\brefund|rebate|benefits?|social security|medicare|medicaid|savings|bank account|insurance|mortgage|rent\b|utility|groceries|credit card|student loan|tax credit|tax return|ACA/i.test(text)) return 'Consumer finance'
  if (/market|stock|earnings|bond/i.test(topic) || /\bstock|\bETF|earnings|shares|S&P|Nasdaq|Dow Jones/i.test(text)) return 'Markets'
  if (/econom|inflation|rates|debt|jobs/i.test(topic) || /inflation|interest rates?|federal reserve|employment|GDP|tariff/i.test(text)) return 'Economy'
  if (/consumer|household/i.test(topic)) return 'Consumer finance'
  return 'Business & policy'
}
export function deduplicateNews(items) {
  const links = new Set(), titles = new Set()
  return items.filter(item => {
    let link
    try { const u = new URL(item.link || item.url); if (!['http:', 'https:'].includes(u.protocol)) return false; u.search = ''; u.hash = ''; link = u.href } catch { return false }
    const title = String(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (!title || links.has(link) || titles.has(title)) return false
    links.add(link); titles.add(title); return true
  })
}
export function selectNews(items, { preferences = {}, watchlist = [], query = '', category = 'All news', now = Date.now() } = {}) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return deduplicateNews(items).filter(item => (category === 'All news' || newsCategory(item) === category) && terms.every(term => `${item.title} ${item.summary || ''} ${item.source}`.toLowerCase().includes(term)))
    .map(item => {
      const age = Math.max(0, (now - Date.parse(item.date)) / 86400000)
      const bucket = newsCategory(item)
      // Recency decays smoothly; preferences never remove a story or a recall.
      const preference = bucket === 'Recalls' ? Math.max(0, preferences[bucket] || 0) : preferences[bucket] || 0
      const mentionedSymbols = `${item.title} ${item.summary || ''}`.match(/\b[A-Z][A-Z0-9.-]{1,9}\b/g) || []
      const watchMatch = watchlist.some(symbol => mentionedSymbols.includes(symbol))
      return { item, score: (Number.isFinite(age) ? 12 / (1 + age / 3) : 0) + preference * 6 + (bucket === 'Recalls' ? 3 : 0) + (watchMatch ? 3 : 0) }
    }).sort((a, b) => b.score - a.score || Date.parse(b.item.date) - Date.parse(a.item.date)).map(row => row.item)
}
