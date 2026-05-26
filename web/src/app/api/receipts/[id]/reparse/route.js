// POST /api/receipts/[id]/reparse
//
// Re-runs the AI parser against a single receipt's source email body and
// updates the receipt in place (store, date, total, tax, payment, items,
// store FK). Use case: a one-off receipt that the auto-parse got wrong —
// user clicks "Re-parse" on the receipt detail page and watches it fix
// itself without involving an engineer.
//
// Auth: standard user session. Receipt + email_messages access is via the
// per-user supabase client, so RLS enforces ownership automatically.
//
// Rate-limited: 10 reparses per hour per user. Stops a user from burning
// AI budget by repeatedly poking the button on the same row.

import { createApiClient } from '../../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../../lib/apiGuard'
import { parseReceiptFromText, parseReceiptFromFile } from '../../../../../lib/parse-receipt-engine'
import { resolveStoreAndLocation, writeRefundPolicies, lookupStoreDefaultPolicies, stripEmailWrapper } from '../../../../../lib/email-to-receipt'

export const runtime = 'nodejs'
export const maxDuration = 30

// stripEmailWrapper centralised in lib/email-to-receipt.js

export async function POST(_request, { params }) {
  const { id: receiptId } = await params
  if (!receiptId) return Response.json({ error: 'receipt id required' }, { status: 400 })

  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = await rateLimit(userRateKey(user.id, 'receipt-reparse'), { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  // Source detection. Two re-parse paths supported:
  //   (A) Email-linked  → re-feed the original email body through Gemini text
  //   (B) Image-linked  → fetch the photo from receipt_link, run Gemini vision
  //
  // (B) covers receipts captured via the mobile camera before v0.2.25 — those
  // got uploaded as raw images with blank fields, so this is how we backfill.

  const { data: rcpt } = await sb
    .from('receipts')
    .select('id, receipt_link, store_name')
    .eq('id', receiptId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rcpt) return Response.json({ error: 'Receipt not found.' }, { status: 404 })

  // Path A: email-linked receipt
  const { data: emRows } = await sb
    .from('email_messages')
    .select('id, body_text, body_html, received_at')
    .eq('user_id', user.id)
    .eq('receipt_id', receiptId)
    .order('received_at', { ascending: false })
    .limit(1)
  const em = emRows?.[0]

  let parsed = null
  let safeDate = undefined           // used to skip date update when AI returned the email date

  if (em) {
    const body = stripEmailWrapper(em.body_text || em.body_html || '')
    if (!body || body.length < 60) {
      return Response.json({ error: 'Email body is too short to parse.' }, { status: 400 })
    }
    parsed = await parseReceiptFromText(body, { emailDate: em.received_at })
    if (!parsed || (!parsed.store_name && !parsed.total_amount && !parsed.items?.length)) {
      return Response.json({ error: 'AI returned no usable data from the email body.' }, { status: 502 })
    }
    // Date safety: if the AI returned the email forward date verbatim, that's
    // probably wrong — refuse to overwrite the existing date with it.
    const emailDateIso = em.received_at ? new Date(em.received_at).toISOString().slice(0, 10) : null
    const parsedDateIso = parsed.date && /^\d{4}-\d{2}-\d{2}/.test(parsed.date) ? parsed.date.slice(0, 10) : null
    const dateMatchesEmail = !!(parsedDateIso && emailDateIso && parsedDateIso === emailDateIso)
    safeDate = parsedDateIso && !dateMatchesEmail ? parsedDateIso : undefined
  } else if (rcpt.receipt_link) {
    // Path B: image-linked receipt — fetch the image and run vision parse.
    let buffer, mimeType
    try {
      const imgRes = await fetch(rcpt.receipt_link)
      if (!imgRes.ok) throw new Error(`Image fetch failed (${imgRes.status})`)
      mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
      // Sanity: only accept image / PDF
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        return Response.json({ error: `Unsupported file type: ${mimeType}` }, { status: 415 })
      }
      const ab = await imgRes.arrayBuffer()
      buffer = Buffer.from(ab)
    } catch (e) {
      return Response.json({ error: `Couldn't fetch receipt image: ${e.message}` }, { status: 502 })
    }
    try {
      parsed = await parseReceiptFromFile({ buffer, mimeType })
    } catch (e) {
      return Response.json({ error: `AI failed to parse the image: ${e.message}` }, { status: 502 })
    }
    if (!parsed || (!parsed.store_name && !parsed.total_amount && !parsed.items?.length)) {
      return Response.json({ error: 'AI returned no usable data from the image.' }, { status: 502 })
    }
    // For image-source receipts the printed date IS the transaction date —
    // no email-date trap to defend against.
    const parsedDateIso = parsed.date && /^\d{4}-\d{2}-\d{2}/.test(parsed.date) ? parsed.date.slice(0, 10) : null
    safeDate = parsedDateIso || undefined
  } else {
    return Response.json({
      error: "This receipt isn't linked to an email or image — nothing to re-parse against.",
    }, { status: 400 })
  }

  // Resolve store + location FKs (best-effort)
  const { store_id, store_location_id } = await resolveStoreAndLocation(sb, parsed)

  const { data: updated, error: upErr } = await sb.from('receipts').update({
    store_name: parsed.store_name || 'Receipt by email',
    store_id,
    store_location_id,
    date: safeDate,
    total_amount: parsed.total_amount || 0,
    tax_paid: parsed.tax_paid || 0,
    payment_method: parsed.payment_method || null,
    payment_last4: parsed.payment_last4 || null,
    is_return: Boolean(parsed.is_return),
    category: parsed.category || null,
    processed: true,
  }).eq('id', receiptId).eq('user_id', user.id).select().single()
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 })

  // Replace items in one shot — simpler than diffing
  await sb.from('receipt_items').delete().eq('receipt_id', receiptId)
  if (Array.isArray(parsed.items) && parsed.items.length > 0) {
    const itemRows = parsed.items.map(it => ({
      receipt_id: receiptId,
      sku: it.sku || null,
      model: it.model || null,
      item_name: it.item_name || '',
      qty: it.qty || 1,
      price: it.price == null ? null : Number(it.price),
      returned: it.category === 'charity' ? false : Boolean(it.returned),
      category: it.category || null,
    }))
    await sb.from('receipt_items').insert(itemRows)
  }

  // Refund policies — printed policies preferred, curated store defaults
  // (Amazon 30d, Costco lifetime, …) as the fallback.
  if (Array.isArray(parsed.refund_policies) && parsed.refund_policies.length > 0) {
    await writeRefundPolicies(sb, receiptId, parsed.refund_policies, 'receipt').catch(() => {})
  } else {
    const cats = (parsed.items || []).map(i => i.category).filter(Boolean)
    if (parsed.category) cats.push(parsed.category)
    const defaults = await lookupStoreDefaultPolicies(sb, parsed.store_name, cats).catch(() => [])
    if (defaults.length > 0) {
      await writeRefundPolicies(sb, receiptId, defaults, 'store-default').catch(() => {})
    }
  }

  return Response.json({
    ok: true,
    receipt: updated,
    items_parsed: parsed.items?.length || 0,
    provider: parsed._provider || null,
  })
}
