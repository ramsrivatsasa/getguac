// Predictor-telemetry helpers.
//
// One central place to read + write prediction_outcomes (migration 045).
// Every surface that needs to record what happened to a prediction —
// the shopping list's delete handler, the daily TTL cron, the future
// "auto-mark purchased" sweep — goes through this lib. No inline
// inserts elsewhere.
//
// Outcomes:
//   purchased  — model called it right; user bought it.
//   dismissed  — user said "never". Strong negative.
//   ignored    — sat unactioned past TTL. Weak negative.
//   superseded — replaced by a newer prediction (neutral).
//
// Reads return precision/coverage shapes ready for an admin panel
// or a future weekly digest email.

/**
 * Record an outcome for a single prediction. Idempotent — if we've
 * already recorded an outcome for this shopping_list_id, the upsert
 * leaves the original alone (first verdict wins).
 *
 * @param {object} sb            Supabase client (user-bound).
 * @param {string} userId
 * @param {string} shoppingListId
 * @param {'purchased'|'dismissed'|'ignored'|'superseded'} outcome
 * @param {object} [meta]
 * @param {string} [meta.itemKey]
 * @param {string} [meta.predictedAt]  ISO string for days_to_outcome math.
 * @param {string} [meta.receiptId]
 * @param {string} [meta.receiptItemId]
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function recordPredictionOutcome(sb, userId, shoppingListId, outcome, meta = {}) {
  if (!sb || !userId || !shoppingListId || !outcome) {
    return { ok: false, error: 'recordPredictionOutcome: missing args' }
  }
  if (!['purchased', 'dismissed', 'ignored', 'superseded'].includes(outcome)) {
    return { ok: false, error: `recordPredictionOutcome: invalid outcome ${outcome}` }
  }

  let daysToOutcome = null
  if (meta.predictedAt) {
    try {
      const diffMs = Date.now() - new Date(meta.predictedAt).getTime()
      if (Number.isFinite(diffMs)) daysToOutcome = Math.max(0, Math.round(diffMs / 86400000))
    } catch {}
  }

  // First verdict wins. ON CONFLICT DO NOTHING preserves the original
  // outcome — useful when the TTL cron runs after a manual dismissal
  // and shouldn't overwrite the stronger signal.
  const { error } = await sb.from('prediction_outcomes').upsert({
    shopping_list_id: shoppingListId,
    user_id:          userId,
    outcome,
    outcome_at:       new Date().toISOString(),
    receipt_id:       meta.receiptId || null,
    receipt_item_id:  meta.receiptItemId || null,
    days_to_outcome:  daysToOutcome,
    item_key:         meta.itemKey || null,
  }, { onConflict: 'shopping_list_id', ignoreDuplicates: true })
  if (error) {
    // Migration 045 may not be applied yet — log + soft-fail so the
    // user-facing action (delete shopping row, etc.) never breaks.
    console.warn('[prediction-feedback] outcome upsert failed:', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Quick per-user metrics over a recent window. Reads outcomes only;
 * doesn't re-derive from receipts.
 *
 * @param {object} sb
 * @param {string} userId
 * @param {object} [opts]
 * @param {number} [opts.days=90]
 * @returns {Promise<{
 *   total: number,
 *   purchased: number,
 *   dismissed: number,
 *   ignored: number,
 *   superseded: number,
 *   precision: number|null,    // purchased / (purchased + dismissed + ignored)
 *   medianLeadDays: number|null,
 * }>}
 */
export async function getPredictionMetrics(sb, userId, opts = {}) {
  const out = {
    total: 0, purchased: 0, dismissed: 0, ignored: 0, superseded: 0,
    precision: null, medianLeadDays: null,
  }
  if (!sb || !userId) return out
  const days = Math.max(1, Number(opts.days || 90))
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data, error } = await sb
    .from('prediction_outcomes')
    .select('outcome, days_to_outcome')
    .eq('user_id', userId)
    .gte('outcome_at', since)
  if (error || !Array.isArray(data)) {
    console.warn('[prediction-feedback] metrics read failed:', error?.message)
    return out
  }

  const leadDays = []
  for (const r of data) {
    out.total += 1
    if (r.outcome === 'purchased')      out.purchased += 1
    else if (r.outcome === 'dismissed') out.dismissed += 1
    else if (r.outcome === 'ignored')   out.ignored += 1
    else if (r.outcome === 'superseded')out.superseded += 1
    if (r.outcome === 'purchased' && Number.isFinite(r.days_to_outcome)) {
      leadDays.push(r.days_to_outcome)
    }
  }

  const ratable = out.purchased + out.dismissed + out.ignored
  out.precision = ratable > 0 ? out.purchased / ratable : null

  if (leadDays.length > 0) {
    leadDays.sort((a, b) => a - b)
    const mid = Math.floor(leadDays.length / 2)
    out.medianLeadDays = leadDays.length % 2 === 0
      ? (leadDays[mid - 1] + leadDays[mid]) / 2
      : leadDays[mid]
  }

  return out
}

/**
 * Group an array of predicted shopping_list rows by `store_id` (and
 * fall back to a "no-store" bucket for rows without one). Used by the
 * Errand Plan panel to render "1 trip to Costco vs 4 separate trips".
 *
 * Pure function — no DB, no auth. Hand it the rows you've already
 * fetched.
 *
 * @param {Array<{
 *   id: string, item_name: string, qty: number, store_id?: string,
 *   list_name?: string, category?: string, predicted?: boolean
 * }>} rows
 * @returns {Array<{
 *   storeId: string|null,
 *   items: Array<object>,
 *   itemCount: number,
 * }>}
 */
export function groupPredictionsByStore(rows = []) {
  const map = new Map()
  for (const r of rows) {
    if (!r) continue
    const key = r.store_id || '__nostore__'
    if (!map.has(key)) map.set(key, { storeId: r.store_id || null, items: [], itemCount: 0 })
    const entry = map.get(key)
    entry.items.push(r)
    entry.itemCount += 1
  }
  // Largest baskets first — those are the "1 trip saves the most" winners.
  return [...map.values()].sort((a, b) => b.itemCount - a.itemCount)
}
