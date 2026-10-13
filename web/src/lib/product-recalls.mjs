// Official notices only. Receipt matches are leads, never confirmation of a lot.
const FDA = 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml'
const USDA = 'https://www.fsis.usda.gov/fsis/api/recall/v/1'
const CPSC = 'https://www.cpsc.gov/Newsroom/CPSC-RSS-Feed/Recalls-RSS'
const DAY = 86400000

export function plainText(value) {
  return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[n]))
    .replace(/\s+/g, ' ').trim()
}

function officialUrl(value, host) {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== host || url.username || url.password) return null
    url.protocol = 'https:'
    return url.href
  } catch { return null }
}

export function parseFda(xml) {
  if (!xml.includes('<rss') || !xml.includes('<channel')) throw new Error('Invalid FDA feed')
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const field = name => plainText(item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1])
    return { title: field('title'), url: officialUrl(field('link'), 'www.fda.gov'), date: field('pubDate'), source: 'FDA' }
  }).filter(n => n.url && n.title)
}

export function parseUsda(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid USDA feed')
  return rows.filter(r => r.field_archive_recall !== 'True' && r.field_active_notice !== 'False').map(r => ({
    title: plainText(r.field_title), url: officialUrl(r.field_recall_url, 'www.fsis.usda.gov'),
    date: r.field_last_modified_date || r.field_recall_date, source: 'USDA',
  })).filter(n => n.url && n.title)
}

export function parseCpsc(xml) {
  if (!/<rss\b|<feed\b/i.test(xml)) throw new Error('Invalid CPSC feed')
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
    const field = name => plainText(item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1])
    return { title: field('title'), url: officialUrl(field('link'), 'www.cpsc.gov'), date: field('pubDate') || field('dc:date'), source: 'CPSC' }
  }).filter(n => n.url && n.title)
}

// State notices surfaced by the owner's article. Keep the notice date and expire
// from matching alongside the live feeds; never present them as freshly fetched.
const STATE_NOTICES = [
  { title: 'Happy Hens egg recall', product: 'Happy Hens eggs', date: '2026-09-11', source: 'California CDPH', url: 'https://www.cdph.ca.gov/Programs/OPA/Pages/NR26-029.aspx' },
  { title: 'Leaping Bear Farm egg recall', product: 'Leaping Bear Farm eggs', date: '2026-09-11', source: 'Vermont Agriculture', url: 'https://agriculture.vermont.gov/recall-chicken-eggs-due-potential-salmonella-contamination' },
]

export async function fetchRecallNotices(fetcher = fetch, now = Date.now()) {
  const sources = [{ name: 'FDA', url: FDA, parse: parseFda, format: 'text' }, { name: 'USDA', url: USDA, parse: parseUsda, format: 'json' }, { name: 'CPSC', url: CPSC, parse: parseCpsc, format: 'text' }]
  const results = await Promise.allSettled(sources.map(async s => {
    const response = await fetcher(s.url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error(`${s.name} unavailable`)
    return s.parse(await response[s.format]())
  }))
  const unavailable = sources.filter((_, i) => results[i].status === 'rejected').map(s => s.name)
  const notices = [...STATE_NOTICES, ...results.flatMap(r => r.status === 'fulfilled' ? r.value : [])]
    .filter(n => Number.isFinite(Date.parse(n.date)) && Date.parse(n.date) <= now && Date.parse(n.date) >= now - 90 * DAY)
    .map(n => ({ ...n, date: new Date(n.date).toISOString().slice(0, 10), id: n.url }))
    .sort((a, b) => b.date.localeCompare(a.date))
  return { notices: [...new Map(notices.map(n => [n.id, n])).values()], unavailable }
}

const STOP = new Set('the and with for from due possible potential undeclared allergy alert recall recalls recalled voluntary nationwide issues inc llc corp corporation company product products food foods organic natural fresh large small count pack farm farms brand all purpose of in on to a an'.split(' '))
function words(value) {
  return [...new Set(plainText(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .map(w => w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)
    .filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)))]
}

export function matchRecallNotices(notices, receipts, now = Date.now()) {
  const matches = []
  for (const notice of notices) {
    // Ignore the hazard portion: an egg allergy in cheese is not an egg recall.
    const allergyProduct = notice.title.match(/allergy alert.*?\bin\s+(.+)$/i)?.[1]
    const product = notice.product || allergyProduct || notice.title.split(/\b(?:due to|because|over|for possible)\b/i)[0]
    const productWords = words(product)
    for (const receipt of receipts) {
      if (receipt.is_return || !receipt.date || !Number.isFinite(Date.parse(receipt.date)) || receipt.date > new Date(now).toISOString().slice(0, 10) || receipt.date < new Date(Date.parse(notice.date) - 365 * DAY).toISOString().slice(0, 10)) continue
      const item = (receipt.receipt_items || []).find(i => {
        if (i.returned) return false
        const tokens = words(i.item_name)
        const overlap = tokens.filter(w => productWords.includes(w))
        return tokens.length >= 2 && overlap.length >= 2 && overlap.length / tokens.length >= 0.6
      })
      if (!item) continue
      matches.push({ ...notice, itemName: item.item_name, storeName: receipt.store_name, purchaseDate: receipt.date,
        receiptId: receipt.id, match: 'possible', grocery: /grocer|food|supermarket/i.test(`${receipt.category || ''} ${item.category || ''}`) })
      break
    }
  }
  return matches.sort((a, b) => Number(b.grocery) - Number(a.grocery) || b.date.localeCompare(a.date))
}
