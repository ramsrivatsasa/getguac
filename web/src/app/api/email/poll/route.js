// POST /api/email/poll  — cron-friendly endpoint. Walks every provisioned
// mailbox, pulls new messages, persists them in email_messages, and turns
// every +receipts message into a draft receipt the user can open in /receipts.
//
// Auth: header `x-cron-secret: <CRON_SECRET>`. Required so random hits don't
// rate-pound IMAP. The GitHub Actions workflow sends this header.
//
// Returns: { users, messages, errors }
//
// Designed to finish under Vercel's 60s timeout even at small fleet size.
// For larger fleets (>~200 active users), shard by user_id mod and run
// multiple cron jobs in parallel.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { pollMailbox, isReceiptsAddress, deleteImapMessage, moveImapMessage } from '../../../../lib/imap-poll'
import { decryptSecret } from '../../../../lib/crypto'
import { draftReceiptFromEmail } from '../../../../lib/email-to-receipt'
import { reportServerError } from '../../../../lib/report-error'
import { isImapAuthFailure, reprovisionMailbox, autoReauthedRecently, recordAutoReauth, describeImapError, retryAfterReauth, recordPollSuccess, recordPollFailure, QUARANTINE_AFTER_FAILURES } from '../../../../lib/mailbox-reauth'
import { provisionMissingMailboxes } from '../../../../lib/provision-missing'

export const runtime = 'nodejs'
export const maxDuration = 60

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Already in the Guacked archive — handles both raw 'Guacked' and namespaced
// shapes like 'INBOX.Guacked' or 'INBOX/Guacked' that some servers create.
function leafLooksLikeGuacked(path) {
  if (!path) return false
  const leaf = path.split(/[./]/).filter(Boolean).pop() || path
  return leaf.toLowerCase() === 'guacked'
}

