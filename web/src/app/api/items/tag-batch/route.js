// POST /api/items/tag-batch
//
// Guac-AI ENRICHMENT BACKFILL — Item tagging.
//
// For every receipt_items row where ai_tag IS NULL, assign one of the
// fixed-vocabulary tags from lib/itemTagVocab.js
// (household, kid, health, treat, alcohol, food, beauty, tech, other).
//
// Distinct from `category`: category routes the *receipt* into a spending
// bucket (grub, pharmacy, …), the tag describes the *line item* in
// household-role terms ("kid", "treat") so the chip helps a user scan a
// long receipt and spot, e.g., "all the kid stuff" without having to
// reorganize categories.
//
// Contract:
//   POST body (optional):
//     { item_ids: [<uuid>, …] }   // explicit list, max 500
//                                  // omit / null = "all untagged for me"
//   Response:
//     { matched, updated, samples?: [{id, item_name, tag}] }
//
// Per-user (RLS scoped via the parent receipt JOIN).

import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { createApiClient } from '../../../../lib/supabase/server'
import { ITEM_TAG_SLUGS, sanitizeItemTag } from '../../../../lib/itemTagVocab'

export const runtime = 'nodejs'
export const maxDuration = 60

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You assign ONE semantic tag to each grocery / store line item.

Output ONLY a JSON object:
{ "tags": { "<item_id>": "<tag>" } }

Allowed tags (use EXACTLY one of these — anything else will be discarded):
- "household": cleaning, paper goods, laundry, batteries, light bulbs, trash bags
- "kid":       items obviously for children — diapers, baby formula, kid Tylenol, kids' clothes, school supplies for kids, toys
- "health":    vitamins, supplements, protein, fitness gear, doctor co-pay
- "treat":     candy, soda, cookies, chips, ice cream, dessert
- "alcohol":   beer, wine, spirits, cocktails
- "food":      groceries that aren't treats or alcohol — fruits, vegetables, meat, dairy, bread, eggs, restaurant meals, coffee
- "beauty":    makeup, skincare, perfume, hair products, nail polish, deodorant
- "tech":      electronics, cables, phones, software, headphones
- "other":     anything that doesn't fit cleanly above

Rules:
- Every item_id MUST appear in your output. If unsure, use "other".
- Use the item NAME — store name is given only for context.
- One tag per item, lowercase, exactly as listed.
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

  const rl = await rateLimit(userRateKey(user.id, 'items-tag-batch'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  let body = null
  try { body = await request.json() } catch {}
  const explicitIds = Array.isArray(body?.item_ids)
    ? body.item_ids.filter(x => typeof x === 'string').slice(0, 500)
    : null

  // receipt_items doesn't have user_id directly — RLS routes through the
  // parent receipt. We JOIN by selecting the item + parent.store_name in
  // one query so the AI prompt has store context.
  let q = sb.from('receipt_items')
    .select('id, item_name, ai_tag, category, receipts!inner(user_id, store_name)')
    .eq('receipts.user_id', user.id)
    .is('ai_tag', null)

  if (explicitIds && explicitIds.length > 0) {
    q = q.in('id', explicitIds)
  } else {
    q = q.order('created_at', { ascending: false }).limit(500)
  }

  const { data: candidates, error: findErr } = await q
  if (findErr) return Response.json({ error: findErr.message }, { status: 500 })

  const targets = (candidates || []).filter(it => !!it.item_name)
  if (targets.length === 0) {
    return Response.json({ matched: 0, updated: 0 })
  }

  // ── AI call ────────────────────────────────────────────────────
  const apiKey  = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  if (!apiKey && !groqKey) {
    return Response.json({ error: 'No AI provider configured', matched: targets.length, updated: 0 }, { status: 500 })
  }

  // Chunk into batches of 100 items per prompt so the response stays
  // small and the AI can still produce one tag per id reliably.
  const CHUNK = 100
  const tagsById = new Map()

  for (let i = 0; i < targets.length; i += CHUNK) {
    const slice = targets.slice(i, i + CHUNK)
    const compact = slice.map(it => ({
      id: it.id,
      name: String(it.item_name || '').slice(0, 60),
      store: String(it.receipts?.store_name || '').slice(0, 60) || undefined,
    }))
    const payload = `Tag these items.\n${JSON.stringify(compact)}`

    let raw
    try { if (apiKey) raw = await callGemini({ apiKey, payload }) }
    catch (e) { console.warn('[items/tag-batch] Gemini failed:', e.message) }
    if (!raw && groqKey) {
      try { raw = await callGroq({ apiKey: groqKey, payload }) }
      catch (e) { console.warn('[items/tag-batch] Groq failed:', e.message) }
    }

    const parsed = safeParseJson(raw)
    if (parsed?.tags) {
      for (const it of slice) {
        const tag = sanitizeItemTag(parsed.tags[it.id])
        if (tag) tagsById.set(it.id, tag)
      }
    }
  }

  if (tagsById.size === 0) {
    return Response.json({ matched: targets.length, updated: 0 })
  }

  // ── Persist — group by tag so we issue at most ITEM_TAG_SLUGS.length
  // UPDATEs total, regardless of batch size. Each UPDATE is bounded by
  // the .in() id list it receives.
  let updated = 0
  const samples = []
  for (const slug of ITEM_TAG_SLUGS) {
    const ids = []
    for (const [id, t] of tagsById) if (t === slug) ids.push(id)
    if (ids.length === 0) continue
    const { error: updErr, count } = await sb
      .from('receipt_items')
      .update({ ai_tag: slug }, { count: 'exact' })
      .in('id', ids)
    if (updErr) {
      console.warn('[items/tag-batch] update failed:', updErr.message)
      continue
    }
    updated += count || ids.length
    for (const id of ids.slice(0, 2)) {
      if (samples.length < 10) {
        const row = targets.find(t => t.id === id)
        samples.push({ id, item_name: row?.item_name, tag: slug })
      }
    }
  }

  return Response.json({
    matched: targets.length,
    updated,
    samples,
  })
}
