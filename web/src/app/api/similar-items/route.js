// Semantic similar-items search — uses the embeddings populated by /api/embeddings/refresh.
// Given a query string, returns the user's receipt_items most semantically
// similar to it. No exact name match needed — "lid" finds bucket lids, jar lids, etc.
//
// POST { query: "lavender plant" }   →   { items: [{ id, item_name, sku, similarity }, ...] }

import { createClient } from '../../../lib/supabase/server'
import { embedOne } from '../../../lib/embeddings'
import { rateLimit, rateKey, validate, v } from '../../../lib/apiGuard'
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'similar-items'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY required' }, { status: 500 })

    const body = await request.json().catch(() => null)
    const checked = validate(body, {
      query: v.requiredString({ max: 200 }),
    })
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    // Embed the query
    const vec = await embedOne(checked.data.query, apiKey)
    if (!vec) return Response.json({ items: [] })

    // RPC the semantic match (defined in migration_014)
    const { data, error } = await sb.rpc('match_items', {
      query_embedding: vec,
      match_count: 10,
      similarity_threshold: 0.3,
    })
    if (error) throw error

    return Response.json({ items: data || [] })
  } catch (err) {
    console.error('[similar-items]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
