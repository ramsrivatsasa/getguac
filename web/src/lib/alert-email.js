// Operational alert email — sent to the admin when something the app can't
// self-heal goes wrong (currently: the receipt-email pull pipeline going
// stale, detected by /api/email/health).
//
// Sends FROM a dedicated no-reply mailbox, not a user's, so it works with no
// user session in scope. Config via Vercel env:
//   ALERT_SMTP_USER    sender mailbox           (default noreply@getguac.app)
//   ALERT_SMTP_PASS    that mailbox's password  (REQUIRED — no pass, no send)
//   ADMIN_ALERT_EMAIL  where alerts land        (default admin@getguac.app)
//
// Best-effort: returns { ok, error, messageId } and never throws.

import nodemailer from 'nodemailer'
import { ENDPOINTS } from './migadu'

export function alertSender() {
  return process.env.ALERT_SMTP_USER || 'noreply@getguac.app'
}

export function alertRecipient() {
  return process.env.ADMIN_ALERT_EMAIL || 'admin@getguac.app'
}

// True when we actually have the credential needed to send. The health
// endpoint uses this to decide whether it can self-alert or must defer to the
// GitHub Actions SMTP backstop.
export function adminAlertConfigured() {
  return !!process.env.ALERT_SMTP_PASS
}

export async function sendAdminAlert({ subject, text }) {
  const user = alertSender()
  const pass = process.env.ALERT_SMTP_PASS
  const to = alertRecipient()
  if (!pass) return { ok: false, error: 'ALERT_SMTP_PASS not set' }

  try {
    const transporter = nodemailer.createTransport({
      host: ENDPOINTS.smtp.host,
      port: ENDPOINTS.smtp.port,
      secure: ENDPOINTS.smtp.secure,
      auth: { user, pass },
    })
    const info = await transporter.sendMail({
      from: `"GetGuac Ops" <${user}>`,
      to,
      subject,
      text,
    })
    return { ok: true, messageId: info.messageId }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}
