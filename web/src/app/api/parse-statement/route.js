// Statement parser — accepts a PDF or image of a credit-card or bank statement
// (or a cropped screenshot of just the transaction rows) and extracts every
// transaction as a row. Mirrors /api/parse-receipt's provider strategy:
// Gemini primary, Groq fallback.
//
// Returns a *preview* only — the client posts the user-edited rows to
// /api/parse-statement/import to actually create receipts. This 2-step flow
// is important: a statement page can contain 50+ rows, the user must be able
// to deselect or re-categorize before anything hits their receipts table.

import pdfParse from 'pdf-parse'
import { rateLimit, rateKey } from '../../../lib/apiGuard'
import { createClient } from '../../../lib/supabase/server'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024   // statements can be a touch larger than single receipts

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL   = process.env.GROQ_TEXT_MODEL   || 'llama-3.3-70b-versatile'
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You extract transactions from a credit-card statement, bank statement,
or a cropped screenshot of transaction rows from either. Return ONLY one JSON
object. No prose, no markdown.

Schema:
{
  "statement_kind": "credit-card" | "bank" | "rows-only" | null,
  "issuer":         string|null,           // "Chase Sapphire Preferred", "Amex Platinum", "Wells Fargo Checking"
  "account_last4":  string|null,
  "period_start":   string|null,           // YYYY-MM-DD
  "period_end":     string|null,           // YYYY-MM-DD
  "totals": {
    "purchases":     number|null,          // sum of purchases (money out, fees excluded), positive
    "refunds":       number|null,          // sum of refunds / credits, positive number
    "fees":          number|null,          // sum of bank/card fees, positive
    "interest":      number|null,          // sum of interest charges, positive
    "payments":      number|null           // sum of card-payments applied (paying down the balance)
  },
  "finance": {
    "previous_balance":     number|null,   // balance carried in from the prior statement
    "new_balance":          number|null,   // total balance owed at end of period
    "credit_limit":         number|null,
    "available_credit":     number|null,
    "minimum_payment_due":  number|null,
    "payment_due_date":     string|null,   // YYYY-MM-DD
    "purchase_apr":         number|null,   // annual %, e.g. 24.99 (NOT a decimal — 24.99 not 0.2499)
    "balance_transfer_apr": number|null,
    "cash_advance_apr":     number|null
  },
  "transactions": [
    {
      "date":            string,           // YYYY-MM-DD (post date)
      "merchant":        string,           // CLEANED — strip "TST*","SQ *","AUTH","POS DEBIT", trailing city/state, ref numbers
      "raw_description": string,           // verbatim original line
      "amount":          number,           // POSITIVE = money OUT (purchase / fee / interest / withdrawal). NEGATIVE = money IN (refund / credit / deposit / card payment)
      "category":        string|null,      // ONE of: "grub","eats","tech","big-stuff","fix-it","outdoors","fits","wellness","gas-up","fun","gifting","misc". Use null for fee/interest/payment rows.
      "kind":            "purchase" | "refund" | "fee" | "interest" | "payment" | "deposit" | "withdrawal" | "transfer" | "other",
      "is_payment":      boolean,          // true if this row PAYS DOWN the card balance (NOT a merchant payment) — set true for "PAYMENT - THANK YOU", autopay, etc.
      "is_fee":          boolean,          // true for ANY fee: annual fee, foreign-transaction fee, overdraft, late fee, ATM fee, monthly maintenance fee
      "is_interest":     boolean,          // true ONLY for interest charges (purchase interest, cash-advance interest, finance charge)
      "is_refund":       boolean,          // true ONLY for MERCHANT refunds / credits (NOT card payments). Amount must be negative when true.
      "fee_kind":        string|null,      // when is_fee or is_interest: short label like "Annual fee","Foreign tx fee","Overdraft","ATM fee","Late fee","Purchase interest","Cash-advance interest"
      "city":            string|null,
      "state":           string|null
    }
  ]
}

