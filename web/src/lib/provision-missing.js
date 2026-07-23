// Self-heal: create Migadu mailboxes for confirmed users whose signup-time
// provisioning silently failed — they have a claimed @getguac.app handle (or a
// pending one) but no mailbox. Root cause of "new users' email not created in
// Migadu": provisionMailbox in finish-signup swallows failures, so a transient
// miss leaves the user permanently mailbox-less. Running this inside the poll
// cron makes every miss auto-recover on the next tick.
//
// Idempotent + best-effort: never throws to the caller; records outcomes on the
// shared `summary` object and reports hard failures so they stop being silent.

import { createMailbox, mailboxExists } from './migadu'
import { encryptSecret, generateMailboxPassword } from './crypto'

const VALID_USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/

export async function provisionMissingMailboxes(sbAdmin, summary, reportServerError) {
  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) return
  summary.provisioned = summary.provisioned || 0

  // Only the small set of not-yet-provisioned profiles — cheap even on the
  // 10-min cron. `email_alias` may be null if provisioning died before the
  // handle was even claimed (we recover that from auth metadata below).
  const { data: pending } = await sbAdmin
    .from('profiles')
    .select('id, email_alias, email_inbox_provisioned, first_name, last_name')
    .or('email_inbox_provisioned.is.null,email_inbox_provisioned.eq.false')
    .limit(200)
  if (!pending?.length) return

  for (const p of pending) {
    try {
      let alias = p.email_alias
      let first = p.first_name
      let last = p.last_name

      // No handle yet → recover the pending one from auth metadata + claim it,
      // but only for a genuinely confirmed user (mirrors finish-signup's gate).
      if (!alias) {
        const { data: au } = await sbAdmin.auth.admin.getUserById(p.id)
        const u = au?.user
        if (!u || !(u.email_confirmed_at || u.confirmed_at)) continue
        const cand = String(u.user_metadata?.pending_username || '').toLowerCase()
        if (!cand || !VALID_USERNAME_RE.test(cand)) continue
        const [{ data: reserved }, { data: taken }] = await Promise.all([
          sbAdmin.from('reserved_email_aliases').select('alias').eq('alias', cand).maybeSingle(),
          sbAdmin.from('profiles').select('id').eq('email_alias', cand).maybeSingle(),
        ])
        if (reserved || (taken && taken.id !== p.id)) continue
        alias = cand
        first = first || u.user_metadata?.first_name || null
        last = last || u.user_metadata?.last_name || null
        await sbAdmin.from('profiles')
          .update({ email_alias: alias, alias_set_at: new Date().toISOString(), first_name: first, last_name: last })
          .eq('id', p.id)
      }

      // Mailbox already exists upstream (a prior partial run) → just mark it.
      if (await mailboxExists(alias)) {
        await sbAdmin.from('profiles').update({ email_inbox_provisioned: true }).eq('id', p.id)
        continue
      }

      const password = generateMailboxPassword()
      const displayName = [first, last].filter(Boolean).join(' ') || alias
      await createMailbox({ localPart: alias, password, name: displayName })
      await sbAdmin.from('profiles')
        .update({ email_inbox_provisioned: true, email_inbox_password_enc: encryptSecret(password) })
        .eq('id', p.id)
      summary.provisioned++
    } catch (e) {
      summary.errors.push({ user: p.id, error: `provision: ${e.message}` })
      if (reportServerError) {
        await reportServerError(
          { tag: 'email_provision', action: 'email_failure', level: 'error', userId: p.id, platform: 'server', message: `provision: ${e.message}` },
          sbAdmin,
        ).catch(() => {})
      }
    }
  }
}
