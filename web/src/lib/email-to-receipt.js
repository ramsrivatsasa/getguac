// Convert an IMAP-fetched message into a receipt row. Tries AI-parsing the
// body first (Groq Llama for text); if that fails, falls back to a smarter
// stub that uses the sender display name / subject instead of the bare email
// domain. Both code paths produce a row with `processed = true` (parsed) or
// `processed = false` (stub) so a later batch can re-parse the stubs.
//
// Returns { receipt_id, processed, source } where source describes which
// strategy actually produced the row — useful for diagnostics.

import { parseReceiptFromText } from './parse-receipt-engine'
import { normalizeStoreName, canonicalStoreName } from './store-name-normalize'

function normalizePhone(s) {
  return (s || '').replace(/\D+/g, '')
}

// Find-or-create a row in `stores` for a parsed AI result. Match strategy:
//   1. phone (most reliable — same digits = same location)
//   2. address (string match)
//   3. NORMALIZED name (Amazon === Amazon.com === AMAZON.COM, Inc.)
// Falls through to insert when no match. New rows get a canonical display
// name ("Amazon" not "AMAZON.COM, Inc.") when one is known in the alias map.
//
// Takes the Supabase client as a parameter so it works with either the
// per-user client OR the admin/service-role client used by the poller.
async function upsertStoreServer(sb, parsed) {
  const storeName = (parsed.store_name || '').trim()
  if (!storeName) return null

  const address  = parsed.store_address || null
  const phoneNo  = parsed.store_phone   || null
  const website  = parsed.store_website || null

  const phoneNorm = normalizePhone(phoneNo)
  const addrNorm  = (address || '').trim().toLowerCase()
  const nameNorm  = normalizeStoreName(storeName)

  // Match against the global stores table. The scale issue with this full
  // table-scan is logged in the audit — fine for now, costly later.
  const { data: all } = await sb.from('stores').select('*')
  const stores = all || []

  let match = null
  if (phoneNorm.length >= 7) {
    match = stores.find(s => normalizePhone(s.phone_no) === phoneNorm) || null
  }
  if (!match && addrNorm) {
    match = stores.find(s => (s.address || '').trim().toLowerCase() === addrNorm) || null
  }
  if (!match && nameNorm) {
    // Normalised-name match: "amazon" === "amazon.com" === "amazon mktp"
    match = stores.find(s => normalizeStoreName(s.store_name) === nameNorm) || null
  }

  if (match) {
    // Backfill missing top-level fields when the parse picked them up.
    // Also upgrade the stored name to the canonical alias if we know one
    // and the current value is messier (e.g. fix "AMAZON.COM, INC." -> "Amazon").
    const patch = {}
    if (!match.address && address) patch.address = address
    if (!match.phone_no && phoneNo) patch.phone_no = phoneNo
    if (!match.website && website) patch.website = website
    const canonical = canonicalStoreName(storeName)
    if (canonical && canonical !== match.store_name && normalizeStoreName(canonical) === normalizeStoreName(match.store_name)) {
      patch.store_name = canonical
    }
    if (Object.keys(patch).length > 0) {
      const { data: updated } = await sb.from('stores').update(patch).eq('id', match.id).select().single()
      return updated || match
    }
    return match
  }

  // No match — insert with the canonical display name so the chart never
  // shows "AMAZON.COM, Inc." in the first place.
  const { data, error } = await sb
    .from('stores')
    .insert({
      store_name: canonicalStoreName(storeName),
      address,
      phone_no: phoneNo,
      website,
    })
    .select()
    .single()
  if (error) {
    console.warn('[email-to-receipt] store insert failed:', error.message)
    return null
  }
  return data
}

// Find-or-create the store_locations row for this parse. One location row per
// distinct address within a store.
async function upsertStoreLocationServer(sb, storeId, parsed) {
  if (!storeId) return null
  const address  = parsed.store_address || null
  const city     = parsed.store_city    || null
  const state    = parsed.store_state   || null
  const zip      = parsed.store_zip     || null
  const phoneNo  = parsed.store_phone   || null
  const storeNo  = parsed.store_no      || null
  const locName  = parsed.location_name || null

  // Nothing distinct to identify a location — skip.
  if (!address && !city && !zip && !storeNo) return null

  let q = sb.from('store_locations').select('*').eq('store_id', storeId)
  if (address) q = q.ilike('address', address)
  else q = q.is('address', null)
  const { data: existing } = await q.limit(1).maybeSingle()

  if (existing) {
    const patch = {}
    if (!existing.location_name && locName) patch.location_name = locName
    if (!existing.city && city) patch.city = city
    if (!existing.state && state) patch.state = state
    if (!existing.zip && zip) patch.zip = zip
    if (!existing.phone_no && phoneNo) patch.phone_no = phoneNo
    if (!existing.store_no && storeNo) patch.store_no = storeNo
    if (Object.keys(patch).length > 0) {
      const { data: updated } = await sb.from('store_locations').update(patch).eq('id', existing.id).select().single()
      return updated || existing
    }
    return existing
  }

  const { data, error } = await sb
    .from('store_locations')
    .insert({ store_id: storeId, location_name: locName, address, city, state, zip, phone_no: phoneNo, store_no: storeNo })
    .select()
    .single()
  if (error) {
    console.warn('[email-to-receipt] store_location insert failed:', error.message)
    return null
  }
  return data
}

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

// Public helper: given a parsed AI result, find-or-create the matching
// `stores` + `store_locations` rows and return their FKs. Best-effort —
// returns nulls on any failure so the caller can still save the receipt
// with just the store_name string.
export async function resolveStoreAndLocation(sb, parsed) {
  const store    = await upsertStoreServer(sb, parsed).catch(() => null)
  const location = store ? await upsertStoreLocationServer(sb, store.id, parsed).catch(() => null) : null
  return { store_id: store?.id || null, store_location_id: location?.id || null }
}

// Insert a receipt row + its items + refund policies for an AI-parsed result.
// Also find-or-creates the linked store + store_location so the receipt
// joins into the per-store views (Stash, Worth It, store detail page).
// Returns { receipt_id }.
async function insertParsedReceipt(sb, userId, parsed, bodyPreview) {
  // Resolve the store first so the receipt insert can carry the FK.
  const { store_id, store_location_id } = await resolveStoreAndLocation(sb, parsed)

  const { data: rcpt, error } = await sb.from('receipts').insert({
    user_id: userId,
    store_name: parsed.store_name || 'Receipt by email',
    store_id,
    store_location_id,
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
