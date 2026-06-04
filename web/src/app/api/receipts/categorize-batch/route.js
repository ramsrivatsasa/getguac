// POST /api/receipts/categorize-batch
//
// Guac-AI ENRICHMENT BACKFILL — Smart Auto-Categorization.
//
// Why this exists: every receipt save path tries to assign a category
// (rule engine → Tier 2 inference → AI parse), but the AI parse step
// runs on the *items* not on the whole receipt and sometimes returns
// nothing for the receipt header. This endpoint runs a follow-up
// "second-look" Gemini call against the existing /api/categorize
// pipeline, restricted to rows where category IS NULL or = 'uncategorized'
// or = 'misc'.
//
// Contract:
//   POST body (optional):
//     { receipt_ids: [<uuid>, …] }   // explicit list, max 200
//                                     // omit / null = "all uncategorized for me"
//   Response:
//     { matched, updated, dryRun: false, samples?: [{id, store_name, was, now}] }
//
// Per-user (RLS scoped). Conservative — never clobbers a 'user'-sourced
// category. Internally re-uses the same Gemini prompt as /api/categorize
// so the slug taxonomy stays consistent.

import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { createApiClient } from '../../../../lib/supabase/server'
import { applyCategoryRules } from '../../../../lib/categorizeRules'
import { CATEGORIES } from '../../../../lib/categories'

export const runtime = 'nodejs'
export const maxDuration = 60

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SLUGS = CATEGORIES.map(c => c.slug)

const SYSTEM_PROMPT = `You assign a single spending-category slug to each receipt. Return ONLY a JSON object:
{ "categories": { "<receipt_id>": "<slug>" } }

Allowed slugs (exactly these, no others):
${CATEGORIES.map(c => `- "${c.slug}": ${c.desc}`).join('\n')}

Rules:
- Every receipt id MUST be a key in your output. If unsure, return "misc".
- Subscriptions vs one-time: Netflix monthly → "subs". Buying a Roku → "tech".
- Bills vs subs: Verizon Wireless monthly → "bills". Spotify monthly → "subs".
- Use line items (when provided) to disambiguate misc vs a more specific slug.
- Output JSON only, no prose.`

function safeParseJson(raw) {
  if (!raw) return null
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(s) } catch {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try { return JSON.parse(s) } catch { return null }
}

async function callGemini({ apiKey, payload }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: payload }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.05, maxOutputTokens: 8192 },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  return json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
}

async function callGroq({ apiKey, payload }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: payload },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.05,
      max_tokens: 8192,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Groq ${res.status}`)
  return json?.choices?.[0]?.message?.content || ''
}

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = await rateLimit(userRateKey(user.id, 'categorize-batch'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  let body = null
  try { body = await request.json() } catch {}
  const explicitIds = Array.isArray(body?.receipt_ids)
    ? body.receipt_ids.filter(x => typeof x === 'string').slice(0, 200)
    : null

  // Build the candidate query — restricted to NULL / 'uncategorized' / 'misc'
  // rows that have NOT been user-confirmed. NEVER touch a row where
  // category_source = 'user'.
  let q = sb.from('receipts')
    .select('id, store_name, total_amount, category, category_source')
    .eq('user_id', user.id)
    .or('category.is.null,category.eq.uncategorized,category.eq.misc')

  if (explicitIds && explicitIds.length > 0) {
    q = q.in('id', explicitIds)
  } else {
    // Don't sweep the entire history — cap implicit "all" to 200 most recent.
    q = q.order('date', { ascending: false }).limit(200)
  }

  const { data: candidates, error: findErr } = await q
  if (findErr) return Response.json({ error: findErr.message }, { status: 500 })

  const targets = (candidates || []).filter(r => r.category_source !== 'user')
  if (targets.length === 0) {
    return Response.json({ matched: 0, updated: 0, dryRun: false })
  }

  // Pull line-item snippets for the targets so the prompt is item-aware
  // (a Target receipt with diapers + groceries should land in 'grub',
  // not 'misc').
  const targetIds = targets.map(r => r.id)
  const { data: itemRows } = await sb
    .from('receipt_items')
    .select('receipt_id, item_name')
    .in('receipt_id', targetIds)
    .limit(2000)
  const itemsByReceipt = new Map()
  for (const it of (itemRows || [])) {
    if (!itemsByReceipt.has(it.receipt_id)) itemsByReceipt.set(it.receipt_id, [])
    const arr = itemsByReceipt.get(it.receipt_id)
    if (arr.length < 6) arr.push({ item_name: it.item_name })
  }

  // ── Pass 1: rule engine (free, instant). Many "misc" rows are
  // actually rule-resolvable (we may have inserted them before the
  // rule was added).
  const ruleHits = []
  const stillUnknown = []
  for (const r of targets) {
    const items = itemsByReceipt.get(r.id) || []
    const guess = applyCategoryRules({ store_name: r.store_name }, items)
    if (guess && guess !== 'misc') ruleHits.push({ id: r.id, slug: guess, source: 'rule' })
    else stillUnknown.push(r)
  }

  // ── Pass 2: AI fallback for unknowns ──────────────────────────────
  let aiHits = []
  if (stillUnknown.length > 0) {
    const apiKey  = process.env.GEMINI_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    if (!apiKey && !groqKey) {
      // No provider — return rule-only results. Don't fail the whole
      // batch; the rule pass is still useful.
    } else {
      const compact = stillUnknown.map(r => ({
        id: r.id,
        store: String(r.store_name || '').slice(0, 80),
        total: r.total_amount != null ? Number(r.total_amount) : undefined,
        items: (itemsByReceipt.get(r.id) || []).map(it => String(it.item_name || '').slice(0, 40)).filter(Boolean),
      }))
      const payload = `Categorize these receipts.\n${JSON.stringify(compact)}`

      let raw
      try {
        if (apiKey) raw = await callGemini({ apiKey, payload })
      } catch (e) {
        console.warn('[categorize-batch] Gemini failed:', e.message)
      }
      if (!raw && groqKey) {
        try { raw = await callGroq({ apiKey: groqKey, payload }) }
        catch (e) { console.warn('[categorize-batch] Groq failed:', e.message) }
      }

      const parsed = safeParseJson(raw)
      if (parsed?.categories) {
        for (const r of stillUnknown) {
          const slug = parsed.categories[r.id]
          if (SLUGS.includes(slug) && slug !== 'misc') {
            aiHits.push({ id: r.id, slug, source: 'ai' })
          }
        }
      }
    }
  }

  const all = [...ruleHits, ...aiHits]
  if (all.length === 0) {
    return Response.json({ matched: targets.length, updated: 0, dryRun: false })
  }

  // ── Persist ─ Update each row with the new category. Best-effort per
  // row so one bad row doesn't poison the batch.
  let updated = 0
  const samples = []
  const wasById = new Map(targets.map(r => [r.id, r.category]))
  for (const hit of all) {
    const { error: updErr } = await sb
      .from('receipts')
      .update({ category: hit.slug, category_source: hit.source })
      .eq('id', hit.id)
      .eq('user_id', user.id)
    if (!updErr) {
      updated += 1
      if (samples.length < 10) {
        samples.push({ id: hit.id, was: wasById.get(hit.id) || 'null', now: hit.slug, via: hit.source })
      }
    } else {
      console.warn('[categorize-batch] update failed:', updErr.message)
    }
  }

  return Response.json({
    matched: targets.length,
    updated,
    rule_hits: ruleHits.length,
    ai_hits: aiHits.length,
    samples,
    dryRun: false,
  })
}
