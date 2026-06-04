// POST /api/receipts/from-pdf
//
// PDF-only sibling of /api/parse-receipt — accepts a single PDF upload
// (utility bill, internet invoice, subscription receipt, pay statement,
// etc.), parses it via the Gemini → Groq fallback chain in
// parse-receipt-engine, and PERSISTS the resulting receipt through the
// canonical save-receipt pipeline tagged source='pdf'.
//
// Why a dedicated endpoint:
//   - /api/parse-receipt is a "parse only, hand back JSON" endpoint that
//     the web form uses for the manual-review flow. The PDF drop flow on
//     /receipts is "parse + save in one shot" — the user already chose
//     the file and wants the receipt to show up in the list, not to
//     re-confirm every field.
//   - Magic-byte validation lives here. /api/parse-receipt accepts both
//     images and PDFs (no magic-byte check) because images carry MIME
//     hints we trust. PDFs from share sheets / random downloads do not,
//     so we sniff the first four bytes (%PDF) before letting any parsing
//     library touch the buffer. Refuses anything else with 415.
//
// Contract:
//   Request: multipart/form-data with `file` = the PDF blob.
//   Response (200): { receipt_id, merged, parsed: {...} }
//   Errors:
//     400 — no file
//     413 — too large (> 10 MB)
//     415 — file isn't a PDF (magic bytes mismatch OR MIME mismatch)
//     422 — Gemini said this isn't a receipt
//     429 — rate-limited
//     502 — every AI provider failed
//     500 — anything else

import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { createApiClient } from '../../../../lib/supabase/server'
import { parseReceiptFromFile } from '../../../../lib/parse-receipt-engine'
import { autoCategorize } from '../../../../lib/auto-categorize'
import { guackyNonReceiptResponse } from '../../../../lib/guacky-responses'
import { buildUserContextPrompt } from '../../../../lib/user-context'
import { saveReceipt } from '../../../../lib/save-receipt'

export const runtime = 'nodejs'
export const maxDuration = 60

// Utility-bill PDFs run bigger than receipt photos (multi-page statements,
// embedded logos), so the cap is 10 MB — twice the /api/parse-receipt
// image budget. Still strict enough to refuse pathological PDFs that
// would blow up Gemini's quota.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// PDF magic bytes: 0x25 0x50 0x44 0x46 == "%PDF". Spec allows up to ~1024
// bytes of leading junk before the header (PDF/A and some scanners do
// this) but for the kinds of PDFs users will drop on us (utility bills,
// invoices, statements) the header is at offset 0. We check the first
// 4 bytes only — fast, no false positives in the file types we expect.
function isPdfMagic(buffer) {
  if (!buffer || buffer.length < 4) return false
  return (
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46    // F
  )
}

