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
import { pollMailbox, isReceiptsAddress } from '../../../../lib/imap-poll'
import { decryptSecret } from '../../../../lib/crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
    .select('id, email_alias, email_inbox_password_enc, email_last_poll_at')
    .eq('email_inbox_provisioned', true)
    .not('email_alias', 'is', null)
    .not('email_inbox_password_enc', 'is', null)
    .limit(500)

  if (error) {
    console.error('[email/poll] profiles fetch failed:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const summary = { users: 0, messages: 0, errors: [] }

  for (const u of users || []) {
    summary.users++
    try {
      const password = decryptSecret(u.email_inbox_password_enc)

      // Get the highest UID we've already stored for this user — the poller
      // only fetches anything beyond it.
      const { data: highRow } = await sb
        .from('email_messages')
        .select('uid')
        .eq('user_id', u.id)
        .order('uid', { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastUid = highRow?.uid || null

      const result = await pollMailbox({ localPart: u.email_alias, password, lastUid })

      for (const m of result.messages) {
        // Insert email_messages row
        const { data: insertedMsg, error: insertErr } = await sb
          .from('email_messages')
          .insert({
            user_id: u.id,
            uid: m.uid,
            message_id: m.messageId,
            from_addr: m.fromAddr,
            to_addr: m.toAddr,
            delivered_to: m.deliveredTo,
            subject: m.subject,
            received_at: m.receivedAt,
            preview: m.preview,
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

        // Auto-process +receipts messages: create a draft receipt the user
        // can open in /receipts. Full AI extraction runs in the background
        // when the user opens it (or via a later batch job).
        if (isReceiptsAddress(m, u.email_alias)) {
          const draftStore = (m.fromAddr.match(/<([^>]+)>/)?.[1] || m.fromAddr || '').split('@')[1]?.split('.')[0] || 'Receipt by email'
          const { data: rcpt } = await sb.from('receipts').insert({
            user_id: u.id,
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
            await sb.from('email_messages')
              .update({ receipt_id: rcpt.id, processed: true })
              .eq('id', insertedMsg.id)
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
