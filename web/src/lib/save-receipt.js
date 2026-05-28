// Canonical receipt save pipeline.
//
// SINGLE SOURCE OF TRUTH for what happens between "we have a parsed
// receipt" and "the row is in the DB". Every create path goes through
// here:
//
//   Web app   ─┐
//   Android   ─┼─► POST /api/receipts/save ─┐
//   iOS       ─┘                            │
//   Email/IMAP poller ────────────────────► saveReceipt() ─► receipts row
//
// Why centralize:
//   - Totals on mobile and web are computed off the same row layout. If
//     mobile and web inserted differently (different category_source
//     conventions, different dedup thresholds, missing store FKs), the
//     analytics on each platform diverged. Now there is one writer.
//   - Tier 2 per-store category learning, store/location resolution, and
//     dedup all happen in one place, so a bug fix or threshold change
//     ships to every caller for free.
//   - Per-user only. No cross-user leak surface — we filter every read by
//     the userId the caller passed in.
//
// Pipeline:
//   1. Resolve `stores` + `store_locations` (find-or-create).
//   2. Tier 2 category inference (infer_user_store_category RPC).
//   3. Dedup: same user/store/date/sign/total ±1¢ ⇒ merge into existing.
//   4. INSERT new row (or PATCH existing) including items.
//   5. Refund policies: AI-extracted if present, else curated store default.
//
// Returns: { receipt_id, merged }
//   - merged=true means we updated an existing row instead of inserting.
//   - Caller is responsible for any cache invalidation / list refresh.

import { findExistingReceipt } from './findExistingReceipt'
import {
  resolveStoreAndLocation,
  writeRefundPolicies,
  lookupStoreDefaultPolicies,
} from './email-to-receipt'
import { applyCategoryRules } from './categorizeRules'

/**
 * @param {object} sb        Supabase client bound to the caller's identity
 *                           (per-user session OR service-role; lib doesn't care).
 * @param {string} userId    The user this receipt belongs to. RLS still
 *                           applies — we just pass it explicitly so admin
 *                           paths (email poller) work too.
 * @param {object} parsed    Parsed receipt shape, as returned by
 *                           /api/parse-receipt. Both flat (`store_address`)
 *                           and nested (`store.address`) keys are accepted.
 * @param {object} [opts]
 * @param {string} [opts.receipt_link]      Pre-uploaded Supabase storage URL.
 * @param {string[]} [opts.extra_page_urls] For multi-page captures.
 * @param {boolean} [opts.business_purchase]
 * @param {string} [opts.validation_comment] Free-form note (e.g. "From email: ...").
 * @param {string} [opts.user_category]     User-picked category (form override).
 *                                          When set, beats Tier 2 inference AND
 *                                          AI parse — category_source becomes 'user'.
 * @returns {Promise<{ receipt_id: string, merged: boolean }>}
 */