Hard rules — read carefully:
- Sign convention: positive = money leaving the account (purchase / fee / interest / withdrawal), negative = money entering (refund / deposit / payment-applied).
- Exactly ONE of (is_payment, is_fee, is_interest, is_refund) is allowed to be true per row. If none apply, all four false → it's a normal purchase.
- "kind" must agree with the booleans: is_payment ↔ kind="payment"; is_fee ↔ kind="fee"; is_interest ↔ kind="interest"; is_refund ↔ kind="refund". Otherwise pick the best of purchase/deposit/withdrawal/transfer/other.
- Fees and interest: category MUST be null. They are not spending categories.
- Refunds keep their original spending category (a Target return is still "grub" / etc.) — this lets analytics reconcile spend vs. refund per category.
- Card payments (paying off the balance) and ACH transfers between own accounts: is_payment=true, category=null, NOT a refund.
- Bank statements: deposits/transfers in → NEGATIVE. ATM withdrawals → POSITIVE. Online purchases → POSITIVE.
- Date format strictly YYYY-MM-DD. If month+day only, infer year from period_end. If period missing, use current year only as a last resort.
- "totals" should be computed from the rows you extracted — if you cannot reliably compute one, set it null. Do NOT fabricate.
- "finance" — look at the SUMMARY / ACCOUNT INFORMATION block printed on a credit-card statement (usually page 1). Pull these verbatim if printed; do NOT compute them yourself. APRs are PERCENTAGES (e.g. 24.99 means 24.99% APR, NOT 0.2499). If a field isn't printed, set it null. Bank statements (checking/savings) usually have no APR or minimum payment — set those null and try to fill new_balance / previous_balance from the running balance instead.
- Output JSON only.`

function safeParseJson(raw) {
  if (!raw) return null
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  // Strategy 1: parse as-is
  try { return JSON.parse(s) } catch { /* fall through */ }

  // Strategy 2: trim to first { ... last }
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) {
    const slice = s.slice(a, b + 1)
    try { return JSON.parse(slice) } catch { s = slice }
  }

  // Strategy 3: salvage from truncated response.
  // Find the start of "transactions": [ ... and walk the array, collecting only
  // complete top-level objects. Reassemble the outer object with whatever
  // sibling keys (issuer, period_*, totals) we can recover.
  const salvaged = salvageStatementJson(s)
  if (salvaged) return salvaged

  return null
}

function salvageStatementJson(s) {
  const arrKey = s.indexOf('"transactions"')
  if (arrKey < 0) return null
  const arrStart = s.indexOf('[', arrKey)
  if (arrStart < 0) return null

  // Walk the array, tracking brace depth + quote state, collect each {...} child
  const children = []
  let depth = 0
  let inStr = false
  let escape = false
  let objStart = -1

  for (let i = arrStart + 1; i < s.length; i++) {
    const ch = s[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inStr) { escape = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') { if (depth === 0) objStart = i; depth++ }
    else if (ch === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        const objText = s.slice(objStart, i + 1)
        try { children.push(JSON.parse(objText)) } catch { /* skip malformed */ }
        objStart = -1
      }
    } else if (ch === ']' && depth === 0) break
  }

  if (children.length === 0) return null

  // Pull sibling keys (issuer, account_last4, period_*, statement_kind) from
  // the prefix that precedes "transactions". Just regex them out — they're
  // simple top-level strings.
  const head = s.slice(0, arrKey)
  const grab = (key) => {
    const m = head.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`))
    return m ? m[1] : null
  }
  return {
    statement_kind: grab('statement_kind'),
    issuer:         grab('issuer'),
    account_last4:  grab('account_last4'),
    period_start:   grab('period_start'),
    period_end:     grab('period_end'),
    transactions:   children,
    _salvaged:      true,
  }
}

async function callGemini({ apiKey, mimeType, base64 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: 'Extract every transaction per the schema. JSON only.' },
      ],
    }],
    // Statements can have 50+ rows; 8k tokens truncates them mid-array.
    // Gemini 2.5 Flash supports up to 65k output tokens.
    generationConfig: { responseMimeType: 'application/json', temperature: 0.05, maxOutputTokens: 32768 },
  }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  return {
    text: json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '',
    provider: 'gemini', model: GEMINI_MODEL,
  }
}

