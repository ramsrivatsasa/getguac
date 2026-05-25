// Embedding refresh — populates the `embedding` column on receipt_items
// that don't have one yet, in batches of 50 (Gemini's batchEmbedContents limit).
//
// Call this endpoint manually or on a schedule (cron). It picks up where it
// left off via `embedding is null`, so it's resumable + idempotent.
//
// POST /api/embeddings/refresh   →   { embedded: 50, remaining: 1234 }

import { createClient } from '../../../../lib/supabase/server'
import { embedTexts, buildItemEmbedText } from '../../../../lib/embeddings'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH_SIZE = 50

export async function POST(request) {
  try {
    // Tighter rate limit — this is for admin/cron use, not user-driven
    const rl = rateLimit(rateKey(request, 'embed-refresh'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY required' }, { status: 500 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    // Fetch a batch of items missing an embedding. RLS already restricts to
    // the current user, but we also constrain via the receipts join to be explicit.
    const { data: items, error } = await sb
      .from('receipt_items')
      .select('id, item_name, sku, model, category, receipts!inner(user_id)')
      .is('embedding', null)
      .not('item_name', 'is', null)
      .eq('receipts.user_id', user.id)
      .limit(BATCH_SIZE)

    if (error) throw error
    if (!items || items.length === 0) {
      return Response.json({ embedded: 0, remaining: 0, message: 'All caught up' })
    }

    // Build the canonical embed text for each, then batch-embed
    const texts = items.map(i => buildItemEmbedText(i))
    const vectors = await embedTexts(texts, apiKey)

    if (vectors.length !== items.length) {
      throw new Error(`Embed count mismatch: got ${vectors.length}, expected ${items.length}`)
    }

    // Write back. Supabase doesn't have a bulk-update via list, so we issue
    // sequential single-row updates. Still fast for batches of 50.
    let ok = 0, fail = 0
    const now = new Date().toISOString()
    for (let i = 0; i < items.length; i++) {
      const { error: upErr } = await sb
        .from('receipt_items')
        .update({
          embedding: vectors[i],
          embedding_text: texts[i],
          embedded_at: now,
        })
        .eq('id', items[i].id)
      if (upErr) { fail++; console.error('[embed-refresh] update failed', items[i].id, upErr.message) }
      else ok++
    }

    // Count remaining
    const { count: remaining } = await sb
      .from('receipt_items')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null)
      .not('item_name', 'is', null)

    return Response.json({ embedded: ok, failed: fail, remaining: remaining ?? 0 })
  } catch (err) {
    console.error('[embeddings/refresh]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// GET — just report stats without modifying anything
export async function GET(request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const { count: total } = await sb
      .from('receipt_items')
      .select('id', { count: 'exact', head: true })
      .not('item_name', 'is', null)

    const { count: embedded } = await sb
      .from('receipt_items')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null)

    return Response.json({
      total: total ?? 0,
      embedded: embedded ?? 0,
      remaining: Math.max(0, (total ?? 0) - (embedded ?? 0)),
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
