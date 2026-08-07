#!/usr/bin/env node
// =============================================================================
// Local live stats dashboard.
// =============================================================================
//   cd web && node scripts/stats-dashboard.mjs [port]      (default 4317)
//   then open http://localhost:4317
//
// WHY A SERVER AND NOT A STATIC FILE: every number here needs the Supabase
// SERVICE ROLE key. That key must never reach a browser, so the queries run in
// this process and the page is served only on localhost. Nothing is written —
// every query is a read.
//
// The page refetches on an interval, so it stays current with the tab open.
// =============================================================================
import { createClient } from '@supabase/supabase-js'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.argv[2] || 4317)

function loadEnv() {
  const out = { ...process.env }
  try {
    const txt = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in out)) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* env optional */ }
  return out
}
const env = loadEnv()
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in web/.env.local')
  process.exit(1)
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Keep in sync with scripts/click-counts.mjs — the point of listing every wired
// name is that a counter at zero stays visible instead of vanishing.
const WIRED = [
  ['Join landing page', [
    'join-try-one-receipt', 'join-try-one-receipt-success',
    'join-app-store', 'join-google-play', 'join-signup-google', 'join-signup-email',
    'join-how-it-works', 'join-guides', 'join-hero-demo', 'join-demo', 'join-security', 'join-direct-trial',
  ]],
  ['Receipt trial', [
    'join-trial-name-submit', 'join-trial-camera-capture',
    'join-trial-source-camera', 'join-trial-source-gallery', 'join-trial-source-file', 'join-trial-source-voice',
    'join-trial-error-retry', 'join-trial-view-receipt', 'join-trial-view-smashlist', 'join-trial-view-report',
    'join-trial-try-again', 'join-trial-signup', 'join-trial-save', 'join-trial-refer',
    'join-trial-delete', 'join-trial-home',
  ]],
  ['Homepage', ['home-try-one-receipt']],
  ['Start page', ['start-signup-google', 'start-signup-email', 'start-signin']],
]

// The trial funnel, in the order a visitor moves through it.
const FUNNEL = [
  ['Tapped “Try 1 receipt”', ['join-try-one-receipt']],
  ['Entered a name', ['join-trial-name-submit']],
  ['Receipt parsed', ['join-try-one-receipt-success']],
  ['Explored the result', ['join-trial-view-receipt', 'join-trial-view-smashlist', 'join-trial-view-report']],
]

async function gather(days) {
  const out = { days, generatedAt: new Date().toISOString(), errors: [] }

  // --- signups funnel -------------------------------------------------------
  try {
    const { data, error } = await db.from('signups').select('email, created_at, confirmed_at, first_receipt_at, signup_method')
    if (error) throw error
    const rows = data || []
    out.signups = {
      total: rows.length,
      confirmed: rows.filter(r => r.confirmed_at).length,
      unconfirmed: rows.filter(r => !r.confirmed_at).length,
      scanned: rows.filter(r => r.first_receipt_at).length,
      recent: rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8)
        .map(r => ({ email: r.email, created_at: r.created_at, confirmed: !!r.confirmed_at, scanned: !!r.first_receipt_at })),
    }
  } catch (e) { out.errors.push('signups: ' + e.message); out.signups = null }

  // --- click totals over the window ----------------------------------------
  try {
    const { data, error } = await db.rpc('site_top_paths', { p_days: days, p_limit: 1000 })
    if (error) throw error
    const clicks = {}, pages = []
    for (const r of data || []) {
      const p = String(r.path)
      if (p.startsWith('/click/')) clicks[p.slice(7)] = Number(r.views)
      else pages.push({ path: p, views: Number(r.views) })
    }
    out.clicks = clicks
    out.pages = pages.sort((a, b) => b.views - a.views).slice(0, 12)
  } catch (e) { out.errors.push('site_top_paths: ' + e.message); out.clicks = {}; out.pages = [] }

  // --- individual events (last 48h) ----------------------------------------
  try {
    const { data, error } = await db.rpc('site_click_events_since', { p_hours: 48 })
    if (error) throw error
    out.events = (data || []).map(e => ({ name: e.click_name, at: e.clicked_at }))
      .sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 40)
  } catch (e) { out.errors.push('site_click_events_since: ' + e.message); out.events = [] }

  out.groups = WIRED.map(([g, names]) => [g, names.map(n => [n, out.clicks?.[n] || 0])])
  out.funnel = FUNNEL.map(([label, names]) => [label, names.reduce((s, n) => s + (out.clicks?.[n] || 0), 0)])
  return out
}

// Read per request, not once at boot: this is a local tool you will want to
// tweak, and caching the template means an edit looks like it did nothing.
const PAGE_PATH = resolve(__dirname, 'stats-dashboard.html')

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/api/stats') {
    const days = Math.max(1, Number(url.searchParams.get('days') || 30))
    try {
      const payload = await gather(days)
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(payload))
    } catch (e) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(readFileSync(PAGE_PATH, 'utf8'))
    return
  }
  res.writeHead(404); res.end('not found')
}).listen(PORT, '127.0.0.1', () => {
  console.log(`\n  GetGuac stats dashboard — http://localhost:${PORT}\n`)
  console.log('  Reads only. Service-role key stays in this process; the page never sees it.')
  console.log('  Ctrl+C to stop.\n')
})
