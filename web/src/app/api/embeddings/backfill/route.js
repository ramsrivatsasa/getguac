// One-shot embedding backfill for the signed-in user.
//
// Calls the same per-user batch logic as /api/embeddings/refresh in a loop
// until remaining=0 or we hit MAX_BATCHES. Vercel function timeout is 60s
// (Pro: 300s), so each call is bounded — clients can poll this endpoint
// repeatedly to fully backfill historical data without redeploying.
//
// Distinct from the cron path on /refresh because:
//   - This is user-driven (per-user button "embed all my items now")
//   - It loops multiple batches within one HTTP call
//   - It paces requests to stay under Gemini's per-minute quota
//
// POST /api/embeddings/backfill  →  { embedded, failed, remaining, batches }

import { createClient } from '../../../../lib/supabase/server'
import { embedTexts, buildItemEmbedText } from '../../../../lib/embeddings'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH_SIZE = 50
// Stop short of maxDuration so the final response can serialize. 50s leaves
// 10s of headroom on the default 60s Vercel free-tier ceiling.
const SOFT_DEADLINE_MS = 50_000
// Hard upper bound — even on Pro (300s) we don't want a runaway loop.
const MAX_BATCHES = 30
// Polite pause between Gemini batches. text-embedding-004 free tier permits
// ~1500 req/day with a per-minute cap; 1.5s between batches → ~40/min ceiling.
const PAUSE_MS = 1500

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchBatch(sb, userId) {
  const { data, error } = await sb
    .from('receipt_items')
    .select('id, item_name, sku, model, category, receipts!inner(user_id)')
    .is('embedding', null)
    .not('item_name', 'is', null)
    .eq('receipts.user_id', userId)
    .limit(BATCH_SIZE)
  if (error) throw error
  return data || []
}

async function writeVectors(sb, items, vectors, texts) {
  let ok = 0, fail = 0
  const now = new Date().toISOString()
  for (let i = 0; i < items.length; i++) {
    const { error } = await sb
      .from('receipt_items')
      .update({ embedding: vectors[i], embedding_text: texts[i], embedded_at: now })
      .eq('id', items[i].id)
    if (error) { fail++; console.error('[embed-backfill] update failed', items[i].id, error.message) }
    else ok++
  }
  return { ok, fail }
}

async function countRemaining(sb, userId) {
  const { count } = await sb
    .from('receipt_items')
    .select('id, receipts!inner(user_id)', { count: 'exact', head: true })
    .is('embedding', null)
    .not('item_name', 'is', null)
    .eq('receipts.user_id', userId)
  return count ?? 0
}

export async function POST(request) {
  try {
    // Tighter rate limit than /refresh — this endpoint is much more expensive.
    const rl = await rateLimit(rateKey(request, 'embed-backfill'), { limit: 2, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY required' }, { status: 500 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const startedAt = Date.now()
    let totalEmbedded = 0
    let totalFailed = 0
    let batches = 0

    for (let i = 0; i < MAX_BATCHES; i++) {
      if (Date.now() - startedAt > SOFT_DEADLINE_MS) break

      const items = await fetchBatch(sb, user.id)
      if (items.length === 0) break

      const texts = items.map(it => buildItemEmbedText(it))
      const vectors = await embedTexts(texts, apiKey)
      if (vectors.length !== items.length) {
        throw new Error(`Embed count mismatch: got ${vectors.length}, expected ${items.length}`)
      }
      const { ok, fail } = await writeVectors(sb, items, vectors, texts)
      totalEmbedded += ok
      totalFailed += fail
      batches++

      // Only pause if there's likely another batch coming.
      if (items.length === BATCH_SIZE && Date.now() - startedAt + PAUSE_MS < SOFT_DEADLINE_MS) {
        await sleep(PAUSE_MS)
      }
    }

    const remaining = await countRemaining(sb, user.id)
    return Response.json({
      embedded: totalEmbedded,
      failed: totalFailed,
      remaining,
      batches,
      done: remaining === 0,
      elapsed_ms: Date.now() - startedAt,
    })
  } catch (err) {
    console.error('[embeddings/backfill]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
