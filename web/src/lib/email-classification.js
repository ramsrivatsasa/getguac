const PROMOTION_PATTERNS = [
  /\b(?:sale|clearance|limited[- ]time|today only|flash deal)\b/i,
  /\b(?:save|take|get)\s+(?:an?\s+)?\d{1,3}%\s+off\b/i,
  /\b(?:coupon|promo(?:tion| code)?|special offer|exclusive offer)\b/i,
  /\b(?:shop now|buy now|redeem now|activate offer)\b/i,
  /\bunsubscribe\b/i,
  /\b\d{1,3}%\s+off\b/i,
  /\$\d+(?:\.\d{2})?\s+off\b/i,
]

const TRANSACTION_PATTERNS = [
  /\b(?:order|transaction|confirmation|invoice|receipt)\s*(?:number|no\.?|#|id)\s*[:#-]?\s*[a-z0-9-]{3,}/i,
  /\b(?:amount|total)\s+(?:paid|charged|due)\b/i,
  /\b(?:grand|order)\s+total\b/i,
  /\bpayment\s+(?:method|received|processed|confirmation)\b/i,
  /\b(?:purchased|ordered|sold)\s+(?:on|by|to)\b/i,
]

const STATUS_PATTERNS = [
  /\b(?:shipped|out for delivery|delivered|tracking number|track (?:your|the) (?:order|package))\b/i,
]

const normalizedText = (message = {}, body = '') => [
  message.subject,
  message.fromAddr,
  message.preview,
  body,
].filter(Boolean).join('\n').replace(/<[^>]+>/g, ' ')

const countMatches = (patterns, text) => patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)

export function classifyCommerceEmail(message = {}, body = '') {
  const text = normalizedText(message, body)
  const promotionSignals = countMatches(PROMOTION_PATTERNS, text)
  const transactionSignals = countMatches(TRANSACTION_PATTERNS, text)
  const statusSignals = countMatches(STATUS_PATTERNS, text)

  if (statusSignals > 0 && !TRANSACTION_PATTERNS.slice(1).some(pattern => pattern.test(text))) {
    return { classification: 'order_update', confidence: 0.84, reason: 'Shipping status without paid transaction evidence', promotionSignals, transactionSignals }
  }

  if (transactionSignals >= 1) {
    return {
      classification: 'purchase_receipt',
      confidence: Math.min(0.98, 0.72 + transactionSignals * 0.08),
      reason: `${transactionSignals} transaction signal(s)`,
      promotionSignals,
      transactionSignals,
    }
  }
  if (statusSignals >= 1) {
    return {
      classification: 'order_update',
      confidence: Math.min(0.96, 0.76 + statusSignals * 0.08),
      reason: `${statusSignals} shipping/order-status signal(s) without purchase evidence`,
      promotionSignals,
      transactionSignals,
    }
  }
  if (/\b(?:points balance|reward balance|loyalty statement|password reset|reset your password|security alert|sign[- ]in to your account|verify your email|welcome to|account statement)\b/i.test(text)) {
    return { classification: 'account_notice', confidence: 0.8, reason: 'Account or loyalty notice without purchase evidence', promotionSignals, transactionSignals }
  }
  if (promotionSignals >= 1) {
    return {
      classification: 'promotion',
      confidence: Math.min(0.98, 0.72 + promotionSignals * 0.07),
      reason: `${promotionSignals} promotion signal(s) without transaction evidence`,
      promotionSignals,
      transactionSignals,
    }
  }
  return {
    classification: 'unknown',
    confidence: 0.4,
    reason: 'No reliable promotion or transaction evidence',
    promotionSignals,
    transactionSignals,
  }
}

export function hasCredibleReceiptEvidence(parsed, message = {}, body = '') {
  if (!parsed || parsed.is_receipt === false) return false
  const initial = classifyCommerceEmail(message, body)
  const items = Array.isArray(parsed.items) ? parsed.items.filter((item) => item?.item_name) : []
  const total = Number(parsed.total_amount || 0)

  // A zero-net exchange/return can be valid when the parser found real line
  // items, but merchant-name-only parses and promotional prices are not.
  const structuredPurchase = Math.abs(total) > 0.009 || items.length > 0
  return initial.transactionSignals > 0 && structuredPurchase
}

