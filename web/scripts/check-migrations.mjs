#!/usr/bin/env node
// Which migrations are actually LIVE in the database?
//
//   cd web && node scripts/check-migrations.mjs
//
// There is no migrations table in this project — SQL is pasted into the
// Supabase editor by hand — so "did I run it?" is otherwise unanswerable.
// This probes each migration's own artifact (table or function) with the
// service-role key and reports APPLIED / MISSING. A missing RPC surfaces to
// users as a silent 404 in the browser console, not as an error page, which
// is exactly how migration_082 shipped broken.
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
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// [migration, kind, name, args] — probe the thing the migration creates.
const PROBES = [
  ['070_saved_searches',      'table', 'saved_searches'],
  ['071_shopping_cache',      'table', 'shopping_cache'],
  ['072_seen_steals',         'table', 'seen_steals'],
  ['073_marketplace_listings','table', 'marketplace_listings'],
  ['074_premium_entitlement', 'table', 'premium_entitlements'],
  ['075_chat_safety',         'table', 'chat_messages'],
  ['078_game_scores',         'table', 'game_scores'],
  ['079_arcade_leaderboard',  'rpc',   'arcade_leaderboard', { p_game: 'snake', p_limit: 1 }],
  ['082_game_likes',          'rpc',   'game_like_counts', {}],
  ['082_game_likes',          'table', 'game_likes'],
  ['083_site_visits',         'rpc',   'site_traffic', { p_days: 1 }],
]

const missing = []
for (const [mig, kind, name, args] of PROBES) {
  let status, detail
  if (kind === 'table') {
    const { error } = await db.from(name).select('*', { count: 'exact', head: true }).limit(1)
    // 42P01 = undefined_table. PGRST205 = PostgREST can't find it in the schema cache.
    const gone = error && /42P01|PGRST205|does not exist|Could not find the table/i.test(`${error.code} ${error.message}`)
    status = gone ? 'MISSING' : error ? 'ERROR' : 'APPLIED'
    detail = error ? `${error.code || ''} ${error.message}`.trim().slice(0, 90) : 'table reachable'
  } else {
    const { error } = await db.rpc(name, args)
    const gone = error && /PGRST202|42883|Could not find the function/i.test(`${error.code} ${error.message}`)
    status = gone ? 'MISSING' : error ? 'ERROR' : 'APPLIED'
    detail = error ? `${error.code || ''} ${error.message}`.trim().slice(0, 90) : 'function callable'
  }
  if (status === 'MISSING') missing.push(`${mig} → ${kind} ${name}`)
  console.log(`${status.padEnd(8)} migration_${mig.padEnd(26)} ${kind} ${name.padEnd(22)} ${status === 'APPLIED' ? '' : detail}`)
}

console.log('\n' + '─'.repeat(70))
if (missing.length) {
  console.log(`${missing.length} MISSING — paste the matching .sql into the Supabase SQL editor:`)
  for (const m of missing) console.log(`  • ${m}`)
} else {
  console.log('All probed migrations are applied.')
}
process.exit(missing.length ? 1 : 0)
