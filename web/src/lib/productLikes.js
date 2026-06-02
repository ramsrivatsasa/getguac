// Product-likes engine — single source of truth for the "♥ N users
// like this" badge on item cards.
//
// === CANONICAL ENGINE — DO NOT FORK ===
// Web `ItemRowCard` and mobile `FetchCard` both display a love-count
// badge sourced from this module. Mobile reads via
// `mobile/lib/services/product_likes_service.dart` (Dart port).
// Both implementations resolve to the same Supabase RPC
// `product_like_counts(item_keys text[])` (migration 062).
//
// === PUBLIC API ===
//   fetchLikeStats(itemKeys)  → Map<key, {totalLikes, likedByMe}>
//   toggleLike(itemKey)       → Promise<{liked, totalLikes}>
//   formatLikeCount(n)        → '22k' / '1.5k' / '999' / '0'
//
// Pure formatting lives in `formatLikeCount` so it can be tested
// without a Supabase connection. The fetch + toggle helpers wrap
// Supabase calls and return values the UI can render directly.

// Supabase client lazy-loaded inside the network functions so this
// module can also be imported from a pure-Node test runner (which
// doesn't have the @supabase/auth-helpers React bindings available).
// formatLikeCount stays pure + standalone.
async function _sb() {
  const { createClient } = await import('./supabase/client.js')
  return createClient()
}

/**
 * Aggregate like stats for a batch of item keys. Returns a Map so
 * the caller can decorate a list of items in O(1). Calls the
 * SECURITY DEFINER RPC which returns one row per requested key —
 * keys with no likes come back as { totalLikes: 0, likedByMe: false }.
 *
 * Returns an empty Map on any error so the UI degrades to "no
 * love-count badge" rather than throwing.
 */
export async function fetchLikeStats(itemKeys) {
  if (!Array.isArray(itemKeys) || itemKeys.length === 0) return new Map()
  const sb = await _sb()
  const { data, error } = await sb.rpc('product_like_counts', { item_keys: itemKeys })
  if (error) {
    if (typeof console !== 'undefined') console.warn('[likes] fetchLikeStats failed:', error.message)
    return new Map()
  }
  const m = new Map()
  for (const row of data || []) {
    m.set(row.item_key, { totalLikes: row.total_likes, likedByMe: row.liked_by_me })
  }
  return m
}

/**
 * Toggle the calling user's like on `itemKey`. Idempotent — calling
 * twice with the same auth puts the user back in their original
 * state. Returns the new state + the new total count.
 *
 * Throws on auth failure so the caller can show a "sign in to like"
 * prompt. Throws on Supabase error so the caller can revert any
 * optimistic UI.
 */
export async function toggleLike(itemKey) {
  if (!itemKey) throw new Error('itemKey required')
  const sb = await _sb()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('sign in to like products')
  // Check if the user already liked this product.
  const { data: existing } = await sb
    .from('product_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('item_key', itemKey)
    .maybeSingle()
  let liked
  if (existing) {
    const { error } = await sb
      .from('product_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('item_key', itemKey)
    if (error) throw error
    liked = false
  } else {
    const { error } = await sb
      .from('product_likes')
      .insert({ user_id: user.id, item_key: itemKey })
    if (error) throw error
    liked = true
  }
  // Get the new count via the same RPC the UI uses so this returns
  // an authoritative value, not an off-by-one local estimate.
  const m = await fetchLikeStats([itemKey])
  return {
    liked,
    totalLikes: m.get(itemKey)?.totalLikes ?? (liked ? 1 : 0),
  }
}

/**
 * Format a like count for the badge. Same rules as the value-chip
 * formatter so the visual rhythm matches across the card.
 *   < 1000        → exact integer
 *   1000 – 999999 → "1k", "1.5k", "22k", "100k"
 *   >= 1M         → "1.2M"
 *
 * Pure function — tested by the 20-scenario suite without a network
 * roundtrip. Both web and mobile must produce identical output for
 * the same input.
 */
export function formatLikeCount(n) {
  const v = Math.abs(Number(n) || 0)
  if (v < 1000) return String(Math.round(v))
  if (v < 10_000) {
    const k = v / 1000
    return k === Math.round(k) ? `${Math.round(k)}k` : `${k.toFixed(1)}k`
  }
  if (v < 1_000_000) return `${Math.round(v / 1000)}k`
  const m = v / 1_000_000
  return m === Math.round(m) ? `${Math.round(m)}M` : `${m.toFixed(1)}M`
}
