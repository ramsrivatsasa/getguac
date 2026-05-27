// Receipt parser. Primary: Google Gemini 2.0 Flash (native PDF + image support).
// Fallback: Groq Llama 3.3 70B (PDF text extracted via pdf-parse) — used if Gemini
// returns an error AND a Groq key is configured. Both return the same JSON shape.

import pdfParse from 'pdf-parse'
import { rateLimit, rateKey } from '../../../lib/apiGuard'
import { parseReceiptFromImages } from '../../../lib/parse-receipt-engine'
import { autoCategorize } from '../../../lib/auto-categorize'
import { guackyNonReceiptResponse } from '../../../lib/guacky-responses'
export const runtime = 'nodejs'
export const maxDuration = 60

// Max 5 MB per receipt — reject larger uploads at the door
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL   = process.env.GROQ_TEXT_MODEL   || 'llama-3.3-70b-versatile'
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You extract structured data from retail receipts (in-store, e-receipt emails, and order confirmations).

Return ONLY a single JSON object. No prose, no markdown fences. Schema:

{
  "store_name": string,
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
  "date": string,                        // YYYY-MM-DD (transaction date, NOT email/forwarded date)
  "total_amount": number,                // positive purchases, NEGATIVE for returns
  "tax_paid": number,                    // negative on returns
  "payment_method": string|null,
  "payment_last4": string|null,
  "is_return": boolean,
  "is_receipt": boolean,                 // TRUE for any receipt / invoice / order confirmation. FALSE for non-receipt photos (selfie, cat, landscape, blank paper, screenshot of something else).
  "non_receipt_subject": string|null,    // When is_receipt=false: short 2-3 word description of what you DID see, lowercase ("a person", "a cat", "a sunset", "a blank page", "a screenshot of a chat"). When is_receipt=true: null.
  "category": string|null,               // ONE of: "grub", "eats", "snacks", "bars", "tea", "drinks", "subs", "bills", "bank-fees", "cloud", "tech", "big-stuff", "fix-it", "outdoors", "supplies", "fits", "pharmacy", "health", "personal-care", "household", "gas-up", "fun", "gifting", "charity", "misc"
  "items": [
    { "sku": string|null, "model": string|null, "item_name": string, "qty": number, "price": number, "category": string|null, "health_tier": "healthy"|"neutral"|"treat"|"harmful"|null, "refund_policy_id": string|null, "returned": boolean }
  ],
  "refund_policies": [
    { "policy_id": string|null, "days": number|null, "expiry_date": string|null, "eligible": boolean, "details": string|null }
  ]
}

Rules:
- Unknown fields → null (or [] for arrays). Never invent.
- Expand abbreviations: "BEGPLANT4" → "Burpee Eggplant #4", "75LM FLASHLI" → "Defiant 75LM Flashlight".
- Home Depot "4@3.33 13.32" → qty: 4, price: 13.32 (the line total, not per-unit).
- For returns, all money is negative AND is_return true AND each returned line has returned: true.
- date = transaction date printed on the receipt (NOT email forward date).

NOT-A-RECEIPT — if the input is clearly NOT a receipt (a selfie / portrait, a pet, a landscape, a screenshot of a chat, a blank piece of paper, an unrelated product photo, etc.), set:
  is_receipt: false
  non_receipt_subject: a short 2-3 word lowercase description of WHAT you saw ("a person", "a cat", "a sunset", "a blank page", "a screenshot", "a dog", "a meme", "a whiteboard")
  store_name: ""    date: null    total_amount: 0    tax_paid: 0    items: []    refund_policies: []
Set is_receipt: true for any receipt, invoice, e-receipt email, or order confirmation — even if some fields are unreadable or smudged. Only set false when the image is unmistakably NOT a receipt.

BEVERAGE ITEMS — when an item line names a beverage brand or kind, set the per-item category to the matching beverage slug, not the receipt-level slug:
  "COKE 12PK" / "PEPSI 2L" / "MTN DEW" / "STARBUCKS LATTE" / "COLD BREW" / "ESPRESSO" / "TROPICANA" / "MINUTE MAID OJ" / "OREO MILKSHAKE" / "FROSTY" / "GATORADE" → "drinks"
  "EARL GREY" / "MATCHA" / "CHAMOMILE" → "tea"
  "BUDWEISER 6PK" / "RED WINE" / "MARGARITA" → "bars"

