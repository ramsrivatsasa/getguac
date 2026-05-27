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
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return Response.json({ skipped: 'email not configured' })
  }

  const sb = adminClient()
  const { data: users, error } = await sb
    .from('profiles')
    .select('id, email_alias, email_inbox_password_enc, email_last_poll_at, email_processing_enabled, email_auto_delete_after_import')
    .eq('email_inbox_provisioned', true)
    .eq('email_processing_enabled', true)
    .not('email_alias', 'is', null)
    .not('email_inbox_password_enc', 'is', null)
    .limit(500)

  if (error) {
    console.error('[email/poll] profiles fetch failed:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const summary = { users: 0, messages: 0, moved_to_guacked: 0, deleted_upstream: 0, errors: [] }

  for (const u of users || []) {
    summary.users++
    try {
      const password = decryptSecret(u.email_inbox_password_enc)

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

      const result = await pollMailbox({ localPart: u.email_alias, password, lastUidByFolder })

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

      await sb.from('profiles')
        .update({ email_last_poll_at: new Date().toISOString() })
        .eq('id', u.id)
    } catch (e) {
      summary.errors.push({ user: u.id, error: e.message })
    }
  }

  return Response.json(summary)
}