export async function POST(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    // Diagnostic (no secret values leaked): tells you *which* side is wrong —
    // a missing header = GitHub Actions secret unset; UNSET server env =
    // Vercel CRON_SECRET missing/stale (often a failed/partial deploy).
    const hasHeader = !!request.headers.get('x-cron-secret')
    console.warn(`[email-poll] cron secret mismatch — incoming header ${hasHeader ? 'present but != server' : 'MISSING'}; server CRON_SECRET ${process.env.CRON_SECRET ? 'set' : 'UNSET'}`)
    return Response.json({ error: 'unauthorized: cron secret mismatch (GitHub vs Vercel CRON_SECRET)' }, { status: 401 })
  }
  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return Response.json({ skipped: 'email not configured' })
  }

  const sb = adminClient()

  // The per-mailbox health columns arrive in migration 082. Selecting a column
  // that does not exist is a hard PostgREST error, which would take email
  // pulling from "one broken mailbox" to "all nine" for however long the code
  // is deployed ahead of the SQL. So ask for them, and fall back to the legacy
  // column set if they are not there yet — the deploy is then safe in either
  // order. The health writes below already swallow their own errors.
  const BASE_COLS = 'id, email_alias, email_inbox_password_enc, email_last_poll_at, email_processing_enabled, email_auto_delete_after_import'
  const HEALTH_COLS = `${BASE_COLS}, email_consecutive_failures, email_quarantined_at`
  const selectUsers = (cols) => sb
    .from('profiles')
    .select(cols)
    .eq('email_inbox_provisioned', true)
    .eq('email_processing_enabled', true)
    .not('email_alias', 'is', null)
    .not('email_inbox_password_enc', 'is', null)
    .limit(500)

  let { data: users, error } = await selectUsers(HEALTH_COLS)
  if (error && /does not exist/i.test(error.message || '')) {
    console.warn('[email/poll] migration 082 not applied yet — per-mailbox health tracking disabled this run')
    ;({ data: users, error } = await selectUsers(BASE_COLS))
  }

  if (error) {
    console.error('[email/poll] profiles fetch failed:', error.message)
    await reportServerError({ tag: 'email_poll', action: 'email_failure', level: 'error', platform: 'server', message: `profiles fetch: ${error.message}` }, sb)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const summary = { users: 0, messages: 0, moved_to_guacked: 0, deleted_upstream: 0, provisioned: 0, reauthed: 0, recovered: 0, quarantined: [], failing: [], errors: [] }

  for (const u of users || []) {
    summary.users++
    try {
      let password = decryptSecret(u.email_inbox_password_enc)

      // Get the highest UID per IMAP folder we've already stored. UIDs are
      // unique only within a folder, so we keep one cursor per folder.
      const { data: cursorRows } = await sb
        .from('email_messages')
        .select('imap_folder, uid')
        .eq('user_id', u.id)
        .order('uid', { ascending: false })
      const lastUidByFolder = {}
      for (const r of cursorRows || []) {
        const f = r.imap_folder || 'INBOX'
        if (lastUidByFolder[f] == null || r.uid > lastUidByFolder[f]) {
          lastUidByFolder[f] = r.uid
        }
      }

      let result
      try {
        result = await pollMailbox({ localPart: u.email_alias, password, lastUidByFolder })
      } catch (pollErr) {
        // Desynced mailbox password (symptom: IMAP "Command failed") → rotate it
        // on Migadu and retry. Non-auth errors bubble to the outer catch.
        //
        // Three gates before we rotate anything, because rotation is the
        // expensive, destructive option and it was previously unbounded:
        //   1. the error must actually look like an auth failure
        //   2. not already rotated within the 6h throttle window
        //   3. the mailbox must not be QUARANTINED — a mailbox Migadu itself
        //      cannot repair (rdasaradi@: 500 on the password PUT *and* on IMAP
        //      login) burned 26 rotations across 18 days and recovered from
        //      exactly none of them. Past the threshold we keep polling (that
        //      is how it auto-recovers once fixed upstream) but stop rotating.
        if (!isImapAuthFailure(pollErr) || u.email_quarantined_at || await autoReauthedRecently(sb, u.id)) throw pollErr
        const { password: newPw } = await reprovisionMailbox(sb, { userId: u.id, alias: u.email_alias })
        // Everything after the retry (including move/delete cleanup) must use
        // the credential now stored in Migadu, not the stale pre-rotation one.
        password = newPw
        await recordAutoReauth(sb, { userId: u.id, alias: u.email_alias, via: 'poll' })
        summary.reauthed++
        // Migadu does not publish a password change to its IMAP frontend
        // instantly. Retrying ~1s later (the old behaviour) lost that race and
        // wasted the whole 6h throttle window, so back off and try again.
        result = await retryAfterReauth(() =>
          pollMailbox({ localPart: u.email_alias, password: newPw, lastUidByFolder })
        )
      }

      for (const m of result.messages) {
        const isHook = isReceiptsAddress(m, u.email_alias)
        // Cap stored body sizes — 256 KB text, 512 KB html. Beyond that we
        // truncate with a sentinel; UI can offer to fetch full from IMAP later.
        const TEXT_CAP = 256 * 1024, HTML_CAP = 512 * 1024
        const bodyText = m.bodyText.length > TEXT_CAP ? m.bodyText.slice(0, TEXT_CAP) + '\n\n[truncated]' : m.bodyText
        const bodyHtml = m.bodyHtml.length > HTML_CAP ? m.bodyHtml.slice(0, HTML_CAP) : m.bodyHtml

        // Insert email_messages row. `imap_folder` is the source IMAP folder
        // (INBOX, g, receipts, …) and is part of the dedupe key. `folder` is
        // the UI bucket (inbox / sent / trash), which we always default to
        // 'inbox' for fresh polls regardless of IMAP source.
        const { data: insertedMsg, error: insertErr } = await sb
          .from('email_messages')
          .insert({
            user_id: u.id,
            uid: m.uid,
            imap_folder: m.imapFolder || 'INBOX',
            message_id: m.messageId,
            from_addr: m.fromAddr,
            to_addr: m.toAddr,
            delivered_to: m.deliveredTo,
            subject: m.subject,
            received_at: m.receivedAt,
            preview: m.preview,
            body_text: bodyText,
            body_html: bodyHtml,
            has_attachments: m.hasAttachments,
            attachments_summary: m.attachments,
            is_receipts_hook: isHook,
            folder: 'inbox',
          })
          .select('id')
          .single()
        if (insertErr) {
          // Unique violation = already stored (different poller race). Skip silently.
          if (!/duplicate key/i.test(insertErr.message)) {
            summary.errors.push({ user: u.id, uid: m.uid, error: insertErr.message })
          }
          continue
        }
        summary.messages++

        // Auto-process +receipts messages: AI-parse the body and create a
        // fully-populated receipt. Falls back to a stub with a sensible
        // store-name guess (sender display name or subject pattern) if AI
        // parsing fails or no key is configured.
        if (isHook) {
          try {
            const { receipt_id } = await draftReceiptFromEmail(sb, u.id, m)
            if (receipt_id) {
              await sb.from('email_messages')
                .update({ receipt_id, processed: true })
                .eq('id', insertedMsg.id)
            }
          } catch (e) {
            console.warn('[email/poll] draft from email failed:', e.message)
            summary.errors.push({ user: u.id, uid: m.uid, error: `draft: ${e.message}` })
            await reportServerError({ tag: 'email_draft', action: 'email_failure', level: 'warn', userId: u.id, platform: 'server', message: `draft: ${e.message}`, meta: { uid: m.uid, subject: m.subject } }, sb)
          }
        }

        // Upstream cleanup. Two modes per-user:
        //   - Default: MOVE the imported message into the user's "Guacked"
        //     folder so their inbox stays clean but the email is still
        //     retrievable via webmail.
        //   - Opt-in (profiles.email_auto_delete_after_import = true):
        //     DELETE the upstream copy entirely. Single-source-of-truth
        //     mode for users who want maximum privacy.
        // Both are best-effort: the local insert already succeeded and is
        // the user's authoritative copy, so a cleanup failure isn't fatal.
        if (m.uid && m.imapFolder) {
          try {
            if (u.email_auto_delete_after_import) {
              const r = await deleteImapMessage({
                localPart: u.email_alias,
                password,
                folder: m.imapFolder,
                uid: m.uid,
              })
              if (r?.ok) summary.deleted_upstream++
            } else if (!leafLooksLikeGuacked(m.imapFolder)) {
              const r = await moveImapMessage({
                localPart: u.email_alias,
                password,
                folder: m.imapFolder,
                uid: m.uid,
                destFolder: 'Guacked',
              })
              if (r?.ok) summary.moved_to_guacked++
            }
          } catch (e) {
            const tag = u.email_auto_delete_after_import ? 'upstream-delete' : 'upstream-move'
            summary.errors.push({ user: u.id, uid: m.uid, error: `${tag}: ${e.message}` })
          }
        }
      }

      // Messages the IMAP server refused to serve, and folders that failed
      // outright. The poller now steps over both rather than letting either
      // end the run (see the poison-message note in lib/imap-poll.js), so
      // they would otherwise vanish silently — which is exactly how
      // rdasaradi@ sat broken for 17 days. Report them loudly enough to act
      // on, but as a WARNING: the run itself succeeded.
      if (result?.skipped?.length || result?.folderErrors?.length) {
        summary.skipped = (summary.skipped || 0) + (result.skipped?.length || 0)
        for (const s of result.skipped || []) {
          summary.errors.push({ user: u.id, uid: s.uid, folder: s.folder, error: `unreadable: ${s.error}` })
        }
        for (const f of result.folderErrors || []) {
          summary.errors.push({ user: u.id, folder: f.folder, error: `folder failed: ${f.error}` })
        }
        await reportServerError({
          tag: 'email_poll_skipped',
          action: 'email_skip',
          level: 'warn',
          userId: u.id,
          platform: 'server',
          message: `${u.email_alias}@: stepped over ${result.skipped?.length || 0} unreadable message(s), `
            + `${result.folderErrors?.length || 0} folder error(s)`,
          meta: {
            alias: u.email_alias,
            skipped: (result.skipped || []).slice(0, 20),
            folderErrors: result.folderErrors || [],
          },
        }, sb).catch(() => {})
      }

      // Success stamps the heartbeat AND clears any failure/quarantine state,
      // so a mailbox fixed upstream recovers on the next tick with nothing to
      // click and nothing to redeploy.
      if (u.email_quarantined_at || u.email_consecutive_failures > 0) summary.recovered++
      await recordPollSuccess(sb, u.id)
    } catch (e) {
      const msg = describeImapError(e)
      summary.errors.push({ user: u.id, error: msg })

      // Per-mailbox failure accounting (migration 082). Without this a single
      // dead mailbox is invisible to the watchdog, which is precisely how
      // rdasaradi@ stayed broken from 2026-07-15 to 2026-08-01 unnoticed.
      const state = await recordPollFailure(sb, {
        userId: u.id,
        message: msg,
        priorFailures: u.email_consecutive_failures || 0,
        alreadyQuarantined: !!u.email_quarantined_at,
      })
      summary.failing.push({ user: u.id, alias: u.email_alias, failures: state.failures, error: msg })
      if (state.quarantined) summary.quarantined.push(u.email_alias)

      // Alert on the QUARANTINE EDGE only. Every failure still lands in
      // audit_log for /admin/crashes, but the loud "this mailbox is dead"
      // signal fires once rather than every 10 minutes forever — repeat noise
      // is what makes an alarm get ignored.
      await reportServerError({
        tag: state.justQuarantined ? 'email_mailbox_dead' : 'email_poll',
        action: 'email_failure',
        level: state.justQuarantined ? 'error' : 'warn',
        userId: u.id,
        platform: 'server',
        message: state.justQuarantined
          ? `mailbox ${u.email_alias}@ QUARANTINED after ${state.failures} consecutive failed polls: ${msg}`
          : msg,
        meta: { alias: u.email_alias, consecutive_failures: state.failures, quarantine_threshold: QUARANTINE_AFTER_FAILURES },
      }, sb)
    }
  }

  // Self-heal: create mailboxes for confirmed users whose signup provisioning
  // silently failed (they have a handle but no Migadu mailbox). Best-effort —
  // wrapped so a provisioning hiccup never breaks the mail pull above.
  try {
    await provisionMissingMailboxes(sb, summary, reportServerError)
  } catch (e) {
    console.error('[email/poll] provision self-heal pass failed:', e.message)
  }

  return Response.json(summary)
}
