#!/usr/bin/env node
// Bulk-delete mailboxes from Migadu by name pattern. Built for cleaning up
// load-test accounts (loadtest_*, test_*, qa_*) without clicking through the
// admin UI 200 times.
//
// Usage:
//   # 1. Set env vars (or use a local .env loader of your choice)
//   export MIGADU_ACCOUNT="you@yourdomain"
//   export MIGADU_API_KEY="abcd..."
//   export MIGADU_DOMAIN="getguac.app"
//
//   # 2. Dry-run — lists matches, doesn't touch anything
//   node scripts/bulk-delete-mailboxes.mjs --prefix=loadtest_
//   node scripts/bulk-delete-mailboxes.mjs --regex=^(test|qa|demo)_
//
//   # 3. Execute — actually deletes. Asks for typed confirmation.
//   node scripts/bulk-delete-mailboxes.mjs --prefix=loadtest_ --execute
//
//   # 4. Multiple filters combined (must match ALL)
//   node scripts/bulk-delete-mailboxes.mjs --prefix=load --created-before=2026-05-01 --execute
//
// Safety:
//   - Default mode is dry-run. The destructive --execute flag is required.
//   - Even with --execute, you must type the literal word DELETE at the
//     prompt to proceed.
//   - The script never deletes more than --max accounts in one run
//     (default 50) to limit blast radius if your pattern is too broad.
//   - It DOES NOT touch the Supabase profiles row — delete those separately
//     via a Supabase SQL editor query if needed. Migadu cleanup is the
//     usually-painful part; DB cleanup is one DELETE statement.

import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, exit, argv, env } from 'node:process'

// Parse CLI flags.
const args = Object.fromEntries(
  argv.slice(2).map((a) => {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      return eq === -1 ? [a.slice(2), true] : [a.slice(2, eq), a.slice(eq + 1)]
    }
    return [a, true]
  })
)

const PREFIX  = args.prefix
const REGEX   = args.regex ? new RegExp(args.regex) : null
const SUFFIX  = args.suffix
const BEFORE  = args['created-before'] ? new Date(args['created-before']) : null
const EXECUTE = !!args.execute
const MAX     = Number(args.max || 50)

if (!PREFIX && !REGEX && !SUFFIX && !BEFORE) {
  console.error('Refusing to run with no filters. Use --prefix= / --regex= / --suffix= / --created-before=YYYY-MM-DD.')
  console.error('Combine multiple flags — they AND together.')
  exit(1)
}

const account = env.MIGADU_ACCOUNT
const apiKey  = env.MIGADU_API_KEY
const domain  = env.MIGADU_DOMAIN || 'getguac.app'
if (!account || !apiKey) {
  console.error('Set MIGADU_ACCOUNT and MIGADU_API_KEY in env. See script header.')
  exit(1)
}

const BASE = 'https://api.migadu.com/v1'
const auth = 'Basic ' + Buffer.from(`${account}:${apiKey}`).toString('base64')

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${init.method || 'GET'} ${path} → ${res.status}: ${text.slice(0, 240)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

console.log(`Listing all mailboxes on ${domain}…`)
const data = await api(`/domains/${domain}/mailboxes`)
const all = data?.mailboxes ?? []
console.log(`Found ${all.length} mailboxes total.`)

const matched = all.filter((m) => {
  const lp = m.local_part || ''
  if (PREFIX && !lp.startsWith(PREFIX)) return false
  if (SUFFIX && !lp.endsWith(SUFFIX)) return false
  if (REGEX && !REGEX.test(lp)) return false
  if (BEFORE) {
    const created = m.created_at ? new Date(m.created_at) : null
    if (!created || created >= BEFORE) return false
  }
  return true
})

console.log(`\n${matched.length} mailboxes match the filter:`)
for (const m of matched.slice(0, 80)) {
  console.log(`  • ${m.local_part}@${domain}  ` +
    `${m.created_at ? '(' + new Date(m.created_at).toISOString().slice(0, 10) + ')' : ''}`)
}
if (matched.length > 80) console.log(`  … ${matched.length - 80} more not shown`)

if (matched.length === 0) {
  console.log('\nNothing to do.')
  exit(0)
}
if (matched.length > MAX) {
  console.error(`\nRefusing: ${matched.length} matches exceeds --max=${MAX}.`)
  console.error('Narrow the filter, or raise --max if you really mean it.')
  exit(1)
}

if (!EXECUTE) {
  console.log('\n--execute not passed. Dry-run only. Re-run with --execute to delete.')
  exit(0)
}

const rl = createInterface({ input: stdin, output: stdout })
const word = await rl.question(`\nType DELETE to permanently remove these ${matched.length} mailboxes: `)
rl.close()
if (word !== 'DELETE') {
  console.log('Aborted.')
  exit(0)
}

let ok = 0, fail = 0
for (const m of matched) {
  try {
    await api(`/domains/${domain}/mailboxes/${encodeURIComponent(m.local_part)}`, { method: 'DELETE' })
    ok++
    process.stdout.write(`  ✓ ${m.local_part}\n`)
  } catch (e) {
    fail++
    process.stdout.write(`  ✗ ${m.local_part} — ${e.message}\n`)
  }
}
console.log(`\nDone. Deleted ${ok}, failed ${fail}.`)
if (fail > 0) exit(2)
