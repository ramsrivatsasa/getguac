// AI batch categorizer — takes a list of receipts and returns a category
// slug for each. Used by the "Auto-categorize" button on /receipts as a
// fallback when the rule-based pass in lib/categorizeRules.js can't match.
//
// POST body:
//   { receipts: [{ id, store_name, total_amount?, items?: [{item_name, sku?, category?}] }] }
// Response:
//   { categories: { <id>: 'grub' | 'eats' | ... | null } }

import { rateLimit, rateKey, validate, v } from '../../../lib/apiGuard'
import { createClient } from '../../../lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SLUGS = ['grub','eats','subs','bills','tech','big-stuff','fix-it','outdoors','supplies','fits','wellness','gas-up','fun','gifting','misc']

const SYSTEM_PROMPT = `You assign a single spending-category slug to each receipt. Return ONLY a JSON object:
{ "categories": { "<receipt_id>": "<slug>" } }

Allowed slugs (exactly these, no others):
- "grub":      Groceries & food shopping (Whole Foods, Kroger, Trader Joe's, Aldi, farmers market, Instacart groceries)
- "eats":      Restaurants & dining, fast food, coffee shops, food delivery (Starbucks, Chipotle, DoorDash)
- "subs":      Recurring streaming + software subscriptions (Netflix, Spotify, Disney+, Adobe, ChatGPT Plus, NYT, iCloud, Audible)
- "bills":     Utility bills — mobile, internet, electricity, water, gas, trash, insurance (Verizon, Comcast, PG&E, GEICO)
- "tech":      One-time electronics, computers, gadgets (Apple Store, Best Buy, GameStop)
- "big-stuff": Appliances + large home purchases (Refrigerator, furniture > $300, washer/dryer)
- "fix-it":    Home maintenance + hardware + tools (Home Depot, Lowe's, Ace Hardware)
- "outdoors":  Garden, plants, sporting goods, outdoor gear (REI, garden center, Patagonia)
- "supplies":  Stationery, office & school supplies, craft (Staples, Office Depot, Michaels, pens, printer ink)
- "fits":      Clothing & shoes (Nordstrom, Nike, H&M, DSW)
- "wellness":  Pharmacy, vitamins, gym, doctor/dental/vision (CVS, Walgreens, Planet Fitness)
- "gas-up":    Fuel & auto service (Shell, Chevron, oil change)
- "fun":       Movies, theme parks, concerts, one-time games (AMC, Ticketmaster, Steam one-time purchase)
- "gifting":   Items clearly bought as gifts for others
- "misc":      Mixed-purpose stores when items are ambiguous (Target, Walmart, Amazon)

Rules:
- Every receipt id MUST be a key in your output. If unsure, return "misc".
- Subscriptions vs one-time: Netflix monthly → "subs". Buying a Roku → "tech".
- Bills vs subs: Verizon Wireless monthly → "bills" (utility). Spotify monthly → "subs" (entertainment).
- Use the line items (when provided) to decide between misc vs a more specific slug. Example: Target receipt with diapers + groceries → "grub".
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
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: payload }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.05, maxOutputTokens: 8192 },
  }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
  try {
    const rl = rateLimit(rateKey(request, 'categorize'), { limit: 10, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const checked = validate(body, { receipts: v.optionalArray({ maxLen: 200 }) })
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })
    const receipts = (body?.receipts || []).filter(r => r && r.id && r.store_name).slice(0, 200)
    if (receipts.length === 0) return Response.json({ categories: {} })

    const apiKey  = process.env.GEMINI_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    if (!apiKey && !groqKey) return Response.json({ error: 'No AI provider configured' }, { status: 500 })

    // Compact payload — minimize tokens
    const compact = receipts.map(r => ({
      id: r.id,
      store: String(r.store_name).slice(0, 80),
      total: r.total_amount != null ? Number(r.total_amount) : undefined,
      items: Array.isArray(r.items) ? r.items.slice(0, 6).map(it => String(it.item_name || '').slice(0, 40)).filter(Boolean) : undefined,
    }))
    const payload = `Categorize these receipts.\n${JSON.stringify(compact)}`

    let raw
    if (apiKey) {
      try { raw = await callGemini({ apiKey, payload }) }
      catch (e) { console.warn('[categorize] Gemini failed:', e.message); if (!groqKey) throw e }
    }
    if (!raw && groqKey) {
      raw = await callGroq({ apiKey: groqKey, payload })
    }

    const parsed = safeParseJson(raw)
    if (!parsed?.categories) {
      console.error('[categorize] malformed AI response:', raw?.slice(0, 400))
      return Response.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    // Sanitize — keep only known slugs
    const out = {}
    for (const r of receipts) {
      const slug = parsed.categories[r.id]
      out[r.id] = SLUGS.includes(slug) ? slug : null
    }
    return Response.json({ categories: out })
  } catch (err) {
    console.error('[categorize]', err)
    return Response.json({ error: err.message || 'Categorize failed' }, { status: 500 })
  }
}
