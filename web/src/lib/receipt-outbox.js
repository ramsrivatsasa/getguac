// Web outbox for /api/receipts/save.
//
// Why
// ---
// User taps "Save" → network is flaky / offline / VPN switching. Without
// an outbox, the save just fails and the user has to remember to retry.
// With one, the save attempt either lands or queues, the UI never hangs,
// and a flush sweeps queued saves whenever the app reloads / regains net.
//
// Storage
// -------
// localStorage. Key: `getguac.outbox.v1`. Value: JSON array of entries.
// Mobile uses the same shape in shared_preferences so a future shared
// debug dump format works across platforms.
//
// Each entry:
//   { id, parsed, receipt_link, business_purchase, user_category,
//     validation_comment, extra_page_urls,
//     idempotency_key, attempts, last_error, queued_at }
//
// Flow
// ----
//   saveReceiptViaOutbox(opts)
//     1. Try POST /api/receipts/save with 30s timeout + Idempotency-Key.
//     2. On 2xx → return result. (Nothing queued; nothing to clean up.)
//     3. On network error / timeout / 5xx → enqueue, return { queued: true }.
//     4. On 4xx → throw (user error, retry won't help).
//
//   flushOutbox()
//     For each queued entry, replay it. On success → splice it out.
//     On 4xx → also splice out (it'll never succeed) and log.
//     On network/5xx → leave it, bump attempts.
//
// TTL
// ---
// Entries older than 7 days OR attempts >= 10 are auto-dropped on flush
// with a console warning. Keeps the queue from growing without bound.
//
// No new dependencies. No service worker (kept simple — flushes on load
// + post-save explicitly). No background sync (predictable behavior;
// service worker can come later).

const STORAGE_KEY = 'getguac.outbox.v1'
const MAX_ATTEMPTS = 10
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 30_000

function readQueue() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(entries) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (e) {
    // Quota exceeded — drop oldest to fit. Better than silently losing the
    // current save.
    console.warn('[outbox] localStorage write failed, trimming:', e.message)
    try {
      const trimmed = entries.slice(-20)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {}
  }
}

function newIdempotencyKey() {
  // crypto.randomUUID() returns 36 chars — well within the route's regex bounds.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback: timestamp + random — also matches /^[A-Za-z0-9_-]{16,200}$/
  return `out-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Try to save. On network failure, enqueue + resolve with { queued: true }.
 * Never throws on network errors — the UI shouldn't have to handle them.
 * 4xx still throws (user fix needed, retry won't help).
 */
export async function saveReceiptViaOutbox(payload) {
  const idemKey = payload.idempotency_key || newIdempotencyKey()
  try {
    const res = await fetchWithTimeout('/api/receipts/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKey,
      },
      body: JSON.stringify({
        parsed:             payload.parsed,
        receipt_link:       payload.receipt_link,
        extra_page_urls:    payload.extra_page_urls,
        business_purchase:  payload.business_purchase,
        validation_comment: payload.validation_comment,
        user_category:      payload.user_category,
      }),
    }, REQUEST_TIMEOUT_MS)

    if (res.status >= 200 && res.status < 300) {
      const json = await res.json()
      return { ...json, queued: false }
    }

    if (res.status >= 400 && res.status < 500) {
      const json = await res.json().catch(() => ({}))
      const err = new Error(json.error || `Save failed (${res.status})`)
      err.status = res.status
      throw err
    }

    // 5xx — network-class, queue + return
    throw new Error(`Server ${res.status}`)
  } catch (e) {
    // 4xx already threw above; everything else (network, timeout, 5xx) → queue.
    if (e.status && e.status >= 400 && e.status < 500) throw e
    enqueue({
      id: idemKey,
      parsed:             payload.parsed,
      receipt_link:       payload.receipt_link,
      extra_page_urls:    payload.extra_page_urls,
      business_purchase:  payload.business_purchase,
      validation_comment: payload.validation_comment,
      user_category:      payload.user_category,
      idempotency_key:    idemKey,
      attempts:           1,
      last_error:         e.message || 'network',
      queued_at:          Date.now(),
    })
    return { queued: true, idempotency_key: idemKey }
  }
}

function enqueue(entry) {
  const q = readQueue()
  // De-dup by idempotency_key — replays shouldn't create twin entries.
  const filtered = q.filter(e => e.idempotency_key !== entry.idempotency_key)
  filtered.push(entry)
  writeQueue(filtered)
}

async function fetchWithTimeout(url, init, ms) {
  // AbortSignal.timeout is widely available in modern browsers; fall back
  // to a manual controller for older ones.
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

/**
 * Sweep the queue once. Returns { sent, failed, dropped } counts.
 * Safe to call any time. Caller should NOT await this in critical UI paths.
 */
export async function flushOutbox() {
  if (typeof window === 'undefined') return { sent: 0, failed: 0, dropped: 0 }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, failed: 0, dropped: 0 }
  }

  let q = readQueue()
  if (q.length === 0) return { sent: 0, failed: 0, dropped: 0 }

  const now = Date.now()
  const kept = []
  let sent = 0, failed = 0, dropped = 0

  for (const entry of q) {
    // TTL or attempt cap → drop with a warning. The user has presumably
    // moved on; the receipt is also still in the camera roll for re-capture.
    const ageMs = now - (entry.queued_at || now)
    if (ageMs > MAX_AGE_MS || (entry.attempts || 0) >= MAX_ATTEMPTS) {
      console.warn('[outbox] dropping entry (TTL or max attempts):', entry.idempotency_key, entry.last_error)
      dropped++
      continue
    }

    try {
      const res = await fetchWithTimeout('/api/receipts/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': entry.idempotency_key,
        },
        body: JSON.stringify({
          parsed:             entry.parsed,
          receipt_link:       entry.receipt_link,
          extra_page_urls:    entry.extra_page_urls,
          business_purchase:  entry.business_purchase,
          validation_comment: entry.validation_comment,
          user_category:      entry.user_category,
        }),
      }, REQUEST_TIMEOUT_MS)

      if (res.status >= 200 && res.status < 300) {
        sent++
        continue // drop from queue
      }
      if (res.status >= 400 && res.status < 500) {
        // User fix needed (e.g. RLS denied, validation). Retrying will keep
        // failing — drop with a log so the entry doesn't sit forever.
        console.warn('[outbox] dropping 4xx entry:', entry.idempotency_key, res.status)
        dropped++
        continue
      }
      // 5xx — keep, bump attempts
      kept.push({ ...entry, attempts: (entry.attempts || 0) + 1, last_error: `server ${res.status}` })
      failed++
    } catch (e) {
      // Network / timeout — keep, bump attempts
      kept.push({ ...entry, attempts: (entry.attempts || 0) + 1, last_error: e.message || 'network' })
      failed++
    }
  }

  writeQueue(kept)
  return { sent, failed, dropped }
}

/** Read-only count for UI badges. */
export function getOutboxSize() {
  return readQueue().length
}
