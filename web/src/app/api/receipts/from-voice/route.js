// POST /api/receipts/from-voice
//
// Voice → receipt. Client sends a transcript like:
//   "I just spent thirty bucks at Costco on groceries"
// We hand the string to Gemini with a tight schema prompt and return the
// SAME shape /api/parse-receipt returns for an image — so the existing
// save pipeline (POST /api/receipts/save) and every client UI that
// consumes a "parsed receipt" works unchanged.
//
// Contract
// --------
// Request (JSON): { transcript: string, locale?: string }
// Response (200): same shape as /api/parse-receipt's response, with an
//   extra `_source: 'voice'` marker so callers can flag the receipt as
//   voice-captured (used by validation_comment so we can audit accuracy
//   later — see plan note about source='voice').
// Response (4xx/5xx): { error: string }
//
// IMPORTANT: This endpoint does NOT save the receipt. The client is
// expected to surface the parsed result for the user to REVIEW and edit
// before POSTing to /api/receipts/save. Speech recognition accuracy
// varies by accent / background noise / mumbled brand names, so we
// always want a human-in-the-loop step.

import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { autoCategorize } from '../../../../lib/auto-categorize'

export const runtime = 'nodejs'
export const maxDuration = 30

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Max transcript length — 2000 chars is generous (≈ 5 minutes of speech).
// Beyond that we're almost certainly looking at a paste-error or abuse,
// and the Gemini cost grows linearly without proportional value.
const MAX_TRANSCRIPT_CHARS = 2000

const VOICE_PROMPT = `You convert a SPOKEN description of a purchase into a structured receipt.

The user just spoke a sentence like:
  "I just spent thirty bucks at Costco on groceries"
  "I dropped fifty bucks at Chipotle yesterday"
  "Sixty-two dollars at Shell, gas"
  "Spent a hundred and twelve dollars at Target on shampoo and laundry detergent"

Return ONLY a single JSON object. No prose, no markdown fences. Schema:

{
  "store_name": string,
  "date": string,                        // YYYY-MM-DD. If the user said "yesterday" / "last Friday" / etc., resolve it relative to today. Default to today when unspecified.
  "total_amount": number,                // positive purchase, negative return
  "tax_paid": number,                    // 0 unless explicitly mentioned
  "category": string|null,               // ONE of: "grub", "eats", "snacks", "bars", "tea", "drinks", "subs", "bills", "bank-fees", "cloud", "tech", "big-stuff", "fix-it", "outdoors", "supplies", "fits", "pharmacy", "health", "personal-care", "household", "gas-up", "fun", "gifting", "charity", "misc"
  "is_return": boolean,
  "items": [
    { "item_name": string, "qty": number, "price": number|null, "category": string|null }
  ]
}

Rules:
- Convert spoken numbers to numerics: "thirty bucks" → 30, "a hundred and twelve dollars" → 112, "twelve fifty" → 12.50, "twelve dollars and fifty cents" → 12.50.
- If the user only gives a TOTAL and no individual prices, return items with their price set to null (do NOT invent prices). Example: "twenty bucks at Whole Foods on apples and milk" → total_amount 20, items [{item_name:"apples",price:null},{item_name:"milk",price:null}].
- If the user names a category-shaped phrase ("on groceries", "for gas", "for coffee"), set the receipt-level category accordingly. "groceries" → "grub", "gas" → "gas-up", "coffee" → "eats" (cafe drink + light meal), "lunch"/"dinner" → "eats", "drinks at a bar" → "bars", "Netflix"/"Spotify" → "subs", "Tylenol"/"prescription" → "pharmacy", "shampoo"/"laundry detergent" → "personal-care"/"household" respectively.
- Today's date is __TODAY__. Use it to resolve relative phrases.
- Unknown fields → null (or [] for items). NEVER invent a store name or amount.
- If the transcript is too vague to extract even a store OR a total, return { "store_name": "", "total_amount": 0, "items": [] } — the caller will show an error.
- Output JSON only.`

function safeParseJson(raw) {
  if (!raw) return null
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try { return JSON.parse(s) } catch { return null }
}