export async function saveReceipt(sb, userId, parsed, opts = {}) {
  if (!sb || !userId) throw new Error('saveReceipt: sb + userId required')
  if (!parsed) throw new Error('saveReceipt: parsed required')

  // Flatten the parse shape — accept either nested store.* (parse-receipt-
  // engine output) OR flat store_address/store_city/... (legacy form posts).
  const flatParsed = flattenParsed(parsed)

  // 1. Resolve store + location FKs (find-or-create). Best-effort: null FKs
  // when this fails — receipt still saves with store_name as a string.
  const { store_id, store_location_id } = await resolveStoreAndLocation(sb, flatParsed)

  // 2. Tier 2 per-user-per-store category inference. Only applies when the
  // user didn't explicitly pick a category in the form (`opts.user_category`).
  let inferredCategory = null
  if (!opts.user_category) {
    try {
      const { data: pref } = await sb.rpc('infer_user_store_category', {
        p_user_id: userId,
        p_store_id: store_id,
        p_store_name: flatParsed.store_name || null,
      })
      if (pref && typeof pref === 'string') inferredCategory = pref
    } catch { /* RPC absent on older DBs — fall through to AI category */ }
  }

  // Final category resolution. Priority:
  //   user pick > rule engine > Tier 2 inferred > AI parse > null
  // category_source records which won so the learning RPC can count
  // user-corrections later (it only counts 'user' source).
  //
  // The 'rule' tier handles category invariants that should hold no
  // matter what the AI or per-user history says. Today the engine
  // handles gas-station detection (Costco Gas → gas-up, not grub).
  // More rules slot into RULE_ORDER in lib/categorizeRules.js — each
  // checks items first, store second.
  const ruleCategory = applyCategoryRules(flatParsed, flatParsed.items)
  let finalCategory, categorySource
  if (opts.user_category) {
    finalCategory = opts.user_category
    categorySource = 'user'
  } else if (ruleCategory) {
    finalCategory = ruleCategory
    categorySource = 'rule'
  } else if (inferredCategory) {
    finalCategory = inferredCategory
    categorySource = 'inferred'
  } else {
    finalCategory = flatParsed.category || null
    categorySource = 'ai'
  }

  // 3. Dedup — same user/store/date/total ±1¢ already exists?
  const candidate = {
    store_name: flatParsed.store_name || 'Receipt',
    date: flatParsed.date || new Date().toISOString().slice(0, 10),
    total_amount: Number(flatParsed.total_amount ?? 0),
  }
  const existingId = await findExistingReceipt(sb, userId, candidate).catch(() => null)

  if (existingId) {
    // Merge into existing row. Patch with anything richer the new parse
    // produced, but NEVER overwrite a user-curated category.
    const patch = {}
    if (store_id)               patch.store_id          = store_id
    if (store_location_id)      patch.store_location_id = store_location_id
    if (flatParsed.tax_paid != null)       patch.tax_paid       = Number(flatParsed.tax_paid)
    if (flatParsed.payment_method)         patch.payment_method = flatParsed.payment_method
    if (flatParsed.payment_last4)          patch.payment_last4  = flatParsed.payment_last4
    if (opts.receipt_link)                 patch.receipt_link   = opts.receipt_link
    if (Array.isArray(opts.extra_page_urls) && opts.extra_page_urls.length > 0) {
      patch.extra_page_urls = opts.extra_page_urls
    }
    // Category merge: re-set only if the existing row wasn't user-confirmed.
    // The DB-side category_source on the existing row guards this: we look it
    // up first and skip the category patch when it's 'user'.
    const { data: existingRow } = await sb
      .from('receipts')
      .select('category_source')
      .eq('id', existingId)
      .eq('user_id', userId)
      .maybeSingle()
    const existingSource = existingRow?.category_source
    if (existingSource !== 'user' && finalCategory) {
      patch.category = finalCategory
      patch.category_source = categorySource
    }

    if (Object.keys(patch).length > 0) {
      await sb.from('receipts').update(patch).eq('id', existingId).eq('user_id', userId)
    }

    // Append items only if existing row had none (don't double-insert on
    // re-upload of the same photo).
    const items = Array.isArray(flatParsed.items) ? flatParsed.items : []
    if (items.length > 0) {
      const { data: hadItems } = await sb
        .from('receipt_items').select('id').eq('receipt_id', existingId).limit(1)
      if (!hadItems || hadItems.length === 0) {
        const itemRows = items.map(it => normalizeItemRow(existingId, it, candidate.date))
        await sb.from('receipt_items').insert(itemRows).then(
          () => {},
          (e) => console.warn('[save-receipt] merge item insert failed:', e.message),
        )
      }
    }

    return { receipt_id: existingId, merged: true }
  }

  // 4. Ensure a rewards row for this (user, store) so the receipt
  // list shows a reward number. If the receipt itself printed a
  // membership / loyalty number (Costco Member, CVS ExtraCare,
  // Kroger Plus, ...) we pass it through so the rewards row gets
  // the REAL number rather than a "GG-XXXXXXXX" placeholder. The
  // helper upgrades any existing placeholder when a real number
  // finally arrives. Best-effort: a rewards failure must NEVER
  // block the receipt insert.
  let rewardNo = ''
  if (flatParsed.store_name) {
    rewardNo = await _ensureStoreRewardServer(
      sb, userId, flatParsed.store_name, flatParsed.member_number || null,
    ).catch((e) => { console.warn('[save-receipt] ensureStoreReward skipped:', e.message); return '' })
  }

  // 5. INSERT new row.
  const insertRow = {
    user_id: userId,
    store_name: flatParsed.store_name || 'Receipt',
    store_id,
    store_location_id,
    date: flatParsed.date || new Date().toISOString().slice(0, 10),
    total_amount: Number(flatParsed.total_amount ?? 0),
    tax_paid: Number(flatParsed.tax_paid ?? 0),
    payment_method: flatParsed.payment_method || null,
    payment_last4: flatParsed.payment_last4 || null,
    is_return: Boolean(flatParsed.is_return),
    category: finalCategory,
    category_source: categorySource,
    receipt_link: opts.receipt_link || '',
    business_purchase: Boolean(opts.business_purchase),
    processed: Array.isArray(flatParsed.items) && flatParsed.items.length > 0,
    validation_comment: opts.validation_comment || null,
    reward_no: rewardNo || null,
  }
  if (Array.isArray(opts.extra_page_urls) && opts.extra_page_urls.length > 0) {
    insertRow.extra_page_urls = opts.extra_page_urls
  }

  const { data: rcpt, error } = await sb
    .from('receipts')
    .insert(insertRow)
    .select('id')
    .single()
  if (error) throw error

  const receiptId = rcpt.id

  // 6. Items — best effort. Failure doesn't undo the parent receipt.
  //    When we have a store_id, also upsert into store_items so the
  //    /stores page + Worth-It analytics include items from receipts
  //    captured on every platform (this used to be web-only).
  const items = Array.isArray(flatParsed.items) ? flatParsed.items : []
  if (items.length > 0) {
    const itemRows = []
    const catalogIdByIndex = []
    if (store_id) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const cat = await upsertStoreItemServer(sb, {
          store_id,
          sku: it.sku || null,
          item_name: it.item_name || '',
          price: Number(it.price || 0),
          warranty_info: it.warranty_info || null,
          item_manual: it.item_manual || null,
        }).catch((e) => { console.warn('[save-receipt] store_items upsert skipped:', e.message); return null })
        catalogIdByIndex[i] = cat?.id || null
      }
    }
    for (let i = 0; i < items.length; i++) {
      const row = normalizeItemRow(receiptId, items[i], insertRow.date)
      if (catalogIdByIndex[i]) row.store_item_id = catalogIdByIndex[i]
      itemRows.push(row)
    }
    const { error: itemErr } = await sb.from('receipt_items').insert(itemRows)
    if (itemErr) console.warn('[save-receipt] item insert failed:', itemErr.message)
  }

  // 7. Refund policies. Two tier:
  //    a) AI extracted policies from the receipt body → use those.
  //    b) Otherwise look up curated store defaults (Amazon 30d, Costco lifetime, ...).
  if (Array.isArray(flatParsed.refund_policies) && flatParsed.refund_policies.length > 0) {
    await writeRefundPolicies(sb, receiptId, flatParsed.refund_policies, 'receipt', flatParsed.date)
      .catch((e) => console.warn('[save-receipt] refund policies failed:', e.message))
  } else {
    const cats = (items.map(i => i.category).filter(Boolean))
    if (finalCategory) cats.push(finalCategory)
    const defaults = await lookupStoreDefaultPolicies(sb, flatParsed.store_name, cats).catch(() => [])
    if (defaults.length > 0) {
      await writeRefundPolicies(sb, receiptId, defaults, 'store-default', flatParsed.date)
        .catch((e) => console.warn('[save-receipt] default policies failed:', e.message))
    }
  }

  return { receipt_id: receiptId, merged: false }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function flattenParsed(p) {
  // Accept either nested (engine output) or flat (legacy form posts).
  if (p.store && typeof p.store === 'object') {
    return {
      ...p,
      store_address: p.store_address || p.store.address || null,
      store_city:    p.store_city    || p.store.city    || null,
      store_state:   p.store_state   || p.store.state   || null,
      store_zip:     p.store_zip     || p.store.zip     || null,
      store_phone:   p.store_phone   || p.store.phone_no || null,
      store_website: p.store_website || p.store.website || null,
      store_no:      p.store_no      || p.store.store_no || null,
      location_name: p.location_name || p.store.location_name || null,
    }
  }
  return p
}

