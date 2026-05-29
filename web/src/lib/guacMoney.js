// GuacMoney — the "we saved you real money" accounting layer.
//
// Different from cashback / points apps in one important way: nothing
// is paid out. Each row in guac_money_events represents real dollars
// the user did NOT spend because GetGuac routed them to a cheaper
// option. The dashboard tile, activity feed entries, and public-share
// social proof all read off of guac_money_events.
//
// This file owns:
//   - log()              — write a single save event
//   - logAutoAddCheapest()— specialized helper for the bulk-cheapest
//                            flow (computes savings per item from
//                            per-store history, writes events in
//                            parallel, returns the total)
//   - fetchTotal()       — current accumulated balance for the user
//   - fetchRecent()      — latest N events for activity-feed rendering
//
// Cost model: every event is a single Supabase insert. The cap (10k
// USD per event, enforced by RLS) is a sanity bound against client
// bugs writing absurd numbers, not a product limit.

import { createClient } from './supabase/client'

export const GUAC_MONEY_SOURCES = {
  AUTO_ADD_CHEAPEST: 'auto_add_cheapest',
  PICK_CHEAPEST: 'pick_cheapest',
  WEB_BEAT: 'web_beat',
  PREDICTED_SAVE: 'predicted_save',
}

// Single-event writer. Returns the inserted row on success or null on
// failure — never throws so callers can fire-and-forget without a
// try/catch (the actual user-facing action shouldn't be blocked by a
// telemetry write failing).
export async function log({ source, amount, itemName, storeName, metadata }) {
  if (!amount || amount <= 0) return null
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data, error } = await sb.from('guac_money_events').insert({
    user_id: user.id,
    source,
    amount: Math.min(9999.99, Number(amount)),
    item_name: itemName || null,
    store_name: storeName || null,
    metadata: metadata || null,
  }).select('id, amount, source, item_name, store_name, created_at').single()
  if (error) {
    if (typeof console !== 'undefined') console.warn('[guacMoney.log] failed:', error.message)
    return null
  }
  return data
}

// Returns the user's current total. Uses the SQL aggregate function
// from migration_055 so we don't pull every event row client-side.
// Falls back to 0 if the function is missing (migration not yet run).
export async function fetchTotal() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return 0
  const { data, error } = await sb.rpc('guac_money_total', {
    target_user_id: user.id,
  })
  if (error) {
    // Function-missing error (PGRST202) = migration not yet run. Don't
    // spam the console; just degrade gracefully.
    return 0
  }
  return Number(data) || 0
}

// Latest N events for the activity-feed surface.
export async function fetchRecent(limit = 20) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []
  const { data, error } = await sb
    .from('guac_money_events')
    .select('id, source, amount, item_name, store_name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

// Specialized writer for the Auto-Add → Cheapest flow. Given the
// target items + their per-store price history (already loaded by
// autoAddAll for the cheapest-routing math), computes savings per
// item and writes events. Returns the total saved + per-item map for
// the toast / confetti message.
//
// Savings formula: for an item with N stores, savings = the difference
// between the chosen (cheapest) store's min_price and the AVG min_price
// across the OTHER stores. This is the dollar amount the user would
// have spent if they'd defaulted to a random one of the other stores
// instead of being routed.
//
// Caveats:
//   - Skips items with no chosen store (predictor didn't have a hit).
//   - Skips items with only one historical store (nothing to compare
//     against, so no "save" claim is honest).
//   - Skips items where the chosen store isn't actually the cheapest
//     in `perItem` (defensive; shouldn't happen in normal flow).
export async function logAutoAddCheapest({ targets, perItem, getChosenStoreId }) {
  let total = 0
  const perItemSavings = []
  const writes = []
  for (const t of targets) {
    const sid = getChosenStoreId(t.item_name)
    if (!sid) continue
    const m = perItem.get(t.item_name)
    if (!m || m.size < 2) continue   // need at least 2 stores to claim a save
    const stores = [...m.values()]
    const chosen = stores.find(s => String(s.id) === String(sid))
    if (!chosen || chosen.min_price == null) continue
    const others = stores.filter(s => String(s.id) !== String(sid) && s.min_price != null)
    if (others.length === 0) continue
    const otherAvg = others.reduce((sum, s) => sum + Number(s.min_price), 0) / others.length
    const saved = otherAvg - Number(chosen.min_price)
    if (saved <= 0) continue          // chosen wasn't actually cheaper; honesty bound
    const qty = Number(t.qty || 1)
    const amount = +(saved * qty).toFixed(2)
    if (amount <= 0) continue
    total += amount
    perItemSavings.push({ item: t.item_name, amount })
    writes.push(log({
      source: GUAC_MONEY_SOURCES.AUTO_ADD_CHEAPEST,
      amount,
      itemName: t.item_name,
      storeName: chosen.name,
      metadata: {
        chosen_price: Number(chosen.min_price),
        other_avg: +otherAvg.toFixed(2),
        other_count: others.length,
        qty,
      },
    }))
  }
  // Don't await the writes here — they're best-effort telemetry.
  // The Promise.allSettled keeps the caller responsive while we
  // commit them in the background.
  Promise.allSettled(writes).catch(() => {})
  return { total: +total.toFixed(2), perItemSavings }
}

// Pretty-print helpers used by the dashboard tile + toasts.
export function formatGuacMoney(amount) {
  const n = Number(amount) || 0
  if (n >= 1000) return `$${n.toFixed(0)}`
  return `$${n.toFixed(2)}`
}

export function sourceLabel(source) {
  switch (source) {
    case GUAC_MONEY_SOURCES.AUTO_ADD_CHEAPEST: return 'Cheapest-store routing'
    case GUAC_MONEY_SOURCES.PICK_CHEAPEST:     return 'Picked the cheaper store'
    case GUAC_MONEY_SOURCES.WEB_BEAT:          return 'Web price beat your last buy'
    case GUAC_MONEY_SOURCES.PREDICTED_SAVE:    return 'Predictor caught a save'
    default:                                   return 'Save'
  }
}
