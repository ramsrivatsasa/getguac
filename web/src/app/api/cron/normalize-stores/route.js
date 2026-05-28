// POST /api/cron/normalize-stores
//
// Daily AI-driven store-name normalization. Scans receipts for merchants
// not in our hardcoded alias map (lib/store-name-normalize.js#ALIASES),
// asks Gemini whether each is a variant of a known retail brand, and
// caches the answer in public.store_name_aliases so future cron runs
// don't re-ask about the same unknowns.
//
// When Gemini confidently identifies a canonical brand, we ALSO update
// receipts.store_name to the canonical form across every row that
// shares the normalized key. That way the dashboard chart's grouping
// logic (storeGroupKey, which already consults the hardcoded ALIASES)
// keeps working — the receipts themselves now contain the canonical
// name, no client-side alias lookup needed.
//
// Auth:
//   - cron: header `x-cron-secret: $CRON_SECRET` OR
//     `Authorization: Bearer $CRON_SECRET`
//   - admin user: signed in + profile.is_admin = true (for manual runs)
//
// Body (optional):
//   { dryRun: true }     — preview only, no DB writes
//   { limit: 50 }        — cap on how many unknown keys we ask Gemini
//                          about this run (cost guard). Default 50.
//   { lookbackDays: 90 } — only consider receipts dated within this
//                          window. Default 90.
//
// Response: { scanned, asked, learned, skipped, updated_receipts,
//             dryRun, samples? }

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { normalizeStoreName } from '../../../../lib/store-name-normalize'

export const runtime = 'nodejs'
export const maxDuration = 60

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const DEFAULT_LIMIT = 50
const DEFAULT_LOOKBACK_DAYS = 90
// We give up on a key after this many failed Gemini attempts (returned null).
const MAX_ATTEMPTS = 3
// Require at least this many receipts sharing a normalized key before we
// spend a Gemini call on it. Avoids paying for one-off typos / local stores
// that the user only visits once.
const MIN_RECEIPTS_PER_KEY = 2

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = request.headers.get('x-cron-secret')
                || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (header === cronSecret) return { ok: true, mode: 'cron' }
  }
  // Manual admin trigger via signed-in session.
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user?.id) {
      const { data: prof } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
      if (prof?.is_admin) return { ok: true, mode: 'admin' }
    }
  } catch {}
  return { ok: false }
}