// Placeholder reward_no shape this helper writes when no real number
// is known yet ("GG-" prefix + 8 base36 chars). The same pattern is
// the trigger for the upgrade-on-detection path below.
const PLACEHOLDER_REWARD_RE = /^GG-[A-Z0-9]{8}$/

function _isPlaceholderReward(n) {
  return !n || PLACEHOLDER_REWARD_RE.test(String(n))
}

/**
 * Server-side mirror of lib/db.js#ensureStoreReward. Takes the supabase
 * client as a parameter so the central save pipeline (which serves web,
 * mobile, iOS) can ensure a rewards row regardless of which auth flavor
 * the caller has — the db.js version uses createClient() which only
 * works in browser contexts.
 *
 * Behaviour (one source of truth for "what reward_no does this receipt
 * get?"):
 *
 *   1. If the receipt printed a real member_number AND we have an
 *      existing rewards row with a PLACEHOLDER, UPGRADE the row to the
 *      real number. The user finally taught us the real one.
 *   2. If the receipt printed a real member_number AND we have NO
 *      row yet, INSERT with the real number directly.
 *   3. If the receipt printed a real member_number AND the existing
 *      row already has a (different) real number, leave it alone.
 *      The user has already curated this entry — never clobber a
 *      user pick with an AI parse.
 *   4. If no member_number on this receipt AND no existing row,
 *      INSERT a placeholder ("GG-XXXXXXXX") so the receipts list
 *      shows something instead of blank.
 *   5. If no member_number on this receipt AND we already have a
 *      row (placeholder or real), return its existing reward_no.
 *
 * Best-effort: returns '' on any failure so receipt save never blocks
 * on the rewards table.
 */
