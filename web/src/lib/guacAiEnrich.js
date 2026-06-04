// Server-side inline helpers for Guac-AI enrichment hooks.
//
// Two functions:
//   • categorizeReceiptInline(sb, userId, receipt, items)
//       — runs Gemini on a SINGLE receipt + items and updates the row's
//         category if Gemini returns a confident slug. Used by the save
//         pipeline as a "second look" when the rule engine, Tier 2, and
//         AI parse all returned null/misc.
//
//   • tagItemsInline(sb, receiptId, storeName)
//       — fetches all items with ai_tag = null for the given receipt and
//         asks Gemini for ONE fixed-vocab tag per item, persists each
//         to receipt_items.ai_tag.
//
// Both helpers are best-effort: they swallow AI / network errors so a
// failure never blocks the parent save. They do NOT call any /api routes;
// they talk to Gemini / Groq directly so they work under both the per-
// user session client and the service-role client used by the email
// poller. Tokens are cheap — each call is ≤ 1 receipt or ≤ ~30 items
// (one chunk).

import { CATEGORIES } from './categories'
import { ITEM_TAG_SLUGS, sanitizeItemTag } from './itemTagVocab'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CATEGORY_SLUGS = CATEGORIES.map(c => c.slug)

function safeParseJson(raw) {
  if (!raw) return null
  let s = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(s) } catch {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try { return JSON.parse(s) } catch { return null }
}

async function callGeminiJson({ apiKey, system, payload, maxTokens = 2048, temperature = 0.05 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: payload }] }],
      generationConfig: { responseMimeType: 'application/json', temperature, maxOutputTokens: maxTokens },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  return json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
}

async function callGroqJson({ apiKey, system, payload, maxTokens = 2048, temperature = 0.05 }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: payload },
      ],
      response_format: { type: 'json_object' },
      temperature,
      max_tokens: maxTokens,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Groq ${res.status}`)
  return json?.choices?.[0]?.message?.content || ''
}

const CATEGORIZE_SYSTEM = `You assign ONE spending-category slug to a single receipt.

Return ONLY a JSON object: { "slug": "<slug>" }

Allowed slugs:
${CATEGORIES.map(c => `- "${c.slug}": ${c.desc}`).join('\n')}

Rules:
- One slug, lowercase, exactly from the list above.
- If genuinely unsure return "misc".
- Output JSON only, no prose.`

/**
 * Run a single-receipt categorize pass and persist the result.
 * Never throws — returns the slug it wrote (or null).
 *
 * @param {object} sb        Supabase client
 * @param {string} userId    Owning user
 * @param {object} receipt   { id, store_name, total_amount }
 * @param {Array}  items     items array (may be empty)
 * @returns {Promise<string|null>}
 */
export async function categorizeReceiptInline(sb, userId, receipt, items = []) {
  if (!sb || !userId || !receipt?.id || !receipt.store_name) return null
  const apiKey  = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  if (!apiKey && !groqKey) return null

  const payload = `Categorize this receipt.\n${JSON.stringify({
    store: String(receipt.store_name).slice(0, 80),
    total: receipt.total_amount != null ? Number(receipt.total_amount) : undefined,
    items: (Array.isArray(items) ? items : []).slice(0, 6).map(it => String(it.item_name || '').slice(0, 40)).filter(Boolean),
  })}`

  let raw
  try { if (apiKey) raw = await callGeminiJson({ apiKey, system: CATEGORIZE_SYSTEM, payload }) }
  catch (e) { console.warn('[guacAiEnrich.categorize] Gemini failed:', e.message) }
  if (!raw && groqKey) {
    try { raw = await callGroqJson({ apiKey: groqKey, system: CATEGORIZE_SYSTEM, payload }) }
    catch (e) { console.warn('[guacAiEnrich.categorize] Groq failed:', e.message) }
  }
  const parsed = safeParseJson(raw)
  const slug = parsed?.slug
  if (!CATEGORY_SLUGS.includes(slug) || slug === 'misc') return null

  // Only patch if the row STILL has no/misc category — race-safe with a
  // parallel user pick that arrived after the save kicked off enrichment.
  const { error } = await sb
    .from('receipts')
    .update({ category: slug, category_source: 'ai' })
    .eq('id', receipt.id)
    .eq('user_id', userId)
    .or('category.is.null,category.eq.misc,category.eq.uncategorized')
  if (error) {
    console.warn('[guacAiEnrich.categorize] update failed:', error.message)
    return null
  }
  return slug
}

const TAG_SYSTEM = `You assign ONE semantic tag to each line item.

