// Dismiss a predicted Smashlist item.
//
// Two effects:
//   1. Insert the item's normalized key into smashlist_predict_dismissed so
//      future predict runs skip it. Deleting alone wouldn't be enough — the
//      cron would just re-add it tomorrow.
//   2. Delete the shopping_list row so it disappears from the UI immediately.
//
// POST /api/smashlist/dismiss  { id: uuid }
//   id is the shopping_list row id. We look up the item_name from it (so the
//   client doesn't need to know the normalized form) and dismiss by that key.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey, validate, v } from '../../../../lib/apiGuard'
import { _internals } from '../../../../lib/predict-smashlist'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const rl = await rateLimit(userRateKey(user.id, 'smashlist-dismiss'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const checked = validate(body, { id: v.requiredString({ max: 64 }) })
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })

    // Fetch the row to get item_name. RLS already restricts to the owner.
    const { data: row, error: rowErr } = await sb.from('shopping_list')
      .select('id, item_name, predicted')
      .eq('id', checked.data.id)
      .single()
    if (rowErr || !row) return Response.json({ error: 'Item not found' }, { status: 404 })

    const itemKey = _internals.normalizeKey(row.item_name)
    if (!itemKey) return Response.json({ error: 'Invalid item' }, { status: 400 })

    // Upsert into dismissed so the next cron skips this product.
    const { error: insErr } = await sb.from('smashlist_predict_dismissed')
      .upsert({ user_id: user.id, item_key: itemKey }, { onConflict: 'user_id,item_key' })
    if (insErr) {
      console.error('[smashlist/dismiss] dismiss upsert failed', insErr.message)
      return Response.json({ error: insErr.message }, { status: 500 })
    }

    // Remove from the visible list.
    const { error: delErr } = await sb.from('shopping_list').delete().eq('id', checked.data.id)
    if (delErr) {
      console.error('[smashlist/dismiss] delete failed', delErr.message)
      return Response.json({ error: delErr.message }, { status: 500 })
    }

    return Response.json({ ok: true, item_key: itemKey })
  } catch (err) {
    console.error('[smashlist/dismiss]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
