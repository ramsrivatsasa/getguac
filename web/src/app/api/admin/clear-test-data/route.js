// POST /api/admin/clear-test-data
//
// Companion to /api/admin/import-test-data — wipes every receipt
// (and cascaded line items) tagged with validation_comment =
// '[TEST IMPORT]' for the signed-in user. Doesn't touch anything
// outside that tag, so a tester's real receipts are safe.

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'

const TEST_TAG = '[TEST IMPORT]'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'clear-test-data'), { limit: 10, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'Too many requests' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const sbAdmin = admin()

    // Find first so we can return a count of what's about to vanish.
    const { data: targets } = await sbAdmin
      .from('receipts')
      .select('id')
      .eq('user_id', user.id)
      .eq('validation_comment', TEST_TAG)

    const ids = (targets || []).map(r => r.id)
    if (ids.length === 0) {
      return Response.json({ ok: true, deleted: 0, message: 'No test data found to clear' })
    }

    // receipt_items FK has ON DELETE CASCADE so the items go too.
    const { error } = await sbAdmin
      .from('receipts')
      .delete()
      .in('id', ids)
    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true, deleted: ids.length })
  } catch (err) {
    console.error('[clear-test-data]', err)
    return Response.json({ error: err.message || 'clear failed' }, { status: 500 })
  }
}
