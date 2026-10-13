import { createHash } from 'node:crypto'
import { approvedOfferUrl, publicOfferCandidate } from './promotion-discovery.mjs'
import { retailerHtml } from './find-your-10/retailer-evidence.mjs'
import { getCachedSearch, setCachedSearch } from './shoppingCache.js'
export const MAJOR_CATALOG_KEY = 'major-promotions-public-v1'
export const PROMOTION_CATEGORIES = { groceries: /grocery|groceries|produce|milk|food/i, household: /household|cleaning|laundry|home/i, apparel: /clothing|apparel|shoes|sneakers|jeans/i, electronics: /electronics|laptop|television|headphones/i, travel: /travel|hotel|flight/i }
export function majorPromotionConfig(input = {}) {
  const hours = [1, 6, 24].includes(Number(input.hours)) ? Number(input.hours) : 24
  const urls = [...new Set((Array.isArray(input.urls) ? input.urls : []).filter(url => typeof url === 'string').map(url => url.trim()).filter(approvedOfferUrl))].slice(0, 6)
  const categories = (Array.isArray(input.categories) ? input.categories : []).filter(category => Object.hasOwn(PROMOTION_CATEGORIES, category))
  return { enabled: input.enabled === true, hours, urls, categories, country: 'US', minPercent: Math.max(1, Math.min(100, Number(input.minPercent) || 20)), minAmount: Math.max(1, Math.min(10000, Number(input.minAmount) || 10)), autoPublish: input.autoPublish === true }
}
export function verifiedMajorOffer(html, candidate, config) {
  const text = String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const benefits = [...new Set((text.match(/(?:\b\d{1,2}%\s+off|\$\d+(?:\.\d{2})?\s+off)/gi) || []).map(value => value.toLowerCase()))]
  const percent = Number(candidate.benefit_text?.match(/(\d+)%/)?.[1]), amount = Number(candidate.benefit_text?.match(/\$(\d+(?:\.\d+)?)/)?.[1])
  const major = percent >= config.minPercent || amount >= config.minAmount
  const expiryMentions = text.match(/(?:expires?|ends?|valid\s+(?:through|until))\s*[: ]*([A-Z][a-z]+\s+\d{1,2},?\s+20\d{2}|\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2})/gi) || []
  // A broad deals page cannot substantiate one campaign. Unknown geography,
  // dates or eligibility remains admin review, even when a discount is large.
  const scope = text.match(/\b(?:all|select|eligible)\s+[^.!]{1,80}\b(?:items|products|styles|orders|shoes|clothing)\b/i)?.[0]
  return major && benefits.length === 1 && expiryMentions.length === 1 && Boolean(candidate.expires_at && candidate.eligibility && scope) && !/^exclusions?\s+apply$/i.test(candidate.eligibility) && (!/\b(?:starts?|begins?|valid\s+from)\b/i.test(text) || candidate.starts_at) && /(?:United States|\bU\.S\.|\bUS only\b)/i.test(text) && !/personalized|account[- ]specific|selected members|invitation only/i.test(text)
}
export async function scanMajorPromotions(sb, ownerId, metadata, { read = retailerHtml, now = new Date(), getCache = getCachedSearch, setCache = setCachedSearch } = {}) {
  const config = majorPromotionConfig(metadata.major_promotion_scan)
  if (!config.enabled || !config.urls.length) return { status: 'disabled', checked: 0 }
  const last = metadata.major_promotion_scan_result
  if (last?.checkedAt && now.getTime() - Date.parse(last.checkedAt) < config.hours * 3600000) return { status: 'cached', checked: 0 }
  const cursor = Math.max(0, Number(last?.nextCursor) || 0) % config.urls.length
  const urls = config.urls.slice(cursor, cursor + 3)
  const checked = await Promise.allSettled(urls.map(async url => {
    const page = await read(url, { timeoutMs: 6000 })
    const candidate = publicOfferCandidate(page.html, page.url || url, `${new URL(url).hostname.replace(/^www\./, '')} promotion`, now)
    if (!candidate) return { url, candidate: null }
    if (config.categories.length && !config.categories.some(category => PROMOTION_CATEGORIES[category].test(page.html.replace(/<[^>]+>/g, ' ')))) return { url, candidate: null }
    const verified = verifiedMajorOffer(page.html, candidate, config)
    return { url, candidate: { ...candidate, source: 'ai', source_ref: createHash('sha256').update(url + '|' + candidate.benefit_text + '|' + candidate.expires_at).digest('hex'), status: verified && config.autoPublish ? 'active' : 'review', verification_status: verified ? 'verified' : 'unverified', confidence: verified ? .95 : .7, metadata: { ...candidate.metadata, geography: 'US', audit: { action: verified && config.autoPublish ? 'published' : 'review', checkedAt: now.toISOString(), reason: verified ? 'Single dated primary-source campaign, eligibility and US geography confirmed.' : 'Campaign scope, geography or terms require review.' } } } }
  }))
  const previous = await getCache(MAJOR_CATALOG_KEY)
  // Disable/source failures suppress publication, while preserving admin
  // captured records and earlier decisions for investigation.
  const refreshedUrls = new Set(urls)
  const published = (previous?.offers || []).filter(offer => config.autoPublish && config.urls.includes(offer.source_url) && !refreshedUrls.has(offer.source_url) && Date.parse(offer.expires_at) > now.getTime() && now.getTime() - Date.parse(offer.last_checked_at) < 48 * 3600000)
  let requiringReview = 0, added = 0
  for (const result of checked) {
    if (result.status !== 'fulfilled' || !result.value.candidate) continue
    const candidate = result.value.candidate
    const existing = await sb.from('promotions').select('id,status,verification_status').eq('user_id', ownerId).eq('source', 'ai').eq('source_ref', candidate.source_ref).maybeSingle()
    if (existing.error) throw Error('Promotion review records unavailable')
    if (!existing.data) {
      const write = await sb.from('promotions').upsert({ ...candidate, user_id: ownerId }, { onConflict: 'user_id,source,source_ref', ignoreDuplicates: true })
      if (write.error) throw Error('Promotion review record could not be saved')
      added++
    }
    if (candidate.status === 'active' && existing.data?.status !== 'dismissed' && existing.data?.verification_status !== 'rejected') published.push(candidate)
    else requiringReview++
  }
  await setCache(MAJOR_CATALOG_KEY, { offers: published.slice(0, 40), checkedAt: now.toISOString() })
  const result = { status: checked.some(r => r.status === 'rejected') ? 'partial' : 'checked', checked: urls.length, added, requiringReview, published: published.length, checkedAt: now.toISOString(), nextCursor: (cursor + urls.length) % config.urls.length }
  const update = await sb.auth.admin.updateUserById(ownerId, { user_metadata: { major_promotion_scan_result: result } })
  if (update.error) throw Error('Promotion scan audit could not be saved')
  return result
}
export async function runConfiguredMajorPromotions(sb) {
  const { data: admins, error } = await sb.from('profiles').select('id').eq('is_admin', true).order('id').limit(10)
  if (error) return { status: 'unavailable', checked: 0 }
  for (const admin of admins || []) {
    const auth = await sb.auth.admin.getUserById(admin.id)
    const metadata = auth.data?.user?.user_metadata
    if (!auth.error && metadata?.major_promotion_scan?.enabled) return scanMajorPromotions(sb, admin.id, metadata)
  }
  return { status: 'disabled', checked: 0 }
}
