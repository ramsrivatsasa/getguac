// POST /api/receipts/apply-rules
//
// Backfill: runs the central rule engine (lib/categorizeRules.js#
// applyCategoryRules) across every receipt this user owns and updates
// receipts.category for rows where the engine produces a verdict that
// differs from the current category.
//
// Replaces the per-category recategorize-* pattern (recategorize-gas,
// future recategorize-auto, ...) — adding a new rule to RULE_ORDER
// in the central engine now retroactively applies to existing
// receipts the next time the user hits /bank Refresh, with zero
// new endpoint code.
//
// Preserved invariants:
//   - User-curated rows (category_source='user') are NEVER touched.
//   - Only rule-engine verdicts apply. AI and Tier-2 inference paths
//     continue to live at save-time only.
//
// Per-user (RLS scoped). Defaults to dry-run preview;
// {"confirm": true} performs the updates.

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { applyCategoryRules } from '../../../../lib/categorizeRules'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = await rateLimit(userRateKey(user.id, 'apply-rules'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = body?.confirm !== true

  // Pull receipts + items + category_source. Item names feed the
  // item-first rule check; category_source guards against clobbering
  // manual edits.
  const { data: receipts, error: rErr } = await sb
    .from('receipts')
    .select('id, store_name, date, category, category_source, receipt_items(item_name)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(2000)
  if (rErr) {
    return Response.json({ error: rErr.message }, { status: 500 })
  }

  const updates = []
  for (const r of receipts || []) {
    if (r.category_source === 'user') continue
    const verdict = applyCategoryRules(r, r.receipt_items || [])
    if (!verdict) continue
    if (verdict === r.category) continue
    updates.push({
      id: r.id,
      was: r.category || 'null',
      will: verdict,
      store_name: r.store_name,
      date: r.date,
    })
  }
  const matched = updates.length

  if (matched === 0) {
    return Response.json({ matched: 0, updated: 0, dryRun })
  }

  if (dryRun) {
    return Response.json({
      matched,
      updated: 0,
      dryRun: true,
      samples: updates.slice(0, 10),
    })
  }

  // One UPDATE per target category — much faster than one per row.
  const byTarget = new Map()
  for (const u of updates) {
    if (!byTarget.has(u.will)) byTarget.set(u.will, [])
    byTarget.get(u.will).push(u.id)
  }
  let totalUpdated = 0
  for (const [cat, ids] of byTarget) {
    const { error: upErr, count } = await sb
      .from('receipts')
      .update({ category: cat, category_source: 'rule' }, { count: 'exact' })
      .in('id', ids)
      .eq('user_id', user.id)
      .neq('category_source', 'user')  // belt-and-braces against user picks
    if (upErr) {
      return Response.json({ error: upErr.message, matched, updated: totalUpdated }, { status: 500 })
    }
    totalUpdated += count || 0
  }

  return Response.json({
    matched,
    updated: totalUpdated,
    dryRun: false,
  })
}
