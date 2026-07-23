// Backfill Migadu mailboxes for confirmed users whose provisioning failed at
// signup (symptom: confirmed + has a handle but email_inbox_provisioned=false,
// and no mailbox exists in Migadu). Mirrors /api/auth/finish-signup exactly:
// claim a pending handle if needed → createMailbox → store the ENCRYPTED
// password (so the poll can log in) → mark provisioned.
//
//   cd web && node scripts/backfill-mailboxes.mjs           # dry run (shows plan)
//   cd web && node scripts/backfill-mailboxes.mjs --apply   # actually create
//
// Requires these in web/.env.local, matching PRODUCTION values exactly
// (EMAIL_ENCRYPTION_KEY must match prod or the stored password won't decrypt):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   MIGADU_ACCOUNT, MIGADU_API_KEY, EMAIL_ENCRYPTION_KEY

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMailbox, mailboxExists, fullEmail } from '../src/lib/migadu.js'
import { encryptSecret, generateMailboxPassword } from '../src/lib/crypto.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
;(function loadEnv() {
  try {
    const txt = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
})()

const APPLY = process.argv.includes('--apply')
const NEED = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MIGADU_ACCOUNT', 'MIGADU_API_KEY', 'EMAIL_ENCRYPTION_KEY']
const missing = NEED.filter(k => !process.env[k])
if (missing.length) {
  console.error('Missing in web/.env.local (copy from Vercel): ' + missing.join(', '))
  process.exit(1)
}

const VALID_USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// All auth users (for confirmation status + pending_username metadata).
const users = []
for (let page = 1; page <= 20; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('listUsers:', error.message); process.exit(1) }
  users.push(...(data?.users || []))
  if ((data?.users || []).length < 1000) break
}
const byId = Object.fromEntries(users.map(u => [u.id, u]))

const { data: profs, error: pErr } = await admin
  .from('profiles')
  .select('id, email_alias, email_inbox_provisioned, first_name, last_name')
if (pErr) { console.error('profiles:', pErr.message); process.exit(1) }

console.log(APPLY ? '\n== APPLY — creating mailboxes ==\n' : '\n== DRY RUN (add --apply to execute) ==\n')

let created = 0, skipped = 0, failed = 0
for (const p of profs || []) {
  const u = byId[p.id]
  if (!u) continue
  if (!(u.email_confirmed_at || u.confirmed_at)) continue     // only confirmed users
  if (p.email_inbox_provisioned) continue                     // already has a mailbox

  // Alias = the claimed handle, or a valid+available pending handle from signup.
  let alias = p.email_alias
  let needClaim = false
  if (!alias) {
    const pending = String(u.user_metadata?.pending_username || '').toLowerCase()
    if (pending && VALID_USERNAME_RE.test(pending)) { alias = pending; needClaim = true }
  }
  if (!alias) { console.log(`SKIP   ${u.email} — no handle or pending username`); skipped++; continue }

  const first = p.first_name || u.user_metadata?.first_name || null
  const last  = p.last_name  || u.user_metadata?.last_name  || null
  const displayName = [first, last].filter(Boolean).join(' ') || alias

  try {
    if (needClaim) {
      const [{ data: reserved }, { data: taken }] = await Promise.all([
        admin.from('reserved_email_aliases').select('alias').eq('alias', alias).maybeSingle(),
        admin.from('profiles').select('id').eq('email_alias', alias).maybeSingle(),
      ])
      if (reserved || (taken && taken.id !== p.id)) { console.log(`SKIP   ${u.email} — handle @${alias} unavailable`); skipped++; continue }
    }

    if (await mailboxExists(alias)) {
      console.log(`EXISTS ${fullEmail(alias)} — already in Migadu; will mark provisioned (no password reset)`)
      if (APPLY) {
        await admin.from('profiles')
          .update({ email_alias: alias, alias_set_at: new Date().toISOString(), email_inbox_provisioned: true, first_name: first, last_name: last })
          .eq('id', p.id)
      }
      skipped++; continue
    }

    if (!APPLY) { console.log(`WOULD CREATE ${fullEmail(alias)}  ("${displayName}")  ← ${u.email}`); continue }

    const password = generateMailboxPassword()
    await createMailbox({ localPart: alias, password, name: displayName })
    await admin.from('profiles')
      .update({
        email_alias: alias,
        alias_set_at: new Date().toISOString(),
        email_inbox_provisioned: true,
        email_inbox_password_enc: encryptSecret(password),
        first_name: first, last_name: last,
      })
      .eq('id', p.id)
    console.log(`CREATED ${fullEmail(alias)}  ("${displayName}")  ← ${u.email}`)
    created++
  } catch (e) {
    console.log(`FAIL   ${u.email} @${alias} — ${e.message}`)
    failed++
  }
}
console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}\n`)
