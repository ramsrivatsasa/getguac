// Shopping-search result cache engine.
//
// Stores /api/best-prices result payloads keyed by normalized query so repeat
// and saved searches don't re-hit the metered SerpApi (free tier = 100/mo).
// Entries auto-refresh once older than the TTL; callers can also force a
// refresh (bypass the cache) on demand.
//
// Backend: Upstash Redis when configured (cross-instance, native TTL); falls
// back to an in-process Map so caching still works locally or when Upstash
// isn't set. Tune the window with SHOPPING_CACHE_TTL_SECONDS (default 12h).

import { Redis } from '@upstash/redis'

const TTL_SECONDS = Number(process.env.SHOPPING_CACHE_TTL_SECONDS) || 60 * 60 * 12
const PREFIX = 'shopcache:'

let _redis // undefined = not probed; null = unavailable; Redis = ready
function redis() {
  if (_redis !== undefined) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  try { _redis = (url && token) ? new Redis({ url, token }) : null }
  catch { _redis = null }
  return _redis
}

// Per-instance fallback so we still cache without Upstash.
const _mem = new Map() // key → { at, value }

export function cacheKeyFor(query) {
  return PREFIX + String(query || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Fresh cached payload, or null. */
export async function getCachedSearch(query) {
  const key = cacheKeyFor(query)
  const r = redis()
  if (r) {
    try { const v = await r.get(key); if (v) return v } catch { /* fall through */ }
  }
  const m = _mem.get(key)
  if (m && (Date.now() - m.at) < TTL_SECONDS * 1000) return m.value
  if (m) _mem.delete(key)
  return null
}

/** Cache a payload with the configured TTL. Safe to not await. */
export async function setCachedSearch(query, value) {
  const key = cacheKeyFor(query)
  _mem.set(key, { at: Date.now(), value })
  const r = redis()
  if (r) { try { await r.set(key, value, { ex: TTL_SECONDS }) } catch { /* ignore */ } }
}

/** Force-evict a query (e.g. an explicit "refresh"). */
export async function evictCachedSearch(query) {
  const key = cacheKeyFor(query)
  _mem.delete(key)
  const r = redis()
  if (r) { try { await r.del(key) } catch { /* ignore */ } }
}

export const SHOPPING_CACHE_TTL_SECONDS = TTL_SECONDS
