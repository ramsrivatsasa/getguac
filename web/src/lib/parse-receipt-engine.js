// Shared receipt-parsing engine. Used by:
//   - /api/parse-receipt: file uploads (PDF / image) from the camera + drag-drop flow
//   - /api/email/poll + /api/email/backfill: text bodies of forwarded receipt emails
//
// Provider strategy:
//   - For TEXT input: Groq Llama 3.3 70B (fast, cheap, strong on text). No vision needed.
//   - For PDF / IMAGE input: Gemini 2.5 Flash first (native PDF + image), Groq as fallback.
//
// Both paths return the SAME normalized shape, so callers don't branch.

import pdfParse from 'pdf-parse'

const GEMINI_MODEL      = process.env.GEMINI_MODEL      || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL   = process.env.GROQ_TEXT_MODEL   || 'llama-3.3-70b-versatile'
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ── System prompt ────────────────────────────────────────────────────────
// Two things this version handles better than the previous prompt:
//   1. Explicitly tells the model the input may be a forwarded EMAIL with
//      "Forwarded message", From/To headers, and signatures — to be ignored.
//   2. Strong rule that store_name MUST be the merchant (Lowe's, Worldgate
//      Athletic Club, Amazon, …), NEVER the email forwarder or their provider
//      (gmail.com, yahoo.com, the user's own address).
const SYSTEM_PROMPT = `You extract structured data from retail receipts. The receipt may be:
- A scanned/photographed in-store receipt
- An e-receipt email (HTML or plain text)
- An order confirmation email
- A receipt FORWARDED inside another email (with "Forwarded message", "From:", "To:", "Date:", "Subject:" headers and the user's own signature)

Return ONLY a single JSON object. No prose, no markdown fences. Schema:

{
  "store_name": string,                    // The MERCHANT, never the forwarder or their email provider
  "store": {
    "location_name": string|null,
    "address": string|null,
    "city": string|null,
    "state": string|null,
    "zip": string|null,
    "phone_no": string|null,
    "website": string|null,
    "store_no": string|null
  },
  "date": string,                          // YYYY-MM-DD (transaction date PRINTED on the receipt, NOT the email forward date)
  "total_amount": number,                  // positive purchases, NEGATIVE for returns
  "tax_paid": number,                      // negative on returns
  "payment_method": string|null,
  "payment_last4": string|null,
  "is_return": boolean,
  "category": string|null,                 // ONE of: "grub", "eats", "bars", "coffee", "tea", "coke", "pepsi", "juice", "milkshake", "subs", "bills", "tech", "big-stuff", "fix-it", "outdoors", "supplies", "fits", "wellness", "gas-up", "fun", "gifting", "charity", "misc"
  "items": [
    { "sku": string|null, "model": string|null, "item_name": string, "qty": number, "price": number, "category": string|null, "health_tier": "healthy"|"neutral"|"treat"|"harmful"|null, "refund_policy_id": string|null, "returned": boolean }
  ],
  "refund_policies": [
    { "policy_id": string|null, "days": number|null, "expiry_date": string|null, "eligible": boolean, "details": string|null }
  ]
}

Rules:
- Unknown fields → null (or [] for arrays). Never invent.
- IGNORE email wrapper text: "---------- Forwarded message ----------", "From: <forwarder>", "Sent from my iPhone", signatures, gmail/yahoo/outlook quote blocks. Only extract the MERCHANT receipt content.
- store_name MUST be the actual merchant on the receipt (e.g. "Worldgate Athletic Club", "Lowe's", "Amazon"). NEVER use "gmail", "yahoo", "outlook", or the forwarder's email address.
- Expand abbreviations: "BEGPLANT4" → "Burpee Eggplant #4", "75LM FLASHLI" → "Defiant 75LM Flashlight".
- Home Depot "4@3.33 13.32" → qty: 4, price: 13.32 (the line total, not per-unit).
- For returns, all money is negative AND is_return true AND each returned line has returned: true.

TOTAL AMOUNT — critical. Extract the FINAL grand total the customer paid, AFTER tax and shipping. NOT the items subtotal. Look for labels in this order:
  1. "Grand Total:"
  2. "Order Total:" / "Total:"  (the LAST one on the receipt, not the items-only subtotal at the top)
  3. "Amount Charged:" / "You Paid:" / "Total Charged:"
  4. "Total Due:"
Amazon order emails specifically list: Items / Shipping & handling / Total before tax / Estimated tax / GRAND TOTAL. Pick GRAND TOTAL, never "Total before tax" or "Items subtotal".

TAX — extract the explicit "Sales Tax:", "Tax:", or "Estimated tax:" line ONLY. Don't compute or guess.
SANITY CHECK after extraction: if total_amount > 30 AND tax_paid / total_amount < 0.02, you likely picked the wrong total (probably grabbed Items subtotal + a small fee labelled "tax"). Re-scan the receipt and find the higher GRAND TOTAL number that pairs with this tax. Typical US sales tax is 4-10% of the post-tax total.

DATE EXTRACTION — critical. Many receipts get forwarded weeks or months AFTER the
transaction; the email's "Date:" header is NOT the transaction date.
- The transaction date is printed on the receipt body, typically next to one of:
  "Date:", "Trans Date", "Sale Date", "Visit Date", "Order Date", "Date of Sale",
  or stamped directly under the merchant name/address as MM/DD/YYYY, DD/MM/YYYY,
  or "Mon DD, YYYY".
- If two dates appear, the EARLIER one is almost always the transaction date and
  a later date is when the email/receipt was sent or forwarded.
- If a "forwardedAt" or "emailDate" hint is given below, REJECT any candidate date
  that equals it; keep searching for an earlier transaction date in the receipt body.
- Output format: strict YYYY-MM-DD (zero-padded).
- If you genuinely cannot determine the transaction date from the receipt body,
  set "date" to null. NEVER fall back to today, the email date, or any header date.

BEVERAGE ITEMS — when an item line names a beverage brand or kind, set the item's category to the matching beverage slug, not the receipt-level slug:
- "COKE 12PK" / "COCA-COLA 2L" / "CHERRY COKE" → "coke"
- "PEPSI 2L" / "MTN DEW" / "MOUNTAIN DEW" → "pepsi"
- "STARBUCKS VENTI LATTE" / "ESPRESSO" / "COLD BREW" / "DUNKIN COFFEE" → "coffee"
- "EARL GREY TEA" / "MATCHA" / "CHAI LATTE" → "tea"
- "MINUTE MAID OJ" / "TROPICANA" / "APPLE JUICE" → "juice"
- "OREO MILKSHAKE" / "STRAWBERRY SHAKE" / "FROSTY" → "milkshake"
- "BUDWEISER 6PK" / "IPA" / "RED WINE" / "MARGARITA" / "TEQUILA" → "bars"
A Starbucks receipt's RECEIPT-LEVEL category is "coffee". A bar-tab receipt's RECEIPT-LEVEL category is "bars". A grocery run with mixed items has receipt-level "grub" but the Coke line still gets per-item "coke".

HEALTH TIER — for each item, set health_tier to:
- "healthy": vegetables, fruit, lean protein, water, tea, plain yogurt, eggs, oats, legumes
- "neutral": grains, dairy, coffee, lean meats, bread, most prepared foods, non-food items
- "treat": juice, dessert, alcohol, sweetened pastries, chips, fast food
- "harmful": sugary soda (coke, pepsi, mountain dew), milkshakes, candy, deep-fried fast food
Leave null when the item isn't food or drink (electronics, clothing, supplies) — analytics will fall back to the category default.

CHARITY / DONATION ITEMS — set category to "charity" for any item that is a:
- monetary donation, contribution, tithe, offering
- charity entry fee or registration ("Run for X", race fee for a 501c3 event)
- item line labeled DONATION, GIFT TO CHARITY, ROUND-UP DONATION, TIP TO CAUSE
Charity items cannot be "returned" — leave returned=false even if the receipt
indicates a refund of a different line.

Output JSON only.`

