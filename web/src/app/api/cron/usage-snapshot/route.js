// Daily usage snapshot — reads cheap cardinality from Supabase tables
// + writes them into usage_metrics so the /admin/cost dashboard has a
// rolling history without us paying for a metrics SaaS.
//
// Wired in vercel.json with a daily schedule. The route fans out a
// handful of count(*) queries via the service role, no per-row scan.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

async function count(sb, table) {
  const { count: c, error } = await sb.from(table).select('id', { count: 'exact', head: true })
  if (error) return null
  return c ?? 0
}

async function countYesterday(sb, table, col = 'created_at') {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: c, error } = await sb
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte(col, since)
  if (error) return null
  return c ?? 0
}

export async function GET(req) {
  // Vercel cron sends a header so we can trust the caller; refuse other invokes.
  if (req.headers.get('x-vercel-cron') !== '1' && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'cron-only' }, { status: 401 })
  }

  const sb = admin()

  // Total cardinality (counts the lifetime size of each table — cheapest
  // way to see if the Supabase free-tier row-count limit is getting close).
  const totals = {
    receipts: await count(sb, 'receipts'),
    receipt_items: await count(sb, 'receipt_items'),
    profiles: await count(sb, 'profiles'),
    user_connections: await count(sb, 'user_connections'),
    referrals: await count(sb, 'referrals'),
  }

  // Net-new in the last 24h. This is what matters for trajectory.
  const daily = {
    receipts_24h: await countYesterday(sb, 'receipts'),
    receipt_items_24h: await countYesterday(sb, 'receipt_items'),
    profiles_24h: await countYesterday(sb, 'profiles'),
    user_connections_24h: await countYesterday(sb, 'user_connections'),
    referrals_24h: await countYesterday(sb, 'referrals'),
  }

  // Persist every metric. record_usage UPSERT-increments — running the
  // cron twice on the same day double-counts net-new, so the cron is
  // SHOULD only fire once. The 'totals' rows we OVERWRITE rather than
  // increment so they reflect lifetime cardinality, not a sum-of-snapshots.
  const writes = []
  for (const [k, v] of Object.entries({ ...totals, ...daily })) {
    if (v === null) continue
    if (k.endsWith('_24h')) {
      writes.push(sb.rpc('record_usage', { p_metric: k, p_delta: v }))
    } else {
      writes.push(
        sb.from('usage_metrics').upsert(
          { day: new Date().toISOString().slice(0, 10), metric: `total_${k}`, value: v, updated_at: new Date().toISOString() },
          { onConflict: 'day,metric' }
        )
      )
    }
  }
  const results = await Promise.allSettled(writes)
  const failures = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ ok: true, totals, daily, failures })
}
