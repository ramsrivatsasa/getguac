// Distorted-image arithmetic check for demo sign-in and registration.
//
// Replaces Cloudflare Turnstile on both paths. Measured cost of Turnstile
// (2026-08-02): 0.5–1.3 MB downloaded, ~2.2s to settle on a fast connection
// and ~6.0s on a mid-tier Android over 4G, with the submit button disabled
// the whole time. This is a ~1 KB inline SVG and one JSON round trip.
//
// ── WHY DIGITS DRAWN AS PATHS ────────────────────────────────────────────
// Three earlier attempts, and why each was wrong:
//   1. "4 + 5" as TEXT   — /\d+\s*[+-]\s*\d+/ solves it in four characters.
//   2. "four plus five"  — beats that regex, but requires reading ENGLISH.
//                          GetGuac's users do not all read English, and
//                          locking them out to inconvenience a scraper is a
//                          bad trade.
//   3. "I am not a robot" checkbox — pure UX. reCAPTCHA v2 works because
//                          Google scores behaviour behind it; with no such
//                          signal the box alone proves nothing.
// Digits drawn as SVG PATHS are universal — a numeral reads the same in every
// language — and carry no machine-readable text: the DOM holds
// `<path d="M3 2L17 2…">`, not "8 + 3".
//
// ⚠️ ACCESSIBILITY — the real cost of any image CAPTCHA: a screen reader
// cannot read this. The aria-label says a check is present and points at
// support rather than leaking the operands. If a blind user is ever blocked,
// that is a genuine bug and the fix is an audio or email fallback, NOT
// weakening the image.
//
// Stateless: no DB row, no session. The server HMAC-signs (answer, expiry,
// issued-at); the client echoes that blob back with the typed result.
// Nothing is trusted from the client except a signature it cannot forge.
import { createHmac, timingSafeEqual, randomInt } from 'node:crypto'

function secret() {
  return process.env.DEMO_CHALLENGE_SECRET
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || 'getguac-demo-challenge-fallback'
}

const TTL_MS = 10 * 60 * 1000

// Registration only. A person cannot fill in username, email, password and
// birth date in under three seconds; a script posts instantly. The issued-at
// lives inside the signature, so the client cannot backdate it.
export const MIN_FORM_SECONDS = 3

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

// ── Digit rendering ───────────────────────────────────────────────────────
// Seven-segment geometry drawn as stroked paths. Every glyph is jittered and
// rotated slightly, so no two challenges render byte-identically and the SVG
// cannot be matched against a fixed template.
//
//    aaa
//   f   b
//    ggg
//   e   c
//    ddd
const SEG = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg',
  5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
}
// segment -> [x1, y1, x2, y2] inside a 20x34 cell
const PATH = {
  a: [3, 2, 17, 2], b: [17, 3, 17, 15], c: [17, 19, 17, 31],
  d: [3, 32, 17, 32], e: [3, 19, 3, 31], f: [3, 3, 3, 15], g: [3, 17, 17, 17],
}

// 🔴 THE DISTORTION MUST LIVE IN THE COORDINATES, NOT IN A transform=.
//
// The first version emitted `<g transform="translate(..) rotate(..)"><path
// d="M3 2L17 2..."/></g>`. The rotation and jitter were real to the EYE, but
// the `d` attribute still held canonical, unchanged segment coordinates — so a
// parser ignored the transform, read `d`, and looked the digit up in a table
// built from SEG/PATH. Measured 2026-08-03: a six-line regex solved 300/300.
//
// So every point is now rotated, offset and jittered in JS, and only the
// resulting numbers reach the markup. No two renders of the same digit produce
// the same `d`, and there is no canonical string left to match against.
function transformPoint(x, y, cos, sin, ox, dy) {
  const dx = x - 10, dyc = y - 17          // rotate about the cell centre
  const rx = 10 + dx * cos - dyc * sin + ox + (randomInt(0, 15) - 7) / 10
  const ry = 17 + dx * sin + dyc * cos + dy + (randomInt(0, 15) - 7) / 10
  return `${rx.toFixed(1)} ${ry.toFixed(1)}`
}

// Returns an ARRAY of subpaths rather than an element — renderSvg merges every
// glyph into ONE <path>, so the markup no longer reveals which strokes belong
// to which character.
function glyph(digit, ox) {
  const rad = ((randomInt(0, 13) - 6) * Math.PI) / 180   // -6..+6 degrees
  const dy = randomInt(0, 5) - 2
  const cos = Math.cos(rad), sin = Math.sin(rad)
  return (SEG[digit] || '').split('').map((k) => {
    const [x1, y1, x2, y2] = PATH[k]
    return `M${transformPoint(x1, y1, cos, sin, ox, dy)}L${transformPoint(x2, y2, cos, sin, ox, dy)}`
  })
}

