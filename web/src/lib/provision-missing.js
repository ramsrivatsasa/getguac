// Self-heal: create Migadu mailboxes for confirmed users whose signup-time
// provisioning silently failed — they have a claimed @getguac.app handle (or a
// pending one) but no mailbox. Root cause of "new users' email not created in
// Migadu": provisionMailbox in finish-signup swallows failures, so a transient
// miss leaves the user permanently mailbox-less. Running this inside the poll
// cron makes every miss auto-recover on the next tick.
//
// Idempotent + best-effort: never throws to the caller; records outcomes on the
// shared `summary` object and reports hard failures so they stop being silent.

import { createMailbox, mailboxExists, updatePassword } from './migadu'
import { encryptSecret, generateMailboxPassword } from './crypto'

const VALID_USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/

export async function provisionMissingMailboxes(sbAdmin, summary, reportServerError) {
  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) return
  summary.provisioned = summary.provisioned || 0

  // Only the small set of profiles that cannot currently be polled — cheap even
  // on the 10-min cron. Two distinct broken states, and BOTH must be caught:
  //
  //   a) not provisioned at all — signup-time provisioning died. `email_alias`
  //      may be null if it died before the handle was claimed (recovered from
  //      auth metadata below).
  //
  //   b) provisioned = true but NO stored password. This is an orphan and it
  //      was previously unreachable by every code path: the poll query requires
  //      `email_inbox_password_enc IS NOT NULL` so it never polls, and this
  //      healer only looked at provisioned != true so it never healed. The
  //      mailbox is silently dead forever. kingsindianchess@ is in exactly this
  //      state in production right now. Root cause is the mailboxExists branch
  //      below, which used to mark provisioned WITHOUT ever storing a password.
  const { data: pending } = await sbAdmin
    .from('profiles')
    .select('id, email_alias, email_inbox_provisioned, email_inbox_password_enc, first_name, last_name')
    .or('email_inbox_provisioned.is.null,email_inbox_provisioned.eq.false,email_inbox_password_enc.is.null')
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

      // Mailbox already exists upstream (a prior partial run, or a handle that
      // was created before this healer existed).
      //
      // Marking it provisioned is NOT enough: without a stored password the
      // poll query filters the row out and the mailbox never pulls a single
      // message — the orphan bug described above. We cannot recover the
      // original password (it was never stored, and Migadu only stores a hash),
      // so rotate to a fresh one and store that. Rotating is safe: nobody can
      // be using a password we do not have.
      if (await mailboxExists(alias)) {
        if (p.email_inbox_password_enc) {
          await sbAdmin.from('profiles').update({ email_inbox_provisioned: true }).eq('id', p.id)
          continue
        }
        const recovered = generateMailboxPassword()
        await updatePassword(alias, recovered)
        await sbAdmin.from('profiles')
          .update({ email_inbox_provisioned: true, email_inbox_password_enc: encryptSecret(recovered) })
          .eq('id', p.id)
        summary.provisioned++
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
