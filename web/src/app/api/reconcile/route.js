// Reconciliation sweep — pair `from_statement = true` rows with the
// corresponding real receipts by date / amount / fuzzy store-name. Wraps the
// `reconcile_all` and `reconcile_pair` RPCs created in migration 016.
//
// POST                              → run reconcile_all() for the user
// POST { batch: <statement_import_id> } → run reconcile_statement_batch(...)
// POST { pair: { a, b } }           → manually pair two receipts
// POST { unreconcile: <receipt_id> } → break an existing pair

import { createClient } from '../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../lib/apiGuard'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const rl = rateLimit(rateKey(request, 'reconcile'), { limit: 10, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await request.json().catch(() => ({}))

    if (body?.unreconcile) {
      const { error } = await sb.rpc('unreconcile', { p_id: body.unreconcile })
      if (error) throw error
      return Response.json({ ok: true })
    }

    if (body?.pair?.a && body?.pair?.b) {
      const { error } = await sb.rpc('reconcile_pair', { p_a: body.pair.a, p_b: body.pair.b })
      if (error) throw error
      return Response.json({ ok: true, paired: 1 })
    }

    if (body?.batch) {
      const { data, error } = await sb.rpc('reconcile_statement_batch', { p_import_id: body.batch })
      if (error) throw error
      return Response.json({ ok: true, paired: Number(data || 0) })
    }

    // Default: full sweep
    const { data, error } = await sb.rpc('reconcile_all')
    if (error) throw error
    return Response.json({ ok: true, paired: Number(data || 0) })
  } catch (err) {
    console.error('[reconcile]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
