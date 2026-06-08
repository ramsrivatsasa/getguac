// POST /api/email/reconnect
//
// Re-syncs the signed-in user's GetGuac mailbox password when the stored copy
// has drifted out of sync with Migadu. Symptom: the poll cron fails to IMAP-
// login (errors like "Command failed"), so new mail never reaches the in-app
// inbox even though it's sitting in the mailbox (visible at webmail).
//
// Flow: generate a fresh password → set it on Migadu via updatePassword() →
// only then store the new encrypted copy. If the Migadu update throws we leave
// the DB untouched, so the stored copy never gets ahead of the real mailbox.
//
// Returns the new password ONCE so the user can still sign into webmail.
//
// Auth: the user's own session. Rate-limited (5/min) — this rotates a mailbox
// password, so it shouldn't be hammered.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { updatePassword, fullEmail } from '../../../../lib/migadu'
import { encryptSecret, generateMailboxPassword } from '../../../../lib/crypto'
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'email-reconnect'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
      return Response.json({ error: 'Email infrastructure is not configured.' }, { status: 503 })
    }

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('email_alias')
      .eq('id', user.id)
      .single()
    if (pErr) return Response.json({ error: pErr.message }, { status: 500 })

    const alias = profile?.email_alias
    if (!alias) {
      return Response.json(
        { error: 'No GetGuac mailbox yet — claim your email alias first in Connections.' },
        { status: 400 },
      )
    }

    // Migadu first; DB second. Order matters — never let the stored copy lead.
    const password = generateMailboxPassword()
    await updatePassword(alias, password)

    const { error: uErr } = await sb.from('profiles')
      .update({ email_inbox_provisioned: true, email_inbox_password_enc: encryptSecret(password) })
      .eq('id', user.id)
    if (uErr) return Response.json({ error: uErr.message }, { status: 500 })

    return Response.json({
      ok: true,
      email: fullEmail(alias),
      // Shown ONCE — the user needs it only if they sign into webmail directly.
      password,
      message: 'Mailbox reconnected. New mail will sync on the next poll.',
    })
  } catch (err) {
    console.error('[email/reconnect]', err)
    return Response.json({ error: err.message || 'reconnect failed' }, { status: 500 })
  }
}