// ── Helpers ──────────────────────────────────────────────────────────────
function safeParseJson(raw) {
  if (!raw) return null
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try { return JSON.parse(s) } catch { return null }
}

function normalizeResult(parsed, provider, model, usage) {
  if (!parsed) return null
  return {
    store_name: parsed.store_name || '',
    store_address: parsed.store?.address || '',
    store_city: parsed.store?.city || '',
    store_state: parsed.store?.state || '',
    store_zip: parsed.store?.zip || '',
    store_phone: parsed.store?.phone_no || '',
    store_website: parsed.store?.website || '',
    store_no: parsed.store?.store_no || '',
    location_name: parsed.store?.location_name || '',
    date: parsed.date || null,
    total_amount: Number(parsed.total_amount ?? 0),
    tax_paid: Number(parsed.tax_paid ?? 0),
    payment_method: parsed.payment_method || '',
    payment_last4: parsed.payment_last4 || '',
    is_return: Boolean(parsed.is_return),
    category: parsed.category || null,
    items: Array.isArray(parsed.items) ? parsed.items.map(it => ({
      sku: it.sku || '', model: it.model || '', item_name: it.item_name || '',
      qty: Number(it.qty || 1),
      // Distinguish "we don't know" (null) from "free" (0). Amazon "Ordered:"
      // emails list items without per-line prices — we want the UI to show "—"
      // instead of misleadingly displaying "$0.00".
      price: it.price == null || it.price === '' ? null : Number(it.price),
      category: it.category || null,
      refund_policy_id: it.refund_policy_id || '', returned: Boolean(it.returned),
    })) : [],
    refund_policies: Array.isArray(parsed.refund_policies) ? parsed.refund_policies.map(p => ({
      policy_id: p.policy_id || '', days: p.days != null ? Number(p.days) : null,
      expiry_date: p.expiry_date || null, eligible: p.eligible !== false,
      details: p.details || '',
    })) : [],
    _provider: provider,
    _model: model,
    _usage: usage,
  }
}

