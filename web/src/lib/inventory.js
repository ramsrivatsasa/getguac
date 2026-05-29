// Stash inventory — per-user "what's on the shelf right now" tracker.
// Crossed with the predictor's cadence to flag items running low.
//
// item_key normalization matches lib/store-logo.js + the predictor:
// lowercase, strip non-alphanumeric, collapse whitespace. Keeps
// inventory stable across receipt-name variants that the predictor
// merges into a single product via product_aliases.

import { createClient } from './supabase/client'

export function inventoryKey(itemName) {
  return String(itemName || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

// Pull every inventory row for the current user. Returns a Map keyed
// by item_key for cheap O(1) lookup against the Stash items list.
export async function fetchInventoryMap() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Map()
  const { data, error } = await sb
    .from('stash_inventory')
    .select('item_key, on_hand_qty, updated_at')
    .eq('user_id', user.id)
  if (error) return new Map()
  const m = new Map()
  for (const r of data || []) m.set(r.item_key, r)
  return m
}

// Set on_hand_qty for a single item. Upserts so consecutive +/-
// taps land in one row, not many. Returns the new value on success.
export async function setOnHand(itemName, qty) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const key = inventoryKey(itemName)
  if (!key) return null
  const safe = Math.max(0, Math.min(9999, Number(qty) || 0))
  const { error } = await sb.from('stash_inventory').upsert({
    user_id: user.id,
    item_key: key,
    on_hand_qty: safe,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,item_key' })
  if (error) {
    if (typeof console !== 'undefined') console.warn('[inventory] setOnHand failed:', error.message)
    return null
  }
  return safe
}

// Compute a "running low" verdict given on-hand qty + cadence info
// from the predictor. The math:
//   daysOfStockLeft = on_hand * (avg_days_between_buys / avg_qty_per_buy)
// We compare against the user's cadence to decide:
//   - 0 on hand               → out
//   - daysLeft < cadence * 0.3 → running low (urgent)
//   - daysLeft < cadence * 0.6 → running low (soft)
//   - otherwise               → stocked
//
// Returns { state, daysLeft, label } or null when we can't compute
// (no on-hand value, or no cadence data from the predictor).
export function lowStockVerdict({ onHand, avgCadenceDays, avgQtyPerBuy }) {
  if (onHand == null) return null
  if (onHand === 0) {
    return { state: 'out', daysLeft: 0, label: 'Out of stock' }
  }
  if (!avgCadenceDays || !avgQtyPerBuy || avgCadenceDays <= 0 || avgQtyPerBuy <= 0) {
    return null
  }
  const daysPerUnit = avgCadenceDays / avgQtyPerBuy
  const daysLeft = Math.round(onHand * daysPerUnit)
  if (daysLeft < avgCadenceDays * 0.3) {
    return { state: 'urgent', daysLeft, label: `Running low · ~${daysLeft}d left` }
  }
  if (daysLeft < avgCadenceDays * 0.6) {
    return { state: 'soft', daysLeft, label: `Low · ~${daysLeft}d left` }
  }
  return { state: 'ok', daysLeft, label: `~${daysLeft}d on hand` }
}
