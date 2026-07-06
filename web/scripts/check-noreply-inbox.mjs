// Read the noreply@getguac.app inbox (INBOX + Junk) and print sender/subject
// of the newest messages — used to verify Supabase auth-email delivery path.
// Password comes from NOREPLY_PASS env var.
import { ImapFlow } from 'imapflow'

const pass = process.env.NOREPLY_PASS
if (!pass) { console.log('set NOREPLY_PASS'); process.exit(2) }

const client = new ImapFlow({
  host: 'imap.migadu.com', port: 993, secure: true,
  auth: { user: 'noreply@getguac.app', pass },
  logger: false,
})
await client.connect()
for (const box of ['INBOX', 'Junk']) {
  try {
    const lock = await client.getMailboxLock(box)
    try {
      const total = client.mailbox.exists
      console.log(`--- ${box}: ${total} message(s)`)
      if (total > 0) {
        const start = Math.max(1, total - 2)
        for await (const msg of client.fetch(`${start}:*`, { envelope: true, headers: ['received', 'x-mailer', 'return-path'] })) {
          const e = msg.envelope
          console.log(`#${msg.seq} | ${e.date?.toISOString?.() || e.date} | From: ${e.from?.[0]?.address} | Subject: ${e.subject}`)
          const rec = msg.headers?.toString().split('\r\n').filter(l => /^(Received|Return-Path):/i.test(l)).slice(0, 3)
          rec?.forEach(l => console.log('    ' + l.slice(0, 160)))
        }
      }
    } finally { lock.release() }
  } catch (e) { console.log(`--- ${box}: ${e.message}`) }
}
await client.logout()
