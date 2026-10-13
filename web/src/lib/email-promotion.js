import { storeGroupKey } from './store-name-normalize.js'
import { safeOfferUrl } from './promotion-presentation.mjs'
import { sourceCalendarDate } from './promotion-date.mjs'

const URL_RE = /https?:\/\/[^\s<>"']+/gi
const CODE_RE = /(?:promo|coupon|offer)\s*code\s*[:\-]?\s*([A-Z0-9][A-Z0-9_-]{2,20})/i
const BENEFIT_RE = /(\b\d{1,3}%\s+off|\$\d+(?:\.\d{2})?\s+off|\bfree\s+[a-z][a-z ]{2,30})\b/i
export function hasSeparateEmailOffer(message = {}) {
  const text = `${message.subject || ''}\n${message.bodyText || ''}\n${message.bodyHtml || ''}`.replace(/<[^>]+>/g, ' ')
  // A receipt's paid discount alone is not a redeemable future offer.
  return CODE_RE.test(text) && BENEFIT_RE.test(text)
}

function merchantFromSender(fromAddr = '') {
  fromAddr = String(fromAddr || '')
  const display = fromAddr.match(/^\s*["']?([^<"']+?)["']?\s*</)?.[1]?.trim()
  if (display) return display.replace(/\b(?:rewards?|offers?|access|email)\b/gi, '').replace(/\s{2,}/g, ' ').trim() || display
  const domain = fromAddr.match(/@([a-z0-9.-]+)/i)?.[1]?.replace(/^(?:e|em|emails|mail|news)\./, '').split('.')[0]
  return domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'Merchant offer'
}

function safeRedemptionUrl(text = '') {
  return (text.match(URL_RE) || []).find(raw => {
    try {
      const url = new URL(raw)
      return safeOfferUrl(url.href) &&
        !/(?:unsubscribe|privacy|preferences|tracking)/i.test(raw)
    } catch { return false }
  }) || null
}

export function extractEmailPromotion(message = {}) {
  const body = `${message.bodyText || ''}\n${message.bodyHtml || ''}`.replace(/<[^>]+>/g, ' ')
  const subject = String(message.subject || '').replace(/^(?:re|fw|fwd):\s*/i, '').trim()
  const promoCode = body.match(CODE_RE)?.[1] || subject.match(CODE_RE)?.[1] || null
  const benefit = `${subject}\n${body}`.match(BENEFIT_RE)?.[1] || null
  const expiryText = body.match(/(?:expires?|ends?|valid\s+(?:through|until))\s*[: ]*([A-Z][a-z]+\s+\d{1,2},?\s+20\d{2}|\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2})/i)?.[1]
  const expiry = sourceCalendarDate(expiryText)
  const eligibility = body.match(/(?:members?\s+only|new\s+customers?\s+only|online\s+only|in[- ]store\s+only|minimum\s+purchase[^.!]{0,100}|exclusions?\s+apply)/i)?.[0] || null
  const forwarded = /^(?:fw|fwd):/i.test(String(message.subject || '')) ? String(message.bodyText || '').match(/^From:\s*(.+<[^>]+>)/im)?.[1] : null
  return {
    merchant_name: merchantFromSender(forwarded || message.fromAddr),
    title: subject || `${merchantFromSender(message.fromAddr)} offer`,
    description: String(message.preview || '').slice(0, 280) || null,
    benefit_text: benefit,
    promo_code: promoCode,
    redemption_url: safeRedemptionUrl(body),
    expires_at: Number.isFinite(expiry) ? new Date(expiry + 86399999).toISOString() : null,
    eligibility,
  }
}

export function extractEmailPromotions(message = {}) {
  const text = String(message.bodyText || '').trim()
  const blocks = text.split(/\n\s*\n/).filter(block => CODE_RE.test(block) && BENEFIT_RE.test(block)).slice(0, 10)
  if (blocks.length < 2) return [extractEmailPromotion(message)]
  const seen = new Set()
  return blocks.map(block => ({ ...extractEmailPromotion({ ...message, subject: block.split('\n')[0], bodyText: block, bodyHtml: '' }), merchant_name: extractEmailPromotion(message).merchant_name })).filter(offer => { const key = `${offer.promo_code}|${offer.benefit_text}`; if (seen.has(key)) return false; seen.add(key); return true })
}

async function saveOnePromotion(sb, userId, sourceRef, extracted, classification) {
  // Reprocessing must preserve the owner's review/dismissal decision.
  const existing = await sb.from('promotions').select('id').eq('user_id', userId).eq('source', 'email').eq('source_ref', sourceRef).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return { ...existing.data, duplicate: true }
  if (!extracted.benefit_text || !(extracted.redemption_url || extracted.promo_code)) return { id: null, ignored: true }
  // A new campaign email must not resurrect an offer the owner dismissed.
  // Message identity handles replay; a concrete code/merchant/benefit handles
  // repeated campaign messages, including changed expiry wording.
  if (extracted.promo_code && extracted.benefit_text) {
    const campaign = await sb.from('promotions').select('id,status').eq('user_id', userId).eq('source', 'email').eq('merchant_name', extracted.merchant_name).eq('promo_code', extracted.promo_code).eq('benefit_text', extracted.benefit_text).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (campaign.error) throw campaign.error
    if (campaign.data) return { ...campaign.data, duplicate: true }
  }
  const merchantKey = storeGroupKey(extracted.merchant_name)
  let storeId = null
  if (merchantKey) {
    const { data: stores } = await sb.from('stores').select('id,store_name')
    storeId = (stores || []).find(store => storeGroupKey(store.store_name) === merchantKey)?.id || null
  }

  const confidence = Number(classification.confidence || 0)
  const { data, error } = await sb.from('promotions').upsert({
    user_id: userId,
    store_id: storeId,
    ...extracted,
    source: 'email',
    source_ref: sourceRef,
    confidence,
    // Classification confidence does not verify expiration, eligibility or
    // sender identity. Unverified email leads go through the existing review.
    status: 'review',
    verification_status: 'unverified',
    metadata: { classifier_reason: classification.reason || null },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,source,source_ref' }).select('id').single()
  if (error) throw error
  return data
}
export async function saveEmailPromotionCandidate(sb, userId, messageId, message, classification) {
  const offers = extractEmailPromotions(message)
  let first = null
  const importResult = { added: 0, duplicates: 0, expired: 0, ignored: 0, requiringReview: 0 }
  for (const [index, offer] of offers.entries()) {
    if (offer.expires_at && Date.parse(offer.expires_at) <= Date.now()) { importResult.expired++; continue }
    const sourceRef = index === 0 ? messageId : `${messageId}:offer:${offer.promo_code}`
    const saved = await saveOnePromotion(sb, userId, sourceRef, offer, classification)
    if (saved.duplicate) importResult.duplicates++
    else if (saved.ignored) importResult.ignored++
    else { importResult.added++; importResult.requiringReview++ }
    if (!first && saved.id) first = saved
  }
  return { id: first?.id || null, importResult }
}
