import { verifyChallenge, MIN_FORM_SECONDS } from './demo-challenge.js'
import { verifyTurnstile } from './turnstile.js'

// Existing native releases use Turnstile; the website uses a signed arithmetic
// challenge. Neither branch trusts a client assertion or skips verification.
export async function verifySignupChallenge(body) {
  if (body.website && String(body.website).trim()) return { ok: false, reason: 'honeypot' }
  if (body.demo_token != null || body.demo_answer != null) {
    return verifyChallenge(body.demo_token, body.demo_answer, body.website, { minSeconds: MIN_FORM_SECONDS })
  }
  if (typeof body.turnstile_token === 'string' && body.turnstile_token.trim()) {
    return verifyTurnstile(body.turnstile_token, undefined, {
      required: true,
      hostnames: ['getguac.app', 'www.getguac.app'],
    })
  }
  return { ok: false, reason: 'missing_token' }
}
