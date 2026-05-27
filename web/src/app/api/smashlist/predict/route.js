// GuacWizard predictive Smashlist runner.
//
// POST /api/smashlist/predict
//   - As a signed-in user: predicts for the current user only.
//   - As cron (header `x-cron-secret` or Bearer matching $CRON_SECRET):
//     iterates every active user via the active_user_ids RPC (cursor-based,
//     not capped at 10K like the old .limit() pattern) and predicts each.
//
// Pipeline per user:
//   1. Fetch receipt_items (incl. embedding) + existing pending list rows
//      + dismissed keys + persisted aliases (auto + confirmed, NOT rejected).
//   2. Run predict() — string-aggregate, then centroid-merge small groups
//      into large ones at cosine ≥ MERGE_THRESHOLD.
//   3. Upsert any NEW auto-merge decisions into product_aliases (status=auto).
//   4. Insert predictions into shopping_list (predicted=true, approved=false).
//
// Idempotent: if a pending predicted row already exists for the same key,
// the prediction is skipped. Existing aliases are honored on the next run
// so the same group structure recomputes deterministically.

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
  // Pull non-returned receipt_items joined to receipts for the transaction
  // date. `embedding` is included so the centroid-merge pass can run; rows
  // without an embedding still participate via string-key aggregation.
  const { data, error } = await sbAdmin
    .from('receipt_items')
    .select('item_name, qty, price, category, health_tier, purchase_date, returned, embedding, receipts!inner(user_id, date, store_id)')
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
    purchase_date: r.purchase_date || r.receipts?.date,
    store_id: r.receipts?.store_id,
    // pgvector serializes as a string like "[0.1,0.2,...]" through PostgREST.
    // Parse once here so the predictor sees a real number[].
    embedding: parseEmbedding(r.embedding),
  }))
}

function parseEmbedding(raw) {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    // Supabase JS returns pgvector as a JSON-array string like "[0.1, 0.2, ...]"
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : null
    } catch { return null }
  }
  return null
}

async function fetchExistingPending(sbAdmin, userId) {
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

async function fetchAliases(sbAdmin, userId) {
  // 'auto' + 'confirmed' redirect aliases. 'rejected' rows go into rejectedPairs
  // so the merge pass won't recreate the same false merge over and over.
  const { data } = await sbAdmin.from('product_aliases')
    .select('alias_key, canonical_key, status')
    .eq('user_id', userId)
  const aliases = new Map()
  const rejectedPairs = new Set()
  for (const r of data || []) {
    if (r.status === 'rejected') rejectedPairs.add(`${r.alias_key}|${r.canonical_key}`)
    else aliases.set(r.alias_key, r.canonical_key)
  }
  return { aliases, rejectedPairs }
}

async function upsertNewAliases(sbAdmin, userId, newAliases) {
  if (!newAliases.length) return 0
  const rows = newAliases.map(a => ({
    user_id: userId,
    alias_key: a.alias_key,
    canonical_key: a.canonical_key,
    canonical_display_name: a.canonical_display_name,
    similarity: a.similarity,
    status: 'auto',
    source: 'embedding',
    updated_at: new Date().toISOString(),
  }))
  // onConflict on (user_id, alias_key) — refreshes similarity / canonical
  // each run without overwriting a user's 'confirmed' or 'rejected' status.
  // We filter: never overwrite a confirmed/rejected row by only upserting
  // rows where the existing status is 'auto' or absent. Cheapest correct
  // approach: pre-fetch which alias_keys are user-locked.
  const { data: locked } = await sbAdmin.from('product_aliases')
    .select('alias_key')
    .eq('user_id', userId)
    .in('status', ['confirmed', 'rejected'])
  const lockedSet = new Set((locked || []).map(r => r.alias_key))
  const safeRows = rows.filter(r => !lockedSet.has(r.alias_key))
  if (!safeRows.length) return 0
  const { error } = await sbAdmin.from('product_aliases')
    .upsert(safeRows, { onConflict: 'user_id,alias_key' })
  if (error) {
    console.error('[smashlist/predict] alias upsert failed', { userId, msg: error.message })
    return 0
  }
  return safeRows.length
}

async function predictForUser(sbAdmin, userId) {
  const rows = await fetchUserItems(sbAdmin, userId)
  if (rows.length === 0) return { user_id: userId, predictions: 0, inserted: 0, aliases_added: 0 }

  const existing = await fetchExistingPending(sbAdmin, userId)
  const dismissed = await fetchDismissed(sbAdmin, userId)
  const { aliases, rejectedPairs } = await fetchAliases(sbAdmin, userId)

  const { predictions, newAliases } = predict(rows, {
    dismissedKeys: dismissed,
    aliases,
    rejectedPairs,
  })
  const aliasesAdded = await upsertNewAliases(sbAdmin, userId, newAliases)

  const fresh = predictions.filter(p => !existing.has(p.key))
  if (fresh.length === 0) {
    return { user_id: userId, predictions: predictions.length, inserted: 0, aliases_added: aliasesAdded }
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
    return { user_id: userId, predictions: predictions.length, inserted: 0, aliases_added: aliasesAdded, error: insErr.message }
  }
  return { user_id: userId, predictions: predictions.length, inserted: inserts.length, aliases_added: aliasesAdded }
}

// Cursor-based active-user iterator. Replaces the old
//   .from('receipts').select('user_id').gte('date', since).limit(10000)
// pattern which silently capped at 10K receipt rows (not 10K users).
async function* iterateActiveUsers(sbAdmin, sinceDate, pageSize = 500) {
  let cursor = null
  for (;;) {
    const { data, error } = await sbAdmin.rpc('active_user_ids', {
      since_date: sinceDate,
      after_user_id: cursor,
      page_size: pageSize,
    })
    if (error) throw error
    if (!data?.length) return
    for (const row of data) {
      cursor = row.user_id
      yield row.user_id
    }
    if (data.length < pageSize) return
  }
}

async function handle(request) {
  try {
    const auth = request.headers.get('authorization') || ''
    const bearer = auth.replace(/^Bearer\s+/i, '').trim()
    const xHeader = request.headers.get('x-cron-secret') || ''
    const cronSecret = bearer || xHeader
    const isCron = !!cronSecret && cronSecret === process.env.CRON_SECRET

    const sbAdmin = admin()

    if (isCron) {
      const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const results = []
      let totalInserted = 0
      let totalAliases = 0
      for await (const uid of iterateActiveUsers(sbAdmin, since)) {
        try {
          const r = await predictForUser(sbAdmin, uid)
          totalInserted += r.inserted || 0
          totalAliases += r.aliases_added || 0
          results.push(r)
        } catch (e) {
          results.push({ user_id: uid, error: e.message })
        }
      }
      return Response.json({
        ok: true,
        mode: 'cron',
        users: results.length,
        total_inserted: totalInserted,
        total_aliases_added: totalAliases,
        // Return only error rows in the cron summary — full per-user listing
        // gets impractical past a few hundred users.
        errors: results.filter(r => r.error),
      })
    }

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

export async function GET(request)  { return handle(request) }
export async function POST(request) { return handle(request) }
