export function safeOfferUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && url.hostname.includes('.') && !/^(?:localhost|\d+(?:\.\d+){3}|\[)/i.test(url.hostname) && !/\.(?:local|internal)$/i.test(url.hostname) && !/(?:unsubscribe|privacy|preferences)/i.test(url.pathname) ? url.href : null
  } catch { return null }
}

export function currentPromotions(rows, { now = Date.now(), source = '', expiry = '', type = '', merchant = '' } = {}) {
  const seen = new Set()
  return rows.filter(row => {
    if (['dismissed', 'expired'].includes(row.status) || row.verification_status === 'rejected') return false
    const end = row.expires_at ? Date.parse(row.expires_at) : null
    const start = row.starts_at ? Date.parse(row.starts_at) : null
    if (end !== null && (!Number.isFinite(end) || end <= now) || start !== null && (!Number.isFinite(start) || start > now)) return false
    if (source && row.source !== source || expiry === 'dated' && end === null || expiry === 'week' && (end === null || end > now + 7 * 86400000)) return false
    const benefit = `${row.benefit_text || ''} ${row.title || ''}`
    if (type === 'percent' && !/\d+\s*%/.test(benefit) || type === 'amount' && !/\$\s*\d/.test(benefit) || type === 'free' && !/\bfree\b/i.test(benefit)) return false
    if (merchant && !String(row.merchant_name).toLowerCase().includes(merchant.toLowerCase())) return false
    const url = safeOfferUrl(row.redemption_url || row.source_url)
    const campaign = `${String(row.merchant_name).toLowerCase().replace(/[^a-z0-9]/g, '')}|${String(row.promo_code || '').toUpperCase()}|${row.benefit_text || ''}|${row.expires_at || ''}`
    // Unknown campaigns must not collapse distinct private/account offers.
    const key = row.promo_code ? campaign : url && row.benefit_text ? `${campaign}|${url}` : row.id
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}
