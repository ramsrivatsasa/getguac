// POST /api/email/reparse-stubs
//
// Finds receipts that were drafted as STUBS from an email (processed=false, linked
// to an email_messages row), runs the AI parser over each linked email's body, and
// UPDATES the receipt in place — also inserts line items and refund policies.
//
// Use case: existing receipts in the DB still show "gmail"/"yahoo" as the store
// because they were created BEFORE the AI-parsing path landed in the poller.
// This endpoint cleans them up in one shot, rate-limited so users can't burn
// the AI budget by spamming.
//
// Auth: standard user cookie / Bearer. Scoped to the caller's own data via RLS.

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { parseReceiptFromText } from '../../../../lib/parse-receipt-engine'

export const runtime = 'nodejs'
export const maxDuration = 60

// Cap per-run so we stay under Vercel's 60s ceiling regardless of how many
// receipts the user has accumulated. Multiple runs let the user clean up in
// batches; the cooldown below stops them from chaining infinitely.
const MAX_PER_RUN = 20

function stripEmailWrapper(text) {
  if (!text) return ''
  let s = text
  s = s.replace(/-{3,}\s*Forwarded message\s*-{3,}/i, '')
  s = s.replace(/^(From|To|Sent|Date|Subject|Cc|Bcc):.*$/gim, '')
  s = s.replace(/Sent from my (iPhone|iPad|Android|Samsung|Galaxy)[^\n]*/gi, '')
  s = s.replace(/\n{3,}/g, '\n\n').trim()
  return s
}

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  // 4 reparse-sweeps per hour per user. Each can fix up to MAX_PER_RUN receipts,
  // so a user with hundreds of stubs can clean them in a handful of calls.
  const rl = rateLimit(userRateKey(user.id, 'email-reparse'), { limit: 4, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  // Find unparsed receipts that originated from an email (have a linked email_messages
  // row with a body we can re-feed to the AI). Order oldest-first so chained runs
  // make consistent progress.
  const { data: rows, error } = await sb
    .from('email_messages')
    .select(`id, body_text, body_html, subject, from_addr, received_at,
             receipt:receipt_id ( id, processed, store_name )`)
    .eq('user_id', user.id)
    .eq('is_receipts_hook', true)
    .not('receipt_id', 'is', null)
    .order('received_at', { ascending: true })
    .limit(MAX_PER_RUN)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Filter to ones whose receipt is still a stub (processed = false)
  const targets = (rows || []).filter(r => r.receipt && r.receipt.processed === false)

  const summary = { scanned: rows?.length || 0, candidates: targets.length, reparsed: 0, failed: 0, errors: [] }

  for (const row of targets) {
    const body = stripEmailWrapper(row.body_text || row.body_html || '')
    if (!body || body.length < 60) {
      summary.failed++
      summary.errors.push({ message_id: row.id, error: 'body too short' })
      continue
    }
    try {
      const parsed = await parseReceiptFromText(body)
      if (!parsed || (!parsed.store_name && !parsed.total_amount && !parsed.items?.length)) {
        summary.failed++
        summary.errors.push({ message_id: row.id, error: 'AI returned empty parse' })
        continue
      }

      // Update the existing receipt row in place
      const { error: upErr } = await sb.from('receipts').update({
        store_name: parsed.store_name || 'Receipt by email',
        date: parsed.date || undefined,            // leave existing date if AI didn't find one
        total_amount: parsed.total_amount || 0,
        tax_paid: parsed.tax_paid || 0,
        payment_method: parsed.payment_method || null,
        payment_last4: parsed.payment_last4 || null,
        is_return: Boolean(parsed.is_return),
        category: parsed.category || null,
        processed: true,
      }).eq('id', row.receipt.id).eq('user_id', user.id)
      if (upErr) {
        summary.failed++
        summary.errors.push({ message_id: row.id, error: upErr.message })
        continue
      }

      // Replace any existing line items (from prior partial runs) with the
      // freshly parsed set. Stubs have no items, so this is usually 0 deletes.
      await sb.from('receipt_items').delete().eq('receipt_id', row.receipt.id)
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        const itemRows = parsed.items.map(it => ({
          receipt_id: row.receipt.id,
          sku: it.sku || null,
          model: it.model || null,
          item_name: it.item_name || '',
          qty: it.qty || 1,
          price: it.price || 0,
          returned: Boolean(it.returned),
        }))
        await sb.from('receipt_items').insert(itemRows)
      }

      summary.reparsed++
    } catch (e) {
      summary.failed++
      summary.errors.push({ message_id: row.id, error: e.message })
    }
  }

  return Response.json({
    ok: true,
    ...summary,
    note: summary.candidates >= MAX_PER_RUN
      ? `Re-parsed ${summary.reparsed} of ${summary.candidates}. Call this endpoint again to continue (up to 4 calls/hour).`
      : 'Re-parse complete.',
  })
}
