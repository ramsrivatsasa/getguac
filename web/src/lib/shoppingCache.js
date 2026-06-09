// Shopping-search result cache engine — DATABASE-backed, CROSS-USER.
//
// Stores /api/best-prices result payloads in public.shopping_cache keyed by
// normalized query ONLY (no user id) — so the cache is shared across all
// users: user A's "Dell laptop 16GB" search serves user B's identical search
// with zero SerpApi calls. Entries refresh once older than the TTL. A fast
// in-process layer fronts the DB to avoid a round-trip on hot queries.
//
// Writes go through the service-role client (server-only, bypasses RLS);
// reads are allowed to any authenticated user via an RLS read policy (see
// migration_071_shopping_cache.sql). Tune the window with
// SHOPPING_CACHE_TTL_SECONDS (default 12h).

import { createClient } from '@supabase/supabase-js'

const TTL_SECONDS = Number(process.env.SHOPPING_CACHE_TTL_SECONDS) || 60 * 60 * 12

let _admin // undefined = not probed; null = unavailable; client = ready
function admin() {
  if (_admin !== undefined) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    _admin = (url && key)
      ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
      : null
  } catch { _admin = null }
  return _admin
}

// Per-instance fast front layer.
const _mem = new Map() // key → { at, value }

export function cacheKeyFor(query) {
  return String(query || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Fresh cached payload (in-memory or DB), or null. */
export async function getCachedSearch(query) {
  const key = cacheKeyFor(query)
  if (!key) return null

  const m = _mem.get(key)
  if (m && (Date.now() - m.at) < TTL_SECONDS * 1000) return m.value
  if (m) _mem.delete(key)

  const sb = admin()
  if (!sb) return null
  const cutoff = new Date(Date.now() - TTL_SECONDS * 1000).toISOString()
  const { data, error } = await sb
    .from('shopping_cache')
    .select('payload')
    .eq('cache_key', key)
    .gte('updated_at', cutoff)   // only fresh rows
    .maybeSingle()
  if (error || !data) return null
  _mem.set(key, { at: Date.now(), value: data.payload })
  return data.payload
}

/** Upsert a payload into the shared cache (and the in-memory front). */
export async function setCachedSearch(query, value) {
  const key = cacheKeyFor(query)
  if (!key) return
  _mem.set(key, { at: Date.now(), value })
  const sb = admin()
  if (!sb) return
  try {
    await sb.from('shopping_cache').upsert(
      { cache_key: key, payload: value, updated_at: new Date().toISOString() },
      { onConflict: 'cache_key' },
    )
  } catch (e) {
    console.error('[shoppingCache] write failed:', e.message)
  }
}

/** Force-evict a query (e.g. an explicit "refresh"). */
export async function evictCachedSearch(query) {
  const key = cacheKeyFor(query)
  _mem.delete(key)
  const sb = admin()
  if (sb) { try { await sb.from('shopping_cache').delete().eq('cache_key', key) } catch { /* ignore */ } }
}

export const SHOPPING_CACHE_TTL_SECONDS = TTL_SECONDS
