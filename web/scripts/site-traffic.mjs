// Read-only: how many people actually visited the site.
//
// Reads the first-party counter from migration_083 (site_visits /
// site_visitor_days) via the aggregate-only RPCs. Nothing here can identify a
// person — site_traffic() returns counts and site_top_paths() returns paths.
//
//   cd web && node scripts/site-traffic.mjs [days]
//
// `days` (default 14) is the window for both the daily table and the path
// breakdown. If the migration has not been applied this says so plainly rather
// than reporting zero, because "no rows" and "no table" are different answers.

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
const days = Math.max(parseInt(process.argv[2] || '14', 10) || 14, 1)

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// A missing function means migration_083 was never run — report that, don't
// let it read as "zero visitors".
function notInstalled(error) {
  return error && (error.code === 'PGRST202' || /site_traffic|site_top_paths|does not exist/i.test(error.message || ''))
}

const { data: traffic, error: trafficErr } = await db.rpc('site_traffic', { p_days: days })

if (trafficErr) {
  if (notInstalled(trafficErr)) {
    console.log('migration_083 is NOT applied — the counter tables do not exist yet.')
    console.log('Nothing has been recorded, and nothing will be until the SQL is run.')
    console.log('  supabase/migration_083_site_visits.sql')
    process.exit(0)
  }
  console.error('site_traffic failed:', trafficErr)
  process.exit(1)
}

const totalViews = traffic.reduce((n, r) => n + Number(r.views), 0)
const peakDay = traffic.reduce((a, r) => (Number(r.visitors) > Number(a?.visitors ?? -1) ? r : a), null)

console.log(`\nLast ${days} days — ${totalViews} pageviews\n`)
console.log('  day           views   visitors')
console.log('  ' + '-'.repeat(30))
for (const row of traffic) {
  console.log(
    `  ${row.day}   ${String(row.views).padStart(5)}   ${String(row.visitors).padStart(8)}`,
  )
}
if (peakDay) console.log(`\n  busiest day: ${peakDay.day} (${peakDay.visitors} visitors)`)

const { data: paths, error: pathsErr } = await db.rpc('site_top_paths', { p_days: days, p_limit: 25 })
if (pathsErr) {
  console.error('\nsite_top_paths failed:', pathsErr)
  process.exit(1)
}

console.log(`\nTop paths (last ${days} days)\n`)
if (!paths.length) {
  console.log('  (none recorded)')
} else {
  const width = Math.max(...paths.map((p) => p.path.length))
  for (const p of paths) {
    console.log(`  ${p.path.padEnd(width)}   ${String(p.views).padStart(5)}`)
  }
}
console.log('')
