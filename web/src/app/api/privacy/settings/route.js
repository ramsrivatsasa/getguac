// GET  → current privacy settings (auto-seeded if missing)
// PATCH → partial update of privacy settings

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'

const ALLOWED_FIELDS = new Set([
  'receipts_retention_days',
  'receipt_items_retention_days',
  'shopping_list_retention_days',
  'car_trip_retention_days',
  'embeddings_retention_days',
  'search_history_retention_days',
  'auto_purge_enabled',
  'scrub_payment_last4',
  'scrub_addresses',
  'block_telemetry',
  'disallow_ai_training',
])

function sanitize(input) {
  const out = {}
  if (!input || typeof input !== 'object') return out
  for (const [k, v] of Object.entries(input)) {
    if (!ALLOWED_FIELDS.has(k)) continue
    if (k.endsWith('_days')) {
      if (v === null || v === '' || v === undefined) { out[k] = null; continue }
      const n = Math.floor(Number(v))
      if (!Number.isFinite(n) || n < 0 || n > 36500) continue
      out[k] = n
    } else {
      out[k] = Boolean(v)
    }
  }
  return out
}

export async function GET(request) {
  try {
    const rl = rateLimit(rateKey(request, 'privacy-get'), { limit: 60, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    let { data, error } = await sb
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    // Seed row if the trigger hasn't run yet
    if (!data) {
      const seed = await sb.from('user_privacy_settings').insert({ user_id: user.id }).select('*').single()
      if (seed.error) throw seed.error
      data = seed.data
    }

    return Response.json({ settings: data })
  } catch (err) {
    console.error('[privacy/settings GET]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const rl = rateLimit(rateKey(request, 'privacy-patch'), { limit: 30, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const patch = sanitize(body)
    if (Object.keys(patch).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Upsert in case the row doesn't exist yet
    const { data, error } = await sb
      .from('user_privacy_settings')
      .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) throw error
    return Response.json({ settings: data })
  } catch (err) {
    console.error('[privacy/settings PATCH]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
