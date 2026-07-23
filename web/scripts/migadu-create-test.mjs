// Diagnostic: can we CREATE a mailbox right now, or is creation blocked (limit,
// billing, restriction)? Creates a throwaway mailbox then deletes it. Reveals
// the real error that provisioning has been hitting. No encryption key needed.
//
//   cd web && node scripts/migadu-create-test.mjs

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMailbox, deleteMailbox, mailboxExists, fullEmail } from '../src/lib/migadu.js'
import { generateMailboxPassword } from '../src/lib/crypto.js'

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

const local = 'zzprobe' + Math.abs(process.pid % 9999)
console.log(`Attempting to create ${fullEmail(local)} …`)
try {
  await createMailbox({ localPart: local, password: generateMailboxPassword(), name: 'Provision Probe' })
  console.log('  ✅ CREATE SUCCEEDED — mailbox creation works right now.')
  console.log('     → prod provisioning failure was NOT a hard block; likely a prod env')
  console.log('       gap (MIGADU_API_KEY/EMAIL_ENCRYPTION_KEY missing at signup time) or transient.')
  const existed = await mailboxExists(local)
  if (existed) {
    await deleteMailbox(local)
    console.log('  🧹 cleaned up the throwaway mailbox.')
  }
} catch (e) {
  console.log('  ❌ CREATE FAILED — this is the error provisioning has been hitting:')
  console.log('     ' + e.message)
}
