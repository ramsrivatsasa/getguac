// Data export — dumps every row the user owns as one JSON file. This is the
// "right to data portability" hook for GDPR / CCPA. Returns Content-Disposition
// attachment so the browser saves it directly.
//
// Embeddings (the 768-dim vectors) are excluded from the export by default —
// they're inferred data, take ~3 KB each, and aren't useful to humans. If the
// user ticks "include embeddings" we add them back in.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'
export const maxDuration = 60

const TABLES = [
  // [tableName, userIdColumn, extraJoin?]
  ['profiles',                'id'],
  ['user_privacy_settings',   'user_id'],
  ['payment_options',         'user_id'],
  ['receipts',                'user_id'],
  ['shopping_list',           'user_id'],
  ['guac_savings',            'user_id'],
  ['user_categories',         'user_id'],
  ['car_trips',               'user_id'],
  ['search_history',          'user_id'],
]

// Tables that filter by joining to receipts (no user_id column of their own).
// For these, we fetch the user's receipt_ids first then `in()`-filter.
const CHILD_TABLES = [
  'receipt_items',
  'receipt_refund_policies',
]

export async function POST(request) {
  try {
    const rl = rateLimit(rateKey(request, 'privacy-export'), { limit: 3, windowMs: 60 * 60 * 1000 })
    if (!rl.ok) return Response.json({ error: 'rate limited — export available 3x/hour' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const includeEmbeddings = Boolean(body?.include_embeddings)

    const out = {
      meta: {
        exported_at:  new Date().toISOString(),
        user_id:      user.id,
        user_email:   user.email,
        app:          'GetGuac',
        format:       'json-v1',
        note:         'This file contains every record GetGuac stores about you. Keep it safe.',
        embeddings_included: includeEmbeddings,
      },
      data: {},
    }

    for (const [table, col] of TABLES) {
      try {
        const { data, error } = await sb.from(table).select('*').eq(col, user.id)
        if (error) { out.data[table] = { error: error.message }; continue }
        out.data[table] = data || []
      } catch (e) {
        out.data[table] = { error: e.message }
      }
    }

    // Receipt children — fetch receipt_ids first
    const { data: receiptIds } = await sb.from('receipts').select('id').eq('user_id', user.id)
    const ids = (receiptIds || []).map(r => r.id)
    for (const child of CHILD_TABLES) {
      if (ids.length === 0) { out.data[child] = []; continue }
      try {
        let q = sb.from(child).select('*').in('receipt_id', ids)
        const { data, error } = await q
        if (error) { out.data[child] = { error: error.message }; continue }
        if (!includeEmbeddings && child === 'receipt_items') {
          out.data[child] = (data || []).map(({ embedding, embedding_text, embedded_at, ...rest }) => rest)
        } else {
          out.data[child] = data || []
        }
      } catch (e) {
        out.data[child] = { error: e.message }
      }
    }

    // Update last_export_at
    await sb.from('user_privacy_settings')
      .upsert({ user_id: user.id, last_export_at: new Date().toISOString() }, { onConflict: 'user_id' })

    // Audit log
    await sb.from('data_purge_log').insert({
      user_id: user.id, kind: 'export', category: 'all',
      rows_affected: Object.values(out.data).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0),
      details: { include_embeddings: includeEmbeddings },
    })

    const json = JSON.stringify(out, null, 2)
    const stamp = new Date().toISOString().slice(0, 10)
    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="getguac-export-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[privacy/export]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