export async function POST(request) {
  try {
    // 5 PDF uploads / min / (ip,session) — PDF parsing is the most
    // expensive path we have (Gemini native PDF or pdf-parse + Groq),
    // so the limit is tighter than image parsing's 10/min.
    const rl = await rateLimit(rateKey(request, 'receipts-from-pdf'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) {
      return Response.json(
        { error: `Too many PDF uploads. Try again in ${rl.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const groqKey   = process.env.GROQ_API_KEY
    if (!geminiKey && !groqKey) {
      return Response.json(
        { error: 'No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env.local.' },
        { status: 500 },
      )
    }

    // Auth — saving requires a user. /api/parse-receipt allows anonymous
    // calls (parse-only is harmless), but this endpoint writes a row, so
    // the user MUST be signed in.
    const supabase = createApiClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let formData
    try {
      formData = await request.formData()
    } catch {
      return Response.json({ error: 'Invalid multipart payload' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file provided (expected multipart field `file`)' }, { status: 400 })
    }

    // Size check BEFORE buffering — formData.get() will have already
    // pulled bytes off the wire, but Next caps the request body at the
    // route's bodySizeLimit so a multi-GB upload would 413 upstream.
    // This is the final guard for "tens of MB" cases that slip through.
    if (file.size && file.size > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: `PDF too large (${(file.size/1024/1024).toFixed(1)} MB). Max ${MAX_UPLOAD_BYTES/1024/1024} MB.` },
        { status: 413 },
      )
    }

    // MIME hint check first — the cheaper rejection. We don't TRUST the
    // browser-supplied MIME (that's why we sniff magic bytes next), but
    // an outright lie like text/csv tells us not to bother reading the
    // body.
    const declaredMime = file.type || ''
    if (declaredMime && declaredMime !== 'application/pdf' && !declaredMime.startsWith('application/octet-stream')) {
      return Response.json(
        { error: `Expected application/pdf, got ${declaredMime}` },
        { status: 415 },
      )
    }

    // Materialize the bytes ONCE and reuse for magic-byte check + parse.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // The critical check — magic bytes. A renamed .exe or .zip or .png
    // would have passed the MIME check above if the browser left .type
    // empty / set application/octet-stream. The magic-byte sniff is
    // what actually keeps non-PDFs out of pdf-parse (which has a CVE
    // history when fed crafted bytes) and out of Gemini's PDF decoder.
    if (!isPdfMagic(buffer)) {
      return Response.json(
        { error: 'File is not a valid PDF (magic bytes mismatch). Upload a real PDF.' },
        { status: 415 },
      )
    }

    // Per-user few-shot context — same pattern as /api/parse-receipt.
    // Best effort; degraded personalization is fine, a 500 here is not.
    let userContextSuffix = ''
    try {
      userContextSuffix = await buildUserContextPrompt(supabase)
    } catch (e) {
      console.warn('[receipts/from-pdf] user-context fetch failed (continuing without):', e.message)
    }

    // Parse — parseReceiptFromFile already does Gemini native-PDF first
    // (handles text-rich utility bills brilliantly) and falls back to
    // pdf-parse + Groq text for image-only scans where the text extract
    // is empty. We don't need to branch on PDF type here; the engine
    // already does.
    let parsed
    try {
      parsed = await parseReceiptFromFile({
        buffer,
        mimeType: 'application/pdf',
        userContextSuffix,
      })
    } catch (err) {
      console.error('[receipts/from-pdf] parse failed:', err)
      return Response.json({ error: err.message || 'PDF parse failed' }, { status: 502 })
    }

    if (!parsed) {
      return Response.json({ error: 'AI parser returned no data' }, { status: 502 })
    }

    // Non-receipt detection — return the same guacky payload shape the
    // image endpoint does so the UI's existing handler covers PDF too.
    if (parsed.is_receipt === false) {
      const guac = guackyNonReceiptResponse(parsed.non_receipt_subject)
      return Response.json(
        { error: guac.message, non_receipt: true, subject: guac.subject, tip: guac.tip },
        { status: 422 },
      )
    }

    // Auto-categorize line items the same way /api/parse-receipt does
    // before handing off to the save pipeline.
    parsed.items = autoCategorize(parsed.items || [])

    console.log('[receipts/from-pdf]', {
      user: user.id,
      provider: parsed._provider,
      model: parsed._model,
      store: parsed.store_name,
      total: parsed.total_amount,
      items: parsed.items.length,
    })

    // SAVE through the canonical pipeline. source='pdf' marks the row
    // so the dashboard / filters can show "I uploaded a PDF for this"
    // distinctly from photo captures and email receipts.
    let saved
    try {
      saved = await saveReceipt(supabase, user.id, parsed, {
        source: 'pdf',
        // No business_purchase / user_category here — the drop flow is
        // a fire-and-forget save, the user can edit those on the detail
        // page afterwards.
      })
    } catch (e) {
      console.error('[receipts/from-pdf] save failed:', e)
      return Response.json({ error: e.message || 'Save failed' }, { status: 500 })
    }

    return Response.json({
      receipt_id: saved.receipt_id,
      merged: saved.merged,
      parsed,
    })
  } catch (err) {
    console.error('[receipts/from-pdf] unhandled:', err)
    return Response.json({ error: err.message || 'PDF parse failed' }, { status: 500 })
  }
}
