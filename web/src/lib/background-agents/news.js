import { educationalEconomicItem } from '../economic-news-policy.mjs'
import { deduplicateNews, newsCategory } from '../news-selection.mjs'

const MAX_NEWS_AGE_MS = 30 * 24 * 60 * 60 * 1000
const NEWS_POLICY_VERSION = 4

const FEEDS = [
  { source: 'TheStreet', url: 'https://www.thestreet.com/.rss/full/', topic: 'Business & policy' },
  { source: 'FTC', url: 'https://www.ftc.gov/feeds/press-release.xml', topic: 'Consumer finance' },
  { source: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', topic: 'Business & policy' },
  { source: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', topic: 'Markets' },
  { source: '24/7 Wall St.', url: 'https://247wallst.com/feed/', topic: 'Economy' },
  { source: 'BLS', url: 'https://www.bls.gov/feed/bls_latest.rss', topic: 'Economy' },
  { source: 'BLS', url: 'https://www.bls.gov/feed/cpi.rss', topic: 'Inflation' },
  { source: 'Federal Reserve', url: 'https://www.federalreserve.gov/feeds/press_monetary.xml', topic: 'Rates' },
  { source: 'CFPB', url: 'https://www.consumerfinance.gov/about-us/newsroom/feed/', topic: 'Consumer finance' },
  ...[
    '(refund OR rebate OR "Social Security" OR "tax credit" OR benefits)',
    '("savings account" OR insurance OR "utility bills" OR "mortgage rates")',
    '(recall OR "safety alert") (food OR product OR vehicle)',
    '(economy OR inflation OR markets OR ETF)',
  ].map(query => ({ source: 'News discovery', useItemSource: true, topic: 'Business & policy', url: `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:7d')}&hl=en-US&gl=US&ceid=US:en` })),
]

// A slow publisher must not leave the whole news page waiting indefinitely.
const sourceOptions = () => ({
  cache: 'no-store',
  signal: AbortSignal.timeout(8000),
  headers: { 'User-Agent': 'GetGuac economic reader/1.0' },
})

const TREASURY_DEBT_API = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page%5Bsize%5D=1'
const TREASURY_YIELDS_CSV = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${new Date().getUTCFullYear()}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${new Date().getUTCFullYear()}&page&_format=csv`
const NY_FED_HOUSEHOLD_DEBT = 'https://www.newyorkfed.org/householdcredit/hhdc-iframe'
const VERIFIED_FALLBACK_SIGNALS = [
  {
    source: 'U.S. Treasury', topic: 'National debt', date: '2026-08-19',
    title: 'U.S. public debt crossed $40 trillion',
    link: 'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/',
    summary: 'Treasury Fiscal Data reports total public debt outstanding after each business day.',
    impact: 'This is not your personal bill. It can still influence future taxes, public services, inflation risk, and the rates charged on long-term loans.',
  },
  {
    source: 'New York Fed', topic: 'Household debt', date: '2026-08-11',
    title: 'Household debt totaled $18.8T; credit-card balances reached $1.26T in Q2 2026',
    link: 'https://www.newyorkfed.org/newsevents/news/research/2026/20260811',
    summary: 'New delinquencies for auto loans and credit cards remained elevated even as aggregate delinquency improved slightly.',
    impact: 'Compare APRs, protect every on-time payment, and treat a growing credit limit as borrowing capacity—not extra income.',
  },
]

// User-curated public headlines can be shown immediately while the source is
// still waiting to appear in the syndicated search feed. Keep this to title,
// link and our own short impact note; never mirror article body content.
const FEATURED_HEADLINES = [
  {
    source: 'USA TODAY via Yahoo', topic: 'Consumer finance', date: '2026-09-30T09:09:00Z',
    title: 'Trump administration begins $500 ACA refunds for eligible enrollees',
    link: 'https://currently.att.yahoo.com/att/trump-send-500-aca-refund-090910043.html',
    summary: 'USA TODAY reports that checks will begin going to more than 950,000 eligible Americans. The payment does not apply to everyone with health insurance.',
    impact: 'Read the source for eligibility and timing before counting a refund in your budget.',
  },
  {
    source: 'Moneywise via Yahoo', topic: 'Consumer finance', date: '2026-09-23T10:35:00Z',
    title: 'How inflation can reduce the buying power of savings',
    link: 'https://www.yahoo.com/finance/economy/policy/articles/federal-delivers-warning-americans-savings-103500121.html',
    summary: 'Moneywise examines inflation, savings interest and government debt. The linked article includes affiliate promotions.',
    impact: 'Compare savings interest with inflation; the publisher’s product promotions are not GetGuac recommendations.',
  },
  {
    source: 'Seeking Alpha',
    topic: 'Rates',
    date: '2026-09-14',
    title: 'S&P 500 investors adjust expectations for more rate hikes',
    link: 'https://seekingalpha.com/article/4945984-sp500-investors-adjust-expectations-more-rate-hikes',
    summary: '',
    impact: 'Changing rate expectations can affect stock valuations, bond prices, mortgage rates, savings yields, and other borrowing costs.',
  },
]

const decode = value => String(value || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => { const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '' })

const tag = (block, name) => block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || ''
const attrLink = block => block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || ''

function impactFor(title) {
  const text = title.toLowerCase()
  if (/consumer price|inflation|price index|prices/.test(text)) return 'Watch grocery, housing, fuel, and insurance budget limits.'
  if (/rate|fomc|monetary|interest/.test(text)) return 'May affect mortgage, credit-card, auto-loan, and savings rates.'
  if (/mortgage|housing|homebuy/.test(text)) return 'Relevant to housing affordability and refinancing decisions.'
  if (/credit|loan|debt|lending/.test(text)) return 'May change borrowing costs or consumer protections.'
  if (/insurance|premium/.test(text)) return 'Review premium changes against your recurring obligations.'
  return 'Review whether this changes a household cost or financial decision.'
}

function parseFeed(xml, feed) {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map(match => match[2])
  return blocks.map(block => {
    const title = decode(tag(block, 'title'))
    const link = decode(tag(block, 'link')) || attrLink(block)
    const date = decode(tag(block, 'pubDate') || tag(block, 'updated') || tag(block, 'published'))
    const summary = decode(tag(block, 'description') || tag(block, 'summary') || tag(block, 'content'))
    const itemSource = decode(tag(block, 'source'))
    const publisherUrl = block.match(/<source[^>]+url=["']([^"']+)/i)?.[1]
    const cleanTitle = feed.useItemSource && itemSource && title.endsWith(` - ${itemSource}`) ? title.slice(0, -itemSource.length - 3) : title
    const item = { source: feed.useItemSource && itemSource ? itemSource : feed.source, publisherUrl, topic: feed.topic, title: cleanTitle, link, date, summary: feed.useItemSource ? '' : summary.slice(0, 220), impact: impactFor(title) }
    return { ...item, category: newsCategory(item) }
  }).filter(item => item.title && /^https?:\/\//.test(item.link))
}

async function treasuryDebtSignal() {
  const response = await fetch(TREASURY_DEBT_API, sourceOptions())
  if (!response.ok) throw new Error(`Treasury returned ${response.status}`)
  const payload = await response.json()
  const row = payload?.data?.[0]
  const amount = Number(row?.tot_pub_debt_out_amt || 0)
  if (!amount) throw new Error('Treasury debt data missing')
  const trillions = amount / 1_000_000_000_000
  return {
    source: 'U.S. Treasury', topic: 'National debt',
    title: `U.S. public debt is ${trillions.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1 })} trillion`,
    link: 'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/', date: row.record_date,
    summary: 'The Treasury updates this total after each business day.',
    impact: 'This is not your personal bill. It can still influence future taxes, public services, inflation risk, and the rates charged on long-term loans.',
  }
}

async function treasuryYieldSignal() {
  const response = await fetch(TREASURY_YIELDS_CSV, sourceOptions())
  if (!response.ok) throw new Error(`Treasury yields returned ${response.status}`)
  const rows = (await response.text()).trim().split(/\r?\n/)
  if (rows.length < 3) throw new Error('Treasury yield history missing')
  const headers = rows[0].split(',').map(value => value.replaceAll('"', '').trim())
  const parseRow = row => Object.fromEntries(row.split(',').map((value, index) => [headers[index], value.replaceAll('"', '').trim()]))
  const latest = parseRow(rows[1])
  const prior = parseRow(rows[2])
  const current = Number(latest['10 Yr'])
  const previous = Number(prior['10 Yr'])
  if (!Number.isFinite(current) || !Number.isFinite(previous)) throw new Error('Treasury 10-year yield missing')
  const changeBps = Math.round((current - previous) * 100)
  const direction = changeBps > 0 ? 'rose' : changeBps < 0 ? 'fell' : 'held steady'
  const movement = changeBps === 0 ? '' : ` ${Math.abs(changeBps)} basis points`
  return {
    source: 'U.S. Treasury', topic: 'Bond yields', date: latest.Date,
    title: `10-year Treasury yield ${direction}${movement} to ${current.toFixed(2)}%`,
    link: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve',
    summary: `Official daily Treasury rates; previous close was ${previous.toFixed(2)}%.`,
    impact: changeBps > 0
      ? 'Higher yields can raise mortgage and other borrowing costs. Existing bond prices generally move down when yields rise.'
      : 'Lower yields can ease some borrowing costs. Existing bond prices generally move up when yields fall.',
  }
}

async function householdDebtSignal() {
  const response = await fetch(NY_FED_HOUSEHOLD_DEBT, sourceOptions())
  if (!response.ok) throw new Error(`New York Fed returned ${response.status}`)
  const html = await response.text()
  const plain = decode(html)
  const published = html.match(/(?:datePublished|dateModified)["']?\s*[:=]\s*["']([^"']+)/i)?.[1]
  if (!published || !Number.isFinite(Date.parse(published))) throw new Error('New York Fed publication date missing')
  const total = plain.match(/total household debt[^.]{0,140}?(\$[\d.]+\s*trillion)/i)?.[1]
  const cards = plain.match(/credit card balances[^.]{0,140}?(\$[\d.]+\s*trillion)/i)?.[1]
  if (!total) throw new Error('New York Fed household debt total missing')
  return {
    source: 'New York Fed', topic: 'Household debt',
    title: `U.S. household debt totals ${total}${cards ? `; credit cards ${cards}` : ''}`,
    link: 'https://www.newyorkfed.org/microeconomics/hhdc', date: published,
    summary: 'The quarterly report tracks mortgages, student loans, auto loans, credit cards, and delinquencies.',
    impact: 'Compare APRs, protect every on-time payment, and treat a growing credit limit as borrowing capacity—not extra income.',
  }
}

export async function runNewsAgent({ sb, now = new Date() } = {}) {
  const checkedAt = new Date(now)
  const checkedMs = checkedAt.getTime()
  const [settled, signals] = await Promise.all([
    Promise.allSettled(FEEDS.filter(educationalEconomicItem).map(async feed => {
    const response = await fetch(feed.url, sourceOptions())
    if (!response.ok) throw new Error(`${feed.source} returned ${response.status}`)
    return parseFeed(await response.text(), feed)
    })),
    Promise.allSettled([treasuryYieldSignal(), treasuryDebtSignal(), householdDebtSignal()]),
  ])
  const fetchedSignals = signals.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
  const officialSignals = fetchedSignals.length ? fetchedSignals : VERIFIED_FALLBACK_SIGNALS
  const cutoff = checkedMs - MAX_NEWS_AGE_MS
  const items = deduplicateNews([...FEATURED_HEADLINES, ...officialSignals, ...settled.flatMap(result => result.status === 'fulfilled' ? result.value : [])]
    .filter(educationalEconomicItem)
    .filter(item => {
      const published = new Date(item.date || 0).getTime()
      return Number.isFinite(published) && published >= cutoff && published <= checkedMs
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)))
    .slice(0, 600)
  // Overall Market Watch only. No symbols, portfolios, watchlists or personal
  // recommendations. Keep the freshest broad-market and macro drivers in one
  // compact payload shared by News and the dashboard ticker.
  const marketTopics = new Set(['Markets', 'Markets & prices', 'Earnings & stocks', 'Rates', 'Inflation', 'Economy', 'Bond yields'])
  const marketWatch = items
    .filter(item => marketTopics.has(item.topic))
    .slice(0, 12)
  return {
    policyVersion: NEWS_POLICY_VERSION,
    sources: FEEDS.map((feed, i) => ({ source: feed.source, url: feed.url, available: settled[i]?.status === 'fulfilled', count: settled[i]?.status === 'fulfilled' ? settled[i].value.filter(educationalEconomicItem).length : 0 })),
    items,
    marketWatch,
    updatedAt: checkedAt.toISOString(),
    freshness: {
      checkedAt: checkedAt.toISOString(),
      latestPublishedAt: items.length ? new Date(items[0].date).toISOString() : null,
      refreshIntervalMinutes: 15,
    },
    partial: [...settled, ...signals].some(result => result.status === 'rejected'),
  }
}

// Keep serving news when storage is unavailable or a scheduler is behind.
export async function readNewsSnapshot(sb, now = new Date()) {
  try {
    const { data, error } = await sb.from('agent_snapshots')
      .select('result, refreshed_at').eq('scope_key', 'news:global')
      .abortSignal(AbortSignal.timeout(2000)).maybeSingle()
    const age = new Date(now).getTime() - Date.parse(data?.refreshed_at)
    const result = data?.result
    if (error || result?.policyVersion !== NEWS_POLICY_VERSION || !Number.isFinite(age) || age < 0 || age >= 15 * 60 * 1000 ||
        !Array.isArray(result?.items) || !result.items.length || !Array.isArray(result?.marketWatch)) return null
    return result
  } catch { return null }
}
