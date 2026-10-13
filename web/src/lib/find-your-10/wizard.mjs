import { usableItem } from './opportunities.mjs'
export const WIZARD_STEPS = ['story', 'review', 'choices', 'action', 'results']
export const WIZARD_TARGETS = ['cut', 'cheaper', 'bills', 'earn', 'learn']
export const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
export const itemKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
export function purchaseWindow(data, now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  const valid = (data.items || []).filter(row => usableItem(row) && row.receipts.date <= today)
  const recentStart = new Date(now); recentStart.setUTCDate(recentStart.getUTCDate() - 30)
  const historical = valid.length > 0 && !valid.some(row => row.receipts.date > recentStart.toISOString().slice(0, 10))
  const end = historical ? valid.reduce((latest, row) => row.receipts.date > latest ? row.receipts.date : latest, '') : today
  const start = new Date(`${end}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 30)
  return {start: start.toISOString().slice(0, 10), end, historical}
}
export function purchaseGroups(data, now = new Date()) {
  const window = purchaseWindow(data, now)
  const groups = new Map()
  for (const row of data.items || []) {
    if (!usableItem(row) || row.receipts.date > window.end || row.receipts.date <= window.start) continue
    const key = itemKey(row.item_name)
    if (!key) continue
    const group = groups.get(key) || { key, title: row.item_name, rows: [], totalCents: 0, units: 0 }
    group.rows.push(row); group.totalCents += Math.round(Number(row.price) * 100); group.units += Number(row.qty)
    groups.set(key, group)
  }
  return [...groups.values()].map(g => ({ ...g, frequency: new Set(g.rows.map(r => r.receipt_id)).size, lowRated: g.rows.filter(r => r.rating > 0 && r.rating <= 2).length, unrated: g.rows.filter(r => !r.rating).length })).sort((a, b) => b.totalCents - a.totalCents)
}
export function purchaseChoices(data, now = new Date()) {
  return purchaseGroups(data, now).filter(g => g.lowRated).map(g => {
    const row = g.rows.filter(r => r.rating > 0 && r.rating <= 2).sort((a, b) => b.receipts.date.localeCompare(a.receipts.date))[0]
    return { id: `purchase:${row.id}`, type: 'purchase', title: row.item_name, itemKey: g.key, sourceId: row.id, category: row.category, baselineCents: Math.round(Number(row.price) * 100 / Number(row.qty)), maxUnits: g.rows.filter(r => r.rating > 0 && r.rating <= 2).reduce((s, r) => s + Number(r.qty), 0), periodBaselineCents: g.totalCents, baselineIds: g.rows.map(r => r.id), sourceDate: now.toISOString().slice(0, 10), href: `/receipts/${row.receipt_id}`, checkedAt: row.receipts.date }
  })
}
