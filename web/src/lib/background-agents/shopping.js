import { predict, _internals } from '../predict-smashlist.js'
import { allRecords } from '../find-your-10/pagination.mjs'
import { refreshSavedGroceryBasket } from '../grocery-discovery.mjs'

const normalize = _internals.normalizeKey
function embedding(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(value) && value.every(Number.isFinite) ? value : null
  } catch { return null }
}

// Read-only replenishment recommendations. The existing Smashlist cron owns
// list insertion; these snapshots neither add items nor place orders.
export async function runShoppingAgent({ sb, userId, now = new Date() }) {
  if (!sb || !userId) throw new Error('A user-scoped shopping agent is required.')
  const date = new Date(now)
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid snapshot date.')
  const today = date.toISOString().slice(0, 10)
  const sourceCounts = {}
  const read = async (table, columns, order, owner = 'user_id') => {
    const rows = await allRecords(sb.from(table).select(columns).eq(owner, userId).order(order), table)
    sourceCounts[table] = rows.length
    return rows
  }
  const [items, existing, dismissed, aliasesRows, outcomes] = await Promise.all([
    read('receipt_items', 'id,item_name,qty,price,category,health_tier,purchase_date,returned,embedding,receipts!inner(user_id,date,store_id,is_return)', 'id', 'receipts.user_id'),
    read('shopping_list', 'id,item_name,sent_to_store,order_date', 'id'),
    read('smashlist_predict_dismissed', 'item_key', 'item_key'),
    read('product_aliases', 'alias_key,canonical_key,status', 'alias_key'),
    read('prediction_outcomes', 'shopping_list_id,item_key,outcome,outcome_at', 'shopping_list_id'),
  ])
  const aliases = new Map(), rejectedPairs = new Set()
  for (const row of aliasesRows) {
    if (row.status === 'rejected') rejectedPairs.add(`${row.alias_key}|${row.canonical_key}`)
    else if (['auto', 'confirmed'].includes(row.status)) aliases.set(normalize(row.alias_key), normalize(row.canonical_key))
  }
  const canonical = value => {
    let key = normalize(value)
    const seen = new Set()
    while (aliases.has(key) && !seen.has(key)) { seen.add(key); key = aliases.get(key) }
    return key
  }
  const dismissedKeys = new Set(dismissed.map(row => canonical(row.item_key)))
  const feedback = new Map()
  for (const row of outcomes) {
    if (!row.item_key || String(row.outcome_at || '').slice(0, 10) > today) continue
    const key = canonical(row.item_key)
    const stats = feedback.get(key) || { purchased: 0, ignored: 0, dismissed: 0, latestPurchase: null }
    if (row.outcome === 'dismissed') { stats.dismissed++; dismissedKeys.add(key) }
    if (row.outcome === 'ignored') stats.ignored++
    if (row.outcome === 'purchased') {
      stats.purchased++
      const day = String(row.outcome_at).slice(0, 10)
      if (!stats.latestPurchase || day > stats.latestPurchase) stats.latestPurchase = day
    }
    feedback.set(key, stats)
  }
  const rows = items.filter(row => !row.returned && !row.receipts?.is_return)
    .map(row => ({ ...row, purchase_date: row.purchase_date || row.receipts?.date, store_id: row.receipts?.store_id, embedding: embedding(row.embedding) }))
    .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.purchase_date || '') && row.purchase_date <= today)
  const { predictions, newAliases } = predict(rows, { today, dismissedKeys, aliases, rejectedPairs })
  // New centroid merges remain ephemeral but must participate in deduplication.
  for (const row of newAliases) aliases.set(row.alias_key, row.canonical_key)
  const blockedKeys = new Set([...dismissedKeys].map(canonical))
  const recommendations = predictions.filter(item => {
    const key = canonical(item.key)
    if (blockedKeys.has(key)) return false
    const cutoff = date.getTime() - item.predicted_avg_cadence_days * 86400000
    const recentlyPurchased = feedback.get(key)?.latestPurchase
    if (recentlyPurchased && new Date(recentlyPurchased).getTime() >= cutoff) return false
    return !existing.some(row => canonical(row.item_name) === key && (
      !row.sent_to_store || !row.order_date || new Date(row.order_date).getTime() >= cutoff
    ))
  }).map(item => {
    const stats = feedback.get(canonical(item.key)) || { purchased: 0, ignored: 0, dismissed: 0 }
    // Smoothed ranking evidence, not a probability or a trained model score.
    const rankingWeight = (stats.purchased + 1) / (stats.purchased + stats.ignored * 0.5 + 2)
    return { ...item, status: 'suggested', addedToList: false, rankingWeight,
      feedback: { purchased: stats.purchased, ignored: stats.ignored },
      priceBasis: 'Historical purchase price; current availability and price are unverified.' }
  }).sort((a, b) => b.rankingWeight - a.rankingWeight || a.key.localeCompare(b.key))
  let groceryBasket = { status: 'not_requested' }
  if (sb.auth?.admin?.getUserById) {
    const auth = await sb.auth.admin.getUserById(userId)
    const metadata = auth.data?.user?.user_metadata
    if (!auth.error && metadata?.grocery_research_enabled === true) groceryBasket = await refreshSavedGroceryBasket(sb, userId, metadata, { now: date }).catch(() => ({ status: 'unavailable', checkedAt: date.toISOString() }))
  }
  return { kind: 'shopping', userId, generatedAt: date.toISOString(), algorithmVersion: 'shopping-v1', sourceCounts,
    data: { recommendations, groceryBasket, automaticAdditions: false, feedbackBasis: 'Saved purchase, dismissal and ignored outcomes; no model training.' } }
}
