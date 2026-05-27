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
import { findExistingReceipt } from './findExistingReceipt'

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

// Markers that signal the end of the actual receipt body in a typical
// merchant e-receipt. Everything after these is promotional / recommendation
// content (other items + prices) that the AI keeps mis-attributing as the
// receipt's total. We truncate at the FIRST match.
const PROMO_SECTION_MARKERS = [
  /\bBuy it again\b/i,
  /\bRecommended for you\b/i,
  /\bRecommended (?:items|products)\b/i,
  /\bYou (?:may|might) (?:also )?like\b/i,
  /\bRecently viewed\b/i,
  /\bTop picks\b/i,
  /\bMore items to consider\b/i,
  /\bCustomers (?:also|who).*?bought\b/i,
  /\bSimilar items\b/i,
  /\bRelated to items you('|')?ve viewed\b/i,
  /\bInspired by your.*?(history|browsing)\b/i,
  /\bRate (?:your|this) (?:purchase|order)\b/i,
  /\bShare your (?:thoughts|feedback)\b/i,
  /\bWrite a (?:product )?review\b/i,
]

// Strip the email wrapper so the AI sees JUST the receipt body. Removes:
//   1. "---------- Forwarded message ----------" blocks
//   2. From / To / Sent / Date / Subject header lines
//   3. "Sent from my iPhone" mobile-client signatures
//   4. The "Buy it again" / "Recommended" promotional section at the bottom
//      — TRUNCATING at the first marker because everything below it is OTHER
//      items at OTHER prices that the AI was mistakenly attributing to this
//      receipt's total (Amazon $8 receipt was getting parsed as $846 because
//      it summed promo prices).
export function stripEmailWrapper(text) {
  if (!text) return ''
  let s = text
  s = s.replace(/-{3,}\s*Forwarded message\s*-{3,}/i, '')
  s = s.replace(/^(From|To|Sent|Date|Subject|Cc|Bcc):.*$/gim, '')
  s = s.replace(/Sent from my (iPhone|iPad|Android|Samsung|Galaxy)[^\n]*/gi, '')

  // Truncate at the first promo / recommendation marker. Earliest wins.
  let cutoff = -1
  for (const re of PROMO_SECTION_MARKERS) {
    const m = s.match(re)
    if (m && (cutoff === -1 || m.index < cutoff)) cutoff = m.index
  }
  if (cutoff > 0) s = s.slice(0, cutoff)

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

// Wipe-and-insert the receipt_refund_policies rows for a receipt. Server-side
// counterpart to lib/db.js#replaceRefundPolicies — takes the supabase client
// as a parameter so it works with either the user session or the admin client
// (the IMAP poller runs as admin). Best-effort: a failure is logged but does
// not undo the parent receipt insert.
//
// `source` marks WHERE the policy data came from so the UI can show "From
// receipt" vs "Costco.com default" badges. Values:
//   'receipt'       — printed on the receipt body
//   'store-default' — looked up from the curated store_return_policies table
//   'manual'        — typed by the user in the UI
export async function writeRefundPolicies(sb, receiptId, policies, source = 'receipt', receiptDate = null) {
  if (!receiptId) return
  // Wipe first so a re-parse drops stale rows. Safe when the array is empty
  // (we want zero policies on the receipt in that case).
  await sb.from('receipt_refund_policies').delete().eq('receipt_id', receiptId)
  if (!Array.isArray(policies) || policies.length === 0) return
  const rows = policies.map(p => ({
    receipt_id: receiptId,
    policy_id: p.policy_id || null,
    days: p.days ?? null,
    // Derive expiry from receipt date + days when the receipt didn't print
    // a specific expiry date (e.g. it said "30 days from purchase" without
    // the date). Matches the lib/db.js#replaceRefundPolicies behaviour.
    expiry_date: p.expiry_date || deriveExpiry(receiptDate, p.days),
    eligible: p.eligible !== false,
    details: p.details || null,
    source: p.source || source,
    source_url: p.source_url || null,
  }))
  const { error } = await sb.from('receipt_refund_policies').insert(rows)
  if (error) console.warn('[email-to-receipt] refund_policies insert failed:', error.message)
}

function deriveExpiry(receiptDate, days) {
  if (!receiptDate || days == null) return null
  const d = new Date(receiptDate)
  if (isNaN(d.getTime())) return null
  d.setDate(d.getDate() + Number(days))
  return d.toISOString().slice(0, 10)
}

// Curated-table lookup. Returns policies shaped like AI output so the caller
// can hand them straight to writeRefundPolicies. Filters to:
//   1. Default rules for the store (category IS NULL), AND
//   2. Category-specific rules whose category matches any item category on
//      the receipt.
// Returns [] when the store isn't in the curated table — caller can decide
// whether to fall back to "no policy" or an AI inference (we're skipping the
// AI path for now per the user's "minimize AI usage" call).
export async function lookupStoreDefaultPolicies(sb, storeName, itemCategories = []) {
  if (!storeName) return []
  const key = normalizeStoreName(storeName)
  if (!key) return []
  const { data: rows, error } = await sb
    .from('store_return_policies')
    .select('policy_id, category, days, eligible, details, source_url')
    .eq('store_name_normalized', key)
  if (error || !rows || rows.length === 0) return []
  const cats = new Set(itemCategories.filter(Boolean))
  const applicable = rows.filter(r => !r.category || cats.has(r.category))
  // Dedup by policy_id — prefer the category-specific row over the default
  // when both apply (e.g. Costco electronics 90d over Costco default lifetime).
  const byPolicyId = new Map()
  for (const r of applicable) {
    const existing = byPolicyId.get(r.policy_id)
    if (!existing || (r.category && !existing.category)) {
      byPolicyId.set(r.policy_id, r)
    }
  }
  return [...byPolicyId.values()].map(r => ({
    policy_id: r.policy_id,
    days: r.days,
    eligible: r.eligible,
    details: r.details,
    source_url: r.source_url || null,
  }))
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
// Returns { receipt_id, deduped } — deduped:true means we merged into an
// existing row instead of inserting a new one (caller can skip its own
// post-processing in that case if it wants to).
async function insertParsedReceipt(sb, userId, parsed, bodyPreview) {
  // Resolve the store first so the receipt insert can carry the FK.
  const { store_id, store_location_id } = await resolveStoreAndLocation(sb, parsed)

  // Tier 2 learning: if the user has already corrected ≥3 receipts from
  // this store to the same category, prefer THEIR slug over Gemini's
  // call. Best-effort — falls back to parsed.category on any RPC error.
  let inferredCategory = null
  try {
    const { data: pref } = await sb.rpc('infer_user_store_category', {
      p_user_id: userId,
      p_store_id: store_id,
      p_store_name: parsed.store_name || null,
    })
    if (pref) inferredCategory = pref
  } catch { /* RPC missing on older DBs — fall through */ }
  const finalCategory = inferredCategory || parsed.category || null
  const categorySource = inferredCategory ? 'inferred' : 'ai'

  const candidate = {
    store_name: parsed.store_name || 'Receipt by email',
    date: parsed.date || new Date().toISOString().slice(0, 10),
    total_amount: parsed.total_amount || 0,
  }

  // Pre-insert dedup: if we already have a receipt for the same user/store/
  // date/total, skip the insert. Without this, two emails about the same
  // purchase (confirmation + receipt, or a forwarded duplicate) each create
  // their own row.
  const existingId = await findExistingReceipt(sb, userId, candidate).catch(() => null)
  if (existingId) {
    // Best-effort patch the existing row with anything richer the new parse
    // produced — store FKs, tax, payment details — without overwriting
    // anything the user has already curated.
    const patch = {}
    if (store_id)          patch.store_id          = store_id
    if (store_location_id) patch.store_location_id = store_location_id
    if (parsed.tax_paid)        patch.tax_paid        = parsed.tax_paid
    if (parsed.payment_method)  patch.payment_method  = parsed.payment_method
    if (parsed.payment_last4)   patch.payment_last4   = parsed.payment_last4
    if (parsed.category)        patch.category        = parsed.category
    if (Object.keys(patch).length) {
      await sb.from('receipts').update(patch).eq('id', existingId).eq('user_id', userId).catch(() => {})
    }
    return { receipt_id: existingId, deduped: true }
  }

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
    category: finalCategory,
    category_source: categorySource,
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
      price: it.price == null ? null : Number(it.price),
      // Charity items can never be "returned" — force false regardless of
      // what the AI returned.
      returned: it.category === 'charity' ? false : Boolean(it.returned),
      category: it.category || null,
    }))
    const { error: itemErr } = await sb.from('receipt_items').insert(itemRows)
    if (itemErr) console.warn('[email-to-receipt] item insert failed:', itemErr.message)
  }

  // Refund policies. Two-tier:
  //   1. If the AI extracted policies from the receipt body, use those.
  //   2. Otherwise fall back to the curated store_return_policies table
  //      (Amazon 30d, Costco lifetime, etc.) so receipts without printed
  //      policies still surface return rights in the UI.
  // Best-effort: a failure here doesn't undo the parent receipt.
  if (Array.isArray(parsed.refund_policies) && parsed.refund_policies.length > 0) {
    await writeRefundPolicies(sb, rcpt.id, parsed.refund_policies, 'receipt', parsed.date).catch(() => {})
  } else {
    const cats = (parsed.items || []).map(i => i.category).filter(Boolean)
    if (parsed.category) cats.push(parsed.category)
    const defaults = await lookupStoreDefaultPolicies(sb, parsed.store_name, cats).catch(() => [])
    if (defaults.length > 0) {
      await writeRefundPolicies(sb, rcpt.id, defaults, 'store-default', parsed.date).catch(() => {})
    }
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
  // Try AI parse first. Pass the email's received_at as a "do not match" hint
  // so the AI doesn't lazily return the forward date as the transaction date.
  if (body && body.length > 60) {
    try {
      const parsed = await parseReceiptFromText(body, { emailDate: m.receivedAt })
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
