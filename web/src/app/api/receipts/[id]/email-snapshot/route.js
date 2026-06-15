// POST /api/receipts/[id]/email-snapshot
//
// Renders an email-sourced receipt's stored email body to a PNG + PDF using
// headless Chromium, uploads both to the `receipts` storage bucket, and sets
// the receipt's receipt_link (PNG, so it shows the same "View image" / thumbnail
// UI as a photographed receipt) and stashes the PDF in extra_page_urls.
//
// Why this exists: email receipts have no photo. The email body lived only in
// email_messages, which is lost if the user permanently deletes the email from
// their Inbox. Snapshotting makes a durable, portable artifact on the receipt
// itself that survives any email deletion.
//
// Auth: standard user session (cookie) or Bearer (mobile). All reads/writes go
// through the per-user client so RLS enforces ownership.
//
// Idempotent: if the receipt already has a receipt_link, returns it untouched.
// Rate-limited: 30/hour/user — rendering is the heaviest thing a user can
// trigger, and the result is cached forever, so this is plenty.

import { createApiClient } from '../../../../../lib/supabase/server'
import { rateLimit, userRateKey } from '../../../../../lib/apiGuard'
import { renderEmailSnapshot } from '../../../../../lib/email-snapshot'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(_request, { params }) {
  const { id: receiptId } = await params
  if (!receiptId) return Response.json({ error: 'receipt id required' }, { status: 400 })

  const sb = createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const rl = await rateLimit(userRateKey(user.id, 'email-snapshot'), { limit: 30, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const { data: rcpt } = await sb
    .from('receipts')
    .select('id, receipt_link, from_statement, extra_page_urls')
    .eq('id', receiptId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rcpt) return Response.json({ error: 'Receipt not found.' }, { status: 404 })

  // Already has an image (photographed, or previously snapshotted). No-op.
  if (rcpt.receipt_link) {
    return Response.json({ ok: true, already: true, receipt_link: rcpt.receipt_link })
  }
  if (rcpt.from_statement) {
    return Response.json({ error: 'Statement-imported receipts have no source email.' }, { status: 400 })
  }

  // Source email for this receipt (newest, in the rare case of more than one).
  const { data: emRows } = await sb
    .from('email_messages')
    .select('subject, from_addr, body_html, body_text, received_at')
    .eq('user_id', user.id)
    .eq('receipt_id', receiptId)
    .order('received_at', { ascending: false })
    .limit(1)
  const em = emRows?.[0]
  if (!em || (!em.body_html && !em.body_text)) {
    return Response.json({ error: 'no-source-email', detail: 'This receipt has no stored email to snapshot.' }, { status: 400 })
  }

  let png, pdf
  try {
    ({ png, pdf } = await renderEmailSnapshot({
      html: em.body_html,
      text: em.body_text,
      subject: em.subject,
      from: em.from_addr,
    }))
  } catch (e) {
    console.error('[email-snapshot] render failed:', e?.message)
    return Response.json({ error: 'render-failed', detail: e?.message || 'render error' }, { status: 500 })
  }

  // Storage paths must start with the user's id (storage RLS keys off the first
  // path segment). upsert:true so a re-run overwrites cleanly.
  const base = `${user.id}/email-${receiptId}`
  const pngPath = `${base}.png`
  const pdfPath = `${base}.pdf`

  const pngUp = await sb.storage.from('receipts').upload(pngPath, png, { contentType: 'image/png', upsert: true })
  if (pngUp.error) {
    console.error('[email-snapshot] png upload failed:', pngUp.error.message)
    return Response.json({ error: 'upload-failed', detail: pngUp.error.message }, { status: 500 })
  }
  // PDF is a bonus download; don't fail the whole request if it doesn't upload.
  const pdfUp = await sb.storage.from('receipts').upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: true })

  const pngUrl = sb.storage.from('receipts').getPublicUrl(pngPath).data.publicUrl
  const pdfUrl = pdfUp.error ? null : sb.storage.from('receipts').getPublicUrl(pdfPath).data.publicUrl

  // Keep any existing extras, drop a stale snapshot PDF, append the fresh one.
  const extras = Array.isArray(rcpt.extra_page_urls) ? rcpt.extra_page_urls : []
  const nextExtras = pdfUrl
    ? [...extras.filter((u) => !String(u).endsWith(`email-${receiptId}.pdf`)), pdfUrl]
    : extras

  const { error: updErr } = await sb
    .from('receipts')
    .update({ receipt_link: pngUrl, extra_page_urls: nextExtras })
    .eq('id', receiptId)
    .eq('user_id', user.id)
  if (updErr) {
    console.error('[email-snapshot] receipt update failed:', updErr.message)
    return Response.json({ error: updErr.message }, { status: 500 })
  }

  return Response.json({ ok: true, receipt_link: pngUrl, pdf_url: pdfUrl })
}