SNACK ITEMS — packaged dry treats route to "snacks", not generic "grub". Use even on grocery receipts so the snack-shopping pattern is tracked separately:
  "DORITOS NACHO" / "LAY'S CLASSIC" / "PRINGLES" / "RUFFLES" / "CHEETOS" / "FRITOS" / "TAKIS" / "POPCORN" / "PRETZELS" / "GOLDFISH CRACKERS" → "snacks"
  "TRAIL MIX" / "CASHEWS" / "ALMONDS" / "PROTEIN BAR" / "GRANOLA BAR" / "KIND BAR" / "CLIF BAR" / "BEEF JERKY" → "snacks"
  "OREO" / "CHIPS AHOY" / "M&M" / "REESE'S" / "KIT KAT" / "SNICKERS" / "HERSHEY BAR" / "GUMMY BEARS" → "snacks"
A Starbucks receipt's RECEIPT-LEVEL category is "drinks"; a bar tab is "bars". A grocery run with mixed items has receipt-level "grub" but a Coke line still gets per-item "drinks".

HEALTH & HOUSEHOLD ITEMS — split between four specific slugs (do not lump into "misc"):
  "TYLENOL" / "ADVIL" / "RX " / "PRESCRIPTION" / "BAND-AID" → "pharmacy"
  "VITAMIN D" / "OMEGA-3" / "WHEY PROTEIN" / "CREATINE" / "MULTIVITAMIN" → "health"
  "TOOTHPASTE" / "SHAMPOO" / "DEODORANT" / "RAZOR" / "LOTION" → "personal-care"
  "TOILET PAPER" / "PAPER TOWELS" / "DISH SOAP" / "LAUNDRY DETERGENT" / "TRASH BAGS" → "household"

CLOUD vs SUBS vs TECH — split between three slugs:
  "cloud" — web/cloud infrastructure: hosting, domains, SSL, CDN, cloud compute/storage, VPS, email hosting.
    IONOS, GoDaddy, Namecheap, Hostinger, Bluehost, SiteGround, DreamHost, Name.com,
    Cloudflare, Vercel, Netlify, DigitalOcean, Linode,
    AWS, Amazon Web Services, Google Cloud, GCP, Microsoft Azure,
    Google Workspace, Microsoft 365 Business, line items like "Domain renewal", "Hosting plan", ".com renewal" → "cloud"
  "subs" — consumer software / media subscriptions with a user-facing UI:
    Netflix, Hulu, Disney+, HBO Max, Paramount+, Peacock, Spotify, Apple Music, YouTube Premium,
    Adobe Creative Cloud, Microsoft 365 personal, GitHub Pro, Notion, Figma, Slack, Zoom, Canva, JetBrains,
    ChatGPT Plus, Claude Pro, GitHub Copilot, Cursor, Midjourney, Perplexity → "subs"
  "tech" — PHYSICAL electronics, gadgets, cables, chargers, peripherals (laptop, phone, monitor, USB cable, charger). NOT for hosting / domains / SaaS.
A $26.40 IONOS domain renewal is "cloud" (not "tech", not "subs"). An $11.99 Netflix charge is "subs". A $1,299 MacBook Pro is "tech".

BANK FEES — anything the cardholder pays the issuer/bank for (NOT for a merchant purchase) uses "bank-fees":
  Interest charges, finance charges, balance-transfer fees, annual fees, late fees, overdraft fees, ATM fees, foreign-transaction fees, cash-advance fees → "bank-fees"
  Statement rows tagged "[Fee]", "[Interest]", "[Annual Fee]" → "bank-fees"

HEALTH TIER — for each item, set health_tier to:
- "healthy" : vegetables, fruit, lean protein, water, tea, plain yogurt, eggs, oats, legumes
- "neutral" : grains, dairy, coffee, lean meats, bread, most prepared foods, non-food items
- "treat"   : juice, dessert, alcohol, sweetened pastries, chips, fast food
- "harmful" : sugary soda (coke, pepsi, mountain dew), milkshakes, candy, deep-fried fast food
Leave null when the item isn't food or drink (electronics, clothing, supplies) — analytics will fall back to the category default.

