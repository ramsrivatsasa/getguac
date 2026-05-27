// Completes the signup once email is confirmed.
//
// Called by /auth/confirm after Supabase's confirmation hash has set a real
// session cookie. Reads `pending_username` from the signed-in user's
// user_metadata, atomically claims it on profiles, then best-effort provisions
// the Migadu mailbox.
//
// POST /api/auth/finish-signup  (auth-required)

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createMailbox, mailboxExists } from '../../../../lib/migadu'
import { encryptSecret, generateMailboxPassword } from '../../../../lib/crypto'
export const runtime = 'nodejs'

const VALID_USERNAME_RE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$/

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function provisionMailbox(sbAdmin, userId, username, displayName) {
  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return { provisioned: false, reason: 'not_configured' }
  }
  try {
    if (await mailboxExists(username)) {
      return { provisioned: true, reason: 'already_existed' }
    }
    const password = generateMailboxPassword()
    await createMailbox({ localPart: username, password, name: displayName || username })
    await sbAdmin.from('profiles')
      .update({
        email_inbox_provisioned: true,
        email_inbox_password_enc: encryptSecret(password),
      })
      .eq('id', userId)
    return { provisioned: true }
  } catch (e) {
    console.error('[auth/finish-signup] mailbox provisioning failed:', e.message)
    return { provisioned: false, error: e.message }
  }
}

export async function POST() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    // Defence-in-depth: refuse to finish signup if the email isn't actually
    // confirmed. Supabase normally won't issue a session until confirmation,
    // but if "Confirm email" is OFF in the dashboard, signUp() returns a
    // session immediately — and we still want this endpoint to be a no-op
    // for unconfirmed users so a partial config doesn't bypass the guard.
    if (!user.email_confirmed_at && !user.confirmed_at) {
      return Response.json({ error: 'Email not yet confirmed' }, { status: 403 })
    }

    const meta = user.user_metadata || {}
    const pending = String(meta.pending_username || '').toLowerCase()
    const first_name = meta.first_name || null
    const last_name  = meta.last_name  || null

    if (!pending || !VALID_USERNAME_RE.test(pending)) {
      // Nothing to claim — user already finished signup, or didn't go through
      // our flow. Treat as success so the confirm page can still redirect.
      return Response.json({ ok: true, claimed: false, reason: 'no_pending_username' })
    }

    const sbAdmin = admin()

    // Re-check availability — the username may have been claimed by someone
    // else during the time the user took to confirm their email.
    const [{ data: reserved }, { data: taken }] = await Promise.all([
      sbAdmin.from('reserved_email_aliases').select('alias').eq('alias', pending).maybeSingle(),
      sbAdmin.from('profiles').select('id').eq('email_alias', pending).maybeSingle(),
    ])
    if (reserved || (taken && taken.id !== user.id)) {
      return Response.json({
        ok: true,
        claimed: false,
        reason: reserved ? 'reserved_meanwhile' : 'taken_meanwhile',
        message: `The handle @${pending} was reserved while you were confirming. Pick another in Profile.`,
      })
    }

    // Claim atomically via admin client (bypasses RLS for the profile upsert)
    const { error: upErr } = await sbAdmin
      .from('profiles')
      .upsert({ id: user.id, email_alias: pending, alias_set_at: new Date().toISOString(), first_name, last_name }, { onConflict: 'id' })
    if (upErr) {
      console.error('[auth/finish-signup] username claim failed:', upErr.message)
      return Response.json({ ok: true, claimed: false, error: upErr.message })
    }

    // Best-effort: clear pending_username from user_metadata so re-calls
    // are idempotent and an attacker can't replay this endpoint to grab
    // a different handle later.
    try {
      await sbAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...meta, pending_username: null },
      })
    } catch (_) {}

    const displayName = [first_name, last_name].filter(Boolean).join(' ') || pending
    const mailbox = await provisionMailbox(sbAdmin, user.id, pending, displayName)

    return Response.json({ ok: true, claimed: true, username: pending, mailbox })
  } catch (err) {
    console.error('[auth/finish-signup]', err)
    return Response.json({ error: 'Finish-signup failed' }, { status: 500 })
  }
}
