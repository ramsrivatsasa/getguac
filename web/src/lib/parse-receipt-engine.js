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

// A receipt's transaction date can never be in the future. If the AI misreads
// it (commonly a MM/DD ↔ DD/MM swap or a digit slip), drop it to null so the
// user corrects it rather than trusting a wrong future date. A 1-day grace
// absorbs timezone skew (a receipt dated "today" in a zone ahead of UTC).
function notFutureDate(d) {
  if (!d) return null
  const t = new Date()
  t.setUTCDate(t.getUTCDate() + 1)
  const cutoff = t.toISOString().slice(0, 10)
  return d > cutoff ? null : d
}

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
- A SCREENSHOT of an online-order confirmation page or email (Amazon, Doordash, Uber Eats, Instacart, Shipt, Grubhub, Walmart Online, Target Pickup, Costco.com, Whole Foods, Sephora, Best Buy, etc.). These have a website chrome / app UI around them — IGNORE the chrome (browser tabs, app navigation bars, status bars, share buttons) and extract the order content.

ONLINE-ORDER SCREENSHOTS — common label mappings (treat as receipt fields):
- "Restaurant" / "From" / "Sold by" / "Order from" → store_name (the merchant)
- "Delivery from" / "Pickup from" → store_name
- "Subtotal" → items-only number, NOT the final total
- "Delivery fee" / "Service fee" / "Driver tip" / "Tip" / "Priority fee" / "Small order fee" / "Bag fee" → each is a SEPARATE line item with a descriptive item_name and category "eats" (food delivery) or matching context, NOT folded into tax
- "Taxes & Fees" combined → split if possible, otherwise put the explicit "Tax" amount in tax_paid and any fee remainder as its own item
- "Order Total" / "Grand Total" / "Total" / "You paid" / "Total Charged" → total_amount (this is the FINAL number the user paid, AFTER tax + fees + tip)
- "Estimated total" on Amazon → total_amount only if no GRAND TOTAL is shown
- Order date labels: "Ordered on", "Order placed", "Delivered on", "Placed", "Order date" → date (transaction date; prefer "Order placed" over "Delivered on")
- Item rows: name on the left, qty often as "x 2" or "(2)", price on the right. Combo / meal items keep the full combo name. Modifiers ("No onions", "Extra cheese") stay with the parent item — do not create separate lines for them.
- Online-order screenshots almost never have a payment_last4 visible; leave null when not shown. They may show "Visa ending in 1234" → payment_method: "Visa", payment_last4: "1234".

The screenshot may also be of a banking-app transaction detail page (Chase, Capital One, etc.) — those are NOT receipts (no line items, just an amount + merchant). Treat as is_receipt: true if there's a clear merchant + amount + date, with empty items.

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
  "payment_last4": string|null,            // Last 4 of the TENDER/payment card ONLY (from the VISA/MC/DEBIT/ACCT/CARD# payment block). A masked value next to Customer/BonusCard/Rewards or under a /rewards footer URL is a LOYALTY number → put it in member_number and leave this null.
  "member_number": string|null,            // Store loyalty / membership / rewards account number printed on the receipt (Costco "Member:", CVS ExtraCare, Kroger Plus, Sephora Beauty Insider, Giant Food "Customer", etc.). Return digits/chars EXACTLY as printed, INCLUDING mask glyphs — e.g. Giant "Customer 4*****6108" → "4*****6108". This is NOT the payment card — exclude the credit-card last-4 (that's payment_last4). Null when no membership identifier is printed.
  "is_return": boolean,
  "is_receipt": boolean,                   // TRUE for any receipt / invoice / order confirmation. FALSE for non-receipt images (selfie, pet, landscape, blank paper, screenshot of unrelated content).
  "non_receipt_subject": string|null,      // When is_receipt=false: short 2-3 word lowercase description of what you DID see ("a person", "a cat", "a sunset", "a blank page", "a screenshot"). When is_receipt=true: null.
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

MEMBER NUMBER — capture the store loyalty / membership / rewards identifier. Scan the WHOLE receipt incl. the top header and bottom footer; return digits/chars exactly as printed (no labels). Examples: "MEMBER: 111222333"→"111222333", "ExtraCare Card 1234567890"→"1234567890", "Kroger Plus xxx-xxx-1234"→"xxx-xxx-1234".
COSTCO (look hard — usually present): an ~11–12 DIGIT number by the word "Member"/"Membership", typically near the TOP under the warehouse address, OFTEN WITH NO COLON, e.g. "Member 111222333444" or "Member 111 222 333 444"; on Costco.com it's "Membership Number"/"Member ID". Capture the full 11–12 digit string. It is NOT the per-item 6–7 digit item number, the Whse/Register/Trn/Op number, any amount, or the card last-4. EXCLUDE the credit-card last-4. Return null only if no membership identifier is printed anywhere.
GROCERY / MASKED LOYALTY NUMBERS (Giant Food, Stop & Shop, Food Lion, Harris Teeter, Safeway, ACME, Kroger, and similar) — many loyalty / "BonusCard" / "Customer" numbers are printed MASKED for privacy: some leading character(s), a run of mask glyphs, then the last few visible digits. The mask glyph may be "*", "x", "X", or "#". CAPTURE THE MASKED STRING EXACTLY AS PRINTED — keep every mask glyph, hyphen and space; do NOT unmask, reconstruct the hidden digits, drop the glyphs, or return only the trailing digits. These almost always sit in the FOOTER (beneath a "www.<store>.com/rewards" or "CARD SAVINGS" line and a row of asterisks), NOT the top — so scan the bottom.
  "Customer 4*****6108"        → "4*****6108"
  "BonusCard 9****1234"        → "9****1234"
  "****6108" / "XXXXXX6108"    → "****6108" / "XXXXXX6108"   (no leading digit is fine)
  "Club Card S****6108"        → "S****6108"                 (a letter prefix is fine)
