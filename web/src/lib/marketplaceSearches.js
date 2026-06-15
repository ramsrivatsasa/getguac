// Cookie-backed saved searches for the public Marketplace — lets a logged-out
// visitor keep their search criteria across visits with NO account. We use a
// first-party cookie (not localStorage) so the same saved searches are
// available to the server too (e.g. to pre-render saved chips or, later, to
// seed an account when they register).
//
// Shape: cookie `gg_market_searches` = URL-encoded JSON array of
//   { q: string, tab?: string, ts: number }   (newest first, capped at MAX)
//
// All functions are SSR-safe (no-op / [] when `document` is unavailable).

const COOKIE = 'gg_market_searches'
const MAX = 12
const ONE_YEAR = 60 * 60 * 24 * 365

export function getSavedSearches() {
  if (typeof document === 'undefined') return []
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'))
  if (!m) return []
  try {
    const arr = JSON.parse(decodeURIComponent(m[1]))
    return Array.isArray(arr) ? arr.filter((s) => s && typeof s.q === 'string') : []
  } catch {
    return []
  }
}

function write(arr) {
  if (typeof document === 'undefined') return
  const val = encodeURIComponent(JSON.stringify(arr.slice(0, MAX)))
  document.cookie = `${COOKIE}=${val}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}

// Add (or bump to front) a search. Case-insensitive dedupe on the query text.
export function saveSearch(q, extra = {}) {
  const query = (q || '').trim()
  if (!query) return getSavedSearches()
  const rest = getSavedSearches().filter((s) => s.q.toLowerCase() !== query.toLowerCase())
  const next = [{ q: query, ts: Date.now(), ...extra }, ...rest]
  write(next)
  return next.slice(0, MAX)
}

export function removeSearch(q) {
  const query = (q || '').trim().toLowerCase()
  const next = getSavedSearches().filter((s) => s.q.toLowerCase() !== query)
  write(next)
  return next
}

export function clearSavedSearches() {
  write([])
  return []
}

// ── Saved stores (Stores tab) — same cookie approach, separate cookie ──
const STORE_COOKIE = 'gg_market_stores'

export function getSavedStores() {
  if (typeof document === 'undefined') return []
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + STORE_COOKIE + '=([^;]+)'))
  if (!m) return []
  try {
    const arr = JSON.parse(decodeURIComponent(m[1]))
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

function writeStores(arr) {
  if (typeof document === 'undefined') return
  const val = encodeURIComponent(JSON.stringify(arr.slice(0, 40)))
  document.cookie = `${STORE_COOKIE}=${val}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}

// Toggle a store slug on/off. Returns the new saved-slug array.
export function toggleSavedStore(slug) {
  if (!slug) return getSavedStores()
  const cur = getSavedStores()
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [slug, ...cur]
  writeStores(next)
  return next
}
