// Auto-fix queue — feeds the crash-autofix GitHub Action.
//
// GET  /api/admin/autofix-queue   → the next un-triaged, auto-fixable crash issue(s).
// POST /api/admin/autofix-queue   → mark a fingerprint as handled (so GET won't re-emit it).
//
// Auth (both): header `x-cron-secret: <CRON_SECRET>` — same secret as the other crons.
//
// This reuses the exact grouping the admin crash dashboard uses (tag + a
// fingerprinted first line), then filters down to issues an AI agent running in
// CI can plausibly fix on its own:
//   • error-level only (not warnings)
//   • web + server platforms only — NOT ios/android (native crashes can't be
//     fixed or verified from the web CI), and not our own ops noise.
//   • not already queued (a prior run logged action='autofix_queued' for it).
//
// State lives in audit_log (action='autofix_queued'), matching the crash-digest
// windowing pattern — no new table needed.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// audit_log actions that are our own ops noise, never app crashes.
const OPS_ACTIONS = new Set(['crash_digest', 'email_health', 'autofix_queued'])
// Platforms an AI agent in web CI can actually fix + let Vercel verify.
const FIXABLE_PLATFORMS = new Set(['web', 'server', 'node'])

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function firstLine(s) {
  return String(s || '').split('\n')[0].trim().slice(0, 300)
}

// Collapse volatile bits so near-identical messages fold into one issue.
// (Identical to /api/admin/crashes so fingerprints line up across the two.)
function fingerprintMsg(s) {
  return firstLine(s)
    .replace(/0x[0-9a-f]+/gi, '0x#')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b\d+\b/g, '#')
    .slice(0, 200)
}

function hashKey(key) {
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 10)
}

function unauthorized() {
  return Response.json({ error: 'unauthorized: cron secret mismatch' }, { status: 401 })
}

export async function GET(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return unauthorized()

  const url = new URL(request.url)
  const max = Math.min(5, Math.max(1, Number(url.searchParams.get('max') || 1)))
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days') || 3)))
  const minCount = Math.max(1, Number(url.searchParams.get('min_count') || 1))
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  const sb = adminClient()

  // 1. Fingerprints we've already queued (in any window) — never re-open.
  const { data: doneRows } = await sb
    .from('audit_log')
    .select('detail')
    .eq('action', 'autofix_queued')
    .order('created_at', { ascending: false })
    .limit(1000)
  const alreadyQueued = new Set((doneRows || []).map(r => r.detail?.fingerprint).filter(Boolean))

  // 2. Recent error events.
  const { data: rows, error } = await sb
    .from('audit_log')
    .select('id, user_id, action, status, detail, created_at')
    .eq('status', 'error')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 3. Group into issues (same shape as the dashboard).
  const byKey = new Map()
  for (const r of rows || []) {
    if (OPS_ACTIONS.has(r.action)) continue
    const d = r.detail || {}
    const platform = String(d.platform || 'web').toLowerCase()
    if (!FIXABLE_PLATFORMS.has(platform)) continue
    const tag = d.tag || r.action || 'unknown'
    const message = d.message || r.action || '(no message)'
    const key = `${tag}|${fingerprintMsg(message)}`
    if (alreadyQueued.has(key)) continue

    let g = byKey.get(key)
    if (!g) {
      g = {
        fingerprint: key,
        fingerprint_hash: hashKey(key),
        tag,
        title: firstLine(message),
        action: r.action,
        count: 0,
        platforms: new Set(),
        versions: new Set(),
        users: new Set(),
        first_seen: r.created_at,
        last_seen: r.created_at,
        sample: null,
      }
      byKey.set(key, g)
    }
    g.count++
    g.platforms.add(platform)
    if (d.app_version) g.versions.add(d.app_version)
    if (r.user_id) g.users.add(r.user_id)
    if (r.created_at > g.last_seen) g.last_seen = r.created_at
    if (r.created_at < g.first_seen) g.first_seen = r.created_at
    // Keep the richest sample (prefer one that carries a stack trace).
    const stack = d.meta?.stack || d.stack || null
    if (!g.sample || (stack && !g.sample.stack)) {
      g.sample = {
        message: String(message).slice(0, 2000),
        stack: stack ? String(stack).slice(0, 6000) : null,
        platform,
        app_version: d.app_version || null,
        action: r.action,
        url: d.meta?.url || d.url || null,
        session_id: d.session_id || d.meta?.session_id || null,
      }
    }
  }

  const issues = [...byKey.values()]
    .filter(g => g.count >= minCount)
    .map(g => ({
      fingerprint: g.fingerprint,
      fingerprint_hash: g.fingerprint_hash,
      tag: g.tag,
      title: g.title,
      action: g.action,
      count: g.count,
      platforms: [...g.platforms],
      versions: [...g.versions],
      affected_users: g.users.size,
      first_seen: g.first_seen,
      last_seen: g.last_seen,
      sample: g.sample,
    }))
    // Most-recent first, then by blast radius.
    .sort((a, b) => (a.last_seen < b.last_seen ? 1 : a.last_seen > b.last_seen ? -1 : b.count - a.count))

  return Response.json({
    ok: true,
    count: issues.length,
    window_days: days,
    issues: issues.slice(0, max),
  })
}

export async function POST(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return unauthorized()

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  const fingerprint = body?.fingerprint
  if (!fingerprint) return Response.json({ error: 'fingerprint required' }, { status: 400 })

  const sb = adminClient()
  const { error } = await sb.from('audit_log').insert({
    action: 'autofix_queued',
    status: 'logged',
    detail: {
      fingerprint,
      fingerprint_hash: hashKey(fingerprint),
      outcome: body.outcome || 'queued',       // queued | pr_opened | auto_merged | needs_human | no_fix | skipped
      pr_url: body.pr_url || null,
      pr_number: body.pr_number || null,
      note: body.note ? String(body.note).slice(0, 1000) : null,
    },
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, fingerprint })
}
