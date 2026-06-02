// Stash aggregation engine — single source of truth for turning raw
// `receipt_items` rows into the user's Stash list (what they own,
// how many, last bought when, lifetime spend per item, ratings).
//
// === CANONICAL ENGINE — DO NOT FORK ===
// Web `(dashboard)/stash/page.jsx` and mobile `stash_screen.dart`
// both pipe through this aggregator. Same input rows → same output
// list. Fixture suite at `test-fixtures/stash-scenarios.json` locks
// the behavior in.
//
// === GROUPING RULES ===
// Rows are bucketed by a stable product key:
//   key = (sku || name).toLowerCase().trim()
// Falling back to name when SKU is missing lets us aggregate manually-
// entered items, and preferring SKU when present lets us merge the
// same product across stores even when name spellings differ
// ("Coca-Cola 12oz" vs "Coke 12oz").
//
// === FILTERS APPLIED ===
//   - returned === true     → excluded (it's not in the user's stash)
//   - from_statement === true → excluded (statement-import line items
//     aren't real product purchases — just balance entries)
//   - blank item_name       → excluded (corrupt row, can't display)
//
// === OUTPUT SHAPE (per item) ===
//   {
//     key, name, sku, category,
//     qty, totalSpent, timesBought,
//     lastDate, lastReceiptId, lastPrice, lastStore,
//     ratings: number[],
//     ratingCount, ratingSum, ratingMax, ratingAvg,  // null if no ratings
//     stores: string[],   // distinct store names
//     storeCount,
//   }

/** Normalize a string to the lowercase trimmed form we use as a key. */
export function normalizeKey(s) {
  return String(s ?? '').toLowerCase().trim()
}

/**
 * Aggregate raw receipt_items rows into Stash items.
 *
 * Each input row should carry at minimum: item_name, qty, price.
 * Optional fields recognized: sku, category, rating, returned,
 * receipt_id, store_id, plus a joined `receipts` object with date,
 * store_name, from_statement, category.
 *
 * Returns an unsorted array. Apply sortStash / filterStash for the
 * user-facing list.
 */
export function aggregateStashItems(rows = []) {
  const byKey = new Map()
  for (const r of rows) {
    if (!r) continue
    if (r.returned === true) continue
    if (r.receipts?.from_statement === true) continue
    const rawName = (r.item_name || '').trim()
    if (!rawName) continue

    const key = normalizeKey(r.sku || rawName)
    const qty = toInt(r.qty, 1)
    const price = toFloat(r.price, 0)
    const date = (r.receipts?.date || '').toString()
    const rid = (r.receipt_id || '').toString()
    const store = r.receipts?.store_name || ''
    const rating = r.rating == null ? null : toInt(r.rating, null)
    const category = r.category || r.receipts?.category || null

    let item = byKey.get(key)
    if (!item) {
      item = {
        key,
        name: rawName,
        sku: r.sku || null,
        category,
        qty: 0,
        totalSpent: 0,
        timesBought: 0,
        lastDate: '',
        lastReceiptId: '',
        lastPrice: 0,
        lastStore: '',
        ratings: [],
        ratingCount: 0,
        ratingSum: 0,
        ratingMax: null,
        ratingAvg: null,
        stores: new Set(),
      }
      byKey.set(key, item)
    }
    item.qty += qty
    item.totalSpent += price * qty
    item.timesBought += 1
    if (rating != null) {
      item.ratings.push(rating)
      item.ratingCount += 1
      item.ratingSum += rating
      item.ratingMax = item.ratingMax == null ? rating : Math.max(item.ratingMax, rating)
    }
    if (store) item.stores.add(store)
    if (date && date > item.lastDate) {
      item.lastDate = date
      item.lastReceiptId = rid
      item.lastPrice = price
      item.lastStore = store
      // The latest receipt's category wins — recategorizing newer
      // purchases should shift how the product reads.
      if (category) item.category = category
    } else if (!item.category && category) {
      item.category = category
    }
  }

  // Materialize sets + final aggregates
  const out = []
  for (const item of byKey.values()) {
    const stores = [...item.stores]
    if (item.ratingCount > 0) {
      item.ratingAvg = item.ratingSum / item.ratingCount
    }
    out.push({
      ...item,
      stores,
      storeCount: stores.length,
    })
  }
  return out
}

/**
 * Sort a list of aggregated items by one of the supported sort keys.
 *  - 'recent' → lastDate desc (default)
 *  - 'alpha'  → name asc
 *  - 'spent'  → totalSpent desc
 *  - 'qty'    → qty desc
 * Stable: items with equal sort keys retain input order.
 */
export function sortStash(items, sort = 'recent') {
  const arr = [...items]
  switch (sort) {
    case 'alpha':
      arr.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      break
    case 'spent':
      arr.sort((a, b) => b.totalSpent - a.totalSpent)
      break
    case 'qty':
      arr.sort((a, b) => b.qty - a.qty)
      break
    case 'recent':
    default:
      arr.sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''))
  }
  return arr
}

/**
 * Filter a list of aggregated items by a free-text query (matches
 * name and sku case-insensitively) and an optional category slug.
 */
