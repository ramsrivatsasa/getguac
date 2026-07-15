// POST /api/admin/crash-digest — cron. Emails the admin a digest of NEW
// error-level events (crashes) recorded in audit_log since the last digest.
//
// Auth: header `x-cron-secret: <CRON_SECRET>`.
//
// Windowing: the last SUCCESSFULLY-sent digest is recorded as an audit_log row
// (action='crash_digest', status='sent'); the next run only reports crashes
// after it. On send failure we do NOT record, so the window isn't lost — the
// next run retries the same span.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendAdminAlert, adminAlertConfigured } from '../../../../lib/alert-email'

export const runtime = 'nodejs'
export const maxDuration = 30

// audit_log actions that are our own ops noise, not app crashes.
const OPS_ACTIONS = new Set(['crash_digest', 'email_health'])

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function firstLine(s) {
  return String(s || '').split('\n')[0].trim().slice(0, 200)
}

export async function POST(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'unauthorized: cron secret mismatch' }, { status: 401 })
  }

  const sb = adminClient()

  const { data: lastRows } = await sb
    .from('audit_log')
    .select('created_at')
    .eq('action', 'crash_digest')
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
  const since = lastRows?.[0]?.created_at || new Date(Date.now() - 60 * 60_000).toISOString()

  const { data: rows, error } = await sb
    .from('audit_log')
    .select('action, status, detail, created_at')
    .eq('status', 'error')
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const events = (rows || []).filter(r => !OPS_ACTIONS.has(r.action))
  if (events.length === 0) {
    return Response.json({ ok: true, new_crashes: 0, since })
  }

  // Group by tag + first line so the email is a tidy top-list, not a firehose.
  const groups = new Map()
  for (const r of events) {
    const d = r.detail || {}
    const tag = d.tag || r.action || 'unknown'
    const key = `${tag}|${firstLine(d.message || r.action)}`
    let g = groups.get(key)
    if (!g) { g = { tag, title: firstLine(d.message || r.action), count: 0, platform: d.platform || 'web', version: d.app_version || '' }; groups.set(key, g) }
    g.count++
  }
  const top = [...groups.values()].sort((a, b) => b.count - a.count)

  if (!adminAlertConfigured()) {
    // Can't email yet — report it so the caller/workflow surfaces the gap. Do
    // NOT advance the window (no crash_digest row), so nothing is lost.
    return Response.json({ ok: false, new_crashes: events.length, alerted: false, error: 'ALERT_SMTP_PASS not set' }, { status: 503 })
  }

  const lines = [
    `${events.length} new crash event(s) across ${groups.size} issue(s) since ${since}.`,
    '',
    'Top issues:',
    ...top.slice(0, 15).map(g => `  • [${g.count}] (${g.platform}${g.version ? ' ' + g.version : ''}) ${g.tag}: ${g.title}`),
    '',
    'Full detail + stack traces: https://getguac.app/admin/crashes',
    '',
    `— GetGuac crash watch @ ${new Date().toISOString()}`,
  ]
  const subject = `🐛 GetGuac: ${events.length} new crash${events.length === 1 ? '' : 'es'} (${groups.size} issue${groups.size === 1 ? '' : 's'})`

  const res = await sendAdminAlert({ subject, text: lines.join('\n') })

  if (res.ok) {
    await sb.from('audit_log').insert({
      action: 'crash_digest',
      status: 'sent',
      detail: { new_crashes: events.length, issues: groups.size, since },
    }).then(() => {}, () => {})
  }

  return Response.json(
    { ok: res.ok, new_crashes: events.length, issues: groups.size, alerted: res.ok, error: res.ok ? undefined : res.error },
    { status: res.ok ? 200 : 503 }
  )
}
