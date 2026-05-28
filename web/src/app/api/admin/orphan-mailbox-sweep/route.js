// POST /api/admin/orphan-mailbox-sweep — cron-friendly endpoint.
//
// Finds Migadu mailboxes that have no matching public.profiles row (because
// the GetGuac account was deleted) and removes them. Safety net for:
//   - Manual SQL `delete from auth.users where id = ...` (bypasses our
//     /api/account/delete endpoint)
//   - Cases where /api/account/delete deleted the profile but the Migadu
//     API call failed mid-run
//   - Old load-test mailboxes that never had a GetGuac profile to begin
//     with (created via Migadu admin UI for testing)
//
// Auth: x-cron-secret header must match CRON_SECRET. Same shape as the
// existing /api/email/poll cron endpoint.
//
// Body: { dryRun: true } / no body  → preview, never deletes
//        { confirm: true }           → actually deletes
//        { only: ["alice","bob"] }   → optional allowlist of local-parts to
//                                       consider; everything else is left alone
//
// Safety:
//   - Default mode is dry-run.
//   - The set of "protected" local-parts (admin, support, etc.) is hardcoded
//     and never deleted, even if there's no matching profile row.
//   - 24h cooldown on the same mailbox: a mailbox can only be flagged for
//     deletion if it's been orphaned for at least 24h — guards against a
//     race where a brand-new signup hasn't created the profile row yet.

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { listMailboxes, deleteMailbox } from '../../../../lib/migadu'

export const runtime = 'nodejs'
export const maxDuration = 60

// Mailboxes we never touch, even if there's no profile.
const PROTECTED = new Set([
  'admin', 'support', 'hello', 'team', 'noreply', 'postmaster', 'abuse',
  'security', 'privacy', 'webmaster', 'mailer-daemon',
])

const ORPHAN_AGE_MIN_HOURS = 24

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.MIGADU_API_KEY) {
    return Response.json({ skipped: 'Migadu not configured' })
  }

  const body = await request.json().catch(() => ({}))
  const dryRun = !body?.confirm
  const allowlist = Array.isArray(body?.only) ? new Set(body.only) : null

  // 1. List every Migadu mailbox + every claimed alias in our DB.
  const sb = adminClient()
  const [mailboxes, { data: profiles }] = await Promise.all([
    listMailboxes(),
    sb.from('profiles').select('email_alias').not('email_alias', 'is', null),
  ])

  const claimedAliases = new Set(
    (profiles || [])
      .map(p => (p.email_alias || '').toLowerCase().trim())
      .filter(Boolean)
  )

  // 2. Find orphans — mailboxes whose local_part is NOT in claimedAliases,
  // are NOT in the protected list, are older than the cooldown, and pass
  // the optional allowlist.
  const cutoff = new Date(Date.now() - ORPHAN_AGE_MIN_HOURS * 60 * 60 * 1000)
  const orphans = []
  const skipped = { protected_local: 0, too_new: 0, not_in_allowlist: 0 }

  for (const m of mailboxes) {
    const lp = (m.local_part || '').toLowerCase().trim()
    if (!lp) continue
    if (claimedAliases.has(lp)) continue
    if (PROTECTED.has(lp)) { skipped.protected_local++; continue }
    if (allowlist && !allowlist.has(lp)) { skipped.not_in_allowlist++; continue }

    // 24h cooldown so brand-new signups in the middle of provisioning
    // don't get nuked.
    const created = m.created_at ? new Date(m.created_at) : null
    if (created && created > cutoff) { skipped.too_new++; continue }

    orphans.push({
      local_part: m.local_part,
      created_at: m.created_at || null,
    })
  }

  if (dryRun) {
    return Response.json({
      ok: true,
      mode: 'dry-run',
      mailboxes_total: mailboxes.length,
      claimed_in_db: claimedAliases.size,
      orphans_found: orphans.length,
      orphans: orphans.slice(0, 100),
      skipped,
      note: 'Re-run with body { "confirm": true } to delete.',
    })
  }

  // 3. Delete each orphan and audit-log.
  let deleted = 0, failed = 0
  const errors = []
  for (const o of orphans) {
    try {
      await deleteMailbox(o.local_part)
      deleted++
      await sb.from('audit_log').insert({
        user_id: null,
        action: 'orphan_mailbox_delete',
        status: 'ok',
        detail: { local_part: o.local_part, created_at: o.created_at },
      }).catch(() => {})
    } catch (e) {
      failed++
      errors.push({ local_part: o.local_part, error: e.message })
      if (/→ 404/.test(e.message)) {
        // Already gone — count as success.
        deleted++
        failed--
      }
    }
  }

  return Response.json({
    ok: true,
    mode: 'execute',
    mailboxes_total: mailboxes.length,
    orphans_processed: orphans.length,
    deleted,
    failed,
    errors,
    skipped,
  })
}
