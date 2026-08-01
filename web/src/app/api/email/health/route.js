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
import { QUARANTINE_AFTER_FAILURES } from '../../../../lib/mailbox-reauth'

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
//
// Throttling is keyed on a SIGNATURE of what is currently wrong (which
// mailboxes), not on "did we alert at all". A flat throttle would swallow the
// alert for a newly-broken mailbox just because an unrelated one was reported
// 20 minutes ago — re-introducing the blind spot this endpoint exists to close.
async function alertedRecently(sb, signature) {
  const since = new Date(Date.now() - ALERT_THROTTLE_MINUTES * 60_000).toISOString()
  const { data } = await sb
    .from('audit_log')
    .select('detail')
    .eq('action', 'email_health')
    .eq('status', 'alerted')
    .gte('created_at', since)
    .limit(50)
  return (data || []).some(r => r?.detail?.signature === signature)
}

export async function POST(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return Response.json({ healthy: false, error: 'unauthorized: cron secret mismatch' }, { status: 401 })
  }

  const sb = adminClient()

  // Same migration-082 tolerance as the poll route: the per-mailbox staleness
  // check is the whole point of this endpoint and works off email_last_poll_at
  // alone, so it still functions before the SQL lands — it just cannot show
  // failure counts or honour quarantine yet.
  const BASE_COLS = 'id, email_alias, email_last_poll_at, alias_set_at, created_at'
  const HEALTH_COLS = `${BASE_COLS}, email_consecutive_failures, email_last_error, email_quarantined_at, email_quarantine_reason`
  const selectMailboxes = (cols) => sb
    .from('profiles')
    .select(cols)
    .eq('email_inbox_provisioned', true)
    .eq('email_processing_enabled', true)
    .not('email_alias', 'is', null)
    .not('email_inbox_password_enc', 'is', null)

  let { data: mailboxes, error } = await selectMailboxes(HEALTH_COLS)
  if (error && /does not exist/i.test(error.message || '')) {
    console.warn('[email/health] migration 082 not applied yet — reporting staleness without failure counts')
    ;({ data: mailboxes, error } = await selectMailboxes(BASE_COLS))
  }

  if (error) {
    return Response.json({ healthy: false, error: `profiles query failed: ${error.message}` }, { status: 500 })
  }

  const provisioned = mailboxes?.length || 0
  // Nothing to poll -> nothing can be stale.
  if (provisioned === 0) {
    return Response.json({ healthy: true, provisioned: 0, reason: 'no provisioned mailboxes to monitor' })
  }

  const now = Date.now()
  const staleMs = STALE_MINUTES * 60_000
  const minutesSince = (t) => (t ? Math.round((now - Date.parse(t)) / 60_000) : null)

  // ---- Signal 1: fleet-wide stall. MAX() across mailboxes still catches the
  // failures that take the WHOLE pipeline down at once — a dead cron, a
  // CRON_SECRET 401, the site being unreachable. Keep it.
  let newestMs = 0
  for (const m of mailboxes) {
    const t = m.email_last_poll_at ? Date.parse(m.email_last_poll_at) : 0
    if (t > newestMs) newestMs = t
  }
  const ageMinutes = newestMs ? Math.round((now - newestMs) / 60_000) : null
  const fleetStalled = ageMinutes == null || ageMinutes > STALE_MINUTES

  // ---- Signal 2 (THE FIX): per-mailbox staleness.
  // MAX() alone is blind to a single dead mailbox — 8 healthy ones reported the
  // fleet "healthy" while rdasaradi@ had not pulled since 2026-07-15, for 18
  // days. Every mailbox now has to answer for itself.
  //
  // A mailbox that has never been polled only counts once it has had a fair
  // chance: brand-new signups must not page anyone in the minutes between
  // provisioning and the first cron tick.
  const stale = [], quarantined = []
  for (const m of mailboxes) {
    const provisionedAt = Date.parse(m.alias_set_at || m.created_at || 0) || 0
    const neverPolled = !m.email_last_poll_at
    const tooYoung = neverPolled && provisionedAt && now - provisionedAt < staleMs
    if (tooYoung) continue
    const isStale = neverPolled || now - Date.parse(m.email_last_poll_at) > staleMs
    if (!isStale) continue
    const entry = {
      alias: m.email_alias,
      minutes_since_last_poll: minutesSince(m.email_last_poll_at),
      last_poll_at: m.email_last_poll_at || 'never',
      consecutive_failures: m.email_consecutive_failures || 0,
      last_error: m.email_quarantine_reason || m.email_last_error || null,
    }
    // Quarantined = already alerted on once, known-dead, awaiting a human.
    // Reported as degraded but not paged again: an alarm that stays red
    // forever is an alarm everyone learns to ignore.
    if (m.email_quarantined_at) quarantined.push({ ...entry, quarantined_at: m.email_quarantined_at })
    else stale.push(entry)
  }

  const unhealthy = fleetStalled || stale.length > 0

  if (!unhealthy) {
    return Response.json({
      healthy: true,
      provisioned,
      minutes_since_last_poll: ageMinutes,
      // Surfaced even when healthy so a known-dead mailbox stays visible in
      // every single health response instead of quietly disappearing.
      degraded: quarantined.length > 0,
      quarantined,
    })
  }

  // ---- Stalled: build the reason from whichever signal actually tripped. ----
  const lastPollIso = newestMs ? new Date(newestMs).toISOString() : 'never'
  const reasonParts = []
  if (fleetStalled) {
    reasonParts.push(newestMs
      ? `WHOLE PIPELINE: no successful email poll for ANY mailbox in ${ageMinutes} min (threshold ${STALE_MINUTES} min). Last poll: ${lastPollIso}.`
      : `${provisioned} mailbox(es) provisioned but none has ever been polled.`)
  }
  if (stale.length) {
    reasonParts.push(
      `${stale.length} of ${provisioned} mailbox(es) not pulling while others are healthy: ` +
      stale.map(s => `${s.alias}@ (${s.minutes_since_last_poll ?? '∞'} min, ${s.consecutive_failures} consecutive failures${s.last_error ? `, last error: ${s.last_error}` : ''})`).join('; ')
    )
  }
  const reason = reasonParts.join('\n')

  // Signature = what is wrong right now. A newly-broken mailbox changes it and
  // therefore alerts immediately instead of being muted by an older alert.
  const signature = [fleetStalled ? 'FLEET' : '', ...stale.map(s => s.alias).sort()].filter(Boolean).join(',')
  const throttled = await alertedRecently(sb, signature).catch(() => false)

  let alerted = false
  let alertError = null
  if (!throttled) {
    const subject = fleetStalled
      ? '🚨 GetGuac: receipt-email pulling is DOWN (whole pipeline)'
      : `🚨 GetGuac: ${stale.length} mailbox(es) not pulling mail`
    const text = [
      'The email-pull watchdog detected that receipt/email pulling has stalled.',
      '',
      reason,
      '',
      `Provisioned + enabled mailboxes: ${provisioned}`,
      `Healthy: ${provisioned - stale.length - quarantined.length} · Stale: ${stale.length} · Quarantined: ${quarantined.length}`,
      '',
      ...(fleetStalled ? [
        'NO mailbox is pulling, so this is the pipeline, not one account.',
        'Most likely cause: the GitHub Actions "Email Inbox Poll" cron is not reaching',
        '/api/email/poll — usually a CRON_SECRET mismatch between GitHub repo Secrets',
        'and Vercel env (HTTP 401), or the scheduled workflow was auto-disabled.',
        '',
        'Fix:',
        '  1. Re-sync CRON_SECRET in GitHub repo Secrets AND Vercel (Production) -> redeploy.',
        '  2. GitHub -> Actions -> "Email Inbox Poll" -> make sure it is enabled, then Run.',
        '  3. Meanwhile, any user hitting "Backfill" in their Inbox pulls immediately.',
      ] : [
        'Other mailboxes ARE pulling normally, so the cron is alive — this is specific',
        'to the mailbox(es) named above. Check the error text on each.',
        '',
        'Fix:',
        '  1. /admin/crashes -> filter tag email_poll / email_mailbox_dead for the stack.',
        '  2. IMAP auth errors self-heal via a password rotation; if rotation is ALSO',
        '     failing (Migadu 500 on the password PUT), the mailbox is broken upstream —',
        '     reset it by hand at admin.migadu.com, then the next poll recovers it.',
        `  3. After ${QUARANTINE_AFTER_FAILURES} consecutive failures a mailbox is quarantined: it keeps being`,
        '     polled (so it recovers by itself once fixed) but stops rotating passwords.',
      ]),
      ...(quarantined.length ? [
        '',
        `Already quarantined (alerted previously, still broken): ${quarantined.map(q => `${q.alias}@`).join(', ')}`,
      ] : []),
      '',
      `— GetGuac watchdog @ ${new Date().toISOString()}`,
    ].join('\n')

    const res = await sendAdminAlert({ subject, text })
    alerted = res.ok
    alertError = res.ok ? null : res.error

    await sb.from('audit_log').insert({
      action: 'email_health',
      status: alerted ? 'alerted' : 'alert_failed',
      detail: {
        signature, reason, provisioned,
        minutes_since_last_poll: ageMinutes,
        fleet_stalled: fleetStalled,
        stale: stale.map(s => s.alias),
        quarantined: quarantined.map(q => q.alias),
        alert_error: alertError,
        recipient: alertRecipient(),
      },
    }).then(() => {}, () => {})
  }

  const payload = {
    healthy: false,
    provisioned,
    healthy_mailboxes: provisioned - stale.length - quarantined.length,
    minutes_since_last_poll: ageMinutes,
    last_poll_at: lastPollIso,
    fleet_stalled: fleetStalled,
    stale,
    quarantined,
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