export function filterStash(items, { query = '', category = null } = {}) {
  const q = String(query || '').trim().toLowerCase()
  return items.filter(it => {
    if (category && it.category !== category) return false
    if (!q) return true
    if (it.name.toLowerCase().includes(q)) return true
    if (it.sku && it.sku.toLowerCase().includes(q)) return true
    return false
  })
}

/**
 * Format a human-readable "purchase frequency" label for an item
 * — fits under the price chip in the card. Centralized so web +
 * mobile produce identical wording for the same input.
 *
 *   1 buy           → "First buy"
 *   2 buys (any)    → "Bought 2×"          (one gap, ambiguous cadence)
 *   3+ buys, avg <7d   → "Almost daily"
 *                <14d → "Weekly"
 *                <30d → "Every ~Nd"
 *                <60d → "Monthly"
 *                <90d → "Every ~6w"
 *               <180d → "Quarterly"
 *               <365d → "Yearly"
 *              >=365d → "Rare buy"
 *
 * @param {number} timesBought
 * @param {string} firstDate  ISO YYYY-MM-DD
 * @param {string} lastDate   ISO YYYY-MM-DD
 */
export function formatPurchaseFrequency(timesBought, firstDate, lastDate) {
  const n = Number(timesBought || 0)
  if (n <= 0) return ''
  if (n === 1) return 'First buy'
  if (n === 2 || !firstDate || !lastDate || firstDate === lastDate) return `Bought ${n}×`
  const t0 = new Date(firstDate).getTime()
  const t1 = new Date(lastDate).getTime()
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return `Bought ${n}×`
  const days = Math.round((t1 - t0) / 86400000 / (n - 1))
  if (days < 1)   return 'Almost daily'
  if (days < 7)   return `Every ~${days}d`
  if (days < 14)  return 'Weekly'
  if (days < 30)  return `Every ~${days}d`
  if (days < 60)  return 'Monthly'
  if (days < 90)  return `Every ~${Math.round(days / 7)}w`
  if (days < 180) return 'Quarterly'
  if (days < 365) return `Every ~${Math.round(days / 30)}mo`
  return 'Rare buy'
}

/** Counts items per category — fuels the filter pill row. */
export function categoryCounts(items) {
  const m = new Map()
  for (const it of items) {
    const k = it.category || null
    m.set(k, (m.get(k) || 0) + 1)
  }
  return m
}

/**
 * Group items into { category-slug → items[] } buckets, with each
 * bucket internally sorted by the same key as the top-level sort.
 * Used by the accordion view (one section per category).
 *
 * Items without a category go under the synthetic `__uncategorized__`
 * key so the UI can render a "Needs category" section at the end.
 */
export function groupByCategory(items, sort = 'recent') {
  const groups = new Map()
  for (const it of items) {
    const k = it.category || '__uncategorized__'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(it)
  }
  // Stable internal sort per bucket — same comparator as sortStash.
  for (const [, list] of groups) {
    list.splice(0, list.length, ...sortStash(list, sort))
  }
  return groups
}

/**
 * === CENTRAL VIEW SELECTOR ===
 * Single function the UI calls to translate (items, opts) into the
 * exact data shape it should render. Encapsulates the rules:
 *
 *   - SEARCH IS GLOBAL — when `search` is set, ignore `category` so
 *     the user can find any item without first picking the right pill.
 *   - VIEW='accordion' ONLY APPLIES WHEN category='all' — picking a
 *     specific category implies the user wants a flat list of just
 *     those items, not a one-section accordion. So we fall back to
 *     'grid' shape in that case.
 *   - SEARCH NEVER ACCORDIONS — a search result is always flat,
 *     regardless of view, because users expect a search to surface
 *     matches not categorize them.
 *
 * Returns:
 *   {
 *     shape: 'flat' | 'accordion',
 *     items:  [...]                  // when shape === 'flat'
 *     groups: Map<category, items[]> // when shape === 'accordion'
 *     totalShown: number
 *   }
 *
 * Both web and mobile consume this so the rules can't drift.
 */
export function selectStashView(items, {
  sort = 'recent',
  search = '',
  category = null,    // null/'all' = no category filter
  view = 'grid',      // 'grid' | 'list' | 'accordion'
} = {}) {
  const hasSearch = String(search || '').trim().length > 0
  // Search is global — bypass the category filter when active.
  const effectiveCategory = hasSearch ? null : (category && category !== 'all' ? category : null)
  const filtered = filterStash(items, { query: search, category: effectiveCategory })

  // Accordion only fires when:
  //   - view explicitly = 'accordion'
  //   - no specific category is selected (i.e. user is on "All")
  //   - no active search (search results stay flat)
  if (view === 'accordion' && !effectiveCategory && !hasSearch) {
    return {
      shape: 'accordion',
      groups: groupByCategory(filtered, sort),
      totalShown: filtered.length,
    }
  }
  return {
    shape: 'flat',
    items: sortStash(filtered, sort),
    totalShown: filtered.length,
  }
}

// ── helpers ─────────────────────────────────────────────────────────
function toInt(v, fallback) {
  if (v == null) return fallback
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}
function toFloat(v, fallback) {
  if (v == null) return fallback
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}
