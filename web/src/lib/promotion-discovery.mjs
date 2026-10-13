import { createHash } from 'node:crypto'
import { tavilySearch } from './tavily-search.mjs'
import { retailerHtml } from './find-your-10/retailer-evidence.mjs'
import { safeOfferUrl } from './promotion-presentation.mjs'

export const OFFER_SOURCES = ['target.com', 'walmart.com', 'costco.com', 'lowes.com', 'homedepot.com', 'kroger.com', 'safeway.com', 'aldi.us', 'nike.com', 'underarmour.com', 'ae.com', 'abercrombie.com']
import { sourceCalendarDate } from './promotion-date.mjs'
export function approvedOfferUrl(raw) {
  const safe = safeOfferUrl(raw)
  return safe && OFFER_SOURCES.some(domain => new URL(safe).hostname === domain || new URL(safe).hostname.endsWith('.' + domain)) ? safe : null
}
export function publicOfferCandidate(html, url, title, now = new Date()) {
  if (!approvedOfferUrl(url)) return null
  const text = String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ')
  const benefit = text.match(/(?:\b\d{1,2}%\s+off|\$\d+(?:\.\d{2})?\s+off|\bbuy\s+one\s+get\s+one(?:\s+free)?|\bfree\s+shipping)\b/i)?.[0]
  if (!benefit) return null
  const expiryText = text.match(/(?:expires?|ends?|valid\s+(?:through|until))\s*[: ]*([A-Z][a-z]+\s+\d{1,2},?\s+20\d{2}|\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2})/i)?.[1]
  const expiry = sourceCalendarDate(expiryText)
  if (expiryText && (!Number.isFinite(expiry) || expiry + 86400000 <= now.getTime())) return null
  const startText = text.match(/(?:starts?|begins?|valid\s+from)\s*[: ]*([A-Z][a-z]+\s+\d{1,2},?\s+20\d{2}|\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2})/i)?.[1]
  const start = sourceCalendarDate(startText)
  if (startText && (!Number.isFinite(start) || start > now.getTime())) return null
  const eligibility = text.match(/(?:members?\s+only|new\s+customers?\s+only|online\s+only|in[- ]store\s+only|minimum\s+purchase[^.!]{0,100}|exclusions?\s+apply)/i)?.[0] || null
  const domain = new URL(url).hostname.replace(/^www\./, '')
  return { merchant_name: domain, title: String(title || `${domain} offer`).slice(0, 180), benefit_text: benefit, promo_code: text.match(/(?:promo|coupon|offer)\s+code\s*[: ]*([A-Z0-9_-]{3,20})/i)?.[1] || null, redemption_url: url, source_url: url, eligibility, starts_at: start ? new Date(start).toISOString() : null, expires_at: expiry ? new Date(expiry + 86399999).toISOString() : null, last_checked_at: now.toISOString(), status: 'review', verification_status: 'unverified', confidence: 0.7, metadata: { primary_source: true, review_reason: 'Confirm the offer-specific dates, product eligibility and geography; a merchant page can contain multiple campaigns.' } }
}
// Explicit searches only. Read a bounded set of approved primary pages;
// snippets are leads, never evidence that an offer is redeemable.
export async function discoverPublicOffers(query, { search = tavilySearch, read = retailerHtml, now = new Date() } = {}) {
  const leads = await search(`${query} official current offers promotion`, { domains: OFFER_SOURCES })
  const seen = new Set()
  const pages = leads.filter(lead => approvedOfferUrl(lead.url) && !seen.has(lead.url) && seen.add(lead.url)).slice(0, 3)
  const results = await Promise.allSettled(pages.map(async lead => {
    const page = await read(lead.url)
    return publicOfferCandidate(page.html, page.url || lead.url, lead.title, now)
  }))
  return { offers: results.filter(r => r.status === 'fulfilled' && r.value).map(r => ({ ...r.value, source_ref: createHash('sha256').update(r.value.source_url + '|' + r.value.benefit_text + '|' + (r.value.promo_code || '') + '|' + (r.value.expires_at || '')).digest('hex') })), unavailableSources: results.filter(r => r.status === 'rejected').length, checkedAt: now.toISOString() }
}
