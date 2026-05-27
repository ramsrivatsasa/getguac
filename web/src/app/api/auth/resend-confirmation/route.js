// Resends the signup confirmation email for an unverified user.
//
// POST /api/auth/resend-confirmation
//   body: { email }
//
// Rate-limited to 1 request per email per minute to avoid using GetGuac as
// an email-spam tool. Always returns 200 with `{ ok: true }` regardless of
// whether the email exists in the system — leaking "this email is/isn't
// registered" via this endpoint would be an enumeration vector.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const email = String(body.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'A valid email is required' }, { status: 400 })
    }

    // Rate limit per email — 1 request per 60s. Stops abuse / accidental
    // double-tap on the "Resend" button + repeated tries to enumerate users.
    const rl = await rateLimit(`resend-confirm:${email}`, { limit: 1, windowMs: 60_000 })
    if (!rl.ok) {
      return Response.json({
        ok: true,
        rate_limited: true,
        message: `Wait ${rl.retryAfter}s before requesting another email — the previous one should be on its way.`,
      })
    }
    // Also rate-limit per IP so a single abuser can't iterate through addresses.
    const rlIp = await rateLimit(rateKey(request, 'resend-confirm'), { limit: 10, windowMs: 60_000 })
    if (!rlIp.ok) {
      return Response.json({ error: 'Too many requests, slow down.' }, { status: 429 })
    }

    const sb = createClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://getguac.app'

    // Supabase's resend() API: 'signup' type re-sends the same confirmation
    // email a fresh signUp would have triggered. Returns success even for
    // already-confirmed users (Supabase decides whether to actually send),
    // which preserves our non-enumeration property.
    const { error } = await sb.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${baseUrl}/auth/confirm` },
    })
    if (error) {
      // Don't leak whether the email exists — surface a generic ok response.
      console.warn('[resend-confirmation]', error.message)
    }

    return Response.json({
      ok: true,
      message: `If an account exists for ${email}, we just re-sent the confirmation email. Check spam if you don't see it within a minute.`,
    })
  } catch (err) {
    console.error('[resend-confirmation]', err)
    return Response.json({ error: 'Resend failed' }, { status: 500 })
  }
}
