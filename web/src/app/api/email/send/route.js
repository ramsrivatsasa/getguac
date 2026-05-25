// POST /api/email/send  body: { to, subject, body, in_reply_to_id? }
//
// Sends mail through the user's own GetGuac Mail mailbox via authenticated SMTP.
// Decrypts the stored mailbox password, opens a TLS connection, sends, logs the
// send to email_messages (folder='sent') so the user sees it in their Sent view.

import nodemailer from 'nodemailer'
import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { decryptSecret } from '../../../../lib/crypto'
import { ENDPOINTS, fullEmail } from '../../../../lib/migadu'

export const runtime = 'nodejs'
export const maxDuration = 30

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
  const rl = rateLimit(rateKey(request, 'email-send'), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ error: 'Too many sends. Try again shortly.' }, { status: 429 })

  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'invalid body' }, { status: 400 })

  const to = String(body.to || '').trim()
  const subject = String(body.subject || '(no subject)').slice(0, 200)
  const text = String(body.body || '').slice(0, 50_000)
  if (!EMAIL_RE.test(to)) return Response.json({ error: 'Invalid recipient email' }, { status: 400 })
  if (!text.trim())       return Response.json({ error: 'Empty body' }, { status: 400 })

  // Need the user's alias + encrypted password to authenticate to SMTP
  const sbAdmin = admin()
  const { data: prof } = await sbAdmin
    .from('profiles')
    .select('email_alias, email_inbox_password_enc, email_inbox_provisioned, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!prof?.email_inbox_provisioned || !prof.email_inbox_password_enc || !prof.email_alias) {
    return Response.json({ error: 'Your GetGuac Mail inbox is not provisioned yet.' }, { status: 400 })
  }

  let password
  try {
    password = decryptSecret(prof.email_inbox_password_enc)
  } catch (e) {
    console.error('[email/send] decrypt failed:', e.message)
    return Response.json({ error: 'Mailbox credentials unavailable' }, { status: 500 })
  }

  const fromAddr = fullEmail(prof.email_alias)
  const fromName = [prof.first_name, prof.last_name].filter(Boolean).join(' ') || prof.email_alias

  const transporter = nodemailer.createTransport({
    host: ENDPOINTS.smtp.host,
    port: ENDPOINTS.smtp.port,
    secure: ENDPOINTS.smtp.secure,
    auth: { user: fromAddr, pass: password },
  })

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to,
      subject,
      text,
    })

    // Log to Sent
    await sbAdmin.from('email_messages').insert({
      user_id: user.id,
      uid: Date.now(),  // synthetic — Sent items don't come from IMAP poll
      message_id: info.messageId,
      from_addr: fromAddr,
      to_addr: to,
      subject,
      received_at: new Date().toISOString(),
      preview: text.slice(0, 200),
      body_text: text,
      folder: 'sent',
      read_at: new Date().toISOString(),
      processed: true,
    })

    return Response.json({ ok: true, messageId: info.messageId })
  } catch (e) {
    console.error('[email/send] smtp failed:', e.message)
    return Response.json({ error: 'Send failed. Try again.' }, { status: 500 })
  }
}
