// Product-alias management for the signed-in user.
//
//   GET    /api/smashlist/aliases             → list rows for current user
//   PATCH  /api/smashlist/aliases             → { alias_key, status }
//                                               status ∈ 'confirmed' | 'rejected' | 'auto'
//
// 'confirmed' means "yes, these are the same product, keep merging them."
// 'rejected' means "no, never merge these again." The predictor honors both
// on every subsequent cron run — confirmed rows force the merge, rejected
// rows are added to a skip-set that mergeBySimilarity() respects.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey, validate, v } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'

const ALLOWED_STATUSES = new Set(['confirmed', 'rejected', 'auto'])

export async function GET() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const { data, error } = await sb.from('product_aliases')
      .select('alias_key, canonical_key, canonical_display_name, similarity, status, source, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(500)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ aliases: data || [] })
  } catch (err) {
    console.error('[smashlist/aliases GET]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const rl = await rateLimit(userRateKey(user.id, 'aliases-patch'), { limit: 60, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const checked = validate(body, {
      alias_key: v.requiredString({ max: 300 }),
      status:    v.requiredString({ max: 16 }),
    })
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })
    if (!ALLOWED_STATUSES.has(checked.data.status)) {
      return Response.json({ error: 'invalid status' }, { status: 400 })
    }

    const { data, error } = await sb.from('product_aliases')
      .update({ status: checked.data.status, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('alias_key', checked.data.alias_key)
      .select()
      .single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, alias: data })
  } catch (err) {
    console.error('[smashlist/aliases PATCH]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
