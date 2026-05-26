// POST /api/receipts/reparse-images
//
// Bulk-sweep: finds receipts that were uploaded as images via the mobile
// camera but never got AI-parsed (the v0.2.24-and-earlier flow saved the
// image to storage but skipped /api/parse-receipt, so the receipt rows have
// receipt_link set but blank store_name / total_amount / no items).
//
// For each match: fetch the image, run Gemini vision, update fields + items.
// Cap MAX_PER_RUN per call so a single invocation finishes inside Vercel's
// 60-second function ceiling. Rate-limited so the AI bill stays sane.
//
// Two modes (body):
//   { dryRun: true } / no body  → preview which receipts would be touched
//   { confirm: true }           → actually reparse

import { createApiClient } from '../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { parseReceiptFromFile } from '../../../../lib/parse-receipt-engine'
import { resolveStoreAndLocation, writeRefundPolicies, lookupStoreDefaultPolicies } from '../../../../lib/email-to-receipt'

export const runtime = 'nodejs'
export const maxDuration = 60

// Per-call ceiling. AI parse on an image takes ~5-15s; 8 keeps us under 60s
// even with worst-case latency. User can call repeatedly for larger backlogs.
const MAX_PER_RUN = 8

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = await rateLimit(userRateKey(user.id, 'receipts-reparse-images'), { limit: 6, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const dryRun = !body?.confirm

  // Candidates: have a receipt_link, no linked email_messages (we'd want the
  // email path for those), AND the row looks under-populated (blank store
  // OR zero total). Statement-imported rows are excluded explicitly.
  const { data: candidates, error } = await sb
    .from('receipts')
    .select('id, store_name, total_amount, tax_paid, date, receipt_link, from_statement')
    .eq('user_id', user.id)
    .not('receipt_link', 'is', null)
    .neq('receipt_link', '')
    .eq('from_statement', false)
    .or('store_name.is.null,store_name.eq.,total_amount.eq.0')
    .order('date', { ascending: false })
    .limit(50)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Filter out rows that have an email link — those belong to the email
  // reparse path, not image reparse.
  const ids = (candidates || []).map(r => r.id)
  let emailLinkedIds = new Set()
  if (ids.length > 0) {
    const { data: emRows } = await sb
      .from('email_messages')
      .select('receipt_id')
      .eq('user_id', user.id)
      .in('receipt_id', ids)
    emailLinkedIds = new Set((emRows || []).map(r => r.receipt_id))
  }
  const targets = (candidates || [])
    .filter(r => !emailLinkedIds.has(r.id))
    .slice(0, MAX_PER_RUN)

  if (dryRun) {
    return Response.json({
      ok: true,
      mode: 'dry-run',
      total_candidates: candidates?.length || 0,
      eligible_after_email_filter: (candidates || []).filter(r => !emailLinkedIds.has(r.id)).length,
      this_run_will_process: targets.length,
      note: targets.length === MAX_PER_RUN
        ? `Capped at ${MAX_PER_RUN}/run. Call again to continue (6 sweeps/hour max).`
        : 'All eligible image receipts fit in this run.',
    })
  }

  const summary = { processed: 0, succeeded: 0, failed: 0, errors: [] }
  for (const r of targets) {
    summary.processed++
    try {
      const imgRes = await fetch(r.receipt_link)
      if (!imgRes.ok) {
        summary.failed++
        summary.errors.push({ id: r.id, error: `image fetch ${imgRes.status}` })
        continue
      }
      const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        summary.failed++
        summary.errors.push({ id: r.id, error: `unsupported type ${mimeType}` })
        continue
      }
      const buffer = Buffer.from(await imgRes.arrayBuffer())
      const parsed = await parseReceiptFromFile({ buffer, mimeType })
      if (!parsed || (!parsed.store_name && !parsed.total_amount && !parsed.items?.length)) {
        summary.failed++
        summary.errors.push({ id: r.id, error: 'AI returned empty parse' })
        continue
      }

      const { store_id, store_location_id } = await resolveStoreAndLocation(sb, parsed)
      const parsedDateIso = parsed.date && /^\d{4}-\d{2}-\d{2}/.test(parsed.date) ? parsed.date.slice(0, 10) : undefined

      const { error: upErr } = await sb.from('receipts').update({
        store_name: parsed.store_name || r.store_name || 'Camera receipt',
        store_id,
        store_location_id,
        date: parsedDateIso,
        total_amount: parsed.total_amount || 0,
        tax_paid: parsed.tax_paid || 0,
        payment_method: parsed.payment_method || null,
        payment_last4: parsed.payment_last4 || null,
        is_return: Boolean(parsed.is_return),
        category: parsed.category || null,
        processed: true,
      }).eq('id', r.id).eq('user_id', user.id)
      if (upErr) {
        summary.failed++
        summary.errors.push({ id: r.id, error: upErr.message })
        continue
      }

      // Replace items + refund policies
      await sb.from('receipt_items').delete().eq('receipt_id', r.id)
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        const itemRows = parsed.items.map(it => ({
          receipt_id: r.id,
          sku: it.sku || null, model: it.model || null,
          item_name: it.item_name || '',
          qty: it.qty || 1,
          price: it.price == null ? null : Number(it.price),
          returned: it.category === 'charity' ? false : Boolean(it.returned),
          category: it.category || null,
        }))
        await sb.from('receipt_items').insert(itemRows)
      }
      if (Array.isArray(parsed.refund_policies) && parsed.refund_policies.length > 0) {
        await writeRefundPolicies(sb, r.id, parsed.refund_policies, 'receipt').catch(() => {})
      } else {
        const cats = (parsed.items || []).map(i => i.category).filter(Boolean)
        if (parsed.category) cats.push(parsed.category)
        const defaults = await lookupStoreDefaultPolicies(sb, parsed.store_name, cats).catch(() => [])
        if (defaults.length > 0) {
          await writeRefundPolicies(sb, r.id, defaults, 'store-default').catch(() => {})
        }
      }

      summary.succeeded++
    } catch (e) {
      summary.failed++
      summary.errors.push({ id: r.id, error: e.message })
    }
  }

  return Response.json({
    ok: true,
    mode: 'execute',
    ...summary,
    note: targets.length === MAX_PER_RUN
      ? `Processed ${MAX_PER_RUN} of the queue. Call again to continue (6 sweeps/hour max).`
      : 'All eligible image receipts processed.',
  })
}