- Output JSON only.`

function safeParseJson(raw) {
  if (!raw) return null
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try { return JSON.parse(s) } catch { return null }
}

// ── Gemini path ────────────────────────────────────────────────────
async function callGemini({ apiKey, mimeType, base64 }) {
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
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 4096 },
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

// ── Groq path (fallback) ───────────────────────────────────────────
async function callGroq({ apiKey, model, messages }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    }),
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

async function callGroqForFile({ apiKey, mimeType, buffer }) {
  if (mimeType === 'application/pdf') {
    const extracted = await pdfParse(buffer)
    if (!extracted.text || extracted.text.trim().length < 10) throw new Error('PDF text empty')
    return callGroq({
      apiKey, model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Receipt text:\n\n---\n${extracted.text}\n---\n\nJSON only.` },
      ],
    })
  }
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
  return callGroq({
    apiKey, model: GROQ_VISION_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: SYSTEM_PROMPT + '\n\nExtract this receipt:' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }],
  })
}

// ── Route handler ──────────────────────────────────────────────────
export async function POST(request) {
  try {
    // Rate limit — 10 parses/min per IP+session
    const rl = await rateLimit(rateKey(request, 'parse-receipt'), { limit: 10, windowMs: 60_000 })
    if (!rl.ok) {
      return Response.json(
        { error: `Too many parses. Try again in ${rl.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const groqKey   = process.env.GROQ_API_KEY
    if (!geminiKey && !groqKey) {
      return Response.json({ error: 'No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env.local.' }, { status: 500 })
    }

    const formData = await request.formData()

    // Multi-page path: client sends `file_1`, `file_2`, ... `file_N` AND/OR
    // a single `files` array. ML Kit Document Scanner returns N cleaned
    // page images for a single long receipt; we pass them all to Gemini
    // Vision as one multi-image request and get back a single receipt.
    const multiFiles = []
    for (let i = 1; i <= 50; i++) {
      const f = formData.get(`file_${i}`)
      if (f) multiFiles.push(f)
    }
    if (multiFiles.length === 0) {
      const arr = formData.getAll('files')
      if (Array.isArray(arr) && arr.length > 0) multiFiles.push(...arr)
    }
    if (multiFiles.length > 1) {
      // Validate every page is an image (multi-page only supports images;
      // multi-PDF would be a weird mix, so we just reject).
      const totalBytes = multiFiles.reduce((n, f) => n + (f.size || 0), 0)
      // Aggregate cap of 50 MB across all pages (was 15 MB / 3 pages-worth
      // in v0.2.51-0.2.53). A 50-page scan at ~1 MB/page lives comfortably
      // inside this. Per-page size still bounded by MAX_UPLOAD_BYTES.
      if (totalBytes > MAX_UPLOAD_BYTES * 10) {
        return Response.json({
          error: `Total upload too large (${(totalBytes/1024/1024).toFixed(1)} MB). Max ${(MAX_UPLOAD_BYTES * 10)/1024/1024} MB across all pages.`,
        }, { status: 413 })
      }
      const images = []
      for (const f of multiFiles) {
        const t = f.type || 'image/jpeg'
        if (!t.startsWith('image/')) {
          return Response.json({ error: `Page rejected — multi-page requires images only, got ${t}` }, { status: 415 })
        }
        const buf = Buffer.from(await f.arrayBuffer())
        images.push({ mimeType: t, base64: buf.toString('base64') })
      }
      let multiParsed
      try {
        multiParsed = await parseReceiptFromImages({ images })
      } catch (e) {
        return Response.json({ error: e.message || 'Multi-page parse failed' }, { status: 502 })
      }
      if (!multiParsed) {
        return Response.json({ error: 'Multi-page parse returned no data' }, { status: 502 })
      }
      console.log('[parse-receipt multi]', {
        pages: images.length, store: multiParsed.store_name,
        total: multiParsed.total_amount, items: multiParsed.items?.length || 0,
        is_receipt: multiParsed.is_receipt,
      })
      // Non-receipt detection: Gemini told us this isn't a receipt — bail
      // with a guacky response so the UI shows a playful nudge instead of
      // the dry "Missing store or date" error.
      if (multiParsed.is_receipt === false) {
        const guac = guackyNonReceiptResponse(multiParsed.non_receipt_subject)
        return Response.json({ error: guac.message, non_receipt: true, subject: guac.subject, tip: guac.tip }, { status: 422 })
      }
      // Flatten back into the same response shape the single-image path
      // returns so the mobile client doesn't have to branch on it.
      return Response.json({
        store_name: multiParsed.store_name || '',
        store_address: multiParsed.store?.address || '',
        store_city: multiParsed.store?.city || '',
        store_state: multiParsed.store?.state || '',
        store_zip: multiParsed.store?.zip || '',
        store_phone: multiParsed.store?.phone_no || '',
        store_website: multiParsed.store?.website || '',
        store_no: multiParsed.store?.store_no || '',
        location_name: multiParsed.store?.location_name || '',
        date: multiParsed.date || null,
        total_amount: multiParsed.total_amount,
        tax_paid: multiParsed.tax_paid,
        payment_method: multiParsed.payment_method,
        payment_last4: multiParsed.payment_last4,
        is_return: multiParsed.is_return,
        category: multiParsed.category,
        items: autoCategorize(multiParsed.items || []),
        refund_policies: multiParsed.refund_policies || [],
        _provider: multiParsed._provider,
        _pages: images.length,
      })
    }

    // Single-file path (existing behavior).
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const mimeType = file.type || 'application/pdf'
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      return Response.json({ error: `Unsupported file type: ${mimeType}` }, { status: 415 })
    }
    if (file.size && file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: `File too large (${(file.size/1024/1024).toFixed(1)} MB). Max ${MAX_UPLOAD_BYTES/1024/1024} MB.` }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    let result
    let geminiError = null

    // Try Gemini first
    if (geminiKey) {
      try {
        result = await callGemini({ apiKey: geminiKey, mimeType, base64 })
      } catch (err) {
        geminiError = err.message
        console.warn('[parse-receipt] Gemini failed, will try Groq:', err.message)
      }
    }

    // Fall back to Groq if Gemini failed (or wasn't configured)
    if (!result && groqKey) {
      result = await callGroqForFile({ apiKey: groqKey, mimeType, buffer })
    }

    if (!result) {
      return Response.json({ error: geminiError || 'Both providers failed' }, { status: 502 })
    }

    const parsed = safeParseJson(result.text)
    if (!parsed) {
      console.error('[parse-receipt] non-JSON response:', result.text?.slice(0, 500))
      return Response.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    console.log('[parse-receipt]', {
      provider: result.provider, model: result.model,
      store: parsed.store_name, date: parsed.date,
      total: parsed.total_amount, items: parsed.items?.length || 0,
      is_receipt: parsed.is_receipt,
    })

    // Non-receipt detection: Gemini told us this isn't a receipt — bail with
    // a guacky response so the UI shows a playful nudge instead of the dry
    // "Missing store or date" client-side error.
    if (parsed.is_receipt === false) {
      const guac = guackyNonReceiptResponse(parsed.non_receipt_subject)
      return Response.json({ error: guac.message, non_receipt: true, subject: guac.subject, tip: guac.tip }, { status: 422 })
    }

    return Response.json({
      store_name: parsed.store_name || '',
      store_address: parsed.store?.address || '',
      store_city: parsed.store?.city || '',
      store_state: parsed.store?.state || '',
      store_zip: parsed.store?.zip || '',
      store_phone: parsed.store?.phone_no || '',
      store_website: parsed.store?.website || '',
      store_no: parsed.store?.store_no || '',
      location_name: parsed.store?.location_name || '',
      date: parsed.date || new Date().toISOString().slice(0, 10),
      total_amount: Number(parsed.total_amount ?? 0),
      tax_paid: Number(parsed.tax_paid ?? 0),
      payment_method: parsed.payment_method || '',
      payment_last4: parsed.payment_last4 || '',
      is_return: Boolean(parsed.is_return),
      category: parsed.category || null,
      items: autoCategorize(Array.isArray(parsed.items) ? parsed.items.map(it => ({
        sku: it.sku || '', model: it.model || '', item_name: it.item_name || '',
        qty: Number(it.qty || 1), price: Number(it.price || 0),
        category: it.category || null,
        health_tier: it.health_tier || null,
        refund_policy_id: it.refund_policy_id || '', returned: Boolean(it.returned),
      })) : []),
      refund_policies: Array.isArray(parsed.refund_policies) ? parsed.refund_policies.map(p => ({
        policy_id: p.policy_id || '', days: p.days != null ? Number(p.days) : null,
        expiry_date: p.expiry_date || null, eligible: p.eligible !== false,
        details: p.details || '',
      })) : [],
      _provider: result.provider,
      _model: result.model,
      _usage: result.usage,
    })
  } catch (err) {
    console.error('[parse-receipt]', err)
    return Response.json({ error: err.message || 'Parse failed' }, { status: 500 })
  }
}
