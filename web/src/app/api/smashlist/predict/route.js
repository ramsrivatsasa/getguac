// GuacWizard predictive Smashlist runner.
//
// POST /api/smashlist/predict
//   - As a signed-in user: predicts for the current user only.
//   - As cron (header `x-cron-secret: $CRON_SECRET`): iterates every user
//     with at least one receipt and predicts for each.
//
// For each prediction we insert into `shopping_list` with predicted=true,
// approved=false. The UI surfaces approved=false predicted rows separately
// from the user's own entries.
//
// Idempotent: if an un-approved predicted row already exists for the
// (user, item key) we skip. Approved-but-not-yet-sent rows also count as
// "still pending" so we don't double-list.

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { predict, _internals } from '../../../../lib/predict-smashlist'

export const runtime = 'nodejs'
export const maxDuration = 60

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function fetchUserItems(sbAdmin, userId) {
  // Pull every non-returned receipt_item for the user, joined to its
  // receipt for the transaction date. Cap at 3000 rows — enough for
  // multi-year cadence analysis without blowing memory.
  const { data, error } = await sbAdmin
    .from('receipt_items')
    .select('item_name, qty, price, category, health_tier, purchase_date, returned, receipts!inner(user_id, date, store_id)')
    .eq('returned', false)
    .eq('receipts.user_id', userId)
    .order('purchase_date', { ascending: false })
    .limit(3000)
  if (error) throw error
  return (data || []).map(r => ({
    item_name: r.item_name,
    qty: r.qty,
    price: r.price,
    category: r.category,
    health_tier: r.health_tier,
    // Prefer the line's own purchase_date, fall back to the receipt date.
    purchase_date: r.purchase_date || r.receipts?.date,
    store_id: r.receipts?.store_id,
  }))
}

async function fetchExistingPending(sbAdmin, userId) {
  // Anything already in the list and not yet sent counts as "still pending"
  // so we don't re-predict the same item twice.
  const { data } = await sbAdmin
    .from('shopping_list')
    .select('item_name, predicted, approved, sent_to_store')
    .eq('user_id', userId)
    .eq('sent_to_store', false)
  return new Set((data || []).map(r => _internals.normalizeKey(r.item_name)))
}

async function fetchDismissed(sbAdmin, userId) {
  const { data } = await sbAdmin.from('smashlist_predict_dismissed')
    .select('item_key').eq('user_id', userId)
  return new Set((data || []).map(r => r.item_key))
}

async function predictForUser(sbAdmin, userId) {
  const rows = await fetchUserItems(sbAdmin, userId)
  if (rows.length === 0) return { user_id: userId, predictions: 0, inserted: 0 }

  const existing = await fetchExistingPending(sbAdmin, userId)
  const dismissed = await fetchDismissed(sbAdmin, userId)

  const all = predict(rows, { dismissedKeys: dismissed })
  const fresh = all.filter(p => !existing.has(p.key))

  if (fresh.length === 0) {
    return { user_id: userId, predictions: all.length, inserted: 0 }
  }

  const nowIso = new Date().toISOString()
  const inserts = fresh.map(p => ({
    user_id: userId,
    item_name: p.item_name,
    qty: p.qty || 1,
    price: p.price,
    store_name_id: p.store_id,
    list_name: p.list_name,
    category: p.category,
    health_tier: p.health_tier,
    predicted: true,
    approved: false,
    predicted_reason: p.predicted_reason,
    predicted_at: nowIso,
    predicted_avg_cadence_days: p.predicted_avg_cadence_days,
    predicted_last_purchase_date: p.predicted_last_purchase_date,
    frequency: p.predicted_avg_cadence_days <= 10 ? 'Weekly' : (p.predicted_avg_cadence_days <= 18 ? 'Biweekly' : 'Monthly'),
  }))

  const { error: insErr } = await sbAdmin.from('shopping_list').insert(inserts)
  if (insErr) {
    console.error('[smashlist/predict] insert failed', { userId, msg: insErr.message })
    return { user_id: userId, predictions: all.length, inserted: 0, error: insErr.message }
  }
  return { user_id: userId, predictions: all.length, inserted: inserts.length }
}

async function handle(request) {
  try {
    // Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. Manual
    // triggers can pass `x-cron-secret` instead for parity with other cron
    // endpoints in this project. Either matches the CRON_SECRET env var.
    const auth = request.headers.get('authorization') || ''
    const bearer = auth.replace(/^Bearer\s+/i, '').trim()
    const xHeader = request.headers.get('x-cron-secret') || ''
    const cronSecret = bearer || xHeader
    const isCron = !!cronSecret && cronSecret === process.env.CRON_SECRET

    const sbAdmin = admin()

    if (isCron) {
      // Iterate every user with at least one receipt in the last 180 days
      // (active-user heuristic — dormant accounts don't need predictions).
      const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const { data: activeUsers, error } = await sbAdmin
        .from('receipts')
        .select('user_id')
        .gte('date', since)
        .limit(10000)
      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }
      const userIds = [...new Set((activeUsers || []).map(r => r.user_id))]
      const results = []
      for (const uid of userIds) {
        try {
          results.push(await predictForUser(sbAdmin, uid))
        } catch (e) {
          results.push({ user_id: uid, error: e.message })
        }
      }
      return Response.json({
        ok: true,
        mode: 'cron',
        users: results.length,
        total_inserted: results.reduce((s, r) => s + (r.inserted || 0), 0),
        results,
      })
    }

    // User-triggered path — require an active session.
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const result = await predictForUser(sbAdmin, user.id)
    return Response.json({ ok: true, mode: 'user', ...result })
  } catch (err) {
    console.error('[smashlist/predict]', err)
    return Response.json({ error: err.message || 'Predict failed' }, { status: 500 })
  }
}

// Vercel cron sends GET. Users hitting "Predict now" from the UI send POST.
export async function GET(request)  { return handle(request) }
export async function POST(request) { return handle(request) }
