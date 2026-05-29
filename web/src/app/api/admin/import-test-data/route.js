// POST /api/admin/import-test-data
//
// Bulk-imports a tester CSV into the signed-in user's account.
// Lets QA testers populate their own account in seconds with a known
// fixture instead of having to scan 100 paper receipts to exercise
// subscriptions / Buy Again / GuacScore / Bank Fees / etc.
//
// CSV format (matches the TEST_DATA.csv we ship for tester onboarding):
//   date,store_name,item_name,qty,price,category,is_subscription,is_return,
//   payment_method,notes
//
// Rows are grouped by (date, store_name) into a single receipt with
// multiple line items, so realistic shopping-trip shapes survive. Each
// generated receipt is tagged validation_comment = '[TEST IMPORT]' so
// /api/admin/clear-test-data can wipe them all in one shot when QA is
// done.
//
// Gated to the signed-in user's OWN account — never accepts a target
// user_id, so a malicious caller can't pollute someone else's data.

import { createClient } from '../../../../lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 60

const TEST_TAG = '[TEST IMPORT]'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Tiny CSV parser — handles quoted values + escaped commas. Avoids a
// dependency since we control the input format.
function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = splitLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i])
    const row = {}
    for (let j = 0; j < header.length; j++) row[header[j]] = cols[j] ?? ''
    rows.push(row)
  }
  return rows
}
function splitLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'import-test-data'), { limit: 5, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'Too many imports' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    let csvText = ''
    try {
      const body = await request.json()
      csvText = String(body?.csv || '')
    } catch {
      return Response.json({ error: 'POST a JSON body with { csv: "..." }' }, { status: 400 })
    }
    if (!csvText || csvText.length < 20) {
      return Response.json({ error: 'CSV body looks empty' }, { status: 400 })
    }
    if (csvText.length > 1_000_000) {
      return Response.json({ error: 'CSV too large (max 1MB)' }, { status: 413 })
    }

    const rows = parseCsv(csvText)
    if (rows.length === 0) return Response.json({ error: 'No rows parsed' }, { status: 400 })

    const sbAdmin = admin()

    // Group rows into receipt shapes — one receipt per (date, store_name).
    // Subscriptions are one-row-per-receipt naturally; multi-line grocery
    // trips merge into a single receipt with multiple items.
    const receiptGroups = new Map()
    for (const r of rows) {
      const date = String(r.date || '').slice(0, 10)
      const store = String(r.store_name || '').trim()
      if (!date || !store) continue
      const key = `${date}::${store}`
      if (!receiptGroups.has(key)) {
        receiptGroups.set(key, { date, store, items: [], isSubscription: false, isReturn: false })
      }
      const group = receiptGroups.get(key)
      group.items.push({
        item_name: String(r.item_name || '').trim(),
        qty: Number(r.qty) || 1,
        price: Number(r.price) || 0,
        category: String(r.category || '').trim() || null,
      })
      if (String(r.is_subscription || '').toUpperCase() === 'Y') group.isSubscription = true
      if (String(r.is_return || '').toUpperCase() === 'Y') group.isReturn = true
    }

    let receiptsCreated = 0
    let itemsCreated = 0
    const errors = []

    for (const group of receiptGroups.values()) {
      const total = group.items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1), 0)
      // Insert receipt with the TEST_TAG so cleanup can find it.
      const { data: receipt, error: rcptErr } = await sbAdmin
        .from('receipts')
        .insert({
          user_id: user.id,
          store_name: group.store,
          date: group.date,
          total_amount: total,
          tax_paid: 0,
          processed: true,
          is_return: group.isReturn,
          validation_comment: TEST_TAG,
          // Map subscription / bank-fee categories to the right buckets so
          // the subscription tracker + GuacWizard surfaces pick them up.
          category: group.isSubscription ? 'subscription'
                   : group.items[0]?.category === 'bank-fees' ? 'bank-fees'
                   : null,
        })
        .select('id')
        .single()
      if (rcptErr || !receipt) {
        errors.push(`${group.date} @ ${group.store}: ${rcptErr?.message || 'insert failed'}`)
        continue
      }
      receiptsCreated++

      // Insert all line items in one batch — fewer round trips than
      // a per-row insert loop.
      const itemRows = group.items
        .filter(it => it.item_name)
        .map(it => ({
          receipt_id: receipt.id,
          item_name: it.item_name,
          qty: it.qty,
          price: it.price,
          purchase_date: group.date,
          category: it.category,
        }))
      if (itemRows.length > 0) {
        const { error: itemsErr } = await sbAdmin.from('receipt_items').insert(itemRows)
        if (itemsErr) {
          errors.push(`Items for ${group.date}@${group.store}: ${itemsErr.message}`)
        } else {
          itemsCreated += itemRows.length
        }
      }
    }

    return Response.json({
      ok: true,
      receipts_created: receiptsCreated,
      items_created: itemsCreated,
      groups_processed: receiptGroups.size,
      rows_parsed: rows.length,
      errors,
      tag: TEST_TAG,
    })
  } catch (err) {
    console.error('[import-test-data]', err)
    return Response.json({ error: err.message || 'import failed' }, { status: 500 })
  }
}