async function callGroq({ apiKey, model, messages }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0.05, max_tokens: 32768 }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Groq ${res.status}`)
  return { text: json?.choices?.[0]?.message?.content || '', provider: 'groq', model }
}

async function callGroqForFile({ apiKey, mimeType, buffer }) {
  if (mimeType === 'application/pdf') {
    const extracted = await pdfParse(buffer)
    if (!extracted.text || extracted.text.trim().length < 10) throw new Error('PDF text empty')
    return callGroq({
      apiKey, model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Statement text:\n\n---\n${extracted.text}\n---\n\nJSON only.` },
      ],
    })
  }
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
  return callGroq({
    apiKey, model: GROQ_VISION_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: SYSTEM_PROMPT + '\n\nExtract this statement:' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }],
  })
}

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'parse-statement'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: `Too many parses. Try again in ${rl.retryAfter}s.` }, { status: 429 })

    const geminiKey = process.env.GEMINI_API_KEY
    const groqKey   = process.env.GROQ_API_KEY
    if (!geminiKey && !groqKey) return Response.json({ error: 'No AI provider configured.' }, { status: 500 })

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const mimeType = file.type || 'application/pdf'
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      return Response.json({ error: `Unsupported file type: ${mimeType}` }, { status: 415 })
    }
    if (file.size && file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: `File too large. Max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')

    let result, geminiError = null
    if (geminiKey) {
      try { result = await callGemini({ apiKey: geminiKey, mimeType, base64 }) }
      catch (err) { geminiError = err.message; console.warn('[parse-statement] Gemini failed:', err.message) }
    }
    if (!result && groqKey) result = await callGroqForFile({ apiKey: groqKey, mimeType, buffer })
    if (!result) return Response.json({ error: geminiError || 'Both providers failed' }, { status: 502 })

    const parsed = safeParseJson(result.text)
    if (!parsed) {
      const head = result.text?.slice(0, 400) || '(empty)'
      const tail = result.text?.slice(-200) || ''
      const looksTruncated = result.text && !result.text.trim().endsWith('}') && !result.text.trim().endsWith(']')
      console.error('[parse-statement] non-JSON response', {
        provider: result.provider, model: result.model,
        length: result.text?.length || 0,
        looksTruncated,
        head, tail,
      })
      return Response.json({
        error: looksTruncated
          ? 'AI response was truncated before producing valid JSON. Try uploading fewer pages, or cropping to just the transactions.'
          : 'AI returned malformed JSON. Try a clearer scan or a smaller crop.',
      }, { status: 502 })
    }
    if (parsed._salvaged) {
      console.warn('[parse-statement] salvaged truncated JSON — recovered',
        parsed.transactions?.length || 0, 'transactions')
    }

    const txns = Array.isArray(parsed.transactions) ? parsed.transactions.map(t => {
      const amount     = Number(t.amount ?? 0)
      const isPayment  = Boolean(t.is_payment)
      const isFee      = Boolean(t.is_fee)
      const isInterest = Boolean(t.is_interest)
      const isRefund   = Boolean(t.is_refund) || (amount < 0 && !isPayment && !isFee && !isInterest)
      // Derive `kind` if the model didn't supply one
      let kind = t.kind
      if (!kind) {
        if (isPayment)       kind = 'payment'
        else if (isFee)      kind = 'fee'
        else if (isInterest) kind = 'interest'
        else if (isRefund)   kind = 'refund'
        else if (amount < 0) kind = 'deposit'
        else                 kind = 'purchase'
      }
      const valid = t.merchant && Number.isFinite(amount)
      return {
        date:            t.date || '',
        merchant:        (t.merchant || '').trim(),
        raw_description: t.raw_description || '',
        amount,
        category:        (isFee || isInterest || isPayment) ? null : (t.category || 'misc'),
        kind,
        is_payment:      isPayment,
        is_fee:          isFee,
        is_interest:     isInterest,
        is_refund:       isRefund,
        fee_kind:        t.fee_kind || null,
        city:            t.city || null,
        state:           t.state || null,
        // Default-import rule: every valid row checked, including fees,
        // interest, and card payments. The user can uncheck per-row or per-
        // section in the preview before clicking Import.
        _import:         valid,
      }
    }) : []

    // Compute totals from the rows we actually parsed — model-provided totals
    // are unreliable enough to be treated as a hint only.
    const computed = txns.reduce((acc, t) => {
      const a = t.amount
      if (t.is_fee)        acc.fees      += Math.abs(a)
      else if (t.is_interest) acc.interest += Math.abs(a)
      else if (t.is_payment)  acc.payments += Math.abs(a)
      else if (t.is_refund)   acc.refunds  += Math.abs(a)
      else if (a > 0)         acc.purchases += a
      else                    acc.deposits  += Math.abs(a)
      return acc
    }, { purchases: 0, refunds: 0, fees: 0, interest: 0, payments: 0, deposits: 0 })

    console.log('[parse-statement]', {
      provider: result.provider, kind: parsed.statement_kind, issuer: parsed.issuer,
      txns: txns.length, default_import: txns.filter(t => t._import).length,
      computed,
    })

    // Sanitize finance block — strip junk values, keep numeric where present.
    const f = parsed.finance || {}
    const numOrNull = (v) => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v)
    const finance = {
      previous_balance:     numOrNull(f.previous_balance),
      new_balance:          numOrNull(f.new_balance),
      credit_limit:         numOrNull(f.credit_limit),
      available_credit:     numOrNull(f.available_credit),
      minimum_payment_due:  numOrNull(f.minimum_payment_due),
      payment_due_date:     f.payment_due_date || null,
      purchase_apr:         numOrNull(f.purchase_apr),
      balance_transfer_apr: numOrNull(f.balance_transfer_apr),
      cash_advance_apr:     numOrNull(f.cash_advance_apr),
    }

    // ── Duplicate detection ────────────────────────────────────────────
    // A statement is a "duplicate" if THIS user already uploaded one for the
    // same account_last4 covering the same period. We surface the existing
    // row so the UI can offer Replace / Import anyway / Cancel before the
    // user commits.
    let duplicateOf = null
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        let q = sb.from('bank_statements')
          .select('id, issuer, account_last4, period_start, period_end, file_name, uploaded_at, imported_count, transaction_count')
          .eq('user_id', user.id)
          .limit(1)
        // Strongest match: same account + same period
        if (parsed.account_last4 && parsed.period_start && parsed.period_end) {
          q = q.eq('account_last4', String(parsed.account_last4)).eq('period_start', parsed.period_start).eq('period_end', parsed.period_end)
        } else if (parsed.account_last4 && parsed.period_end) {
          q = q.eq('account_last4', String(parsed.account_last4)).eq('period_end', parsed.period_end)
        } else if (parsed.period_start && parsed.period_end && parsed.issuer) {
          q = q.eq('issuer', parsed.issuer).eq('period_start', parsed.period_start).eq('period_end', parsed.period_end)
        } else {
          q = null
        }
        if (q) {
          const { data } = await q
          if (data && data[0]) duplicateOf = data[0]
        }
      }
    } catch (e) {
      // Don't block parse on this — just log
      console.warn('[parse-statement] duplicate-check failed:', e.message)
    }

    return Response.json({
      statement_kind: parsed.statement_kind || null,
      issuer:         parsed.issuer || null,
      account_last4:  parsed.account_last4 || null,
      period_start:   parsed.period_start || null,
      period_end:     parsed.period_end || null,
      file_name:      file.name || 'statement',
      totals:         computed,
      finance,
      transactions:   txns,
      duplicate_of:   duplicateOf,
      _provider:      result.provider,
      _model:         result.model,
    })
  } catch (err) {
    console.error('[parse-statement]', err)
    return Response.json({ error: err.message || 'Parse failed' }, { status: 500 })
  }
}
