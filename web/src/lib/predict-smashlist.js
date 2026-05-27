// GuacWizard predictive engine for the Smashlist.
//
// Reads a user's `receipt_items` (with `purchase_date`, `store_id`,
// `category`, `health_tier`, `embedding`) and emits suggestions for items
// that are likely running out.
//
// Two-pass grouping:
//   1. Normalize item names → string-key buckets (cheap, deterministic).
//   2. Embedding-centroid merge: for small buckets (count < MIN_PRIORS),
//      compute centroid of member embeddings and merge into the most
//      similar large bucket if cosine ≥ MERGE_THRESHOLD. This is what
//      catches "Coke 12pk" / "Coca-Cola 12 Pack" / "Coke 12-Pack".
//
// Persisted aliases (passed in via opts.aliases) are applied BEFORE pass 1,
// so confirmed-by-the-user merges are deterministic. Rejected aliases
// (opts.rejectedPairs) are excluded from auto-merge in pass 2.
//
// Pure function — accepts already-fetched rows + options, returns
// { predictions, newAliases }. The cron-callable route handles I/O.

const BUCKET_MAP = {
  grub:            'Pantry',
  pharmacy:        'Pantry',  // was 'wellness'
  health:          'Pantry',  // vitamins, supplements
  'personal-care': 'Pantry',  // toothpaste, shampoo, soap
  household:       'Pantry',  // bath tissue, paper towels, detergent
  tea:             'Cravings',
  drinks:          'Cravings',  // coffee + coke + pepsi + juice + milkshake merged 2026-05-27
  bars:            'Cravings',
  eats:            'Cravings',   // restaurant dishes — treats/wants. Aligned with Bites' default reorder destination 2026-05-27
  snacks:          'Snack Stack',// chips, crackers, granola bars, popcorn
}

const CADENCE_TRIGGER = 0.80
const MIN_PRIORS = 3

// Cosine threshold for auto-merging a small group into a large one.
// 0.88 is conservative — text-embedding-004 puts close-but-distinct products
// (Coke vs Diet Coke) around 0.82-0.86, true synonyms around 0.90+.
// Tunable via MERGE_THRESHOLD env var so it can be dialed without redeploy.
const MERGE_THRESHOLD = Number(
  (typeof process !== 'undefined' && process.env?.MERGE_THRESHOLD) || 0.88
)

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

function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function meanVector(vecs) {
  if (!vecs || vecs.length === 0) return null
  const dim = vecs[0].length
  const out = new Array(dim).fill(0)
  for (const v of vecs) {
    if (!v || v.length !== dim) continue
    for (let i = 0; i < dim; i++) out[i] += v[i]
  }
  for (let i = 0; i < dim; i++) out[i] /= vecs.length
  return out
}

// Recompute derived stats after a group's row-arrays change (used by merge).
function refreshDerived(g) {
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
  if (g.embeddings.length) g.centroid = meanVector(g.embeddings)
}

/**
 * Group items by normalized name, applying confirmed aliases first.
 *
 * @param {Array} rows
 * @param {Map<string,string>} aliases — alias_key → canonical_key (any status
 *        except 'rejected' counts as a binding redirect, since 'auto' came
 *        from our own merge pass and 'confirmed' is user-approved).
 */
function aggregate(rows, aliases = new Map()) {
  const groups = new Map()
  for (const r of rows) {
    if (!r.item_name || !r.purchase_date) continue
    const rawKey = normalizeKey(r.item_name)
    if (!rawKey) continue
    // Apply alias redirect — if rawKey has been merged before, route to canonical.
    const key = aliases.get(rawKey) || rawKey
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
      embeddings: [],
      memberKeys: new Set([key]),  // tracks which raw keys folded into this group
    }
    g.memberKeys.add(rawKey)
    g.count += 1
    g.dates.push(r.purchase_date)
    if (r.store_id) g.stores.push(r.store_id)
    if (r.price != null) g.prices.push(Number(r.price))
    if (r.qty != null) g.qtys.push(Number(r.qty))
    if (r.category) g.categories.push(r.category)
    if (r.health_tier) g.healthTiers.push(r.health_tier)
    if (Array.isArray(r.embedding) && r.embedding.length) g.embeddings.push(r.embedding)
    if (r.item_name.length > g.displayName.length) g.displayName = r.item_name.trim()
    groups.set(key, g)
  }

  for (const g of groups.values()) refreshDerived(g)
  return groups
}

