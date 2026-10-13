import { classifyCommerceEmail } from './email-classification.js'

export function emailAddressText(value) {
  if (Array.isArray(value)) return value.map(emailAddressText).filter(Boolean).join(', ')
  if (value && typeof value === 'object') return emailAddressText(value.value || value.address || value.text)
  const text = String(value || '').trim()
  return text === '[object Object]' || text === '[object object]' ? '' : text
}

export function inboxReceiptStatus(message, now = Date.now()) {
  const classification = message.email_classification && message.email_classification !== 'unknown'
    ? message.email_classification
    : classifyCommerceEmail({ subject: message.subject, preview: message.preview }, message.body_text || message.body_html || '').classification
  const nonPurchase = ['promotion', 'account_notice', 'order_update'].includes(classification)
  const receipt = nonPurchase ? null : message.receipt
  const active = !nonPurchase && !message.processed && Date.parse(message.processing_lease_until || '') > now
  return { receipt, active, classification, needsReview: Boolean(receipt && !receipt.processed && !active) }
}