PAYMENT-CARD DISAMBIGUATION (BOTH directions) — a masked value next to "Customer"/"BonusCard"/"Rewards"/"Member" or under a "/rewards" URL is the member_number, EVEN when it starts with 4 and ends in 4 digits like a Visa: e.g. "Customer 4*****6108" → member_number "4*****6108" and payment_last4 STAYS null (the leading 4 is a coincidence, NOT a card BIN — never split out "6108" as a card last-4). Conversely, a masked number in the TENDER/payment block (a "VISA/MC/DEBIT/CREDIT", "ACCOUNT/ACCT #", or "CARD #" line) is payment_last4, NOT member_number.
"Customer" ALONE IS NOT A TRIGGER — only treat "Customer" as a loyalty label when a value containing a mask glyph OR ≥4 consecutive digits sits on the SAME line right after it. IGNORE "Customer Copy", "Merchant Copy", "Customer Service", "Customer Care/Support", "Valued Customer", and any phone number. Also NEVER capture as member_number: survey/sweepstakes/feedback codes (under a "/survey", "/feedback" or "/tellus" URL), $-prefixed or decimal-cents amounts (e.g. "CARD SAVINGS $62.09"), store/register/transaction IDs, AID/AUTH/APPROVAL/REF codes, the store phone, or cashier/manager names.
ONLY emit a masked value when actual mask glyphs are present; if the candidate is ALL digits, treat it as a FULL number (Costco 11–12 digit logic above) — never fabricate a masked "last 4" of a full number.

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

NOT-A-RECEIPT — if the input is clearly NOT a receipt (a selfie / portrait, a pet, a landscape, a screenshot of a chat, a blank piece of paper, an unrelated product photo, an unrelated email body, etc.), set:
  is_receipt: false
  non_receipt_subject: a short 2-3 word lowercase description of WHAT you saw ("a person", "a cat", "a sunset", "a blank page", "a screenshot", "a dog", "a meme", "a whiteboard")
  store_name: ""    date: null    total_amount: 0    tax_paid: 0    items: []    refund_policies: []
Set is_receipt: true for any receipt, invoice, e-receipt email, or order confirmation — even if some fields are unreadable or smudged. Only set false when the image is unmistakably NOT a receipt.

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
    date: notFutureDate(parsed.date),
    total_amount: Number(parsed.total_amount ?? 0),
    tax_paid: Number(parsed.tax_paid ?? 0),
    payment_method: parsed.payment_method || '',
    payment_last4: parsed.payment_last4 || '',
    member_number: parsed.member_number || '',
    is_return: Boolean(parsed.is_return),
    is_receipt: parsed.is_receipt === false ? false : true,
    non_receipt_subject: parsed.non_receipt_subject || null,
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
// `userContextSuffix` (optional) is a string appended to the system prompt
// with per-user preferences (see lib/user-context.js). Empty string for
// anonymous / cold-start users — keeps the model on base behavior.
async function callGeminiInline({ apiKey, mimeType, base64, timeoutMs = 30_000, userContextSuffix = '' }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT + userContextSuffix }] },
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
export async function parseReceiptFromText(text, { maxChars = 32_000, emailDate = null, userContextSuffix = '' } = {}) {
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
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT + userContextSuffix }] },
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
          { role: 'system', content: SYSTEM_PROMPT + userContextSuffix },
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
async function callGeminiMultiImage({ apiKey, images, timeoutMs = 45_000, userContextSuffix = '' }) {
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
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT + userContextSuffix }] },
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
export async function parseReceiptFromImages({ images, userContextSuffix = '' }) {
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
      result = await callGeminiMultiImage({ apiKey: geminiKey, images: prepared, userContextSuffix })
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
            { type: 'text', text: SYSTEM_PROMPT + userContextSuffix + '\n\nExtract this receipt (page 1 of multi-page):' },
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

  // One-shot retry on garbled output. Gemini occasionally wraps the JSON
  // in markdown fences mid-stream or truncates the response; reissuing
  // the same request usually returns clean JSON. Cheap insurance — one
  // extra API call only when the first attempt failed.
  let parsed = safeParseJson(result.text)
  if (!parsed && geminiKey) {
    try {
      const retry = await callGeminiMultiImage({ apiKey: geminiKey, images: prepared, userContextSuffix })
      if (retry?.text) {
        const retryParsed = safeParseJson(retry.text)
        if (retryParsed) {
          result = retry
          parsed = retryParsed
          console.log('[parse-receipt-engine] multi-page succeeded on retry')
        }
      }
    } catch (e) {
      console.warn('[parse-receipt-engine] multi-page retry threw:', e.message)
    }
  }
  return normalizeResult(parsed, result.provider, result.model, result.usage)
}

// Parse a receipt from a file (PDF or image). Returns normalized shape OR null.
export async function parseReceiptFromFile({ buffer, mimeType, userContextSuffix = '' }) {
  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey   = process.env.GROQ_API_KEY
  if (!geminiKey && !groqKey) return null

  const base64 = buffer.toString('base64')
  let result
  let firstErr = null

  if (geminiKey) {
    try {
      result = await callGeminiInline({ apiKey: geminiKey, mimeType, base64, userContextSuffix })
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
            { role: 'system', content: SYSTEM_PROMPT + userContextSuffix },
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
              { type: 'text', text: SYSTEM_PROMPT + userContextSuffix + '\n\nExtract this receipt:' },
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
