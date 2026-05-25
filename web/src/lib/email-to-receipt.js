// Convert an IMAP-fetched message into a receipt row. Tries AI-parsing the
// body first (Groq Llama for text); if that fails, falls back to a smarter
// stub that uses the sender display name / subject instead of the bare email
// domain. Both code paths produce a row with `processed = true` (parsed) or
// `processed = false` (stub) so a later batch can re-parse the stubs.
//
// Returns { receipt_id, processed, source } where source describes which
// strategy actually produced the row — useful for diagnostics.

import { parseReceiptFromText } from './parse-receipt-engine'

// Strip the email wrapper so the AI sees just the receipt body. Removes
// "Forwarded message" headers, "From:/To:/Subject:" lines at the top, and
// trailing "Sent from my iPhone" / Gmail-style quote prefixes. Defensive —
// if regex doesn't match, we hand the AI the raw text and let it cope.
function stripEmailWrapper(text) {
  if (!text) return ''
  let s = text
  // Drop common Gmail/Outlook forwarding header block
  s = s.replace(/-{3,}\s*Forwarded message\s*-{3,}/i, '')
  s = s.replace(/^(From|To|Sent|Date|Subject|Cc|Bcc):.*$/gim, '')
  s = s.replace(/Sent from my (iPhone|iPad|Android|Samsung|Galaxy)[^\n]*/gi, '')
  // Compact multiple blank lines
  s = s.replace(/\n{3,}/g, '\n\n').trim()
  return s
}

// Non-AI fallback: extract a plausible store name from the email's sender
// display name and subject. Better than "gmail" / "yahoo".
//
// Examples:
//   "Lowe's <noreply@lowes.com>", subject "Your Lowe's purchase receipt"
//     -> "Lowe's"
//   "Ram Dasaradi <rdasaradi@gmail.com>", subject "Fwd: Your purchase receipt"
//     -> "Receipt" (sender is the user themselves; subject has no merchant)
function guessStoreFromHeaders({ fromAddr, subject }) {
  // Sender display name (the bit before <...>)
  const displayMatch = (fromAddr || '').match(/^([^<]+)\s*</)
  const display = (displayMatch?.[1] || '').trim().replace(/["']/g, '')

  // Skip if display name looks like a human (two-word capitalised name) — that's
  // probably the user forwarding from their personal account, not a merchant.
  const looksLikeHumanName = /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(display)
  if (display && !looksLikeHumanName && display.length < 60) return display

  // Subject patterns: "Your <Store> receipt", "Fw: Your <Store> purchase", etc.
  const cleanSubj = (subject || '').replace(/^(Fw|Fwd|Re):\s*/i, '').trim()
  const subjMatch = cleanSubj.match(/(?:Your|Receipt from|Order from)\s+([A-Z][\w'’&. -]{1,40}?)(?:\s+(?:purchase|order|receipt|confirmation)|$|[.!])/i)
  if (subjMatch?.[1]) return subjMatch[1].trim()

  return 'Receipt by email'
}

// Insert a receipt row + its items + refund policies for an AI-parsed result.
// Returns { receipt_id }.
async function insertParsedReceipt(sb, userId, parsed, bodyPreview) {
  const { data: rcpt, error } = await sb.from('receipts').insert({
    user_id: userId,
    store_name: parsed.store_name || 'Receipt by email',
    date: parsed.date || new Date().toISOString().slice(0, 10),
    total_amount: parsed.total_amount || 0,
    tax_paid: parsed.tax_paid || 0,
    payment_method: parsed.payment_method || null,
    payment_last4: parsed.payment_last4 || null,
    is_return: Boolean(parsed.is_return),
    category: parsed.category || null,
    receipt_link: '',
    business_purchase: false,
    processed: true,
    validation_comment: bodyPreview ? `From email:\n\n${bodyPreview}` : null,
  }).select('id').single()
  if (error) throw error

  // Items — best effort. A failure here doesn't undo the receipt row.
  if (Array.isArray(parsed.items) && parsed.items.length > 0) {
    const itemRows = parsed.items.map(it => ({
      receipt_id: rcpt.id,
      sku: it.sku || null,
      model: it.model || null,
      item_name: it.item_name || '',
      qty: it.qty || 1,
      price: it.price || 0,
      returned: Boolean(it.returned),
    }))
    const { error: itemErr } = await sb.from('receipt_items').insert(itemRows)
    if (itemErr) console.warn('[email-to-receipt] item insert failed:', itemErr.message)
  }

  return { receipt_id: rcpt.id }
}

// Stub fallback when AI parsing failed or is unavailable.
async function insertStubReceipt(sb, userId, { fromAddr, subject, receivedAt, preview }) {
  const store = guessStoreFromHeaders({ fromAddr, subject })
  const { data: rcpt, error } = await sb.from('receipts').insert({
    user_id: userId,
    store_name: store,
    date: (receivedAt instanceof Date ? receivedAt : new Date(receivedAt || Date.now()))
      .toISOString().slice(0, 10),
    total_amount: 0,
    tax_paid: 0,
    receipt_link: '',
    business_purchase: false,
    processed: false,
    validation_comment: `From email: ${subject || ''}\n\n${preview || ''}`,
  }).select('id').single()
  if (error) throw error
  return { receipt_id: rcpt.id }
}

// Public entry: takes a poller `message` object + the supabase admin client +
// the user_id, returns { receipt_id, processed, source }.
export async function draftReceiptFromEmail(sb, userId, m) {
  const body = stripEmailWrapper(m.bodyText || m.bodyHtml || '')
  // Try AI parse first
  if (body && body.length > 60) {
    try {
      const parsed = await parseReceiptFromText(body)
      if (parsed && (parsed.store_name || parsed.total_amount || parsed.items?.length)) {
        const { receipt_id } = await insertParsedReceipt(sb, userId, parsed, m.preview)
        return { receipt_id, processed: true, source: parsed._provider || 'ai' }
      }
    } catch (e) {
      console.warn('[email-to-receipt] AI parse failed; falling back to stub:', e.message)
    }
  }

  // Fallback: stub with better store guess from headers
  const { receipt_id } = await insertStubReceipt(sb, userId, m)
  return { receipt_id, processed: false, source: 'stub' }
}
