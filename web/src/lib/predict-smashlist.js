// GuacWizard predictive engine for the Smashlist.
//
// Reads a user's `receipt_items` (with `purchase_date`, `store_id`,
// `category`, `health_tier`) and emits suggestions for items that are
// likely running out: "you've bought toilet paper every 14 days for the
// last 4 months and the last buy was 16 days ago — add to Pantry."
//
// Pure function — accepts already-fetched rows, returns plain JS objects.
// The cron-callable route in /api/smashlist/predict/route.js handles the
// I/O around it. Keeping the engine pure means we can write deterministic
// tests by feeding fixture data.

// Receipt-item category → Smashlist bucket. Items in categories that
// aren't here don't auto-predict — that's how we keep one-off purchases
// (TVs, clothes) from showing up in the list.
const BUCKET_MAP = {
  grub:      'Pantry',
  wellness:  'Pantry',  // pharmacy + medicines until we add a dedicated bucket
  coffee:    'Cravings',
  tea:       'Cravings',
  coke:      'Cravings',
  pepsi:     'Cravings',
  juice:     'Cravings',
  milkshake: 'Cravings',
  bars:      'Cravings',
  eats:      'Grub & Grab',
}

// How aggressive to be. 0.80 = predict when 80% of the average cadence
// has elapsed. Tunable per future user-preference.
const CADENCE_TRIGGER = 0.80

// Minimum past purchases before we trust a cadence pattern. 3 = bought
// at least three times → two real gaps to average.
const MIN_PRIORS = 3

function normalizeKey(name) {
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,'"`]/g, '')
}

function median(nums) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

function mode(arr) {
  if (!arr.length) return null
  const counts = new Map()
  for (const v of arr) {
    if (v == null) continue
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  let best = null, bestN = 0
  for (const [k, n] of counts) {
    if (n > bestN) { best = k; bestN = n }
  }
  return best
}

function daysBetween(aIso, bIso) {
  const a = new Date(aIso + 'T00:00:00Z')
  const b = new Date(bIso + 'T00:00:00Z')
  return (b - a) / (1000 * 60 * 60 * 24)
}

/**
 * Group items by normalized name and compute purchase cadence stats.
 *
 * @param {Array<{item_name: string, purchase_date: string, qty: number,
 *                price: number, category: string|null,
 *                health_tier: string|null, store_id: string|null}>} rows
 * @returns {Map<string, {key, displayName, count, dates, stores, prices,
 *                       category, healthTier, avgCadence, lastDate}>}
 */
function aggregate(rows) {
  const groups = new Map()
  for (const r of rows) {
    if (!r.item_name || !r.purchase_date) continue
    const key = normalizeKey(r.item_name)
    if (!key) continue
    const g = groups.get(key) || {
      key,
      displayName: r.item_name.trim(),
      count: 0,
      dates: [],
      stores: [],
      prices: [],
      qtys: [],
      categories: [],
      healthTiers: [],
    }
    g.count += 1
    g.dates.push(r.purchase_date)
    if (r.store_id) g.stores.push(r.store_id)
    if (r.price != null) g.prices.push(Number(r.price))
    if (r.qty != null) g.qtys.push(Number(r.qty))
    if (r.category) g.categories.push(r.category)
    if (r.health_tier) g.healthTiers.push(r.health_tier)
    // Prefer the longer / better-cased display variant.
    if (r.item_name.length > g.displayName.length) g.displayName = r.item_name.trim()
    groups.set(key, g)
  }

  for (const g of groups.values()) {
    g.dates.sort()
    const gaps = []
    for (let i = 1; i < g.dates.length; i++) {
      gaps.push(daysBetween(g.dates[i - 1], g.dates[i]))
    }
    const valid = gaps.filter(d => d > 0 && d < 365)
    g.avgCadence = valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length) : null
    g.lastDate = g.dates[g.dates.length - 1]
    g.medianPrice = median(g.prices)
    g.medianQty = median(g.qtys) || 1
    g.topStore = mode(g.stores)
    g.topCategory = mode(g.categories)
    g.topHealthTier = mode(g.healthTiers)
  }

  return groups
}

/**
 * Decide which groups deserve a prediction right now.
 *
 * @param {Map} groups — output of aggregate()
 * @param {{today?: string, dismissedKeys?: Set<string>}} opts
 * @returns {Array<{key, item_name, qty, price, store_id, list_name,
 *                  category, health_tier, predicted_reason,
 *                  predicted_avg_cadence_days, predicted_last_purchase_date}>}
 */
export function predict(rows, opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10)
  const dismissed = opts.dismissedKeys || new Set()
  const groups = aggregate(rows)
  const out = []

  for (const g of groups.values()) {
    if (g.count < MIN_PRIORS) continue
    if (!g.avgCadence || g.avgCadence <= 0) continue
    if (dismissed.has(g.key)) continue

    const daysSince = daysBetween(g.lastDate, today)
    if (daysSince < g.avgCadence * CADENCE_TRIGGER) continue
    if (daysSince > g.avgCadence * 3) continue   // user clearly stopped buying — don't resurrect

    const bucket = BUCKET_MAP[g.topCategory]
    if (!bucket) continue   // category not auto-predictable (subs, bills, tech, …)

    out.push({
      key: g.key,
      item_name: g.displayName,
      qty: g.medianQty,
      price: g.medianPrice,
      store_id: g.topStore,
      list_name: bucket,
      category: g.topCategory,
      health_tier: g.topHealthTier,
      predicted_reason: `Avg every ${Math.round(g.avgCadence)}d, last bought ${Math.round(daysSince)}d ago`,
      predicted_avg_cadence_days: Number(g.avgCadence.toFixed(2)),
      predicted_last_purchase_date: g.lastDate,
    })
  }
  return out
}

export const _internals = { BUCKET_MAP, CADENCE_TRIGGER, MIN_PRIORS, normalizeKey, aggregate }
