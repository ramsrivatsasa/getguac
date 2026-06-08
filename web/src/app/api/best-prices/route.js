// POST /api/best-prices  (PLURAL)
//
// NATIONWIDE retailer scan — current prices for a product at major
// US retailers (Walmart / Target / Costco / Amazon etc). Uses Gemini
// + Google Search grounding. Returns a sorted list.
//
// NOT a duplicate of /api/best-price (singular) — that one is the
// LOCAL-stores-by-lat/lng variant. See best-price/route.js.

import { enhanceSearchQuery } from '../../../lib/guacSearch'
import { profileToPromptContext } from '../../../lib/userProfile'
import { rateLimit, rateKey, validate, v } from '../../../lib/apiGuard'
export const runtime = 'nodejs'
export const maxDuration = 45

const MODEL         = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
// Ollama (local LLM) fallback — fully offline, no external API.
// Install Ollama from https://ollama.com, then `ollama pull llama3.2`
const OLLAMA_URL    = process.env.OLLAMA_URL   || 'http://localhost:11434'
const OLLAMA_MODEL  = process.env.OLLAMA_MODEL || 'llama3.2'
const USE_OLLAMA    = process.env.USE_OLLAMA === '1' || process.env.USE_OLLAMA === 'true'

// ── Ollama (local) ────────────────────────────────────────────
// Calls a local Ollama instance via its OpenAI-compatible endpoint. Works
// fully offline — no web search though, so prices come from the model's
// training data (typical / historical, not real-time).
async function callOllama({ url, model, prompt }) {
  const endpoint = `${url.replace(/\/+$/, '')}/api/generate`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0.2, num_predict: 1500 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status} — is the server running at ${url}?`)
  const json = await res.json()
  return json?.response || ''
}

function safeParseJsonArray(raw) {
  if (!raw) return []
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  // Try array first
  const arrA = s.indexOf('[')
  const arrB = s.lastIndexOf(']')
  if (arrA >= 0 && arrB > arrA) {
    try { const arr = JSON.parse(s.slice(arrA, arrB + 1)); if (Array.isArray(arr)) return arr } catch {}
  }
  // Try line-delimited JSON objects
  const lines = s.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('{') && l.endsWith('}'))
  const arr = []
  for (const ln of lines) { try { arr.push(JSON.parse(ln)) } catch {} }
  return arr
}

export async function POST(request) {
  try {
    // Rate limit — 15 calls/min per IP+session. Each call costs Gemini tokens.
    const rl = await rateLimit(rateKey(request, 'best-prices'), { limit: 15, windowMs: 60_000 })
    if (!rl.ok) {
      return Response.json(
        { error: `Too many searches. Try again in ${rl.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'GEMINI_API_KEY not set — required for web search.' }, { status: 500 })
    }

    // Input validation
    const body = await request.json().catch(() => null)
    const checked = validate(body, {
      item_name:  v.requiredString({ max: 200 }),
      sku:        v.optionalString({ max: 64 }),
      category:   v.optionalString({ max: 32 }),
      stashItems: v.optionalArray({ maxLen: 500 }),
      userProfile: v.optionalObject(),
    })
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })
    const { item_name, sku, category, stashItems = [], userProfile = null } = checked.data

    // ── Guac-Search: in-app query enhancement BEFORE any external call ──
    const raw = sku ? `${item_name} SKU ${sku}` : item_name
    const enhanced = enhanceSearchQuery(raw, { stashItems })

    // ── User-Profile: personalize prompt with the user's own shopping patterns ──
    const profileContext = profileToPromptContext(userProfile)
    const query = enhanced.enhanced || raw
    const suggestedStores = enhanced.suggestedStores.length > 0
      ? enhanced.suggestedStores.join(', ')
      : 'Walmart, Amazon, Target, Best Buy, Home Depot, Lowe\'s, Costco, BJ\'s, Sam\'s Club, Wegmans, Trader Joe\'s, Whole Foods, Kroger, Sephora, Ulta, Macy\'s'

    const buildPrompt = (q, broaden = false) => `You are Guac-AI, a smart deal finder. Search Google right now for current prices of:

"${q}"

${profileContext ? profileContext + '\n\n' : ''}MATCHING STRATEGY:
1. EXPAND abbreviations / nicknames / OCR slips:
   - "Homer Lid" / "Host Lid" → Home Depot Homer 5-gallon bucket lid (orange)
   - "BEGPLANT4" → Burpee eggplant 4-pack
   - "75LM FLASHLI" → 75-lumen flashlight 2-pack
2. ${broaden
       ? 'Search BROADLY — drop the SKU number, ignore exact size/color, find ANY similar product. Returning 3 similar products is better than 0 exact ones.'
       : 'Try exact match first. If you find fewer than 3, INCLUDE SIMILAR / EQUIVALENT products in the same category at major US retailers.'}
3. It is OK to give APPROXIMATE prices — say "typical price" in notes if you can't verify the exact current value.
4. Always tag similar-but-not-exact matches with notes: "similar product".

Best-fit retailers (Guac-Search hint${enhanced.category ? `, category: ${enhanced.category}` : ''}): ${suggestedStores}.
Also include other major US retailers if relevant.

Return a JSON array. Each element:
{
  "store": string,
  "price": number,          // USD, no symbol. 0 = unknown.
  "url": string,            // product page URL. "" if not found.
  "available": boolean,
  "notes": string,          // "similar product", "sale", "approximate", "bundle", etc.
  "matched_name": string    // actual product name found
}

Rules:
- Return 3–8 entries. Sort cheapest first.
- Prefer real prices. If exact unknown, give your best estimate and mark notes: "approximate".
- ${broaden ? 'Drop SKU. Match on generic product type only.' : 'Honor SKU if provided.'}
- Output ONLY the JSON array — no prose, no markdown fences.`

    async function runGemini(promptText, { withSearch = true } = {}) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
      const body = {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        ...(withSearch ? { tools: [{ googleSearch: {} }] } : {}),
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
      const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
      return { text, json }
    }

    // ── TWO-STAGE PIPELINE ──
    // Grounded JSON output is unreliable. We split into:
    //   Stage 1: research — grounded prose call, "what does the web say about this?"
    //   Stage 2: structure — no-grounding call that parses Stage 1's text into JSON
    // This dramatically improves reliability.

    const stage1Prompt = `${profileContext ? profileContext + '\n\n' : ''}Search Google right now for current US retail prices of:

"${query}"

Match strategy:
1. EXPAND abbreviations / nicknames / OCR slips (e.g. "Homer Lid" → Home Depot Homer 5-gallon bucket lid; "lavendar 4.5 in" → lavender 4.5 inch live plant; "BEGPLANT4" → Burpee eggplant 4-pack).
2. If exact SKU not found, search for SIMILAR products (same product type at major retailers).
3. Best-fit retailers (Guac-Search hint${enhanced.category ? `, category: ${enhanced.category}` : ''}): ${suggestedStores}.

List AS MANY distinct matching products as you can find — aim for 15–20 — spanning different brands, models, configurations and retailers that fit the request (do NOT limit to one per store; show the variety a shopper would see on Google Shopping). Write ONE line per product. Use this EXACT pipe-delimited format (keep every pipe even when a field is blank):
STORE | $PRICE | $ORIGINAL_PRICE_IF_ON_SALE | PRODUCT TITLE | RATING(0-5) | REVIEW_COUNT | KEY SPECS | IMAGE_URL | PRODUCT_URL

Example:
Best Buy | $379.99 | $600 | Lenovo IdeaPad Slim 3 15.6" | 4.5 | 52 | 256 GB SSD · 8 GB RAM · Silver | https://pisces.bbystatic.com/image.jpg | https://bestbuy.com/...
Dell | $559.99 |  | Dell 15 Laptop, Windows 11 | 4.6 | 3000 | 512 GB SSD · 16 GB RAM · Carbon Black |  | https://dell.com/...

Rules:
- ORIGINAL_PRICE only when the item is on sale (current < original); otherwise leave it blank.
- IMAGE_URL: a direct https link to the product photo if you can find one; else blank.
- RATING is stars out of 5; REVIEW_COUNT is the number of reviews; blank if unknown.
- KEY SPECS: a short "·"-separated summary of the specs that matter for this category.
- Skip a product if you can't find its price. For approximate prices, append "(approx)" to KEY SPECS.`

    let { text: stage1Text, json } = await runGemini(stage1Prompt, { withSearch: true })
    console.log('[best-prices stage 1]', { query, raw_text: stage1Text?.slice(0, 600) })

    // Stage 2: structure the prose into JSON (no grounding needed)
    let parsed = []
    let mode = 'grounded'
    if (stage1Text && stage1Text.trim().length > 10) {
      const stage2Prompt = `Convert the following price research into a strict JSON array.

RESEARCH:
${stage1Text}

Output ONLY a JSON array (no prose, no markdown fences). Each element:
{
  "store": string,
  "price": number,            // current price, dollars only, no "$"
  "original_price": number,   // 0 if not on sale
  "url": string,              // product page URL, "" if none
  "image": string,            // direct product image URL, "" if none
  "title": string,            // full product title
  "rating": number,           // 0 if unknown, else 0-5
  "review_count": number,     // 0 if unknown
  "specs": string,            // short "·"-separated spec summary, "" if none
  "available": true,
  "notes": string,            // e.g. "(approx)" if the research said so
  "matched_name": string
}

Drop any line that doesn't have a numeric price. Sort cheapest first. Keep up to 24 entries.`
      const stage2 = await runGemini(stage2Prompt, { withSearch: false })
      parsed = safeParseJsonArray(stage2.text)
      console.log('[best-prices stage 2]', { results: parsed.length, sample: parsed[0] })
    }

    let broadened = false
    const broaderQuery = query
      .replace(/\bSKU\s+\d[\d\-]+/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    // If first stage gave us nothing, broaden the query and try stage 1 again
    if (parsed.length === 0 && broaderQuery && broaderQuery !== query) {
      broadened = true
      const altPrompt = stage1Prompt.replace(`"${query}"`, `"${broaderQuery}"`)
      const r1 = await runGemini(altPrompt, { withSearch: true })
      console.log('[best-prices stage 1 — broadened]', { broaderQuery, raw_text: r1.text?.slice(0, 600) })
      if (r1.text && r1.text.trim().length > 10) {
        const stage2Prompt = `Convert this price research into JSON. RESEARCH:\n${r1.text}\n\nOutput a JSON array: [{ "store", "price", "url", "available": true, "notes", "matched_name" }]. Drop lines without numeric prices. JSON only.`
        const r2 = await runGemini(stage2Prompt, { withSearch: false })
        parsed = safeParseJsonArray(r2.text)
        json = r1.json
      }
      mode = 'grounded-broad'
    }

    // OFFLINE FALLBACK — model's training-data knowledge, no grounding
    if (parsed.length === 0) {
      const offlinePrompt = `You are Guac-AI, a US retail pricing expert. Give 3 to 6 PLAUSIBLE retail prices for:

"${broaderQuery || query}"

Use your knowledge. Even if you're unsure, give your BEST GUESS — never return empty. Each entry should be from a real US retailer that genuinely sells this category.

Output ONLY a JSON array (no prose, no fences):
[{ "store": string, "price": number, "url": "", "available": true, "notes": "estimated from typical pricing", "matched_name": string }]

You MUST return at least 3 entries.`
      try {
        const r = await runGemini(offlinePrompt, { withSearch: false })
        console.log('[best-prices offline]', { raw: r.text?.slice(0, 400) })
        parsed = safeParseJsonArray(r.text)
        mode = 'estimated'
      } catch (e) {
        console.error('[best-prices] offline fallback failed', e)
      }
    }

    console.log('[best-prices final]', { query, broadened, mode, results: parsed.length })

    const results = parsed
      .map(r => {
        const price = Number(r.price) || 0
        const orig = Number(r.original_price) || 0
        return {
          store: String(r.store || '').trim(),
          price,
          original_price: orig > price ? orig : 0,   // only a real sale counts
          url: String(r.url || ''),
          image: String(r.image || '').trim(),
          title: String(r.title || r.matched_name || '').trim(),
          rating: Math.min(5, Math.max(0, Number(r.rating) || 0)),
          review_count: Math.max(0, Math.round(Number(r.review_count) || 0)),
          specs: String(r.specs || '').trim(),
          available: r.available !== false,
          notes: String(r.notes || '').trim(),
          matched_name: String(r.matched_name || r.title || '').trim(),
        }
      })
      .filter(r => r.store && r.price > 0)
      .sort((a, b) => a.price - b.price)

    const groundingChunks = json?.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    const sources = groundingChunks
      .map(c => c?.web?.uri ? { title: c.web.title || c.web.uri, url: c.web.uri } : null)
      .filter(Boolean)
      .slice(0, 5)

    return Response.json({
      query,
      broadened_query: broadened ? broaderQuery : null,
      mode,
      results,
      sources,
      enhancement: {
        original:        enhanced.original,
        enhanced:        enhanced.enhanced,
        applied_aliases: enhanced.appliedAliases,
        category:        enhanced.category,
        matched_stash:   enhanced.matchedStashItem ? {
          item_name: enhanced.matchedStashItem.item_name,
          sku:       enhanced.matchedStashItem.sku,
        } : null,
      },
      _model: MODEL,
    })
  } catch (err) {
    console.error('[best-prices]', err)
    return Response.json({ error: err.message || 'Search failed' }, { status: 500 })
  }
}