async function callGeminiText({ apiKey, transcript, today }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const sys = VOICE_PROMPT.replace('__TODAY__', today)
  const body = {
    systemInstruction: { parts: [{ text: sys }] },
    contents: [{
      role: 'user',
      parts: [{ text: `Transcript: """${transcript}"""\n\nExtract per the schema. JSON only.` }],
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1024 },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  return {
    text: json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '',
    usage: json?.usageMetadata,
    provider: 'gemini',
    model: GEMINI_MODEL,
  }
}

export async function POST(request) {
  try {
    // Same per-IP+session rate budget as /api/parse-receipt (10/min).
    const rl = await rateLimit(rateKey(request, 'receipts-from-voice'), { limit: 10, windowMs: 60_000 })
    if (!rl.ok) {
      return Response.json(
        { error: `Too many voice captures. Try again in ${rl.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return Response.json(
        { error: 'Voice parsing requires GEMINI_API_KEY. Set it in your environment.' },
        { status: 500 },
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : ''
    if (!transcript) {
      return Response.json({ error: 'Missing transcript' }, { status: 400 })
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return Response.json(
        { error: `Transcript too long (${transcript.length} chars). Max ${MAX_TRANSCRIPT_CHARS}.` },
        { status: 413 },
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    let result
    try {
      result = await callGeminiText({ apiKey: geminiKey, transcript, today })
    } catch (e) {
      console.warn('[from-voice] Gemini call failed:', e.message)
      return Response.json({ error: e.message || 'Gemini failed' }, { status: 502 })
    }

    let parsed = safeParseJson(result.text)
    // One retry — same pattern as /api/parse-receipt. Gemini occasionally
    // returns markdown-fenced JSON on the first call; a re-issue usually
    // returns clean output and saves the user a re-record.
    if (!parsed) {
      try {
        const retry = await callGeminiText({ apiKey: geminiKey, transcript, today })
        if (retry?.text) {
          parsed = safeParseJson(retry.text)
          if (parsed) result = retry
        }
      } catch (e) {
        console.warn('[from-voice] retry threw:', e.message)
      }
    }
    if (!parsed) {
      console.error('[from-voice] non-JSON response (after retry):', result.text?.slice(0, 500))
      return Response.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    // Soft-validate: if the AI couldn't extract a store OR a total, signal
    // a parse failure so the client can re-prompt instead of saving a
    // mostly-empty row. We don't require BOTH — sometimes the user only
    // says a store name and wants to dictate the amount on the review screen.
    const hasStore = parsed.store_name && String(parsed.store_name).trim().length > 0
    const hasTotal = Number(parsed.total_amount ?? 0) !== 0
    if (!hasStore && !hasTotal) {
      return Response.json({
        error: "I couldn't make out a store or amount. Try: \"I spent thirty dollars at Costco on groceries.\"",
      }, { status: 422 })
    }

    console.log('[from-voice]', {
      provider: result.provider, model: result.model,
      store: parsed.store_name, date: parsed.date,
      total: parsed.total_amount, items: parsed.items?.length || 0,
    })

    // Same flat shape /api/parse-receipt returns. Empty strings for the
    // optional address/phone/etc fields because voice never has them.
    return Response.json({
      store_name: parsed.store_name || '',
      store_address: '',
      store_city: '',
      store_state: '',
      store_zip: '',
      store_phone: '',
      store_website: '',
      store_no: '',
      location_name: '',
      date: parsed.date || new Date().toISOString().slice(0, 10),
      total_amount: Number(parsed.total_amount ?? 0),
      tax_paid: Number(parsed.tax_paid ?? 0),
      payment_method: '',
      payment_last4: '',
      member_number: '',
      is_return: Boolean(parsed.is_return),
      category: parsed.category || null,
      items: autoCategorize(Array.isArray(parsed.items) ? parsed.items.map(it => ({
        sku: '',
        model: '',
        item_name: String(it.item_name || ''),
        qty: Number(it.qty || 1),
        price: it.price == null ? 0 : Number(it.price),
        category: it.category || null,
        health_tier: null,
        refund_policy_id: '',
        returned: false,
      })) : []),
      refund_policies: [],
      _provider: result.provider,
      _model: result.model,
      _usage: result.usage,
      // Flag the receipt as voice-sourced. The web + mobile clients pass
      // this through to validation_comment on save so we can audit voice-
      // parse accuracy later without adding a new column.
      _source: 'voice',
      _transcript: transcript,
    })
  } catch (err) {
    console.error('[from-voice] unhandled:', err)
    return Response.json({ error: err.message || 'Voice parse failed' }, { status: 500 })
  }
}
