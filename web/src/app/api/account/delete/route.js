// POST /api/account/delete  — terminal "delete my entire GetGuac account".
//
// Body: { confirm_phrase: "DELETE MY ACCOUNT" }
//
// Effect, in order, ALL via the service-role client (RLS bypassed because
// we need to reach into auth.users + cross-table profiles ops):
//   1. Read profile to find email_alias (so we know what Migadu mailbox to delete).
//   2. Delete the upstream Migadu mailbox via the admin API. Best-effort —
//      a Migadu API failure doesn't block the rest of the cleanup, because
//      the user has explicitly asked to be deleted. The orphan-sweep cron
//      (see /api/admin/orphan-mailbox-sweep) picks up anything missed.
//   3. Purge every user-data table via the existing purge_user_data() RPC
//      (receipts, items, embeddings, shopping_list, car_trips, search,
//      payments, plus profiles + email_messages).
//   4. Delete the auth.users row itself. After this the user is signed out.
//
// Rate-limited 3/hour/IP — accidental double-clicks shouldn't matter
// (idempotent) but burst protection is cheap.

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '../../../../lib/supabase/server'
import { deleteMailbox } from '../../../../lib/migadu'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 30

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  const rl = await rateLimit(rateKey(request, 'account-delete'), { limit: 3, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: 'Rate limited — 3 deletions/hour' }, { status: 429 })

  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body.confirm_phrase !== CONFIRM_PHRASE) {
    return Response.json({
      error: `To permanently delete your account, set confirm_phrase to exactly "${CONFIRM_PHRASE}".`,
    }, { status: 400 })
  }

  const a = admin()
  const summary = {
    user_id: user.id,
    mailbox_deleted: false,
    mailbox_error: null,
    rows_purged: 0,
    auth_user_deleted: false,
  }

  // 1. Read profile so we know the email_alias.
  const { data: prof } = await a
    .from('profiles')
    .select('email_alias, email_inbox_provisioned')
    .eq('id', user.id)
    .maybeSingle()

  // 2. Migadu mailbox cleanup. Best-effort.
  if (prof?.email_alias && prof?.email_inbox_provisioned
      && process.env.MIGADU_API_KEY) {
    try {
      await deleteMailbox(prof.email_alias)
      summary.mailbox_deleted = true
    } catch (e) {
      // 404 = already gone (someone deleted from Migadu UI). Treat as success.
      if (/→ 404/.test(e.message)) {
        summary.mailbox_deleted = true
        summary.mailbox_error = 'already-gone'
      } else {
        summary.mailbox_error = e.message
        // Don't fail the account delete — orphan-sweep will retry.
        console.warn('[account/delete] Migadu deleteMailbox failed:', e.message)
      }
    }
  }

  // 3. Purge user-data tables via the existing RPC.
  try {
    const { data: purge } = await a.rpc('purge_user_data', {
      p_categories: ['receipts', 'receipt_items', 'embeddings', 'shopping_list',
        'car_trips', 'search_history', 'payments'],
      p_older_than_days: null,
    })
    summary.rows_purged = (purge || []).reduce((n, r) => n + (r.rows_deleted || 0), 0)
  } catch (e) {
    console.warn('[account/delete] purge_user_data failed:', e.message)
  }

  // 4. Drop email_messages + profile row last (purge_user_data may not cover
  // every table by design; we belt-and-suspenders these).
  await a.from('email_messages').delete().eq('user_id', user.id)
  await a.from('profiles').delete().eq('id', user.id)

  // 5. Audit-log the deletion before the user row goes away (FK cascade
  // would null it out, but we want to keep the record for compliance).
  await a.from('audit_log').insert({
    user_id: user.id,
    action: 'account_delete',
    status: 'ok',
    detail: summary,
  }).catch(() => { /* log failure shouldn't block delete */ })

  // 6. The big one — drop auth.users. After this the JWT in the user's
  // cookie is invalid; their next request gets a 401.
  try {
    const { error } = await a.auth.admin.deleteUser(user.id)
    if (error) throw error
    summary.auth_user_deleted = true
  } catch (e) {
    console.error('[account/delete] auth.admin.deleteUser failed:', e.message)
    return Response.json({
      ok: false,
      error: `Failed to delete auth user: ${e.message}`,
      summary,
    }, { status: 500 })
  }

  return Response.json({ ok: true, summary })
}