function operatorGlyph(plus, ox) {
  const rad = ((randomInt(0, 9) - 4) * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const strokes = plus ? [[4, 17, 16, 17], [10, 11, 10, 23]] : [[4, 17, 16, 17]]
  return strokes.map(([x1, y1, x2, y2]) =>
    `M${transformPoint(x1, y1, cos, sin, ox, 0)}L${transformPoint(x2, y2, cos, sin, ox, 0)}`)
}

function renderSvg(a, plus, b) {
  let parts = []
  let x = 8
  for (const ch of String(a)) { parts.push(...glyph(Number(ch), x)); x += 24 }
  parts.push(...operatorGlyph(plus, x)); x += 24
  for (const ch of String(b)) { parts.push(...glyph(Number(ch), x)); x += 24 }
  const w = x + 8

  // Shuffle, then emit as ONE <path>. Every coordinate is absolute, so order is
  // visually irrelevant — but it means the markup no longer groups strokes by
  // character, and the '+' can no longer be spotted by counting two strokes in
  // one element. Reading this now needs spatial clustering, not a regex.
  for (let i = parts.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[parts[i], parts[j]] = [parts[j], parts[i]]
  }
  parts = [`<path d="${parts.join('')}"/>`]
  // Two faint strokes across the glyphs — cheap defeat for naive segment
  // matching, faint enough not to bother a person.
  const noise = [0, 1].map(() => {
    const y1 = randomInt(4, 30), y2 = randomInt(4, 30)
    return `<path d="M0 ${y1}L${w} ${y2}" stroke-opacity="0.22"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 36" width="${w}" height="36" aria-hidden="true">`
       + `<g fill="none" stroke="#15281C" stroke-width="3.4" stroke-linecap="round">`
       + parts.join('') + noise
       + `</g></svg>`
}

// 🔑 DELIBERATELY TRIVIAL. Single digits in, single digit out — "3 + 4", not
// "17 + 8". The point is to prove a person is present, not to test anyone's
// arithmetic, and every extra second of thinking is a signup lost. Ram asked
// for this twice; keep it this easy.
// Subtraction never goes negative, so nobody has to reason about sign.
export function createChallenge() {
  const plus = randomInt(0, 2) === 0
  let a, b
  if (plus) {
    // a + b <= 9, so the answer is always one digit
    a = randomInt(1, 6); b = randomInt(1, 10 - a)
  } else {
    a = randomInt(3, 10); b = randomInt(1, a)
  }
  const answer = plus ? a + b : a - b
  const now = Date.now()
  const exp = now + TTL_MS
  // 🔴 THE ANSWER MUST NEVER APPEAR IN THE TOKEN. IT IS SENT TO THE CLIENT.
  //
  // The first version shipped `${answer}.${exp}.${iat}.${sig}` — so the token
  // literally BEGAN with the digit the user was meant to read off the image.
  // Verified against production 2026-08-03: four fetches returned tokens
  // starting 8, 2, 9, 9, each the correct answer. `token.split('.')[0]` was a
  // complete bypass, and every bit of the distorted rendering below was
  // decoration over a plaintext answer. The file's own comment claimed the
  // wire format "gives a scraper nothing to compute from"; it gave it
  // everything.
  //
  // Now the answer is only ever an HMAC INPUT. The token carries the expiry
  // and issued-at, plus a signature over (answer, exp, iat). verifyChallenge()
  // recomputes that signature from what the USER typed and compares. A client
  // cannot read the answer out, and cannot forge a signature without the
  // secret — so the only attack left is guessing.
  //
  // ⚠️ Guessing is 1-in-9, because Ram asked twice for single-digit answers
  // and that stays. The honeypot, MIN_FORM_SECONDS and per-IP rate limiting
  // are what carry the load here — this arithmetic proves a human is present,
  // it is not a work factor. If fake signups appear, add attempt limiting
  // before you make the sum harder.
  const payload = `${exp}.${now}`
  return { svg: renderSvg(a, plus, b), token: `${payload}.${sign(`${answer}.${payload}`)}` }
}

// Returns { ok: true } or { ok: false, reason }.
// `honeypot` is a CSS-hidden field: any value means an automated form-filler
// walked the DOM, and it fails before the arithmetic is considered.
// `opts.minSeconds` enforces a minimum time on form (sign-up only).
export function verifyChallenge(token, answer, honeypot, opts = {}) {
  if (honeypot) return { ok: false, reason: 'honeypot' }
  if (!token || answer === undefined || answer === null || String(answer).trim() === '') {
    return { ok: false, reason: 'missing' }
  }
  const parts = String(token).split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }
  const [expStr, iatStr, sig] = parts

  // Check expiry and timing BEFORE the signature, so a stale token cannot be
  // replayed indefinitely by an attacker who found one valid answer for it.
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false, reason: 'expired' }

  if (opts.minSeconds) {
    const iat = Number(iatStr)
    if (!Number.isFinite(iat)) return { ok: false, reason: 'malformed' }
    if (Date.now() - iat < opts.minSeconds * 1000) return { ok: false, reason: 'too-fast' }
  }

  // The answer the USER typed is an input to the signature, never read out of
  // the token — see the note in createChallenge(). A wrong answer produces a
  // different digest and fails here, which is also what makes this the
  // 'wrong-answer' path: there is nothing else to compare against.
  const got = String(answer).trim()
  if (!/^\d{1,3}$/.test(got)) return { ok: false, reason: 'wrong-answer' }

  const expected = sign(`${Number(got)}.${expStr}.${iatStr}`)
  // Constant-time compare so a wrong signature leaks nothing by timing.
  const gotBuf = Buffer.from(String(sig))
  const expBuf = Buffer.from(expected)
  if (gotBuf.length !== expBuf.length || !timingSafeEqual(gotBuf, expBuf)) {
    return { ok: false, reason: 'wrong-answer' }
  }

  return { ok: true }
}
