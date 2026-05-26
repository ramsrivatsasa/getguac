// Selective data deletion. Body:
// {
//   categories: ["receipts","embeddings","shopping_list",...],   // what to delete
//   older_than_days: number|null,                                  // null = ALL (terminal)
//   confirm_phrase: "DELETE MY DATA"                               // for wipe-all only
// }
//
// Routing logic:
//  - Each item in `categories` maps to a slice of purge_user_data() in the DB.
//  - "all" is a meta-category — expands to every table.
//  - When older_than_days is null, requires confirm_phrase === "DELETE MY DATA"
//    (so reading "I want to clear everything" is intentional, not a misfire).

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_CATEGORIES = [
  'receipts', 'receipt_items', 'embeddings', 'shopping_list',
  'car_trips', 'search_history', 'payments',
]

const CONFIRM_PHRASE = 'DELETE MY DATA'

export async function POST(request) {
  try {
    // Hard rate limit — destructive endpoint
    const rl = await rateLimit(rateKey(request, 'privacy-delete'), { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.ok) return Response.json({ error: 'rate limited — 10 deletions/hour max' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

    const olderThanDays = body.older_than_days == null ? null : Math.max(0, Math.floor(Number(body.older_than_days)))
    const isWipe = olderThanDays === null

    let categories
    if (Array.isArray(body.categories) && body.categories.includes('all')) {
      categories = [...VALID_CATEGORIES]
    } else if (Array.isArray(body.categories)) {
      categories = body.categories.filter(c => VALID_CATEGORIES.includes(c))
    } else {
      return Response.json({ error: 'categories[] required' }, { status: 400 })
    }
    if (categories.length === 0) return Response.json({ error: 'No valid categories' }, { status: 400 })

    if (isWipe && body.confirm_phrase !== CONFIRM_PHRASE) {
      return Response.json({
        error: `To permanently delete data with no time limit, set confirm_phrase to exactly "${CONFIRM_PHRASE}".`,
      }, { status: 400 })
    }

    const { data, error } = await sb.rpc('purge_user_data', {
      p_categories: categories,
      p_older_than_days: olderThanDays,
    })

    if (error) {
      console.error('[privacy/delete] rpc failed:', error.message)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const totals = (data || []).map(r => ({ category: r.category, rows_deleted: r.rows_deleted }))
    const sum = totals.reduce((n, r) => n + (r.rows_deleted || 0), 0)

    await sb.from('data_purge_log').insert({
      user_id: user.id,
      kind: isWipe ? 'wipe-all' : 'manual',
      category: categories.join(','),
      rows_affected: sum,
      details: { older_than_days: olderThanDays, breakdown: totals },
    })

    return Response.json({ ok: true, totals, total_rows: sum })
  } catch (err) {
    console.error('[privacy/delete]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
