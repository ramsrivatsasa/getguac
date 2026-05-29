// Cloudflare Turnstile server-side token verification.
//
// Free CAPTCHA service — invisible most of the time, falls back to a
// micro-challenge for suspicious traffic. The client renders a widget
// keyed on NEXT_PUBLIC_TURNSTILE_SITE_KEY, the user's browser produces
// a token on form submit, and the server verifies that token against
// Cloudflare's siteverify endpoint before honoring the signup.
//
// Graceful degrade: if TURNSTILE_SECRET_KEY isn't configured (local
// dev, before keys are set in Vercel), verifyTurnstile() returns
// `{ ok: true, skipped: true }` so the signup path still works.
// Once the secret is set in env, the same code starts enforcing.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return { ok: true, skipped: true, reason: 'no_secret_configured' }
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'missing_token' }
  }
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      // 6-second cap so a stuck Cloudflare response can't pin the signup
      // request. If verify is unreachable we fail closed (treat as bot).
      signal: AbortSignal.timeout(6000),
    })
    const data = await res.json().catch(() => ({}))
    if (!data.success) {
      return { ok: false, reason: 'cf_rejected', codes: data['error-codes'] || [] }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: 'cf_unreachable', error: e.message }
  }
}
