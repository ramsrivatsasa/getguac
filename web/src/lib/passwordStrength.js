// Password strength helpers used at sign-up + reset.
//
// 1. Hard minimum: 10 characters (NIST 800-63B recommends >= 8; we go 10).
// 2. Mix check: encourage at least 3 of [lower / upper / digit / symbol] but
//    do NOT require — research shows composition rules hurt usability without
//    improving real-world strength.
// 3. Breached-password check via haveibeenpwned k-anonymity API:
//    - SHA-1 the password, take first 5 chars, query api.pwnedpasswords.com
//    - The API returns suffixes that share the prefix — we never send the
//      full hash. Plaintext never leaves the server.
//
// This module is server-only — it runs in API routes, not the browser.

import { createHash } from 'crypto'

const MIN_LENGTH = 10

export function basicCheck(password) {
  if (!password || typeof password !== 'string') return { ok: false, error: 'Password required' }
  if (password.length < MIN_LENGTH) return { ok: false, error: `Password must be at least ${MIN_LENGTH} characters` }
  // Reject absurdly long input (DoS / memory abuse)
  if (password.length > 256) return { ok: false, error: 'Password too long' }
  // Reject straight whitespace
  if (!password.trim()) return { ok: false, error: 'Password cannot be only whitespace' }
  return { ok: true }
}

// Returns { ok: false, error } if password appears in HIBP's breach corpus.
// Returns { ok: true, count: number } otherwise (count = how many breaches
// it's appeared in; 0 means never seen).
//
// Network failure does NOT block sign-up — fail-open with a warning. The
// alternative is making HIBP a critical dependency, which it shouldn't be.
export async function checkBreached(password) {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'GetGuac-Signup-Check' },
      // 3 second timeout via AbortSignal — don't hang sign-up if HIBP is slow.
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { ok: true, count: 0, skipped: true, reason: `hibp ${res.status}` }
    const text = await res.text()
    for (const line of text.split('\n')) {
      const [hashSuffix, countStr] = line.trim().split(':')
      if (hashSuffix === suffix) {
        const count = parseInt(countStr, 10) || 1
        return {
          ok: false,
          error: `That password has appeared in ${count.toLocaleString()} known data breaches. Pick a different one.`,
          count,
        }
      }
    }
    return { ok: true, count: 0 }
  } catch (e) {
    // Network error / timeout — fail open. Log so we know if HIBP is flaky.
    console.warn('[passwordStrength] HIBP check failed:', e.message)
    return { ok: true, count: 0, skipped: true, reason: e.message }
  }
}

// One-shot: basic + breached. Use this from sign-up + reset routes.
export async function validatePassword(password) {
  const basic = basicCheck(password)
  if (!basic.ok) return basic
  const breached = await checkBreached(password)
  if (!breached.ok) return breached
  return { ok: true, breachSkipped: breached.skipped || false }
}
