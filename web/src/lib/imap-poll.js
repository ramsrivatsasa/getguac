// IMAP poller — fetches new messages from a user's Migadu mailbox, stores
// them in `email_messages`, and queues +receipts messages for receipt parsing.
//
// Designed to be called from a cron endpoint. One run handles one user.
// At ~10k users / 10-min interval this is ~17 user-runs per second across the
// cron worker. Each run takes ~1-3s wall time, so it fits comfortably on a
// single worker. When you outgrow this, parallelise across multiple cron jobs
// keyed by user_id hash range.

import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { ENDPOINTS, fullEmail } from './migadu'

// How many UIDs to walk back on the first poll for a freshly-provisioned mailbox.
// Stops a user's old marketing emails from flooding the receipts pipeline.
const FIRST_RUN_LOOKBACK_UIDS = 50

// Pull only messages that haven't been seen yet (UID > lastUid).
// On first run with no lastUid we still cap how far back we look.
export async function pollMailbox({ localPart, password, lastUid = null }) {
  const client = new ImapFlow({
    host: ENDPOINTS.imap.host,
    port: ENDPOINTS.imap.port,
    secure: ENDPOINTS.imap.secure,
    auth: { user: fullEmail(localPart), pass: password },
    logger: false,
  })

  const results = { fetched: 0, messages: [], highestUid: lastUid || 0 }

  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const mb = client.mailbox
      const exists = mb?.exists || 0
      if (!exists) return results

      // Build the UID range to fetch
      let range
      if (lastUid && lastUid > 0) {
        range = `${lastUid + 1}:*`
      } else {
        // First run: only the last N messages — avoids reprocessing years of old mail.
        const startUid = Math.max(1, (mb.uidNext || exists + 1) - FIRST_RUN_LOOKBACK_UIDS)
        range = `${startUid}:*`
      }

      for await (const msg of client.fetch(range, {
        envelope: true,
        internalDate: true,
        uid: true,
        source: true,
        bodyStructure: false,
        headers: ['delivered-to', 'to', 'from', 'subject', 'message-id'],
      }, { uid: true })) {
        if (!msg.uid || (lastUid && msg.uid <= lastUid)) continue

        const parsed = await simpleParser(msg.source).catch(() => null)
        if (!parsed) continue

        const deliveredTo = (msg.headers?.get('delivered-to') || '').toLowerCase()
        const toHeader   = parsed.to?.text || ''
        const fromHeader = parsed.from?.text || ''
        const subject    = parsed.subject || ''
        const messageId  = parsed.messageId || msg.envelope?.messageId || `uid:${msg.uid}`
        const receivedAt = parsed.date || msg.internalDate || new Date()
        const preview    = (parsed.text || '').trim().slice(0, 200)

        results.messages.push({
          uid: Number(msg.uid),
          messageId,
          fromAddr: fromHeader,
          toAddr: toHeader,
          deliveredTo,
          subject,
          receivedAt,
          preview,
          // For the +receipts auto-process path: full parsed body (text/html)
          // for the receipt parser to chew on. Not persisted — we only store
          // the metadata + preview, the parser converts the body into a receipt.
          rawText: parsed.text || '',
          rawHtml: parsed.html || '',
          attachments: (parsed.attachments || []).map(a => ({
            filename: a.filename, contentType: a.contentType, size: a.size, content: a.content,
          })),
        })
        if (msg.uid > results.highestUid) results.highestUid = msg.uid
        results.fetched++
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return results
}

// Detect whether a message was sent to the +receipts plus address — used to
// trigger auto-processing. We check Delivered-To first (most reliable on Migadu)
// then fall back to scanning the To header.
export function isReceiptsAddress(message, localPart) {
  const target = `${localPart}+receipts@`
  const dt = (message.deliveredTo || '').toLowerCase()
  const to = (message.toAddr || '').toLowerCase()
  return dt.includes(target) || to.includes(target)
}
