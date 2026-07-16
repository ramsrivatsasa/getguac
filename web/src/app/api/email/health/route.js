// POST /api/email/health — watchdog for the receipt-email pull pipeline.
//
// The pull normally runs on a cron (GitHub Actions -> /api/email/poll every
// 10 min), and each successful run stamps profiles.email_last_poll_at. This
// endpoint uses that stamp as a heartbeat: if the freshest poll across all
// provisioned mailboxes is older than the threshold, pulling has stalled and
// we email the admin.
//
// Auth: header `x-cron-secret: <CRON_SECRET>` (same gate as the poll).
//
// Response contract (the GitHub Actions health workflow depends on it):
//   200 { healthy: true, ... }                       -> all good
//   200 { healthy: false, alerted: true|'throttled' } -> stalled; we emailed
//   503 { healthy: false, alerted: false, ... }       -> stalled AND we could
//        NOT email (no ALERT_SMTP_PASS) -> workflow sends the fallback email
//   401 / 500                                         -> workflow fallback too
//
// Because a CRON_SECRET mismatch makes THIS endpoint 401 just like the poll,
// the app can't self-alert in that exact failure. That's deliberate: the
// workflow treats any non-2xx as "app can't report" and emails directly.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendAdminAlert, adminAlertConfigured, alertRecipient } from '../../../../lib/alert-email'

export const runtime = 'nodejs'
export const maxDuration = 30

// Poll runs every 10 min, but GitHub Actions scheduled crons routinely drift
// 15-45 min (sometimes skip a tick) under load, and overnight there may be no
// active user hitting /api/email/sync to refresh the heartbeat either. A 35-min
// window tripped on that jitter and, with no ALERT_SMTP_PASS set, hard-failed
// the watchdog workflow (red X) on false positives. 90 min tolerates the drift
// while still catching a genuine multi-hour outage. Override via env if needed.
const STALE_MINUTES = Number(process.env.EMAIL_POLL_STALE_MINUTES || 90)
// Don't re-email more than once per window while it stays down.
const ALERT_THROTTLE_MINUTES = Number(process.env.EMAIL_ALERT_THROTTLE_MINUTES || 60)

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Have we already emailed within the throttle window? Reuses audit_log so no
// new table is needed. Service role bypasses RLS for the read + write.
async function alertedRecently(sb) {
  const since = new Date(Date.now() - ALERT_THROTTLE_MINUTES * 60_000).toISOString()
  const { data } = await sb
    .from('audit_log')
    .select('id')
    .eq('action', 'email_health')
    .eq('status', 'alerted')
    .gte('created_at', since)
    .limit(1)
  return (data?.length || 0) > 0
}

export async function POST(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return Response.json({ healthy: false, error: 'unauthorized: cron secret mismatch' }, { status: 401 })
  }

  const sb = adminClient()
  const { data: mailboxes, error } = await sb
    .from('profiles')
    .select('email_last_poll_at')
    .eq('email_inbox_provisioned', true)
    .eq('email_processing_enabled', true)
    .not('email_alias', 'is', null)
    .not('email_inbox_password_enc', 'is', null)

  if (error) {
    return Response.json({ healthy: false, error: `profiles query failed: ${error.message}` }, { status: 500 })
  }

  const provisioned = mailboxes?.length || 0
  // Nothing to poll -> nothing can be stale.
  if (provisioned === 0) {
    return Response.json({ healthy: true, provisioned: 0, reason: 'no provisioned mailboxes to monitor' })
  }

  let newestMs = 0
  for (const m of mailboxes) {
    const t = m.email_last_poll_at ? Date.parse(m.email_last_poll_at) : 0
    if (t > newestMs) newestMs = t
  }
  const ageMinutes = newestMs ? Math.round((Date.now() - newestMs) / 60_000) : null
  const stale = ageMinutes == null || ageMinutes > STALE_MINUTES

  if (!stale) {
    return Response.json({ healthy: true, provisioned, minutes_since_last_poll: ageMinutes })
  }

  // ---- Stalled: the poll heartbeat hasn't advanced in too long. ----
  const lastPollIso = newestMs ? new Date(newestMs).toISOString() : 'never'
  const reason = newestMs
    ? `No successful email poll in ${ageMinutes} min (threshold ${STALE_MINUTES} min). Last poll: ${lastPollIso}.`
    : `${provisioned} mailbox(es) provisioned but none has ever been polled.`

  const throttled = await alertedRecently(sb).catch(() => false)

  let alerted = false
  let alertError = null
  if (!throttled) {
    const subject = '🚨 GetGuac: receipt-email pulling is DOWN'
    const text = [
      'The email-pull watchdog detected that receipt/email pulling has stalled.',
      '',
      reason,
      `Provisioned + enabled mailboxes: ${provisioned}`,
      '',
      'Most likely cause: the GitHub Actions "Email Inbox Poll" cron is not reaching',
      '/api/email/poll — usually a CRON_SECRET mismatch between GitHub repo Secrets',
      'and Vercel env (HTTP 401), or the scheduled workflow was auto-disabled.',
      '',
      'Fix:',
      '  1. Re-sync CRON_SECRET in GitHub repo Secrets AND Vercel (Production) -> redeploy.',
      '  2. GitHub -> Actions -> "Email Inbox Poll" -> make sure it is enabled, then Run.',
      '  3. Meanwhile, any user hitting "Backfill" in their Inbox pulls immediately.',
      '',
      `— GetGuac watchdog @ ${new Date().toISOString()}`,
    ].join('\n')

    const res = await sendAdminAlert({ subject, text })
    alerted = res.ok
    alertError = res.ok ? null : res.error

    await sb.from('audit_log').insert({
      action: 'email_health',
      status: alerted ? 'alerted' : 'alert_failed',
      detail: { reason, provisioned, minutes_since_last_poll: ageMinutes, alert_error: alertError, recipient: alertRecipient() },
    }).then(() => {}, () => {})
  }

  const payload = {
    healthy: false,
    provisioned,
    minutes_since_last_poll: ageMinutes,
    last_poll_at: lastPollIso,
    reason,
    alerted: throttled ? 'throttled' : alerted,
    alert_error: alertError,
    alert_configured: adminAlertConfigured(),
  }
  // If we didn't/couldn't email (and aren't just throttled), fail the HTTP
  // status so the workflow backstop sends the alert instead.
  const couldNotAlert = !throttled && !alerted
  return Response.json(payload, { status: couldNotAlert ? 503 : 200 })
}
