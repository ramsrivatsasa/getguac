// /api/cron/shopping-cache  (daily)
//
// Maintains the shared, cross-user shopping_cache (migration_071):
//   1. PRUNE  — delete rows older than SHOPPING_CACHE_PRUNE_DAYS (default 14d).
//   2. WARM   — re-pull the top saved-search queries whose cache is missing or
//               stale (older than the 7-day TTL), so the popular searches stay
//               cache-hits all week. Capped at SHOPPING_WARM_LIMIT actual
//               re-pulls per run (default 10) to protect the SerpApi quota.
//
// Scheduled DAILY (the reliable cadence on Vercel Hobby), but since a warmed
// entry stays fresh for 7 days and we only warm STALE queries, each query is
// effectively refreshed ~once a week — your "weekly" intent, quota-safe.
//
// Auth: cron header `x-cron-secret: $CRON_SECRET` OR `Authorization: Bearer
// $CRON_SECRET` (Vercel Cron sends the latter automatically).

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { serpApiShopping } from '../../../../lib/serpShopping'
import { getCachedSearch, setCachedSearch } from '../../../../lib/shoppingCache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PRUNE_DAYS = Number(process.env.SHOPPING_CACHE_PRUNE_DAYS) || 14
const WARM_LIMIT = Number(process.env.SHOPPING_WARM_LIMIT) || 10

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function authed(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const h = request.headers
  return h.get('x-cron-secret') === secret || h.get('authorization') === `Bearer ${secret}`
}

async function run(request) {
  if (!authed(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const sb = admin()
  const summary = { pruned: 0, warmed: 0, warm_failed: 0, warm_skipped_fresh: 0, serpapi: !!process.env.SERPAPI_KEY }

  // 1. Prune very-old rows.
  try {
    const cutoff = new Date(Date.now() - PRUNE_DAYS * 86400_000).toISOString()
    const { data } = await sb.from('shopping_cache').delete().lt('updated_at', cutoff).select('cache_key')
    summary.pruned = data?.length || 0
  } catch (e) {
    console.error('[cron/shopping-cache] prune failed:', e.message)
  }

  // 2. Warm the top saved-search queries that have gone stale.
  if (process.env.SERPAPI_KEY && WARM_LIMIT > 0) {
    let queries = []
    try {
      const { data } = await sb
        .from('saved_searches')
        .select('query, last_run_at')
        .not('query', 'is', null)
        .order('last_run_at', { ascending: false, nullsFirst: false })
        .limit(300)
      const seen = new Set()
      for (const s of (data || [])) {
        const q = (s.query || '').trim()
        const k = q.toLowerCase()
        if (!q || seen.has(k)) continue
        seen.add(k)
        queries.push(q)
      }
    } catch (e) {
      console.error('[cron/shopping-cache] saved_searches read failed:', e.message)
    }

    for (const q of queries) {
      if (summary.warmed >= WARM_LIMIT) break
      try {
        // Skip queries whose cache is still fresh — no SerpApi call needed.
        const fresh = await getCachedSearch(q)
        if (fresh) { summary.warm_skipped_fresh++; continue }
        const results = await serpApiShopping(q)
        if (results.length) {
          await setCachedSearch(q, {
            query: q, broadened_query: null, mode: 'serpapi', results, sources: [],
            enhancement: { original: q, enhanced: q, applied_aliases: [], category: null, matched_stash: null },
            _model: 'serpapi:google_shopping',
          })
          summary.warmed++
        }
      } catch (e) {
        summary.warm_failed++
        console.error('[cron/shopping-cache] warm failed:', q, e.message)
      }
    }
  }

  return Response.json(summary)
}

export async function GET(request)  { return run(request) }
export async function POST(request) { return run(request) }
