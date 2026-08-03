// Lightweight arithmetic challenge for the DEMO ACCOUNT sign-in.
//
// Replaces Cloudflare Turnstile on that one path. Measured cost of Turnstile
// on /login?demo=1 (2026-08-02): 0.5–1.3 MB downloaded, ~2.2s to settle on a
// fast connection and ~6.0s on a mid-tier Android over 4G — with the submit
// button gated on the token the whole time. This costs zero bytes and zero
// network round trips.
//
// 🔑 WHY THIS IS AN ACCEPTABLE TRADE HERE, AND ONLY HERE:
// the demo credentials are PUBLISHED IN PLAIN TEXT on /join. There is no
// secret to protect and no account to take over — the challenge exists only
// to stop trivial scripted hammering of a shared login. Turnstile was
// enormous overkill for that.
//
// 🔒 DO NOT reuse this for /register or for real user sign-in. Registration
// is where bot defence actually matters (fake accounts, mailbox
// provisioning, Migadu quota), and a solvable-by-regex sum protects none of
// it. Turnstile stays there.
//
// Stateless by design: no DB row, no session, no store to clean up. The
// server signs (a, b, expiry) with HMAC; the client echoes the signed blob
// back with the user's answer; the server re-derives and compares. Nothing
// is trusted from the client except the signature it cannot forge.
import { createHmac, timingSafeEqual, randomInt } from 'node:crypto'

// Falls back to the service-role key so this works before anyone sets a
// dedicated secret. Any stable server-only string is fine — it never leaves
// the server and rotating it only invalidates in-flight challenges.
function secret() {
  return process.env.DEMO_CHALLENGE_SECRET
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || 'getguac-demo-challenge-fallback'
}

const TTL_MS = 10 * 60 * 1000   // 10 minutes: generous for a human, short
                                // enough that a harvested pair is useless.

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

// ── Bot resistance ────────────────────────────────────────────────────────
// A literal "3 + 4 = ?" is solved by a four-character regex, so the prompt is
// never rendered as digits and an operator:
//
//   1. NUMBERS ARE WORDS.        "seven plus two"  — `/\d+\s*\+\s*\d+/` finds
//                                nothing to parse.
//   2. THE OPERATION VARIES.     plus / minus / times, so a scraper cannot
//                                assume addition.
//   3. SUBTRACTION NEVER GOES NEGATIVE and multiplication stays inside the
//                                times tables — still trivial for a person.
//   4. A HONEYPOT FIELD ships alongside (see the login page): hidden from
//                                humans, filled by naive form-fillers.
//
// This is not unbreakable and is not meant to be — anyone willing to write a
// word-to-number map gets through. It is a speed bump on a login whose
// credentials are already printed on /join. 🔒 It must never be used to
// protect real accounts; see the note at the top of this file.
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const OPS = [
  { key: 'plus',  word: 'plus',  apply: (a, b) => a + b },
  { key: 'minus', word: 'minus', apply: (a, b) => a - b },
  { key: 'times', word: 'times', apply: (a, b) => a * b },
]

export function createChallenge() {
  const op = OPS[randomInt(0, OPS.length)]
  let a, b
  if (op.key === 'minus') {
    // never negative — a human should not have to think about sign
    a = randomInt(4, 12); b = randomInt(1, a)
  } else if (op.key === 'times') {
    a = randomInt(2, 6); b = randomInt(2, 6)
  } else {
    a = randomInt(2, 10); b = randomInt(2, 10)
  }
  const answer = op.apply(a, b)
  const exp = Date.now() + TTL_MS
  // The signed payload carries the ANSWER, not the operands, so the wire
  // format gives a scraper nothing to compute from.
  const payload = `${answer}.${exp}`
  return {
    question: `${WORDS[a]} ${op.word} ${WORDS[b]}`,
    token: `${payload}.${sign(payload)}`,
  }
}

// Returns { ok: true } or { ok: false, reason }.
// ⚠️ Mirrors verifyTurnstile's shape so the call site reads the same.
//
// `honeypot` is the value of a field hidden from humans by CSS. Any non-empty
// value means an automated form-filler walked the DOM, so it fails before the
// arithmetic is even considered.
export function verifyChallenge(token, answer, honeypot) {
  if (honeypot) return { ok: false, reason: 'honeypot' }
  if (!token || answer === undefined || answer === null || answer === '') {
    return { ok: false, reason: 'missing' }
  }
  const parts = String(token).split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }
  const [ansStr, expStr, sig] = parts

  const expected = sign(`${ansStr}.${expStr}`)
  // Constant-time compare so a wrong signature leaks nothing by timing.
  const gotBuf = Buffer.from(String(sig))
  const expBuf = Buffer.from(expected)
  if (gotBuf.length !== expBuf.length || !timingSafeEqual(gotBuf, expBuf)) {
    return { ok: false, reason: 'bad-signature' }
  }

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false, reason: 'expired' }

  const got = Number(String(answer).trim())
  if (!Number.isFinite(got) || got !== Number(ansStr)) return { ok: false, reason: 'wrong-answer' }

  return { ok: true }
}