// ── Provider callers ─────────────────────────────────────────────────────
async function callGeminiInline({ apiKey, mimeType, base64, timeoutMs = 30_000 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: 'Extract per the schema. JSON only.' },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 4096 },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
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

async function callGroq({ apiKey, model, messages, timeoutMs = 30_000 }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Groq ${res.status}`)
  return {
    text: json?.choices?.[0]?.message?.content || '',
    usage: json?.usage,
    provider: 'groq',
    model,
  }
}

// ── Public entry points ──────────────────────────────────────────────────

// Parse a receipt from a text body (forwarded email, OCR result, anything textual).
// Returns the normalized shape OR null on failure. Never throws — callers can
// fall back to a stub draft if this returns null.
//
// Optional `emailDate` is an ISO YYYY-MM-DD or full date string for the email's
// received_at. When provided, the AI is told to REJECT this date as a candidate
// — useful when the forwarder's email date isn't the actual transaction date.
export async function parseReceiptFromText(text, { maxChars = 32_000, emailDate = null } = {}) {
  if (!text || !text.trim()) return null

  const groqKey = process.env.GROQ_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!groqKey && !geminiKey) {
    console.warn('[parse-receipt-engine] no AI key configured — skipping parse')
    return null
  }

  // Cap input so a 5 MB newsletter doesn't blow up the AI call cost.
  const body = text.length > maxChars ? text.slice(0, maxChars) + '\n[truncated]' : text

  // Normalize hint to YYYY-MM-DD so the AI sees a consistent format.
  let hint = ''
  if (emailDate) {
    try {
      const d = emailDate instanceof Date ? emailDate : new Date(emailDate)
      if (!Number.isNaN(d.getTime())) {
        const iso = d.toISOString().slice(0, 10)
        hint = `\n\nHINT (do NOT use this as the transaction date — it's when the email was forwarded): emailDate=${iso}\n`
      }
    } catch (_) { /* ignore bad hint */ }
  }

  // Prefer Gemini for text — it's noticeably more accurate than Groq on
  // multi-section receipts (Amazon order emails with multiple subtotals,
  // shipping, tax, and grand total lines). temperature: 0 keeps re-parses
  // deterministic so the user sees the same value every time they re-parse.
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: `Extract the receipt from this email body. JSON only.${hint}\n\n${body}` }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(30_000),
      })
      const json = await res.json()
      if (res.ok) {
        const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
        const parsed = safeParseJson(text)
        if (parsed) return normalizeResult(parsed, 'gemini', GEMINI_MODEL, json?.usageMetadata)
      } else {
        console.warn('[parse-receipt-engine] Gemini text failed:', json?.error?.message || res.status)
      }
    } catch (e) {
      console.warn('[parse-receipt-engine] Gemini text failed:', e.message)
    }
  }

  // Groq fallback — used only if Gemini is unavailable or returns malformed JSON.
  try {
    if (groqKey) {
      const result = await callGroq({
        apiKey: groqKey,
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extract the receipt from this email body. JSON only.${hint}\n\n${body}` },
        ],
      })
      const parsed = safeParseJson(result.text)
      if (parsed) return normalizeResult(parsed, result.provider, result.model, result.usage)
    }
  } catch (e) {
    console.warn('[parse-receipt-engine] Groq text fallback failed:', e.message)
  }

  return null
}

// Multi-image Gemini Vision call. Sends every image in `images` as a
// separate inline_data part in a SINGLE generateContent request, with a
// prompt telling the model they are sequential photos of one long receipt
// (top to bottom). Used for ML Kit Document Scanner output where the user
// captured a multi-page CVS-style receipt.
//
// Returns the same shape as callGeminiInline: { text, usage, provider, model }.
async function callGeminiMultiImage({ apiKey, images, timeoutMs = 45_000 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const parts = []
  // Each image as its own inline_data, in capture order.
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } })
  }
  // Trailing text part frames the images.
  parts.push({
    text: `The ${images.length} image${images.length === 1 ? '' : 's'} above ${images.length === 1 ? 'is' : 'are'} sequential photos of ONE long receipt, taken top to bottom. Treat them as a single receipt. Extract every line item from every image. Use the grand total / final total printed somewhere in the images (usually the last one). JSON only per the schema.`,
  })
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 8192 },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
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

// Parse a multi-page receipt from N images (the ML Kit Document Scanner
// flow). Falls back to parsing only the first image with Groq if Gemini
// fails — Groq Vision can't accept multiple images in one call, and a
// best-effort parse of page 1 is still better than nothing.
export async function parseReceiptFromImages({ images }) {
  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey   = process.env.GROQ_API_KEY
  if (!geminiKey && !groqKey) return null
  if (!Array.isArray(images) || images.length === 0) return null

  // Normalise input: accept either { buffer, mimeType } or { base64, mimeType }.
  const prepared = images.map(img => ({
    mimeType: img.mimeType || 'image/jpeg',
    base64: img.base64 || (img.buffer ? img.buffer.toString('base64') : null),
  })).filter(i => i.base64)

  if (prepared.length === 0) return null

  let result
  let firstErr = null

  if (geminiKey) {
    try {
      result = await callGeminiMultiImage({ apiKey: geminiKey, images: prepared })
    } catch (err) {
      firstErr = err.message
      console.warn('[parse-receipt-engine] Gemini multi-image failed, falling back to Groq on first page:', err.message)
    }
  }

  if (!result && groqKey) {
    // Best-effort: Groq Vision is single-image only, so parse the FIRST page
    // (usually has store name + date + start of items). Tag is_truncated so
    // the caller knows we couldn't read the rest.
    try {
      const dataUrl = `data:${prepared[0].mimeType};base64,${prepared[0].base64}`
      result = await callGroq({
        apiKey: groqKey, model: GROQ_VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: SYSTEM_PROMPT + '\n\nExtract this receipt (page 1 of multi-page):' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
      })
    } catch (e) {
      console.warn('[parse-receipt-engine] Groq single-page fallback failed:', e.message)
    }
  }

  if (!result) {
    const err = new Error(firstErr || 'All AI providers failed')
    err.code = 'ALL_PROVIDERS_FAILED'
    throw err
  }

  const parsed = safeParseJson(result.text)
  return normalizeResult(parsed, result.provider, result.model, result.usage)
}

// Parse a receipt from a file (PDF or image). Returns normalized shape OR null.
export async function parseReceiptFromFile({ buffer, mimeType }) {
  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey   = process.env.GROQ_API_KEY
  if (!geminiKey && !groqKey) return null

  const base64 = buffer.toString('base64')
  let result
  let firstErr = null

  if (geminiKey) {
    try {
      result = await callGeminiInline({ apiKey: geminiKey, mimeType, base64 })
    } catch (err) {
      firstErr = err.message
      console.warn('[parse-receipt-engine] Gemini failed, will try Groq:', err.message)
    }
  }

  if (!result && groqKey) {
    // Groq fallback paths: PDF -> extract text with pdf-parse and use text model;
    // image -> use vision model directly.
    if (mimeType === 'application/pdf') {
      try {
        const { text } = await pdfParse(buffer)
        result = await callGroq({
          apiKey: groqKey, model: GROQ_TEXT_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Extract this receipt. JSON only.\n\n${text}` },
          ],
        })
      } catch (e) { console.warn('[parse-receipt-engine] Groq PDF fallback failed:', e.message) }
    } else if (mimeType.startsWith('image/')) {
      try {
        const dataUrl = `data:${mimeType};base64,${base64}`
        result = await callGroq({
          apiKey: groqKey, model: GROQ_VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: SYSTEM_PROMPT + '\n\nExtract this receipt:' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          }],
        })
      } catch (e) { console.warn('[parse-receipt-engine] Groq vision fallback failed:', e.message) }
    }
  }

  if (!result) {
    const err = new Error(firstErr || 'All AI providers failed')
    err.code = 'ALL_PROVIDERS_FAILED'
    throw err
  }

  const parsed = safeParseJson(result.text)
  return normalizeResult(parsed, result.provider, result.model, result.usage)
}
