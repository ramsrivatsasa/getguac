// In-process API hardening — rate limit + input validation helpers for /api routes.
// Lightweight by design: no Redis, no extra deps. Uses a Map for counts, scoped
// to the dev server process; in prod (Vercel / Edge) each instance has its own
// map, which is fine for the protection we're after (preventing burst abuse).

// ── Rate limiter ──────────────────────────────────────────────────────────
const buckets = new Map()  // key → { count, expiresAt }

/**
 * Allow `limit` requests per `windowMs` per key (typically per-IP + per-route).
 * Returns { ok: boolean, remaining: number, retryAfter: number-of-seconds }.
 */
export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.expiresAt < now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }
  b.count++
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.expiresAt - now) / 1000) }
  }
  return { ok: true, remaining: limit - b.count, retryAfter: 0 }
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

// Garbage-collect expired buckets every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) if (v.expiresAt < now) buckets.delete(k)
  }, 5 * 60_000).unref?.()
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
