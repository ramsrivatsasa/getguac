// Retention sweeper — for each enabled retention window in user_privacy_settings,
// purge matching rows. Designed to be called from cron OR as a self-serve "Run
// retention now" button in the privacy panel.
//
// Two call modes:
//  - User-driven (default): runs for the calling user only.
//  - Cron / admin: pass `?all=1` AND header `X-Cron-Secret: <env CRON_SECRET>` to
//    iterate every user. Returns a per-user summary.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 60

const FIELD_TO_CATEGORY = {
  receipts_retention_days:       'receipts',
  receipt_items_retention_days:  'receipt_items',
  shopping_list_retention_days:  'shopping_list',
  car_trip_retention_days:       'car_trips',
  embeddings_retention_days:     'embeddings',
  search_history_retention_days: 'search_history',
}

async function sweepOneUser(sb, userId, settings) {
  if (!settings?.auto_purge_enabled) return { skipped: 'auto_purge_disabled' }

  // Group categories by retention-days so we issue ONE RPC per distinct window
  const byDays = new Map()
  for (const [field, category] of Object.entries(FIELD_TO_CATEGORY)) {
    const days = settings[field]
    if (days == null || days <= 0) continue
    if (!byDays.has(days)) byDays.set(days, [])
    byDays.get(days).push(category)
  }
  if (byDays.size === 0) return { skipped: 'no_retention_windows' }

  const summary = []
  for (const [days, categories] of byDays) {
    const { data, error } = await sb.rpc('purge_user_data', {
      p_categories: categories,
      p_older_than_days: days,
    })
    if (error) {
      summary.push({ days, categories, error: error.message })
      continue
    }
    summary.push({ days, categories, breakdown: data || [] })

    // Audit log per sweep step
    const sum = (data || []).reduce((n, r) => n + (r.rows_deleted || 0), 0)
    await sb.from('data_purge_log').insert({
      user_id: userId, kind: 'retention',
      category: categories.join(','),
      rows_affected: sum,
      details: { older_than_days: days, breakdown: data },
    })
  }

  await sb.from('user_privacy_settings')
    .update({ last_purge_at: new Date().toISOString() })
    .eq('user_id', userId)

  return { ok: true, summary }
}

export async function POST(request) {
  try {
    const url = new URL(request.url)
    const isAll = url.searchParams.get('all') === '1'

    if (isAll) {
      // Admin / cron mode
      const secret = process.env.CRON_SECRET
      const provided = request.headers.get('x-cron-secret')
      if (!secret || provided !== secret) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Use a service-role client to bypass RLS for the iteration. The route
      // is gated by CRON_SECRET so this is OK.
      // NOTE: This requires SUPABASE_SERVICE_ROLE_KEY to be set; if it isn't,
      // the cron mode is effectively disabled.
      return Response.json({
        error: 'Cron mode requires SUPABASE_SERVICE_ROLE_KEY and is not wired in this build.',
      }, { status: 501 })
    }

    // User mode — rate-limited so it can't be spammed
    const rl = rateLimit(rateKey(request, 'privacy-sweep'), { limit: 4, windowMs: 60 * 60 * 1000 })
    if (!rl.ok) return Response.json({ error: 'rate limited — 4 sweeps/hour max' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const { data: settings } = await sb
      .from('user_privacy_settings').select('*').eq('user_id', user.id).maybeSingle()

    const result = await sweepOneUser(sb, user.id, settings || {})
    return Response.json(result)
  } catch (err) {
    console.error('[privacy/sweep]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
