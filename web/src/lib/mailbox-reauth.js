// Self-heal for a user's Migadu mailbox when the stored IMAP password has
// drifted out of sync with the real mailbox. Symptom: IMAP login throws a
// generic "Command failed" and new mail never reaches the in-app inbox even
// though it's sitting in the mailbox (visible at webmail).
//
// The interactive /api/email/reconnect endpoint already does this on a user's
// click. This module is the shared, reusable core so the background poll cron
// and the on-open sync path can recover a desynced mailbox WITHOUT anyone
// clicking anything — the whole point of a "permanent" fix.

import { updatePassword } from './migadu'
import { encryptSecret, generateMailboxPassword } from './crypto'

// imapflow surfaces a login/credential failure a few different ways depending
// on where in the handshake it dies — sometimes as a clean `authenticationFailed`
// flag, sometimes just as the opaque message "Command failed" (the exact string
// the reconnect route was built to fix). Treat any of them as "can't log in".
export function isImapAuthFailure(err) {
  if (!err) return false
  if (err.authenticationFailed) return true
  const s = `${err.serverResponseCode || ''} ${err.responseText || ''} ${err.message || ''}`.toLowerCase()
  return /authenticationfailed|authentication failed|invalid credentials|login failed|\bauth\b|command failed/.test(s)
}

// Turn an imapflow error into something actionable in logs instead of the bare
// "Command failed". Pulls the fields imapflow actually sets on auth failures.
export function describeImapError(err) {
  if (!err) return 'unknown error'
  const parts = []
  if (err.authenticationFailed) parts.push('auth-failed')
  if (err.serverResponseCode) parts.push(String(err.serverResponseCode))
  parts.push(err.responseText || err.message || String(err))
  return parts.join(': ')
}

// Rotate the mailbox password on Migadu, THEN store the new encrypted copy.
// Migadu first, DB second — never let the stored copy lead the real mailbox
// (a store-first crash would lock the user out until a manual reconnect).
// `client` can be a service-role OR a user-session Supabase client; both can
// update the user's own profile row. Returns { password } (shown once) or throws.
export async function reprovisionMailbox(client, { userId, alias }) {
  if (!alias) throw new Error('no mailbox alias to reconnect')
  const password = generateMailboxPassword()
  await updatePassword(alias, password)
  const { error } = await client
    .from('profiles')
    .update({ email_inbox_provisioned: true, email_inbox_password_enc: encryptSecret(password) })
    .eq('id', userId)
  if (error) throw new Error(`store new mailbox password: ${error.message}`)
  return { password }
}

// Best-effort throttle so a mailbox that stays unreachable even after a reset
// (e.g. IMAP access disabled, or the mailbox was deleted upstream) can't trigger
// a password rotation on every 10-min cron tick. Reuses audit_log — no new table.
// user_id lives inside the jsonb `detail` so we don't depend on a dedicated
// column existing. Volume is tiny, so scanning the recent window is cheap.
export async function autoReauthedRecently(sbAdmin, userId, withinMinutes = 360) {
  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString()
  const { data } = await sbAdmin
    .from('audit_log')
    .select('detail')
    .eq('action', 'email_auto_reauth')
    .gte('created_at', since)
    .limit(100)
  return (data || []).some(r => r?.detail?.user_id === userId)
}

// Record that we auto-rotated a mailbox password, for the throttle above and
// for an audit trail. Never throws — a logging failure must not abort a poll.
export async function recordAutoReauth(sbAdmin, { userId, alias, via, ok = true, error = null }) {
  await sbAdmin
    .from('audit_log')
    .insert({
      action: 'email_auto_reauth',
      status: ok ? 'ok' : 'failed',
      detail: { user_id: userId, alias, via, error },
    })
    .then(() => {}, () => {})
}
