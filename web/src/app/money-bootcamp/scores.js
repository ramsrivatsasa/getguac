// Per-viewer test scores for /money-bootcamp. Browser storage only, by design:
// the Bootcamp is public and needs no account, so scores are a convenience that
// lives in this browser. Every access is guarded — private windows, blocked
// storage and previews throw or return nothing, and the pages must still render.
import { ACADEMY_TITLES, academySlug } from '../../lib/academy-titles.mjs'

const KEY = 'gg_bootcamp_scores_v1'
const EVENT = 'gg-bootcamp-scores'

export function migrateScores(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const next = { ...parsed }
  for (const id of Object.keys(ACADEMY_TITLES)) {
    const alias = academySlug(id), legacy = next[alias]
    if (alias === id || !legacy || typeof legacy !== 'object') continue
    const current = next[id]
    if (current && typeof current === 'object') {
      const latest = (legacy.at || '') > (current.at || '') ? legacy : current
      next[id] = { ...latest, best: Math.max(Number(legacy.best) || 0, Number(current.best) || 0), attempts: (Number(legacy.attempts) || 0) + (Number(current.attempts) || 0) }
    } else next[id] = legacy
    delete next[alias]
  }
  return next
}

export function readScores() {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const scores = migrateScores(parsed)
    if (JSON.stringify(scores) !== JSON.stringify(parsed)) {
      try { window.localStorage.setItem(KEY, JSON.stringify(scores)) } catch {}
    }
    return scores
  } catch {
    return {}
  }
}

// Keeps the best percentage per test and the most recent attempt.
export function saveScore(id, correct, total) {
  const pct = total ? Math.round((correct / total) * 100) : 0
  const prev = readScores()[id]
  const entry = { best: Math.max(pct, prev ? prev.best : 0), last: pct, attempts: (prev ? prev.attempts : 0) + 1, at: new Date().toISOString().slice(0, 10) }
  const next = { ...readScores(), [id]: entry }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: the score shows for this page view only.
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  } catch {}
  return entry
}

export function onScoresChange(cb) {
  const local = (e) => cb(e.detail || readScores())
  const other = (e) => { if (e.key === KEY) cb(readScores()) }
  window.addEventListener(EVENT, local)
  window.addEventListener('storage', other)
  return () => {
    window.removeEventListener(EVENT, local)
    window.removeEventListener('storage', other)
  }
}
