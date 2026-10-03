// Per-viewer lesson progress for /academy. Browser storage only, by design:
// the Academy is public and needs no account, so progress is a convenience that
// lives in this browser. Every access is guarded — private windows, blocked
// storage and previews throw or return nothing, and the pages must still render.
const KEY = 'gg_academy_done_v1'
const EVENT = 'gg-academy-progress'

export function readDone() {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function setDone(slug, value) {
  const next = { ...readDone() }
  if (value) next[slug] = true
  else delete next[slug]
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: progress lasts for this page view only.
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  } catch {}
  return next
}

// Subscribe to changes from this tab (custom event) and other tabs (storage).
export function onDoneChange(cb) {
  const local = (e) => cb(e.detail || readDone())
  const other = (e) => { if (e.key === KEY) cb(readDone()) }
  window.addEventListener(EVENT, local)
  window.addEventListener('storage', other)
  return () => {
    window.removeEventListener(EVENT, local)
    window.removeEventListener('storage', other)
  }
}
