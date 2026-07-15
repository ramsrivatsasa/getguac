// POST /api/email/sync — lightweight, on-demand pull for the CURRENT user.
//
// Why this exists: receipt/email pulling normally rides on the GitHub Actions
// cron hitting /api/email/poll every 10 min. If that cron ever stops (a
// CRON_SECRET mismatch, a disabled schedule, GitHub incident), mail silently
// stops arriving. This endpoint decouples an active user from the cron: the
// inbox calls it on open, so anyone using the app pulls their own new mail
// regardless of the cron's health.
//
// It's the incremental sibling of /api/email/backfill:
//   - backfill: from UID 1 across all folders (heavy; historical re-pull).
//   - sync:     from each folder's stored cursor forward (cheap; new mail only).
//
// Auth: the user's own session. Rate-limited to 1 per 90s per user so mounting
// the inbox repeatedly can't hammer IMAP. Upstream cleanup (move-to-Guacked /
// auto-delete) is intentionally left to the cron — sync only mirrors new mail
// locally, which is all "not pulling" is about.

import { createApiClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { decryptSecret } from '../../../../lib/crypto'
import { pollMailbox, isReceiptsAddress } from '../../../../lib/imap-poll'
import { draftReceiptFromEmail } from '../../../../lib/email-to-receipt'

export const runtime = 'nodejs'
export const maxDuration = 60

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST() {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  // Quiet rate limit: over-limit isn't an error, it's "nothing to do right now".
  const rl = await rateLimit(userRateKey(user.id, 'email-sync'), { limit: 1, windowMs: 90_000 })
  if (!rl.ok) return Response.json({ ok: true, skipped: 'cooldown', inserted: 0 })

  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return Response.json({ ok: true, skipped: 'email not configured', inserted: 0 })
  }

  const admin = adminClient()
  const { data: prof } = await admin
    .from('profiles')
    .select('email_alias, email_inbox_password_enc, email_inbox_provisioned, email_processing_enabled')
    .eq('id', user.id)
    .maybeSingle()

  if (!prof?.email_inbox_provisioned || !prof.email_inbox_password_enc || !prof.email_alias) {
    return Response.json({ ok: true, skipped: 'no mailbox', inserted: 0 })
  }
  if (prof.email_processing_enabled === false) {
    return Response.json({ ok: true, skipped: 'processing disabled', inserted: 0 })
  }

  let password
  try { password = decryptSecret(prof.email_inbox_password_enc) }
  catch (e) { return Response.json({ error: 'Mailbox credentials unavailable.' }, { status: 500 }) }

  // Per-folder cursor = highest UID we've already stored, so we only fetch new
  // messages (UIDs are unique within a folder). Same shape the cron uses.
  const { data: cursorRows } = await admin
    .from('email_messages')
    .select('imap_folder, uid')
    .eq('user_id', user.id)
    .order('uid', { ascending: false })
  const lastUidByFolder = {}
  for (const r of cursorRows || []) {
    const f = r.imap_folder || 'INBOX'
    if (lastUidByFolder[f] == null || r.uid > lastUidByFolder[f]) lastUidByFolder[f] = r.uid
  }

  let result
  try {
    result = await pollMailbox({ localPart: prof.email_alias, password, lastUidByFolder })
  } catch (e) {
    // IMAP login/connection failure — most often a mailbox-password desync.
    // Surface it so the UI can nudge the user to Reconnect.
    return Response.json({ error: 'imap', detail: e.message, hint: 'reconnect' }, { status: 502 })
  }

  const summary = { ok: true, fetched: 0, inserted: 0, drafted: 0, errors: [] }
  for (const m of result.messages) {
    const isHook = isReceiptsAddress(m, prof.email_alias)
    const TEXT_CAP = 256 * 1024, HTML_CAP = 512 * 1024
    const bodyText = m.bodyText.length > TEXT_CAP ? m.bodyText.slice(0, TEXT_CAP) + '\n\n[truncated]' : m.bodyText
    const bodyHtml = m.bodyHtml.length > HTML_CAP ? m.bodyHtml.slice(0, HTML_CAP) : m.bodyHtml

    const { data: insertedMsg, error: insertErr } = await admin.from('email_messages').insert({
      user_id: user.id,
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
    }).select('id').single()

    summary.fetched++
    if (insertErr) {
      if (!/duplicate key/i.test(insertErr.message)) summary.errors.push({ uid: m.uid, error: insertErr.message })
      continue
    }
    summary.inserted++

    if (isHook) {
      try {
        const { receipt_id, processed } = await draftReceiptFromEmail(admin, user.id, m)
        if (receipt_id) {
          await admin.from('email_messages').update({ receipt_id, processed: true }).eq('id', insertedMsg.id)
          if (processed) summary.drafted++
        }
      } catch (e) {
        summary.errors.push({ uid: m.uid, error: `draft: ${e.message}` })
      }
    }
  }

  await admin.from('profiles').update({ email_last_poll_at: new Date().toISOString() }).eq('id', user.id)
  return Response.json(summary)
}
