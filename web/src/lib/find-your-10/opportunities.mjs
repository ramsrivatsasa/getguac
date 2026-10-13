import { guessCategory } from '../categorizeRules.js'
// Deterministic analysis of the member's own records. Historical prices are
// explicitly historical; never describe them as current live offers.
const cents = value => Math.round(Number(value || 0) * 100)
const normalized = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
export const usableReceipt = r => Boolean(r && /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') && r.status !== 'draft' && !r.needs_review && !r.is_payment && !/^\[card payment\]/i.test(r.store_name || '') && Number.isFinite(Number(r.total_amount ?? 0)))
export const usableItem = item => Boolean(item && usableReceipt(item.receipts) && !item.returned && !item.receipts.is_return && Number.isFinite(Number(item.price)) && Number(item.price) > 0 && Number.isFinite(Number(item.qty)) && Number(item.qty) > 0)
// Dining is an experience, not an interchangeable retail product.
export function isDiningItem(item) {
  const categories = [item?.category, item?.receipts?.category].map(normalized)
  if (categories.some(c => /^(eats|dining|restaurants?( & dining)?|dining out|food & dining)$/.test(c))) return true
  return guessCategory(item?.receipts?.store_name || '', []) === 'eats'
}
export const comparableItem = item => usableItem(item) && !isDiningItem(item)
export function usableOffer(offer, date) {
  try {
    const source = new URL(offer.source_url), checked = new Date(offer.last_checked_at).getTime()
    return source.protocol === 'https:' && !source.username && !source.password && offer.status === 'active' && offer.verification_status === 'verified' && Number.isFinite(checked) && checked <= date.getTime() && date.getTime() - checked <= 86400000 && (!offer.starts_at || new Date(offer.starts_at) <= date) && new Date(offer.expires_at) > date
  } catch { return false }
}
export function accountOpportunities(data, date = new Date()) {
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const prior = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const previousMonth = `${prior.getFullYear()}-${String(prior.getMonth() + 1).padStart(2, '0')}`
  const today = `${month}-${String(date.getDate()).padStart(2, '0')}`
  const purchases = [...new Map((data.receipts || []).map(r => [r.id, r])).values()].filter(r => usableReceipt(r) && !r.is_return && r.total_amount > 0 && r.date <= today)
  const categoryTotals = period => purchases.filter(r => r.date.startsWith(period)).reduce((map, r) => map.set(r.category || 'Uncategorized', (map.get(r.category || 'Uncategorized') || 0) + cents(r.total_amount)), new Map())
  const previous = categoryTotals(previousMonth), current = categoryTotals(month)
  const spending = [...previous].filter(([name, amount]) => amount > 0 && !/uncategorized|bill|transfer|payment|utilities|insurance|rent|mortgage/i.test(name)).map(([name, baselineCents]) => ({ id: `spend:${normalized(name)}`, type: 'spending', title: name, category: name, baselineCents, currentCents: current.get(name) || 0, estimateCents: Math.round(baselineCents / 10), previousMonth }))
  const groups = new Map()
  for (const item of data.items || []) {
    const receipt = item.receipts
    if (!comparableItem(item) || receipt.date > today) continue
    // Exact item text retains size/pack information; do not merge fuzzy names
    // or retailer-local SKUs across stores.
    const key = normalized(item.item_name)
    if (!key) continue
    const rows = groups.get(key) || []
    rows.push({ ...item, unitCents: Math.round(cents(item.price) / Number(item.qty)), date: receipt.date, store: receipt.store_name })
    groups.set(key, rows)
  }
  const shopping = []
  for (const [key, rows] of groups) {
    const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date))
    const latest = sorted[0], lower = sorted.filter(i => i.store !== latest.store && i.unitCents < latest.unitCents).sort((a, b) => a.unitCents - b.unitCents)[0]
    if (!lower) continue
    shopping.push({ id: `shop:${latest.id}`, type: 'shopping', title: latest.item_name, category: latest.category, itemKey: key, baselineCents: latest.unitCents, alternativeCents: lower.unitCents, differenceCents: latest.unitCents - lower.unitCents, store: lower.store, checkedAt: lower.date, sourceId: latest.id, lowerId: lower.id, href: `/receipts/${lower.receipt_id}` })
  }
  const promotions = (data.promotions || []).filter(p => usableOffer(p, date))
  const debt = (data.debtAccounts || []).filter(d => d.is_active !== false && d.balance > 0).map(d => ({ ...d, monthlyInterestCents: Math.round(cents(d.balance) * Number(d.apr || 0) / 1200) })).sort((a, b) => Number(b.apr) - Number(a.apr))
  return { month, previousMonth, spending, shopping, promotions, debt }
}
