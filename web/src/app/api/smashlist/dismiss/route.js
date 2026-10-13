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
import { recordPredictionOutcome } from '../../../../lib/prediction-feedback'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const rl = await rateLimit(userRateKey(user.id, 'smashlist-dismiss'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const body = await request.json().catch(() => null)
    // Background suggestions have no shopping_list row until selected.
    // Resolve the key against this member's stored snapshot, never trust a
    // client-provided name or another member's suggestion.
    if (typeof body?.key === 'string' && body.key.length <= 300) {
      const { data: snapshot, error } = await sb.from('agent_snapshots').select('result,refreshed_at')
        .eq('user_id', user.id).eq('kind', 'shopping').maybeSingle()
      if (error) return Response.json({ error: 'Suggestions are unavailable. Retry shortly.' }, { status: 503 })
      const age = Date.now() - Date.parse(snapshot?.refreshed_at || '')
      if (!Number.isFinite(age) || age < -60_000 || age > 48 * 60 * 60_000) return Response.json({ error: 'Suggestions need a refresh before changing them.' }, { status: 409 })
      const suggestion = snapshot?.result?.data?.recommendations?.find(item => item.key === body.key)
      if (!suggestion) return Response.json({ error: 'Suggestion no longer available. Refresh the list.' }, { status: 404 })
      const { error: saveError } = await sb.from('smashlist_predict_dismissed')
        .upsert({ user_id: user.id, item_key: suggestion.key }, { onConflict: 'user_id,item_key' })
      if (saveError) return Response.json({ error: 'Could not save dismissal. Please retry.' }, { status: 503 })
      return Response.json({ ok: true, item_key: suggestion.key })
    }
    const checked = validate(body, { id: v.requiredString({ max: 64 }) })
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })

    // Fetch the row to get item_name + telemetry context. RLS already
    // restricts to the owner.
    const { data: row, error: rowErr } = await sb.from('shopping_list')
      .select('id, item_name, predicted, predicted_at')
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

    // Record the dismissal in prediction_outcomes so we can measure
    // the predictor's accuracy over time. Soft-fails if migration 045
    // hasn't been applied yet — the user-facing dismiss is already
    // complete by this point, telemetry is best-effort.
    if (row.predicted) {
      await recordPredictionOutcome(sb, user.id, row.id, 'dismissed', {
        itemKey,
        predictedAt: row.predicted_at,
      })
    }

    return Response.json({ ok: true, item_key: itemKey })
  } catch (err) {
    console.error('[smashlist/dismiss]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