// Ask Gemini in one batch: for each store name, is it a known brand?
// Prompt is explicit about what counts as "known" — large/national retailers,
// well-known DTC brands, major fuel/pharmacy/grocery chains. Local one-off
// stores return null so we don't pollute the alias table with "JOE'S DELI #4".
async function callGemini(rawNames) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const prompt = `Decide if each merchant name below is a variant of a WELL-KNOWN retail brand.

For each name return:
- "canonical": the canonical brand display name (e.g. "Costco", "Shell", "Trader Joe's", "Whole Foods Market") if you recognize a major chain. Use Title Case for the brand's standard display.
- null when it's a local/regional store, a typo, a person's name, or anything you can't confidently map to a national brand.

Examples:
"COSTCO WHSE #218" -> "Costco"
"SHELL 0123" -> "Shell"
"7-ELEVEN 31415" -> "7-Eleven"
"TRADER JOE'S" -> "Trader Joe's"
"AMAZON MKTP US*ABC123" -> "Amazon"
"JOE'S CORNER DELI" -> null
"K2AWARDS.COM" -> null
"PROGRESSIVE INSURANCE" -> "Progressive"
"CHASE BANK PAYMENT" -> "Chase Bank"

Return ONLY this JSON: { "results": [ { "input": "<raw name>", "canonical": "<brand or null>" }, ... ] }

Names:
${JSON.stringify(rawNames)}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 4096 },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini returned non-JSON: ' + text.slice(0, 200))
  }
  if (!parsed || !Array.isArray(parsed.results)) {
    throw new Error('Gemini response missing results array')
  }
  return parsed.results
}

export async function POST(request) {
  try {
    const auth = await isAuthorized(request)
    if (!auth.ok) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body = {}
    try { body = await request.json() } catch {}
    const dryRun = body.dryRun === true
    const limit = Math.min(Math.max(parseInt(body.limit) || DEFAULT_LIMIT, 1), 200)
    const lookbackDays = Math.min(Math.max(parseInt(body.lookbackDays) || DEFAULT_LOOKBACK_DAYS, 1), 365)

    const sb = admin()

    // 1. Pull distinct store_names from recent receipts.
    const since = new Date()
    since.setDate(since.getDate() - lookbackDays)
    const sinceStr = since.toISOString().slice(0, 10)

    const { data: rows, error } = await sb
      .from('receipts')
      .select('store_name')
      .gte('date', sinceStr)
      .not('store_name', 'is', null)
    if (error) {
      console.error('[cron/normalize-stores] receipts read failed:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Group raw store_names by normalized key. We pick ONE representative
    // raw name per key (the most common) to send to Gemini — sending all
    // variants of "COSTCO WHSE" twenty times wastes tokens.
    const byKey = new Map() // key -> { rawCounts: Map<raw, count>, total: n }
    for (const r of rows) {
      const raw = (r.store_name || '').trim()
      if (!raw) continue
      const key = normalizeStoreName(raw)
      if (!key) continue
      let entry = byKey.get(key)
      if (!entry) { entry = { rawCounts: new Map(), total: 0 }; byKey.set(key, entry) }
      entry.rawCounts.set(raw, (entry.rawCounts.get(raw) || 0) + 1)
      entry.total += 1
    }

    const scanned = byKey.size

    // 2. Filter out keys we already have an alias for, OR keys we've
    // exceeded max attempts on. One round-trip per filter is fine —
    // both tables are global.
    const candidateKeys = [...byKey.keys()]
    if (candidateKeys.length === 0) {
      return Response.json({ scanned: 0, asked: 0, learned: 0, skipped: 0, updated_receipts: 0, dryRun })
    }

    const { data: known } = await sb
      .from('store_name_aliases')
      .select('key, display_name, attempts')
      .in('key', candidateKeys)
    const knownByKey = new Map((known || []).map(r => [r.key, r]))

    // Build the list of keys to actually ask Gemini about:
    //   - not already mapped to a non-null display_name
    //   - not already attempted >= MAX_ATTEMPTS times
    //   - has at least MIN_RECEIPTS_PER_KEY receipts behind it
    const toAsk = []
    for (const key of candidateKeys) {
      const entry = byKey.get(key)
      if (entry.total < MIN_RECEIPTS_PER_KEY) continue
      const existing = knownByKey.get(key)
      if (existing?.display_name) continue                    // already learned
      if ((existing?.attempts || 0) >= MAX_ATTEMPTS) continue // gave up
      // Pick the most-common raw form as the representative.
      let bestRaw = null, bestCount = 0
      for (const [raw, cnt] of entry.rawCounts) {
        if (cnt > bestCount) { bestRaw = raw; bestCount = cnt }
      }
      if (bestRaw) toAsk.push({ key, raw: bestRaw, occurrences: entry.total })
    }

    const skipped = scanned - toAsk.length

    // Cap how many we send to Gemini per run.
    const batch = toAsk.slice(0, limit)
    if (batch.length === 0) {
      return Response.json({ scanned, asked: 0, learned: 0, skipped, updated_receipts: 0, dryRun })
    }

    if (dryRun) {
      return Response.json({
        scanned, asked: batch.length, learned: 0, skipped, updated_receipts: 0,
        dryRun: true,
        samples: batch.slice(0, 20).map(b => ({ key: b.key, raw: b.raw, occurrences: b.occurrences })),
      })
    }

    // 3. Single batched Gemini call.
    const rawNames = batch.map(b => b.raw)
    let results
    try {
      results = await callGemini(rawNames)
    } catch (e) {
      console.error('[cron/normalize-stores] Gemini failed:', e.message)
      return Response.json({ error: 'Gemini call failed: ' + e.message, scanned, asked: batch.length }, { status: 502 })
    }

    // Map Gemini's results back onto our batch by input string.
    const verdictByRaw = new Map()
    for (const r of results) {
      if (r && typeof r.input === 'string') {
        verdictByRaw.set(r.input, (r.canonical && String(r.canonical).trim()) || null)
      }
    }

    // 4. Persist results and rewrite receipts.
    let learned = 0
    let updatedReceipts = 0

    for (const item of batch) {
      const verdict = verdictByRaw.get(item.raw) || null
      const existing = knownByKey.get(item.key)

      // Upsert into store_name_aliases. Increment attempts when verdict
      // is null (so we eventually stop asking); record the brand when
      // verdict is non-null.
      const row = {
        key: item.key,
        display_name: verdict,
        source: 'ai',
        attempts: (existing?.attempts || 0) + 1,
        last_attempt: new Date().toISOString(),
      }
      const { error: upErr } = await sb
        .from('store_name_aliases')
        .upsert(row, { onConflict: 'key' })
      if (upErr) {
        console.warn('[cron/normalize-stores] alias upsert failed for', item.key, upErr.message)
        continue
      }
      if (!verdict) continue
      learned++

      // 5. Rewrite receipts.store_name to the canonical form for every
      // row that normalizes to this key. Cheap: indexed scan + simple
      // update. We DO NOT touch rows where the user has explicitly
      // typed a different name (no signal for that today, so we rewrite
      // unconditionally — printed merchant strings are the source of
      // truth, not user edits).
      //
      // We can't pushdown the normalize() in SQL, so we update by exact
      // raw matches we saw in the recent scan. That's deterministic and
      // bounded.
      const rawForms = [...byKey.get(item.key).rawCounts.keys()]
      const rawsToUpdate = rawForms.filter(r => r !== verdict)
      if (rawsToUpdate.length === 0) continue
      const { count, error: updErr } = await sb
        .from('receipts')
        .update({ store_name: verdict }, { count: 'exact' })
        .in('store_name', rawsToUpdate)
      if (updErr) {
        console.warn('[cron/normalize-stores] receipts update failed for', item.key, updErr.message)
        continue
      }
      updatedReceipts += count || 0
    }

    return Response.json({
      scanned,
      asked: batch.length,
      learned,
      skipped,
      updated_receipts: updatedReceipts,
      dryRun: false,
    })
  } catch (err) {
    console.error('[cron/normalize-stores]', err)
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

// GET = how Vercel cron invokes us. Same logic as POST but reads options
// from the query string. ?dryRun=1 lets an admin preview the diff via
// the browser before flipping to real updates.
export async function GET(request) {
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
                || url.searchParams.get('dryRun') === 'true'
  const limit = parseInt(url.searchParams.get('limit') || '')
  const lookbackDays = parseInt(url.searchParams.get('lookbackDays') || '')
  const fakeReq = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({
      dryRun,
      ...(Number.isFinite(limit) ? { limit } : {}),
      ...(Number.isFinite(lookbackDays) ? { lookbackDays } : {}),
    }),
  })
  return POST(fakeReq)
}
