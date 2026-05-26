// Web-side equivalent of the mobile DebugLog. Captures uncaught errors,
// unhandled promise rejections, and any code that explicitly calls
// clientLog(...). Events are buffered in memory + sessionStorage, then
// posted to /api/client-logs which forwards each to the log_audit RPC.
//
// Upload policy matches mobile:
//   - error / warn → uploaded immediately
//   - info         → debounced 3s
//   - successful upload → events removed from local buffer + session storage
//
// No external dependencies, safe to import server-side (becomes a no-op
// when window is undefined).

const STORAGE_KEY = 'gg_client_debug_log_v1'
const MAX_BUFFER = 500
const SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const noop = () => {}
const isBrowser = typeof window !== 'undefined'

let buffer = []
let initialized = false
let appVersion = null
let debounceHandle = null

function loadFromStorage() {
  if (!isBrowser) return
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) buffer = parsed
    }
  } catch {}
}

function persist() {
  if (!isBrowser) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buffer))
  } catch {}
}

async function flush() {
  if (!isBrowser || buffer.length === 0) return { uploaded: 0 }
  const pending = buffer.slice()
  try {
    const res = await fetch('/api/client-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: pending }),
      credentials: 'include',
    })
    if (!res.ok) {
      // Don't drop events — they stay in the buffer for the next attempt.
      return { uploaded: 0, error: `HTTP ${res.status}` }
    }
    const data = await res.json().catch(() => null)
    const written = data?.written ?? 0
    if (written > 0) {
      // Evict the first `written` events (they were sent in order).
      buffer = buffer.slice(written)
      persist()
    }
    return { uploaded: written }
  } catch (err) {
    return { uploaded: 0, error: err?.message || String(err) }
  }
}

function scheduleFlush() {
  if (!isBrowser) return
  if (debounceHandle) clearTimeout(debounceHandle)
  debounceHandle = setTimeout(() => { flush() }, 3000)
}

export function clientLog(tag, message, { meta, level = 'info' } = {}) {
  if (!isBrowser) return
  const ev = {
    ts: new Date().toISOString(),
    session_id: SESSION_ID,
    platform: 'web',
    app_version: appVersion,
    level,
    tag,
    message,
    meta: meta || null,
  }
  buffer.push(ev)
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER)
  persist()
  // Mirror to console so devs can still see it.
  if (level === 'error') console.error(`[${tag}]`, message, meta || '')
  else if (level === 'warn') console.warn(`[${tag}]`, message, meta || '')
  else console.debug(`[${tag}]`, message, meta || '')

  if (level === 'error' || level === 'warn') {
    flush() // immediate, no debounce
  } else {
    scheduleFlush()
  }
}

export function flushClientLog() {
  return flush()
}

export function initClientDebugLog({ version } = {}) {
  if (!isBrowser || initialized) return
  initialized = true
  appVersion = version || null
  loadFromStorage()

  window.addEventListener('error', (e) => {
    clientLog('window-error', e.message || 'window error', {
      level: 'error',
      meta: {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack?.split('\n').slice(0, 20).join('\n'),
      },
    })
  })
  window.addEventListener('unhandledrejection', (e) => {
    clientLog('unhandled-rejection', e.reason?.message || String(e.reason || 'unhandled'), {
      level: 'error',
      meta: {
        stack: e.reason?.stack?.split('\n').slice(0, 20).join('\n'),
      },
    })
  })
  // Best-effort flush on tab close / hide.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('beforeunload', () => {
    // Synchronous-ish: use sendBeacon when available so the request actually
    // leaves the browser even if the tab is closing.
    try {
      if (navigator.sendBeacon && buffer.length > 0) {
        const blob = new Blob([JSON.stringify({ events: buffer })], { type: 'application/json' })
        const ok = navigator.sendBeacon('/api/client-logs', blob)
        if (ok) {
          buffer = []
          persist()
        }
      }
    } catch {}
  })

  clientLog('client-debug-log', 'init', {
    meta: { buffer_size_at_init: buffer.length },
  })
}

// Default export for convenience.
export default { initClientDebugLog, clientLog, flushClientLog }
