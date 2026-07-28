#!/usr/bin/env node
// What has anyone actually PRESSED?
//
//   cd web && node scripts/click-counts.mjs [days]     (default 90)
//
// Reads the synthetic `/click/<name>` paths that lib/track-click.js posts to
// /api/visit. Every wired button is listed even at zero — a counter missing
// from the output would otherwise be indistinguishable from a counter at zero,
// and those mean very different things (broken wiring vs no traffic).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
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
const days = Math.max(parseInt(process.argv[2] || '90', 10) || 90, 1)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Every name passed to trackClick() anywhere in the app. Keep in sync when you
// wire a new button — the point of the list is to show zeros.
const WIRED = [
  ['/join landing page', [
    'join-app-store', 'join-google-play', 'join-signup-google', 'join-signup-email', 'join-demo',
  ]],
  ['Arcade launcher (dashboard)', [
    'games-menu', 'games-menu-all',
    'games-menu-splurge', 'games-menu-nitro', 'games-menu-bubbles',
    'games-menu-climb', 'games-menu-muncher', 'games-menu-penalty',
  ]],
]

const { data, error } = await db.rpc('site_top_paths', { p_days: days, p_limit: 1000 })
if (error) {
  console.error(error.message.includes('PGRST202')
    ? 'site_top_paths() is missing — migration_083 has not been applied.'
    : error.message)
  process.exit(1)
}
const counts = new Map()
for (const r of data || []) {
  if (String(r.path).startsWith('/click/')) counts.set(String(r.path).slice(7), Number(r.views))
}

console.log(`— button clicks, last ${days} days —\n`)
let total = 0
for (const [group, names] of WIRED) {
  console.log(`  ${group}`)
  for (const n of names) {
    const v = counts.get(n) || 0
    total += v
    console.log(`    ${String(v).padStart(5)}  ${n}`)
  }
  console.log('')
}

// Plays are counted per finished round, signed in OR out — the one arcade
// signal that survives a signed-out player. Not in WIRED because the slug set
// is the whole catalog, not a fixed list.
const plays = [...counts.entries()].filter(([k]) => k.startsWith('play-')).sort((a, b) => b[1] - a[1])
console.log(`  Finished game rounds (signed in or out)`)
if (!plays.length) console.log('        0  (no rounds recorded yet)')
for (const [k, v] of plays) console.log(`    ${String(v).padStart(5)}  ${k.slice(5)}`)

const unknown = [...counts.keys()].filter(
  (k) => !WIRED.some(([, names]) => names.includes(k)) && !k.startsWith('play-'))
if (unknown.length) {
  console.log(`\n  Other /click paths on record`)
  for (const k of unknown) console.log(`    ${String(counts.get(k)).padStart(5)}  ${k}`)
}
console.log(`\n  ${total} total clicks across all wired buttons.`)
