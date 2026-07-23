// Read-only probe of the Migadu Admin API to see WHY new-mailbox provisioning
// is failing. Lists mailboxes (proves the API key + account work) and checks a
// couple of stuck users' addresses. No writes.
//
//   cd web && node scripts/migadu-probe.mjs

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
  } catch {}
  return out
}
const env = loadEnv()
const ACCOUNT = env.MIGADU_ACCOUNT
const KEY = env.MIGADU_API_KEY
const DOMAIN = env.MIGADU_DOMAIN || 'getguac.app'

console.log(`Account: ${ACCOUNT ? ACCOUNT.replace(/(.).*(@.*)/, '$1***$2') : '(MISSING)'}`)
console.log(`API key: ${KEY ? KEY.slice(0, 4) + '…(' + KEY.length + ' chars)' : '(MISSING)'}`)
console.log(`Domain:  ${DOMAIN}\n`)
if (!ACCOUNT || !KEY) { console.error('Missing MIGADU_ACCOUNT or MIGADU_API_KEY in web/.env.local'); process.exit(1) }

const auth = 'Basic ' + Buffer.from(`${ACCOUNT}:${KEY}`).toString('base64')
const BASE = 'https://api.migadu.com/v1'

async function req(method, path) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  const text = await res.text().catch(() => '')
  return { status: res.status, text }
}

// 1. List mailboxes — the key read that tells us if the API key/account are alive.
const list = await req('GET', `/domains/${DOMAIN}/mailboxes`)
console.log(`GET /domains/${DOMAIN}/mailboxes → HTTP ${list.status}`)
if (list.status === 200) {
  let mboxes = []
  try { mboxes = JSON.parse(list.text).mailboxes || [] } catch {}
  console.log(`  ✅ API works. ${mboxes.length} mailbox(es) exist on the domain:`)
  for (const m of mboxes) console.log(`     - ${m.local_part}@${DOMAIN}${m.name ? '  ("' + m.name + '")' : ''}`)
} else {
  console.log(`  ❌ ${list.text.slice(0, 400)}`)
  console.log('  (401/403 = API key revoked or account/billing problem; that stops all new-mailbox creation.)')
}

// 2. Check the two stuck users from today.
for (const local of ['nicky', 'pragathiusatrust']) {
  const r = await req('GET', `/domains/${DOMAIN}/mailboxes/${encodeURIComponent(local)}`)
  console.log(`GET .../mailboxes/${local} → HTTP ${r.status}${r.status === 404 ? '  (does not exist — never provisioned)' : ''}`)
}
console.log('')
