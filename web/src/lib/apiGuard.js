// In-process / cross-instance API hardening — rate limit + input validation
// helpers for /api routes.
//
// At any meaningful scale on Vercel, the rate limiter MUST be cross-instance:
// each serverless function instance has its own memory, and Vercel auto-scales
// instances under load. A pure in-process Map limiter is ineffective at scale
// (verified empirically: at N=100 concurrent sign-ups from one IP, only 1 of
// the 10 expected blocks fired — the other 32 blocks didn't appear until the
// instance pool stopped growing).
//
// This file uses Upstash Redis (via @upstash/ratelimit's sliding-window algo)
// when the env vars are present. When they aren't (local dev or a misconfigured
// env), it transparently falls back to an in-process Map so nothing breaks —
// you just lose the cross-instance guarantee.
//
// rateLimit() is ASYNC. All call sites must `await` it.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Upstash client (lazy) ─────────────────────────────────────────────────
let _redis = null            // null = not yet probed; false = not configured; Redis = ready
let _limiterCache = new Map() // `${limit}|${windowMs}` -> Ratelimit instance

function getRedis() {
  if (_redis !== null) return _redis || null
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) { _redis = false; return null }
  try {
    _redis = new Redis({ url, token })
  } catch (e) {
    console.warn('[apiGuard] Upstash init failed; falling back to in-process limiter:', e.message)
    _redis = false
    return null
  }
  return _redis
}

function getLimiter(limit, windowMs) {
  const redis = getRedis()
  if (!redis) return null
  const cacheKey = `${limit}|${windowMs}`
  if (_limiterCache.has(cacheKey)) return _limiterCache.get(cacheKey)
  // Sliding-window: the most accurate algorithm (no burst at window boundaries).
  // Window string format: "<n> s" / "<n> ms" — we always express in seconds.
  const window = `${Math.max(1, Math.ceil(windowMs / 1000))} s`
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: 'guac:rl',
    analytics: false,   // off — saves a Redis write per call
  })
  _limiterCache.set(cacheKey, limiter)
  return limiter
}

// ── Distributed limit via Upstash, with a 200ms timeout ─────────────────
// On Redis failure (network, throttle, outage) we return null so the caller
// can fall back. Better to let some requests through than to block legit
// users when our limiter is sick.
async function tryRedisLimit(key, limit, windowMs) {
  const limiter = getLimiter(limit, windowMs)
  if (!limiter) return null
  try {
    const result = await Promise.race([
      limiter.limit(key),
      new Promise((_, rej) => setTimeout(() => rej(new Error('rate-limit timeout')), 200)),
    ])
    return {
      ok: result.success,
      remaining: result.remaining,
      retryAfter: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
    }
  } catch (e) {
    // Surface in logs once per cold start so a misconfig is visible without
    // spamming on every request.
    if (!getRedis.warned) {
      console.warn('[apiGuard] Redis rate-limit failed, using in-process fallback:', e.message)
      getRedis.warned = true
    }
    return null
  }
}

// ── In-process fallback (per Vercel function instance) ────────────────────
// Used when Upstash isn't configured OR when a Redis call fails. Coarse but
// non-zero protection.
const inProcBuckets = new Map()

function inProcLimit(key, limit, windowMs) {
  const now = Date.now()
  const b = inProcBuckets.get(key)
  if (!b || b.expiresAt < now) {
    inProcBuckets.set(key, { count: 1, expiresAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }
  b.count++
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.expiresAt - now) / 1000) }
  }
  return { ok: true, remaining: limit - b.count, retryAfter: 0 }
}

// GC expired buckets every 5 min so the Map doesn't grow forever
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of inProcBuckets) if (v.expiresAt < now) inProcBuckets.delete(k)
  }, 5 * 60_000).unref?.()
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Allow `limit` requests per `windowMs` for the given key. Cross-instance
 * via Upstash when configured; falls back to per-instance in-process when not.
 *
 * Returns { ok: boolean, remaining: number, retryAfter: number-of-seconds }.
 *
 * ASYNC — must be awaited.
 */
export async function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const distributed = await tryRedisLimit(key, limit, windowMs)
  if (distributed) return distributed
  return inProcLimit(key, limit, windowMs)
}

/**
 * Best-effort key extraction for rate limiting. Mixes IP + route + auth header.
 * Routes that have user auth get a per-user key; anonymous routes get per-IP.
 */
export function rateKey(request, suffix = '') {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'local'
  const auth = request.headers.get('authorization')?.slice(0, 32) || ''
  return `${ip}|${auth}|${suffix}`
}

/**
 * Rate-limit by user id (when the route already resolved one). Use this in
 * addition to rateKey() so attackers can't rotate IPs to defeat the cap on
 * expensive per-user endpoints (AI parse, email poll, etc.).
 */
export function userRateKey(userId, suffix = '') {
  return `user:${userId || 'anon'}|${suffix}`
}

/**
 * Composite check: trips if EITHER per-IP or per-user limit is exceeded.
 * Both limits run independently so a single user on a botnet still hits
 * the per-user wall, and an open lab IP hits the per-IP wall.
 *
 * ASYNC — must be awaited.
 */
export async function rateLimitComposite({ ipKey, userKey, ipLimit, userLimit, windowMs = 60_000 }) {
  const ip = await rateLimit(ipKey, { limit: ipLimit, windowMs })
  if (!ip.ok) return { ok: false, reason: 'ip', retryAfter: ip.retryAfter }
  const user = await rateLimit(userKey, { limit: userLimit, windowMs })
  if (!user.ok) return { ok: false, reason: 'user', retryAfter: user.retryAfter }
  return { ok: true, remaining: Math.min(ip.remaining, user.remaining), retryAfter: 0 }
}

// ── Input validation (no zod dep — hand-rolled, tiny) ─────────────────────
/**
 * Validate an object against a schema of validator functions.
 *
 * Schema example:
 *   { item_name: requiredString({ max: 200 }), sku: optionalString({ max: 64 }) }
 *
 * Returns { ok: true, data } on success, { ok: false, error: string } on fail.
 */
export function validate(body, schema) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' }
  const cleaned = {}
  for (const [key, check] of Object.entries(schema)) {
    const v = body[key]
    const result = check(v, key)
    if (result.error) return { ok: false, error: result.error }
    if (result.value !== undefined) cleaned[key] = result.value
  }
  return { ok: true, data: cleaned }
}

export const v = {
  requiredString: ({ min = 1, max = 500 } = {}) => (val, key) => {
    if (val == null || val === '') return { error: `${key} required` }
    const s = String(val).trim()
    if (s.length < min) return { error: `${key} too short` }
    if (s.length > max) return { error: `${key} too long (max ${max})` }
    return { value: s }
  },
  optionalString: ({ max = 500 } = {}) => (val, key) => {
    if (val == null || val === '') return { value: null }
    const s = String(val).trim()
    if (s.length > max) return { error: `${key} too long (max ${max})` }
    return { value: s }
  },
  optionalArray: ({ maxLen = 100, of = null } = {}) => (val, key) => {
    if (val == null) return { value: [] }
    if (!Array.isArray(val)) return { error: `${key} must be an array` }
    if (val.length > maxLen) return { error: `${key} too many items (max ${maxLen})` }
    if (of) {
      for (let i = 0; i < val.length; i++) {
        const r = of(val[i], `${key}[${i}]`)
        if (r.error) return r
      }
    }
    return { value: val }
  },
  optionalObject: () => (val) => {
    if (val == null) return { value: null }
    if (typeof val !== 'object' || Array.isArray(val)) return { error: 'must be an object' }
    return { value: val }
  },
}
