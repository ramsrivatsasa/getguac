// POST /api/email/backfill
//
// Forces a full re-download of the calling user's mailbox starting from UID 1,
// ignoring the lastUid cursor. Useful when:
//   - The user wants to backfill historical mail received before the inbox
//     was provisioned in GetGuac.
//   - Debugging — re-pull everything to verify the pipeline.
//
// Auth: standard mobile/web auth (cookie or Bearer). User can only backfill
// their own mailbox.
//
// Rate-limited: 1 per 5 minutes per user (it's expensive — IMAP roundtrip +
// up to 200 message body parses).

import { createApiClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { decryptSecret } from '../../../../lib/crypto'
import { pollMailbox, isReceiptsAddress } from '../../../../lib/imap-poll'

export const runtime = 'nodejs'
export const maxDuration = 60

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = rateLimit(userRateKey(user.id, 'email-backfill'), { limit: 1, windowMs: 300_000 })
  if (!rl.ok) return Response.json({ error: `Backfill rate-limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  if (!process.env.MIGADU_API_KEY || !process.env.EMAIL_ENCRYPTION_KEY) {
    return Response.json({ error: 'Email infrastructure not configured.' }, { status: 503 })
  }

  // Look up the user's mailbox creds via the service role (we need the
  // encrypted password column which RLS hides from the user themselves).
  const admin = adminClient()
  const { data: prof, error: profErr } = await admin
    .from('profiles')
    .select('email_alias, email_inbox_password_enc, email_inbox_provisioned, email_processing_enabled')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !prof?.email_inbox_provisioned || !prof.email_inbox_password_enc || !prof.email_alias) {
    return Response.json({ error: 'Your inbox is not provisioned yet.' }, { status: 400 })
  }

  let password
  try { password = decryptSecret(prof.email_inbox_password_enc) }
  catch (e) { return Response.json({ error: 'Mailbox credentials unavailable.' }, { status: 500 }) }

  // Force-poll from UID 1 across every folder — ignores all cursors entirely.
  // Empty lastUidByFolder = each folder starts at UID 1.
  const result = await pollMailbox({ localPart: prof.email_alias, password, lastUidByFolder: {} })

  const summary = { fetched: 0, inserted: 0, drafted: 0, errors: [], messages_per_folder: {} }
  for (const m of result.messages) {
    const f = m.imapFolder || 'INBOX'
    summary.messages_per_folder[f] = (summary.messages_per_folder[f] || 0) + 1
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
      // Already-stored row (duplicate UID) is fine — we skip silently
      if (!/duplicate key/i.test(insertErr.message)) {
        summary.errors.push({ uid: m.uid, error: insertErr.message })
      }
      continue
    }
    summary.inserted++

    // Auto-draft a receipt for +g mail
    if (isHook) {
      const draftStore = (m.fromAddr.match(/<([^>]+)>/)?.[1] || m.fromAddr || '').split('@')[1]?.split('.')[0] || 'Receipt by email'
      const { data: rcpt } = await admin.from('receipts').insert({
        user_id: user.id,
        store_name: draftStore,
        date: (m.receivedAt instanceof Date ? m.receivedAt : new Date(m.receivedAt)).toISOString().slice(0, 10),
        total_amount: 0,
        tax_paid: 0,
        receipt_link: '',
        business_purchase: false,
        processed: false,
        validation_comment: `From email: ${m.subject}\n\n${m.preview}`,
      }).select('id').single()
      if (rcpt?.id) {
        await admin.from('email_messages').update({ receipt_id: rcpt.id, processed: true }).eq('id', insertedMsg.id)
        summary.drafted++
      }
    }
  }

  await admin.from('profiles').update({ email_last_poll_at: new Date().toISOString() }).eq('id', user.id)

  return Response.json({
    ok: true,
    ...summary,
    // Diagnostic — surfaces which IMAP folders the poller actually walked, so
    // it's obvious from the response whether new folders (g, receipts) are
    // being discovered, and what the per-folder progress looks like.
    folders_polled: Object.keys(result.highestUidByFolder || {}),
    highest_uid_by_folder: result.highestUidByFolder || {},
    note: result.fetched >= 200
      ? 'Batch of 200 fetched — call backfill again to continue (5 min cooldown between calls).'
      : 'Backfill complete.',
  })
}
