// GET /api/admin/crashes — data for the admin crash dashboard.
//
// Admin-only (profiles.is_admin, enforced here server-side — never trust the
// client gate alone). Reads error + warn events from audit_log, where the
// mobile app's DebugLog (FlutterError / zone-error / failed flows) and the
// server-side reporters land, groups them into issues, and returns stats.
//
// Query params:
//   days=7                 lookback window (1..90)
//   level=all|error|warn   default all (error+warn)
//   platform=ios|android|web
//   q=...                  substring match on tag/message
//   limit=2000             max raw rows scanned (100..5000)

import { createApiClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function firstLine(s) {
  return String(s || '').split('\n')[0].trim().slice(0, 300)
}

// Collapse volatile bits (numbers, hex ids, uuids) so near-identical messages
// fold into a single issue for counting.
function fingerprintMsg(s) {
  return firstLine(s)
    .replace(/0x[0-9a-f]+/gi, '0x#')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b\d+\b/g, '#')
    .slice(0, 200)
}

export async function GET(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const { data: prof } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!prof?.is_admin) return Response.json({ error: 'Admin only' }, { status: 403 })

  const url = new URL(request.url)
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 7)))
  const level = url.searchParams.get('level') || 'all'
  const platform = (url.searchParams.get('platform') || '').toLowerCase()
  const q = (url.searchParams.get('q') || '').toLowerCase()
  const limit = Math.min(5000, Math.max(100, Number(url.searchParams.get('limit') || 2000)))

  const statuses = level === 'error' ? ['error'] : level === 'warn' ? ['warn'] : ['error', 'warn']
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  const admin = adminClient()
  const { data: rows, error } = await admin
    .from('audit_log')
    .select('id, user_id, action, status, detail, created_at')
    .in('status', statuses)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Normalize each audit row into a crash event.
  const events = []
  for (const r of rows || []) {
    const d = r.detail || {}
    const plat = String(d.platform || 'web').toLowerCase()
    if (platform && plat !== platform) continue
    const tag = d.tag || r.action || 'unknown'
    const msg = d.message || r.action || '(no message)'
    if (q && !`${tag} ${msg}`.toLowerCase().includes(q)) continue
    events.push({
      id: r.id,
      level: r.status,
      action: r.action,
      tag,
      message: msg,
      platform: plat,
      app_version: d.app_version || null,
      stack: d.meta?.stack || d.stack || null,
      meta: d.meta || null,
      session_id: d.session_id || null,
      user_id: r.user_id,
      created_at: r.created_at,
    })
  }

  // Group into issues by (tag + fingerprinted first line).
  const byKey = new Map()
  for (const e of events) {
    const key = `${e.tag}|${fingerprintMsg(e.message)}`
    let g = byKey.get(key)
    if (!g) {
      g = {
        key, tag: e.tag, level: e.level, title: firstLine(e.message), count: 0,
        platforms: new Set(), versions: new Set(), users: new Set(),
        first_seen: e.created_at, last_seen: e.created_at, sample: e,
      }
      byKey.set(key, g)
    }
    g.count++
    g.platforms.add(e.platform)
    if (e.app_version) g.versions.add(e.app_version)
    if (e.user_id) g.users.add(e.user_id)
    if (e.created_at > g.last_seen) { g.last_seen = e.created_at; g.sample = e }
    if (e.created_at < g.first_seen) g.first_seen = e.created_at
    if (e.level === 'error') g.level = 'error'  // error outranks warn
  }

  const issues = [...byKey.values()]
    .map(g => ({
      key: g.key, tag: g.tag, level: g.level, title: g.title, count: g.count,
      platforms: [...g.platforms], versions: [...g.versions], affected_users: g.users.size,
      first_seen: g.first_seen, last_seen: g.last_seen, sample: g.sample,
    }))
    .sort((a, b) => (a.last_seen < b.last_seen ? 1 : a.last_seen > b.last_seen ? -1 : b.count - a.count))

  const now = Date.now()
  const byPlatform = {}
  for (const e of events) byPlatform[e.platform] = (byPlatform[e.platform] || 0) + 1

  return Response.json({
    stats: {
      total: events.length,
      errors: events.filter(e => e.level === 'error').length,
      warnings: events.filter(e => e.level === 'warn').length,
      last24h: events.filter(e => now - Date.parse(e.created_at) < 86400_000).length,
      unique_issues: issues.length,
      by_platform: byPlatform,
    },
    issues: issues.slice(0, 200),
    recent: events.slice(0, 100),
    window_days: days,
    truncated: (rows?.length || 0) >= limit,
  })
}
