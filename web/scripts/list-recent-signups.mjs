// Read-only: list recent signups with their confirmation + mailbox status.
// Answers "who signed up" and, crucially, who is STUCK (signed up but email
// never confirmed → no @getguac.app handle, no Migadu mailbox).
//
//   cd web && node scripts/list-recent-signups.mjs [days]
//
// `days` (default 7) limits to accounts created in the last N days.

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
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web/.env.local')
  process.exit(1)
}

const DAYS = Number(process.argv[2] || 7)
const cutoff = Date.now() - DAYS * 86_400_000

const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// Pull all auth users (paginate to be safe), newest first.
let all = []
for (let page = 1; page <= 20; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('listUsers failed:', error.message); process.exit(1) }
  const users = data?.users || []
  all.push(...users)
  if (users.length < 1000) break
}

all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
const recent = all.filter(u => new Date(u.created_at).getTime() >= cutoff)

// Cross-reference profiles for handle + mailbox provisioning.
const ids = recent.map(u => u.id)
const profById = {}
for (let i = 0; i < ids.length; i += 200) {
  const slice = ids.slice(i, i + 200)
  const { data } = await admin
    .from('profiles')
    .select('id, email_alias, email_inbox_provisioned, first_name, last_name')
    .in('id', slice)
  for (const p of data || []) profById[p.id] = p
}

console.log(`\n${recent.length} signup(s) in the last ${DAYS} day(s) (newest first):\n`)
console.log('created (UTC)        confirmed  handle            mailbox  name                  email')
console.log('─'.repeat(120))
let stuck = 0
for (const u of recent) {
  const p = profById[u.id] || {}
  const confirmed = !!(u.email_confirmed_at || u.confirmed_at)
  const pending = u.user_metadata?.pending_username || ''
  const handle = p.email_alias ? `@${p.email_alias}` : (pending ? `(pending @${pending})` : '—')
  const mailbox = p.email_inbox_provisioned ? 'yes' : 'NO'
  const name = [p.first_name || u.user_metadata?.first_name, p.last_name || u.user_metadata?.last_name].filter(Boolean).join(' ') || '—'
  if (!confirmed) stuck++
  console.log(
    `${u.created_at.slice(0, 19).replace('T', ' ')}  ` +
    `${(confirmed ? 'yes' : 'NO ').padEnd(9)}  ` +
    `${handle.padEnd(16)}  ` +
    `${mailbox.padEnd(7)}  ` +
    `${name.padEnd(20)}  ` +
    `${u.email}`
  )
}
console.log('─'.repeat(92))
console.log(`\n${stuck} account(s) are UNCONFIRMED (stuck: no handle, no mailbox, can't log in).`)
console.log('These are the users blocked by the confirmation-email failure.\n')