Return ONLY a JSON object: { "tags": { "<item_id>": "<tag>" } }

Allowed tags (use exactly one, lowercase):
- "household": cleaning, paper goods, laundry, batteries, light bulbs, trash bags
- "kid":       items obviously for children — diapers, formula, kid Tylenol, toys
- "health":    vitamins, supplements, protein, fitness, doctor co-pay
- "treat":     candy, soda, cookies, chips, ice cream, dessert
- "alcohol":   beer, wine, spirits, cocktails
- "food":      groceries that aren't treats or alcohol — produce, meat, dairy, bread, eggs, restaurant meals, coffee
- "beauty":    makeup, skincare, perfume, hair products, deodorant
- "tech":      electronics, cables, phones, software, headphones
- "other":     anything that doesn't fit

Rules:
- Every item_id MUST appear. Use "other" when unsure.
- One tag per item, lowercase. Output JSON only.`

/**
 * Tag all items belonging to a receipt that don't yet have ai_tag set.
 * Best-effort. Never throws.
 *
 * @param {object} sb         Supabase client
 * @param {string} receiptId  receipt id
 * @param {string} storeName  receipt's store_name (for context)
 */
export async function tagItemsInline(sb, receiptId, storeName = '') {
  if (!sb || !receiptId) return 0
  const apiKey  = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  if (!apiKey && !groqKey) return 0

  const { data: rows, error } = await sb
    .from('receipt_items')
    .select('id, item_name, ai_tag')
    .eq('receipt_id', receiptId)
    .is('ai_tag', null)
    .limit(200)
  if (error) { console.warn('[guacAiEnrich.tag] load failed:', error.message); return 0 }
  if (!rows || rows.length === 0) return 0

  const compact = rows
    .filter(it => typeof it.item_name === 'string' && it.item_name.length > 0)
    .map(it => ({ id: it.id, name: String(it.item_name).slice(0, 60), store: String(storeName || '').slice(0, 60) || undefined }))
  if (compact.length === 0) return 0

  const payload = `Tag these items.\n${JSON.stringify(compact)}`

  let raw
  try { if (apiKey) raw = await callGeminiJson({ apiKey, system: TAG_SYSTEM, payload, maxTokens: 4096 }) }
  catch (e) { console.warn('[guacAiEnrich.tag] Gemini failed:', e.message) }
  if (!raw && groqKey) {
    try { raw = await callGroqJson({ apiKey: groqKey, system: TAG_SYSTEM, payload, maxTokens: 4096 }) }
    catch (e) { console.warn('[guacAiEnrich.tag] Groq failed:', e.message) }
  }
  const parsed = safeParseJson(raw)
  if (!parsed?.tags) return 0

  // Group ids by tag → at most ITEM_TAG_SLUGS.length UPDATEs.
  const idsByTag = new Map()
  for (const it of rows) {
    const tag = sanitizeItemTag(parsed.tags[it.id])
    if (!tag) continue
    if (!idsByTag.has(tag)) idsByTag.set(tag, [])
    idsByTag.get(tag).push(it.id)
  }
  let updated = 0
  for (const slug of ITEM_TAG_SLUGS) {
    const ids = idsByTag.get(slug)
    if (!ids || ids.length === 0) continue
    const { error: updErr, count } = await sb
      .from('receipt_items')
      .update({ ai_tag: slug }, { count: 'exact' })
      .in('id', ids)
    if (updErr) {
      console.warn('[guacAiEnrich.tag] update failed:', updErr.message)
      continue
    }
    updated += count || ids.length
  }
  return updated
}