/**
 * Centroid-based merge pass. Small groups (< MIN_PRIORS) absorb into the
 * most-similar large group (≥ MIN_PRIORS) if cosine sim ≥ MERGE_THRESHOLD
 * and the pair isn't in the rejected set.
 *
 * Mutates `groups` and returns the list of merge decisions made this run,
 * so the caller can persist them as new product_aliases rows.
 *
 * @param {Map} groups — output of aggregate()
 * @param {{rejectedPairs?: Set<string>}} opts — rejected pairs as "alias|canonical"
 */
function mergeBySimilarity(groups, opts = {}) {
  const rejected = opts.rejectedPairs || new Set()
  const newAliases = []

  const large = []
  const small = []
  for (const g of groups.values()) {
    if (g.count >= MIN_PRIORS && g.centroid) large.push(g)
    else if (g.centroid) small.push(g)
  }
  if (!large.length || !small.length) return newAliases

  for (const sg of small) {
    let bestSim = 0
    let bestLarge = null
    for (const lg of large) {
      if (rejected.has(`${sg.key}|${lg.key}`)) continue
      const sim = cosineSim(sg.centroid, lg.centroid)
      if (sim > bestSim) { bestSim = sim; bestLarge = lg }
    }
    if (!bestLarge || bestSim < MERGE_THRESHOLD) continue

    // Fold sg into bestLarge
    bestLarge.count += sg.count
    bestLarge.dates.push(...sg.dates)
    bestLarge.stores.push(...sg.stores)
    bestLarge.prices.push(...sg.prices)
    bestLarge.qtys.push(...sg.qtys)
    bestLarge.categories.push(...sg.categories)
    bestLarge.healthTiers.push(...sg.healthTiers)
    bestLarge.embeddings.push(...sg.embeddings)
    for (const k of sg.memberKeys) bestLarge.memberKeys.add(k)
    if (sg.displayName.length > bestLarge.displayName.length) {
      bestLarge.displayName = sg.displayName
    }
    refreshDerived(bestLarge)
    groups.delete(sg.key)

    newAliases.push({
      alias_key: sg.key,
      canonical_key: bestLarge.key,
      canonical_display_name: bestLarge.displayName,
      similarity: Number(bestSim.toFixed(4)),
    })
  }
  return newAliases
}

/**
 * Decide which groups deserve a prediction right now.
 *
 * @param {Array} rows
 * @param {{
 *   today?: string,
 *   dismissedKeys?: Set<string>,
 *   aliases?: Map<string,string>,        // alias_key → canonical_key (auto + confirmed)
 *   rejectedPairs?: Set<string>,         // "alias|canonical" pairs to skip
 * }} opts
 * @returns {{ predictions: Array, newAliases: Array }}
 */
export function predict(rows, opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10)
  const dismissed = opts.dismissedKeys || new Set()
  const groups = aggregate(rows, opts.aliases || new Map())
  const newAliases = mergeBySimilarity(groups, { rejectedPairs: opts.rejectedPairs })

  const predictions = []
  for (const g of groups.values()) {
    if (g.count < MIN_PRIORS) continue
    if (!g.avgCadence || g.avgCadence <= 0) continue
    if (dismissed.has(g.key)) continue

    const daysSince = daysBetween(g.lastDate, today)
    if (daysSince < g.avgCadence * CADENCE_TRIGGER) continue
    if (daysSince > g.avgCadence * 3) continue

    const bucket = BUCKET_MAP[g.topCategory]
    if (!bucket) continue

    predictions.push({
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
  return { predictions, newAliases }
}

export const _internals = {
  BUCKET_MAP, CADENCE_TRIGGER, MIN_PRIORS, MERGE_THRESHOLD,
  normalizeKey, cosineSim, meanVector, aggregate, mergeBySimilarity,
}
