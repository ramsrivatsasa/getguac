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

// Max messages to fetch in a single poll run (summed across all folders).
// Stops a single run from timing out on a backfill of thousands of historical
// messages — the next cron run picks up where this one left off via the
// per-folder lastUid cursor.
const MAX_PER_RUN = 200

// IMAP folders we never poll into email_messages. These are conventional names
// across providers; Migadu uses the capitalised forms in their default folder
// set. Match case-insensitively below since user mail clients may have created
// alternate-case variants.
const SKIP_FOLDERS = new Set(['sent', 'drafts', 'junk', 'spam', 'trash', 'archive'])

// Discover folders worth polling. Migadu's plus-addressing auto-files mail to
// matching subfolders (ram+g@... -> folder `g`), so we have to poll all of
// them, not just INBOX. Returns an array of folder paths (e.g. ['INBOX', 'g',
// 'receipts']).
async function listPollableFolders(client) {
  const list = await client.list()
  const out = []
  for (const f of list || []) {
    const path = f.path
    if (!path) continue
    if (SKIP_FOLDERS.has(path.toLowerCase())) continue
    // imapflow includes a \Noselect flag on folder containers that can't hold
    // messages (Gmail's '[Gmail]' parent, etc.) — skip those defensively.
    if (Array.isArray(f.flags) && f.flags.includes('\\Noselect')) continue
    out.push(path)
  }
  // Ensure INBOX is first — most mail still lands there, and we want it
  // prioritised when MAX_PER_RUN cuts off a giant backfill.
  out.sort((a, b) => (a === 'INBOX' ? -1 : b === 'INBOX' ? 1 : 0))
  return out
}

// Fetch new messages across every pollable folder of a user's mailbox.
//
// `lastUidByFolder` is `{ [folderPath]: highestStoredUid }`. Missing entries
// mean "we've never polled that folder" so we start from UID 1.
//
// Returns:
//   {
//     fetched,                                       // total messages parsed
//     messages: [{ ..., folder: 'INBOX'|'g'|... }],  // each tagged with source folder
//     highestUidByFolder: { 'INBOX': 42, 'g': 5 },   // cursor for next run
//   }
export async function pollMailbox({ localPart, password, lastUidByFolder = {} }) {
  const client = new ImapFlow({
    host: ENDPOINTS.imap.host,
    port: ENDPOINTS.imap.port,
    secure: ENDPOINTS.imap.secure,
    auth: { user: fullEmail(localPart), pass: password },
    logger: false,
  })

  const results = { fetched: 0, messages: [], highestUidByFolder: { ...lastUidByFolder } }

  await client.connect()
  try {
    const folders = await listPollableFolders(client)
    for (const folder of folders) {
      if (results.fetched >= MAX_PER_RUN) break
      const lastUid = lastUidByFolder[folder] || null
      const folderFetched = await pollOneFolder(client, folder, lastUid, results)
      if (folderFetched.highestUid > (results.highestUidByFolder[folder] || 0)) {
        results.highestUidByFolder[folder] = folderFetched.highestUid
      }
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return results
}

// Poll a single IMAP folder. Mutates `results.messages` and `results.fetched`
// to share the per-run cap with the caller.
async function pollOneFolder(client, folder, lastUid, results) {
  const out = { highestUid: lastUid || 0 }
  const lock = await client.getMailboxLock(folder)
  try {
    const mb = client.mailbox
    const exists = mb?.exists || 0
    if (!exists) return out

    // Build the UID range to fetch.
    // - Incremental: anything since the last cursor for THIS folder.
    // - First run for the folder: from UID 1 so historical mail backfills
    //   over a few cron ticks (cap below stops a single run from timing out).
    const range = lastUid && lastUid > 0 ? `${lastUid + 1}:*` : '1:*'

    for await (const msg of client.fetch(range, {
      envelope: true,
      internalDate: true,
      uid: true,
      source: true,
      bodyStructure: false,
    }, { uid: true })) {
      if (!msg.uid || (lastUid && msg.uid <= lastUid)) continue

      const parsed = await simpleParser(msg.source).catch(() => null)
      if (!parsed) continue

      // mailparser exposes a Map at parsed.headers — that's the reliable
      // source for Delivered-To. (imapflow's msg.headers when requested
      // as a list returns a Buffer, not a Map, so .get() throws.)
      const deliveredToRaw = parsed.headers?.get?.('delivered-to')
      const deliveredTo = String(
        Array.isArray(deliveredToRaw) ? deliveredToRaw[0] : (deliveredToRaw || '')
      ).toLowerCase()
      const toHeader   = parsed.to?.text || ''
      const fromHeader = parsed.from?.text || ''
      const subject    = parsed.subject || ''
      const messageId  = parsed.messageId || msg.envelope?.messageId || `uid:${msg.uid}`
      const receivedAt = parsed.date || msg.internalDate || new Date()
      const bodyText   = parsed.text || ''
      const bodyHtml   = parsed.html || ''
      const preview    = bodyText.trim().slice(0, 200)
      const attachments = (parsed.attachments || []).map(a => ({
        filename: a.filename, contentType: a.contentType, size: a.size,
        // We don't ship raw bytes in the poller result — too much memory.
        // Attachment retrieval is on-demand from IMAP via a future endpoint.
      }))

      results.messages.push({
        uid: Number(msg.uid),
        imapFolder: folder,
        messageId,
        fromAddr: fromHeader,
        toAddr: toHeader,
        deliveredTo,
        subject,
        receivedAt,
        preview,
        bodyText,
        bodyHtml,
        attachments,
        hasAttachments: attachments.length > 0,
      })
      if (msg.uid > out.highestUid) out.highestUid = msg.uid
      results.fetched++
      if (results.fetched >= MAX_PER_RUN) break  // next cron tick will continue
    }
  } finally {
    lock.release()
  }
  return out
}

// Detect whether a message was sent to one of our receipt-hook plus addresses.
// We accept the short default '+g' (brand-friendly: g for guac) AND the
// legacy '+receipts' so existing forwarding rules keep working.
//
// Three independent signals — ANY of them counts:
//   1. The IMAP folder the message was filed into. Migadu's plus-addressing
//      auto-files +tag@ mail to a folder named `tag`. This is the strongest
//      signal when forwarded mail rewrites Delivered-To headers.
//   2. The Delivered-To header (Postfix / Migadu / most modern MTAs).
//   3. The raw To header (fallback when neither of the above survives).
const RECEIPT_TAGS = ['+g', '+receipts']
const RECEIPT_FOLDERS = new Set(['g', 'receipts'])

export function isReceiptsAddress(message, localPart) {
  // Folder-based detection works even when the user FORWARDS a receipt from
  // their personal address — Delivered-To gets rewritten but the Migadu
  // filter still files based on the original +tag.
  const folder = (message.imapFolder || '').toLowerCase()
  if (RECEIPT_FOLDERS.has(folder)) return true

  const dt = (message.deliveredTo || '').toLowerCase()
  const to = (message.toAddr || '').toLowerCase()
  for (const tag of RECEIPT_TAGS) {
    const target = `${localPart}${tag}@`
    if (dt.includes(target) || to.includes(target)) return true
  }
  return false
}
