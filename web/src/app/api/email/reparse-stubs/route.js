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
import { draftReceiptFromEmail, resolveStoreAndLocation, writeRefundPolicies, lookupStoreDefaultPolicies, stripEmailWrapper } from '../../../../lib/email-to-receipt'

export const runtime = 'nodejs'
export const maxDuration = 60

// Cap per-run so we stay under Vercel's 60s ceiling regardless of how many
// receipts the user has accumulated. Multiple runs let the user clean up in
// batches; the cooldown below stops them from chaining infinitely.
const MAX_PER_RUN = 20

// stripEmailWrapper is centralised in lib/email-to-receipt.js so the truncate
// logic (promo-section markers) stays in one place.

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  // 4 reparse-sweeps per hour per user. Each can fix up to MAX_PER_RUN receipts,
  // so a user with hundreds of stubs can clean them in a handful of calls.
  const rl = await rateLimit(userRateKey(user.id, 'email-reparse'), { limit: 4, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  // Pull every receipt-hook email that needs work:
  //   a) has no linked receipt (the user deleted the bad row) → recreate
  //   b) has a stub receipt (processed = false)               → reparse in place
  //   c) parsed receipt but no store_id (legacy rows pre-store-fix) → resolve
  //      store + location FK from the existing parse data
  // Order oldest-first so chained runs make consistent progress.
  const { data: rows, error } = await sb
    .from('email_messages')
    .select(`id, body_text, body_html, subject, from_addr, to_addr, delivered_to,
             received_at, preview, has_attachments, receipt_id,
             receipt:receipt_id ( id, processed, store_id, store_name )`)
    .eq('user_id', user.id)
    .eq('is_receipts_hook', true)
    .order('received_at', { ascending: true })
    .limit(MAX_PER_RUN * 2)   // 2x because some scanned rows will be filtered out
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Targets: any of a/b/c above
  const targets = (rows || []).filter(r => {
    if (r.receipt_id == null) return true                          // (a) needs recreate
    if (!r.receipt) return false
    if (r.receipt.processed === false) return true                 // (b) stub
    if (r.receipt.processed === true && r.receipt.store_id == null) return true  // (c) needs store
    return false
  }).slice(0, MAX_PER_RUN)

  const summary = {
    scanned: rows?.length || 0,
    candidates: targets.length,
    reparsed: 0,
    recreated: 0,
    stores_linked: 0,
    failed: 0,
    errors: [],
  }

  for (const row of targets) {
    const isRecreate = row.receipt_id == null

    // Branch A: missing receipt — recreate via the shared draft helper, which
    // does AI parse + items + refund policies in one go and falls back to a
    // smart stub if the AI fails. Then relink the email_messages row.
    if (isRecreate) {
      try {
        const m = {
          fromAddr: row.from_addr,
          toAddr:   row.to_addr,
          deliveredTo: row.delivered_to,
          subject:  row.subject,
          receivedAt: row.received_at,
          preview:  row.preview,
          bodyText: row.body_text,
          bodyHtml: row.body_html,
          hasAttachments: row.has_attachments,
        }
        const { receipt_id, processed } = await draftReceiptFromEmail(sb, user.id, m)
        if (receipt_id) {
          await sb.from('email_messages').update({ receipt_id, processed: true }).eq('id', row.id)
          summary.recreated++
          if (processed) summary.reparsed++
        } else {
          summary.failed++
          summary.errors.push({ message_id: row.id, error: 'recreate returned no id' })
        }
      } catch (e) {
        summary.failed++
        summary.errors.push({ message_id: row.id, error: `recreate: ${e.message}` })
      }
      continue
    }

    // Branch C: already-parsed receipt missing store_id. Re-run the parser
    // ONLY to extract store fields, then set the FKs. Cheap — same AI call
    // but no other receipt fields are touched.
    const isStoreLink = row.receipt && row.receipt.processed === true && row.receipt.store_id == null
    if (isStoreLink) {
      const bodyC = stripEmailWrapper(row.body_text || row.body_html || '')
      if (!bodyC || bodyC.length < 60) {
        summary.failed++
        summary.errors.push({ message_id: row.id, error: 'body too short for store-link' })
        continue
      }
      try {
        const parsed = await parseReceiptFromText(bodyC, { emailDate: row.received_at })
        if (!parsed || !parsed.store_name) {
          summary.failed++
          summary.errors.push({ message_id: row.id, error: 'AI returned no store_name for store-link' })
          continue
        }
        const { store_id, store_location_id } = await resolveStoreAndLocation(sb, parsed)
        if (!store_id) {
          summary.failed++
          summary.errors.push({ message_id: row.id, error: 'store upsert returned null' })
          continue
        }
        await sb.from('receipts')
          .update({ store_id, store_location_id })
          .eq('id', row.receipt.id)
          .eq('user_id', user.id)
        summary.stores_linked++
      } catch (e) {
        summary.failed++
        summary.errors.push({ message_id: row.id, error: `store-link: ${e.message}` })
      }
      continue
    }

    // Branch B: stub receipt — update in place
    const body = stripEmailWrapper(row.body_text || row.body_html || '')
    if (!body || body.length < 60) {
      summary.failed++
      summary.errors.push({ message_id: row.id, error: 'body too short' })
      continue
    }
    try {
      const parsed = await parseReceiptFromText(body, { emailDate: row.received_at })
      if (!parsed || (!parsed.store_name && !parsed.total_amount && !parsed.items?.length)) {
        summary.failed++
        summary.errors.push({ message_id: row.id, error: 'AI returned empty parse' })
        continue
      }

      // Resolve store + location FKs so the updated receipt joins into the
      // per-store views. Best-effort.
      const { store_id, store_location_id } = await resolveStoreAndLocation(sb, parsed)

      const { error: upErr } = await sb.from('receipts').update({
        store_name: parsed.store_name || 'Receipt by email',
        store_id,
        store_location_id,
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
          price: it.price == null ? null : Number(it.price),
          returned: it.category === 'charity' ? false : Boolean(it.returned),
          category: it.category || null,
        }))
        await sb.from('receipt_items').insert(itemRows)
      }

      // Persist refund policies: printed first, curated store-defaults as
      // fallback (Amazon 30d, Costco lifetime, …).
      if (Array.isArray(parsed.refund_policies) && parsed.refund_policies.length > 0) {
        await writeRefundPolicies(sb, row.receipt.id, parsed.refund_policies, 'receipt').catch(() => {})
      } else {
        const cats = (parsed.items || []).map(i => i.category).filter(Boolean)
        if (parsed.category) cats.push(parsed.category)
        const defaults = await lookupStoreDefaultPolicies(sb, parsed.store_name, cats).catch(() => [])
        if (defaults.length > 0) {
          await writeRefundPolicies(sb, row.receipt.id, defaults, 'store-default').catch(() => {})
        }
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
