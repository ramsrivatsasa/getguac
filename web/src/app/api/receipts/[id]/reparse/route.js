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
import { parseReceiptFromText } from '../../../../../lib/parse-receipt-engine'
import { resolveStoreAndLocation } from '../../../../../lib/email-to-receipt'

export const runtime = 'nodejs'
export const maxDuration = 30

function stripEmailWrapper(text) {
  if (!text) return ''
  let s = text
  s = s.replace(/-{3,}\s*Forwarded message\s*-{3,}/i, '')
  s = s.replace(/^(From|To|Sent|Date|Subject|Cc|Bcc):.*$/gim, '')
  s = s.replace(/Sent from my (iPhone|iPad|Android|Samsung|Galaxy)[^\n]*/gi, '')
  s = s.replace(/\n{3,}/g, '\n\n').trim()
  return s
}

export async function POST(_request, { params }) {
  const { id: receiptId } = await params
  if (!receiptId) return Response.json({ error: 'receipt id required' }, { status: 400 })

  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = await rateLimit(userRateKey(user.id, 'receipt-reparse'), { limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  // Find the linked email_messages row. Multiple emails could point at this
  // receipt (rare — only if dedup ran); we just use the newest one.
  const { data: emRows } = await sb
    .from('email_messages')
    .select('id, body_text, body_html, received_at')
    .eq('user_id', user.id)
    .eq('receipt_id', receiptId)
    .order('received_at', { ascending: false })
    .limit(1)
  const em = emRows?.[0]
  if (!em) {
    return Response.json({
      error: "This receipt isn't linked to an email — re-parse only works for receipts that were created from a forwarded email.",
    }, { status: 400 })
  }

  const body = stripEmailWrapper(em.body_text || em.body_html || '')
  if (!body || body.length < 60) {
    return Response.json({ error: 'Email body is too short to parse.' }, { status: 400 })
  }

  const parsed = await parseReceiptFromText(body)
  if (!parsed || (!parsed.store_name && !parsed.total_amount && !parsed.items?.length)) {
    return Response.json({ error: 'AI returned no usable data from the email body.' }, { status: 502 })
  }

  // Resolve store + location FKs (best-effort)
  const { store_id, store_location_id } = await resolveStoreAndLocation(sb, parsed)

  const { data: updated, error: upErr } = await sb.from('receipts').update({
    store_name: parsed.store_name || 'Receipt by email',
    store_id,
    store_location_id,
    date: parsed.date || undefined,
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
      price: it.price || 0,
      returned: Boolean(it.returned),
    }))
    await sb.from('receipt_items').insert(itemRows)
  }

  return Response.json({
    ok: true,
    receipt: updated,
    items_parsed: parsed.items?.length || 0,
    provider: parsed._provider || null,
  })
}
