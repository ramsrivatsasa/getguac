const asNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/**
 * Deterministic confidence for receipt automation. This deliberately does not
 * trust a model's self-reported confidence: it scores the fields GetGuac can
 * validate and explains every reason an automatic save should pause.
 */
export function scoreReceiptConfidence(receipt = {}) {
  const reasons = []
  let score = 0
  const store = String(receipt.store_name || '').trim()
  const date = String(receipt.date || '').trim()
  const total = asNumber(receipt.total_amount)
  const items = Array.isArray(receipt.items) ? receipt.items : []

  if (store) score += 25
  else reasons.push('Store name was not detected')

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) score += 15
  else reasons.push('Purchase date was not detected')

  if (total > 0) score += 30
  else reasons.push('Receipt total was not detected')

  const namedItems = items.filter((item) => String(item?.item_name || '').trim())
  if (namedItems.length) score += 15
  else reasons.push('No line items were detected')

  const itemSum = namedItems.reduce(
    (sum, item) => sum + asNumber(item.price) * Math.max(1, asNumber(item.qty) || 1),
    0,
  )
  if (total > 0 && itemSum > 0) {
    const tax = Math.max(0, asNumber(receipt.tax_paid))
    const tip = Math.max(0, asNumber(receipt.tip_amount))
    const service = Math.max(0, asNumber(receipt.service_charge))
    const difference = Math.abs(total - (itemSum + tax + tip + service))
    const tolerance = Math.max(1, total * 0.08)
    if (difference <= tolerance) score += 10
    else reasons.push('Line items do not closely match the receipt total')
  } else {
    reasons.push('Receipt total could not be reconciled with line items')
  }

  if (receipt.payment_method || receipt.payment_last4) score += 5

  const level = score >= 85 ? 'high' : score >= 65 ? 'medium' : 'low'
  return {
    score,
    level,
    auto_save: level === 'high' && reasons.length === 0,
    review_reasons: reasons,
  }
}
