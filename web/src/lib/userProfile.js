// User-Profile model — Guac's own per-user "AI" that learns from a user's
// transaction history. It's a parametric statistical model: the parameters
// are computed from the user's receipts and items, and used to personalize
// search, recommendations, and deal evaluation.
//
// Pure function: build it once from the user's receipts + items, then read
// the profile fields anywhere (server or client).

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}
function median(arr) { return percentile([...arr].sort((a, b) => a - b), 0.5) }
function quantiles(arr) {
  const s = [...arr].sort((a, b) => a - b)
  return { p10: percentile(s, 0.1), p25: percentile(s, 0.25), p50: percentile(s, 0.5), p75: percentile(s, 0.75), p90: percentile(s, 0.9) }
}

/**
 * Build the user profile from receipts + receipt_items.
 * Receipts must include: store_name, total_amount, date, category, business_purchase, rating
 * Items must include: item_name, sku, price, category, receipt_id, store_name (denormalized) or receipts.{store_id, store_name}
 */
export function buildUserProfile({ receipts = [], items = [] }) {
  if (receipts.length === 0 && items.length === 0) {
    return { empty: true, sample_size: 0 }
  }

  // ── Spend patterns at the receipt level ───────────────────────
  const allSpend = receipts.map(r => parseFloat(r.total_amount || 0)).filter(v => v > 0)
  const spendStats = quantiles(allSpend)

  // ── Top stores overall + by category ──────────────────────────
  const storeSpend = new Map()
  const storeVisits = new Map()
  const byCategoryStore = new Map()  // category → store → spend
  for (const r of receipts) {
    const store = r.store_name || 'Unknown'
    const v = Math.abs(parseFloat(r.total_amount || 0))
    storeSpend.set(store, (storeSpend.get(store) || 0) + v)
    storeVisits.set(store, (storeVisits.get(store) || 0) + 1)
    const cat = r.category || 'misc'
    if (!byCategoryStore.has(cat)) byCategoryStore.set(cat, new Map())
    const m = byCategoryStore.get(cat)
    m.set(store, (m.get(store) || 0) + v)
  }
  const topStores = [...storeSpend.entries()]
    .map(([store, spend]) => ({ store, spend, visits: storeVisits.get(store) || 0 }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
  const storesByCategory = {}
  for (const [cat, m] of byCategoryStore.entries()) {
    storesByCategory[cat] = [...m.entries()]
      .map(([store, spend]) => ({ store, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 3)
      .map(x => x.store)
  }

  // ── Per-item price history (key by SKU or lowercase name) ────
  const itemPrices = new Map()
  for (const it of items) {
    const key = (it.sku || it.item_name || '').toLowerCase().trim()
    if (!key) continue
    const price = parseFloat(it.price || 0)
    if (!(price > 0)) continue
    if (!itemPrices.has(key)) itemPrices.set(key, { name: it.item_name, sku: it.sku, category: it.category, prices: [], stores: new Map() })
    const e = itemPrices.get(key)
    e.prices.push(price)
    const store = it.store_name || it.receipts?.store_name || ''
    if (store) e.stores.set(store, Math.min(e.stores.get(store) || Infinity, price))
  }
  const itemHistory = {}
  for (const [key, e] of itemPrices.entries()) {
    itemHistory[key] = {
      name: e.name,
      sku: e.sku,
      category: e.category,
      count: e.prices.length,
      ...quantiles(e.prices),
      avg: e.prices.reduce((a, b) => a + b, 0) / e.prices.length,
      cheapest_store: [...e.stores.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] || null,
      cheapest_price: [...e.stores.values()].sort((a, b) => a - b)[0] || null,
    }
  }

  // ── Category averages ─────────────────────────────────────────
  const byCategorySpend = new Map()
  for (const r of receipts) {
    const cat = r.category || 'misc'
    if (!byCategorySpend.has(cat)) byCategorySpend.set(cat, [])
    byCategorySpend.get(cat).push(Math.abs(parseFloat(r.total_amount || 0)))
  }
  const categoryStats = {}
  for (const [cat, prices] of byCategorySpend.entries()) {
    categoryStats[cat] = { ...quantiles(prices), count: prices.length, total: prices.reduce((a, b) => a + b, 0) }
  }

  // ── Worth-it patterns ─────────────────────────────────────────
  const rated = receipts.filter(r => r.rating != null)
  const regretStores = new Map()
  for (const r of rated) {
    if (r.rating > 2) continue
    const s = r.store_name || 'Unknown'
    regretStores.set(s, (regretStores.get(s) || 0) + Math.abs(parseFloat(r.total_amount || 0)))
  }
  const topRegretStores = [...regretStores.entries()]
    .map(([store, spend]) => ({ store, spend }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)

  // ── Business vs personal ───────────────────────────────────────
  const bizCount = receipts.filter(r => r.business_purchase).length
  const bizRatio = receipts.length === 0 ? 0 : bizCount / receipts.length

  return {
    empty: false,
    sample_size: receipts.length,
    item_count: items.length,
    spend: spendStats,
    top_stores: topStores,
    stores_by_category: storesByCategory,
    item_history: itemHistory,
    category_stats: categoryStats,
    top_regret_stores: topRegretStores,
    biz_ratio: bizRatio,
    generated_at: new Date().toISOString(),
  }
}

/**
 * Predict items the user is likely to buy soon — based on their own history.
 *  - "Replenish" candidates: bought 2+ times, where days since last buy >= median interval
 *  - "Recent recurring": bought regularly, last buy within a week (still in cadence)
 *  - "Stale staples": bought multiple times but not in a long time (gentle reminder)
 *
 * `now` lets tests inject a fixed timestamp; production passes Date.now().
 */
export function predictReplenishItems({ receipts = [], items = [] }, { now = Date.now(), limit = 10 } = {}) {
  // Group purchases by (sku-or-name) with timestamps
  const map = new Map()
  for (const it of items) {
    const key = (it.sku || it.item_name || '').toLowerCase().trim()
    if (!key) continue
    const dateStr = it.receipts?.date || it.purchase_date
    if (!dateStr) continue
    const ts = new Date(dateStr).getTime()
    if (!Number.isFinite(ts)) continue
    if (!map.has(key)) {
      map.set(key, {
        key,
        item_name: it.item_name,
        sku: it.sku,
        category: it.category || it.receipts?.category || 'misc',
        store_name: it.receipts?.store_name || '',
        store_id: it.receipts?.store_id || null,
        last_price: parseFloat(it.price || 0),
        timestamps: [],
      })
    }
    const e = map.get(key)
    e.timestamps.push(ts)
    if (ts > Math.max(...e.timestamps, 0)) e.last_price = parseFloat(it.price || 0)
  }

  const out = []
  for (const e of map.values()) {
    if (e.timestamps.length < 2) continue
    e.timestamps.sort((a, b) => a - b)
    // Compute intervals between purchases (ms)
    const intervals = []
    for (let i = 1; i < e.timestamps.length; i++) intervals.push(e.timestamps[i] - e.timestamps[i - 1])
    const medianMs = median(intervals)
    const lastTs = e.timestamps[e.timestamps.length - 1]
    const sinceLast = now - lastTs
    const overdueRatio = medianMs === 0 ? 0 : sinceLast / medianMs
    // Mark replenishment-worthy if we're past the typical interval
    if (overdueRatio < 0.6) continue
    out.push({
      ...e,
      times_bought: e.timestamps.length,
      typical_interval_days: Math.round(medianMs / 86400000),
      days_since_last: Math.round(sinceLast / 86400000),
      overdue_ratio: overdueRatio,
      tag: overdueRatio > 2 ? 'stale' : overdueRatio > 1 ? 'overdue' : 'due soon',
    })
  }
  return out
    .sort((a, b) => b.overdue_ratio - a.overdue_ratio)
    .slice(0, limit)
}

/**
 * Filter rewards / coupons that expire within `days` from now.
 */
export function expiringRewards(rewards = [], days = 30) {
  const now = Date.now()
  const horizon = now + days * 86400000
  return (rewards || [])
    .filter(r => r.expiry_date)
    .map(r => ({ ...r, expires_in_days: Math.round((new Date(r.expiry_date).getTime() - now) / 86400000) }))
    .filter(r => r.expires_in_days >= 0 && r.expires_in_days <= days)
    .sort((a, b) => a.expires_in_days - b.expires_in_days)
}

/**
 * Build a compact, model-friendly summary of the profile to inject into LLM prompts.
 * Limits length so it doesn't blow the context window.
 */
export function profileToPromptContext(profile) {
  if (!profile || profile.empty) return ''
  const lines = []
  lines.push(`Personalization context for this user (Guac User-Profile model, ${profile.sample_size} receipts analyzed):`)
  if (profile.top_stores?.length > 0) {
    lines.push(`- Frequently shops at: ${profile.top_stores.slice(0, 5).map(s => s.store).join(', ')}`)
  }
  const cats = Object.entries(profile.stores_by_category || {}).slice(0, 6)
  if (cats.length > 0) {
    lines.push(`- Preferred stores by category:`)
    for (const [cat, stores] of cats) lines.push(`    ${cat}: ${stores.join(', ')}`)
  }
  if (profile.spend?.p50) {
    lines.push(`- Typical receipt total: $${profile.spend.p25.toFixed(0)} – $${profile.spend.p75.toFixed(0)} (median $${profile.spend.p50.toFixed(0)})`)
  }
  if (profile.top_regret_stores?.length > 0) {
    lines.push(`- Stores where past purchases were rated low (avoid pushing these): ${profile.top_regret_stores.slice(0, 3).map(s => s.store).join(', ')}`)
  }
  return lines.join('\n')
}