async function _ensureStoreRewardServer(sb, userId, storeName, parsedMemberNumber = null) {
  if (!sb || !userId || !storeName) return ''
  const parsed = (parsedMemberNumber && String(parsedMemberNumber).trim()) || null

  const { data: existing } = await sb
    .from('rewards')
    .select('id, reward_no')
    .eq('user_id', userId)
    .ilike('store_name', storeName)
    .limit(1)
    .maybeSingle()

  // Case 1 + 3: existing row, receipt printed a number.
  if (existing && parsed) {
    if (_isPlaceholderReward(existing.reward_no)) {
      // UPGRADE: placeholder → real. Also bump the title from
      // "(placeholder)" to remove the marker.
      const { error: upErr } = await sb.from('rewards').update({
        reward_no: parsed,
        reward_title: storeName,
        description: 'Auto-detected from a receipt. Edit if needed.',
      }).eq('id', existing.id)
      if (upErr) {
        console.warn('[save-receipt] reward upgrade failed:', upErr.message)
        return existing.reward_no
      }
      return parsed
    }
    // Real number already on file — never clobber user-curated data.
    return existing.reward_no
  }

  // Case 5: existing row, no new info — keep what's there.
  if (existing) return existing.reward_no

  // Case 2 + 4: no row yet. Use the parsed number if we have one,
  // else mint a placeholder.
  const numberToWrite = parsed || `GG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  const isPlaceholder = !parsed
  const oneYear = new Date(); oneYear.setFullYear(oneYear.getFullYear() + 1)
  const { error } = await sb.from('rewards').insert({
    user_id:      userId,
    reward_no:    numberToWrite,
    expiry_date:  oneYear.toISOString().slice(0, 10),
    reward_type:  'Loyalty',
    reward_title: isPlaceholder ? `${storeName} (placeholder)` : storeName,
    description:  isPlaceholder
      ? 'Auto-created by receipt scan. Replace with your real loyalty number.'
      : 'Auto-detected from a receipt. Edit if needed.',
    store_name:   storeName,
    reward_points: 0,
  })
  if (error) {
    console.warn('[save-receipt] ensureStoreReward insert failed:', error.message)
    return numberToWrite
  }
  return numberToWrite
}

// Server-side store_items upsert. Mirrors lib/db.js#upsertStoreItem but
// takes the supabase client as a parameter (so this works under both the
// per-user session client and the service-role client used by the email
// poller). Best-effort: returns null on any failure — the caller logs and
// continues.
async function upsertStoreItemServer(sb, { store_id, sku, item_name, price, return_policy, warranty_info, item_manual }) {
  if (!store_id || !item_name) return null

  let existing = null
  if (sku) {
    const { data } = await sb.from('store_items').select('*')
      .eq('store_id', store_id)
      .ilike('sku', sku)
      .limit(1).maybeSingle()
    existing = data
  }
  if (!existing && !sku) {
    const { data } = await sb.from('store_items').select('*')
      .eq('store_id', store_id)
      .ilike('item_name', item_name.trim())
      .limit(1).maybeSingle()
    existing = data
  }

  if (existing) {
    const patch = {}
    if (price != null && price > 0) patch.price = price
    if (!existing.return_policy && return_policy) patch.return_policy = return_policy
    if (!existing.warranty_info && warranty_info) patch.warranty_info = warranty_info
    if (!existing.item_manual   && item_manual)   patch.item_manual   = item_manual
    if (!existing.item_name && item_name)         patch.item_name     = item_name
    if (Object.keys(patch).length === 0) return existing
    const { data: updated } = await sb.from('store_items').update(patch).eq('id', existing.id).select().single()
    return updated || existing
  }

  const insertRow = {
    store_id,
    sku: sku || null,
    item_name,
    price: price != null && price > 0 ? price : null,
    return_policy: return_policy || null,
    warranty_info: warranty_info || null,
    item_manual: item_manual || null,
  }
  const { data, error } = await sb.from('store_items').insert(insertRow).select().single()
  if (error) { console.warn('[save-receipt] store_items insert failed:', error.message); return null }
  return data
}

function normalizeItemRow(receiptId, it, purchaseDate = null) {
  return {
    receipt_id: receiptId,
    sku: it.sku || null,
    model: it.model || null,
    item_name: it.item_name || '',
    // qty MUST be an integer in Postgres. Doubles serialize to "1.0" and
    // Postgres rejects with 22P02. round() so 0.5 doesn't floor to 0.
    qty: it.qty == null ? 1 : Math.round(Number(it.qty)),
    price: it.price == null || it.price === '' ? null : Number(it.price),
    // Charity items cannot be "returned" — force false regardless of AI.
    returned: it.category === 'charity' ? false : Boolean(it.returned),
    category: it.category || null,
    health_tier: it.health_tier || null,
    // Copy the parent receipt's date down to the item so the smashlist
    // predictor (predict-smashlist.js aggregate()) doesn't skip the
    // row. Without this, every item saved through the central pipeline
    // had purchase_date=null and never participated in cadence
    // detection — silent across web + mobile + email-poller + statement
    // importer. Fixed at the writer so all callers get it for free.
    purchase_date: purchaseDate,
  }
}
