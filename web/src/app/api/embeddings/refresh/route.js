// Embedding refresh — populates the `embedding` column on receipt_items
// that don't have one yet, in batches of 50 (Gemini's batchEmbedContents limit).
//
// Two execution paths:
//   - User (POST, authenticated): does ONE batch for the signed-in user
//     and returns counts. Resumable across calls.
//   - Cron (GET/POST with Bearer/x-cron-secret matching $CRON_SECRET):
//     iterates active users via active_user_ids RPC and does ONE batch each.
//     Designed to run frequently (every 6h via vercel.json) so embeddings
//     stay current before the daily smashlist predict cron at 06:00 UTC.

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { embedTexts, buildItemEmbedText } from '../../../../lib/embeddings'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH_SIZE = 50

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Embed ONE batch (up to BATCH_SIZE rows) for a single user. Returns counts.
 * Used by both the user path and the cron loop — the heavy lifting lives here.
 */
async function refreshOneBatchForUser(sb, userId, apiKey) {
  const { data: items, error } = await sb
    .from('receipt_items')
    .select('id, item_name, sku, model, category, receipts!inner(user_id)')
    .is('embedding', null)
    .not('item_name', 'is', null)
    .eq('receipts.user_id', userId)
    .limit(BATCH_SIZE)
  if (error) throw error
  if (!items || items.length === 0) return { embedded: 0, failed: 0 }

  const texts = items.map(i => buildItemEmbedText(i))
  const vectors = await embedTexts(texts, apiKey)
  if (vectors.length !== items.length) {
    throw new Error(`Embed count mismatch: got ${vectors.length}, expected ${items.length}`)
  }

  let ok = 0, fail = 0
  const now = new Date().toISOString()
  for (let i = 0; i < items.length; i++) {
    const { error: upErr } = await sb
      .from('receipt_items')
      .update({ embedding: vectors[i], embedding_text: texts[i], embedded_at: now })
      .eq('id', items[i].id)
    if (upErr) { fail++; console.error('[embed-refresh] update failed', items[i].id, upErr.message) }
    else ok++
  }
  return { embedded: ok, failed: fail }
}

async function countRemainingForUser(sb, userId) {
  const { count } = await sb
    .from('receipt_items')
    .select('id, receipts!inner(user_id)', { count: 'exact', head: true })
    .is('embedding', null)
    .not('item_name', 'is', null)
    .eq('receipts.user_id', userId)
  return count ?? 0
}

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
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY required' }, { status: 500 })

    const authHeader = request.headers.get('authorization') || ''
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
    const xHeader = request.headers.get('x-cron-secret') || ''
    const cronSecret = bearer || xHeader
    const isCron = !!cronSecret && cronSecret === process.env.CRON_SECRET

    if (isCron) {
      const sbAdmin = admin()
      const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      let totalEmbedded = 0
      let totalFailed = 0
      let users = 0
      const errors = []
      for await (const uid of iterateActiveUsers(sbAdmin, since)) {
        users++
        try {
          const r = await refreshOneBatchForUser(sbAdmin, uid, apiKey)
          totalEmbedded += r.embedded
          totalFailed += r.failed
        } catch (e) {
          errors.push({ user_id: uid, error: e.message })
        }
      }
      return Response.json({
        ok: true, mode: 'cron', users,
        embedded: totalEmbedded, failed: totalFailed, errors,
      })
    }

    // User-driven single-batch path.
    const rl = await rateLimit(rateKey(request, 'embed-refresh'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const r = await refreshOneBatchForUser(sb, user.id, apiKey)
    const remaining = await countRemainingForUser(sb, user.id)
    return Response.json({ embedded: r.embedded, failed: r.failed, remaining })
  } catch (err) {
    console.error('[embeddings/refresh]', err)
    // Postgres "column ... does not exist" → migration 014 wasn't
    // applied. Tell the user explicitly so they don't retry into
    // the rate limiter.
    if (err?.code === '42703' || /column .* does not exist/i.test(err.message || '')) {
      return Response.json({
        error: 'Embeddings table not set up. Apply migration 014 (embeddings) in Supabase, then retry.',
        migration_needed: '014_embeddings.sql',
      }, { status: 503 })
    }
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) { return handle(request) }
export async function GET(request)  { return handle(request) }
