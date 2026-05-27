// Statement → receipts + bank ledger importer.
//
// Order of operations matters here for resilience: if a bank-ledger migration
// hasn't been run yet (017 / 018), we DO NOT want to lose the user's receipts.
// So we insert receipts FIRST, then attempt the bank tables on a best-effort
// basis. Any failures get reported back as `warnings[]` so the UI can surface
// them without blocking the import.
//
// Per call:
//   1. Insert receipts for opted-in rows (with from_statement = true).
//   2. Best-effort: insert bank_statements row.
//   3. Best-effort: insert bank_fees for ALL fee/interest/penalty rows.
//   4. Best-effort: insert bank_transactions for EVERY parsed row.
//   5. Best-effort: reconcile_statement_batch + update counters.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey, validate, v } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'

const MAX_ROWS = 200

export async function POST(request) {
  const warnings = []
  try {
    const rl = await rateLimit(rateKey(request, 'statement-import'), { limit: 6, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const checked = validate(body, {
      issuer:        v.optionalString({ max: 120 }),
      account_last4: v.optionalString({ max: 8 }),
      file_name:     v.optionalString({ max: 240 }),
      transactions:  v.optionalArray({ maxLen: MAX_ROWS }),
    })
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })

    const businessDefault = Boolean(body?.business_default)
    const statementKind   = body?.statement_kind || null
    const periodStart     = body?.period_start || null
    const periodEnd       = body?.period_end   || null
    const totals          = body?.totals || null
    // Finance block (minimum due, due date, APRs, balances). Sanitize each
    // field — only pass through what's a real number / valid date.
    const fin = body?.finance || {}
    const numOrNull = (v) => (v == null || v === '' || Number.isNaN(Number(v))) ? null : Number(v)
    const dateOrNull = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : null
    const finance = {
      previous_balance:     numOrNull(fin.previous_balance),
      new_balance:          numOrNull(fin.new_balance),
      credit_limit:         numOrNull(fin.credit_limit),
      available_credit:     numOrNull(fin.available_credit),
      minimum_payment_due:  numOrNull(fin.minimum_payment_due),
      payment_due_date:     dateOrNull(fin.payment_due_date),
      purchase_apr:         numOrNull(fin.purchase_apr),
      balance_transfer_apr: numOrNull(fin.balance_transfer_apr),
      cash_advance_apr:     numOrNull(fin.cash_advance_apr),
    }

    const { issuer, account_last4, file_name } = checked.data
    const allRows = (body?.transactions || []).filter(t => t && t.merchant && t.date).slice(0, MAX_ROWS)
    const optedRows = allRows.filter(t => t._import !== false)

    if (allRows.length === 0) {
      return Response.json({ error: 'No transactions parsed from the statement' }, { status: 400 })
    }

    const statementImportId = crypto.randomUUID()
    const source = (file_name || `${issuer || 'statement'}-${new Date().toISOString().slice(0,10)}`).slice(0, 240)
    const last4 = (account_last4 || '').replace(/\D/g, '').slice(-4) || null
    const force = Boolean(body?.force)

    // ── Duplicate safeguard ──────────────────────────────────────────────
    // If the client didn't pass `force: true`, refuse to insert a second
    // statement covering the same (account_last4, period_start, period_end).
    // The /api/parse-statement preview already surfaces this in the UI, so
    // hitting this 409 means the client skipped the warning.
    if (!force && last4 && periodStart && periodEnd) {
      try {
        const { data: dup } = await sb.from('bank_statements')
          .select('id, period_start, period_end, uploaded_at, imported_count')
          .eq('user_id', user.id)
          .eq('account_last4', last4)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .limit(1)
        if (dup && dup[0]) {
          return Response.json({
            error: 'duplicate_statement',
            message: `A statement for ••${last4} covering ${periodStart} → ${periodEnd} was already uploaded on ${dup[0].uploaded_at?.slice(0,10)} (${dup[0].imported_count} receipts). Re-send with force:true to import anyway, or delete the existing one first.`,
            duplicate_of: dup[0],
          }, { status: 409 })
        }
      } catch (e) {
        // Non-fatal — proceed
      }
    }

    // ── 1. Receipts first (only opted-in rows) ───────────────────────────
    const receiptInserts = optedRows.map(t => {
      const amount = Number(t.amount || 0)
      const flagLabel = t.is_fee     ? (t.fee_kind || 'Fee')
                      : t.is_interest ? (t.fee_kind || 'Interest')
                      : t.is_payment  ? 'Card payment'
                      : null
      const merchant = flagLabel
        ? `[${flagLabel}] ${t.merchant || issuer || 'Charge'}`.slice(0, 120)
        : (t.merchant || '').slice(0, 120)
      const linkParts = []
      if (flagLabel) linkParts.push(`kind: ${t.kind || flagLabel.toLowerCase()}`)
      if (t.raw_description) linkParts.push(t.raw_description)
      const isBusiness = (typeof t.business === 'boolean') ? t.business : businessDefault
      return {
        user_id:           user.id,
        store_name:        merchant,
        date:              t.date,
        total_amount:      amount,
        tax_paid:          0,
        // Bank-issued charges (interest, finance fees, late fees, balance
        // transfer fees, etc.) all route to the dedicated 'bank-fees' slug
        // so the donut + reports don't dump them into Misc. Card-payment
        // rows stay in 'misc' — they're audit-only ledger entries, not
        // expenses.
        category:          (t.is_fee || t.is_interest) ? 'bank-fees'
                          : t.is_payment ? 'misc'
                          : (t.category || 'misc'),
        business_purchase: isBusiness,
        payment_method:    issuer ? `${issuer} card` : 'Card',
        payment_last4:     last4,
        from_statement:    true,
        statement_source:  source,
        statement_import_id: statementImportId,
        receipt_link:      linkParts.length ? `Statement row — ${linkParts.join(' · ')}`.slice(0, 500) : null,
      }
    })

    let receiptIds = []
    if (receiptInserts.length > 0) {
      const { data, error } = await sb.from('receipts').insert(receiptInserts).select('id')
      if (error) {
        console.error('[statement/import] receipts insert failed:', error.message)
        return Response.json({ error: `Receipts insert failed: ${error.message}` }, { status: 500 })
      }
      receiptIds = data.map(r => r.id)
    }

    // ── 2. Best-effort: bank_statements ──────────────────────────────────
    let statementId = null
    const baseStmtRow = {
      user_id:             user.id,
      statement_import_id: statementImportId,
      issuer,
      account_last4:       last4,
      statement_kind:      statementKind,
      file_name:           source,
      period_start:        periodStart,
      period_end:          periodEnd,
      totals,
      row_count:           allRows.length,
    }
    // First try with the new finance fields (migration 019). If those columns
    // don't exist yet (user only ran 017), retry without them so the rest of
    // the ledger still gets created.
    async function insertStatement(row) {
      return sb.from('bank_statements').insert(row).select('id').single()
    }
    try {
      let { data: stmtRow, error: stmtErr } = await insertStatement({ ...baseStmtRow, ...finance })
      if (stmtErr && /column .* does not exist|could not find the .* column/i.test(stmtErr.message)) {
        warnings.push(`bank_statements finance fields skipped (run migration 019): ${stmtErr.message}`)
        ;({ data: stmtRow, error: stmtErr } = await insertStatement(baseStmtRow))
      }
      if (stmtErr) {
        warnings.push(`bank_statements: ${stmtErr.message}`)
        console.warn('[statement/import] bank_statements failed:', stmtErr.message)
      } else {
        statementId = stmtRow.id
      }
    } catch (e) {
      warnings.push(`bank_statements: ${e.message}`)
    }

    // ── 3. Best-effort: bank_fees ───────────────────────────────────────
    const feeInserts = []
    for (const t of allRows) {
      if (!t.is_fee && !t.is_interest) continue
      const kind = t.is_interest ? 'interest' : 'fee'
      let linkedReceiptId = null
      if (t._import !== false) {
        const optedIdx = optedRows.indexOf(t)
        if (optedIdx >= 0 && receiptIds[optedIdx]) linkedReceiptId = receiptIds[optedIdx]
      }
      feeInserts.push({
        user_id:         user.id,
        statement_id:    statementId,
        receipt_id:      linkedReceiptId,
        date:            t.date,
        kind,
        fee_kind:        t.fee_kind || (kind === 'interest' ? 'Interest' : 'Fee'),
        merchant:        (t.merchant || issuer || '').slice(0, 120) || null,
        amount:          Math.abs(Number(t.amount || 0)),
        raw_description: t.raw_description || null,
      })
    }

    let feeIds = []
    if (feeInserts.length > 0) {
      try {
        const { data: feeData, error: feeErr } = await sb.from('bank_fees').insert(feeInserts).select('id')
        if (feeErr) {
          warnings.push(`bank_fees: ${feeErr.message}`)
          console.warn('[statement/import] bank_fees failed:', feeErr.message)
        } else {
          feeIds = feeData.map(f => f.id)
        }
      } catch (e) {
        warnings.push(`bank_fees: ${e.message}`)
      }
    }

    // ── 4. Best-effort: bank_transactions (every parsed row) ────────────
    let txInsertedCount = 0
    if (statementId) {
      const txInserts = []
      let feeCursor = 0
      for (let i = 0; i < allRows.length; i++) {
        const t = allRows[i]
        const amount   = Number(t.amount || 0)
        const isFee    = Boolean(t.is_fee)
        const isInt    = Boolean(t.is_interest)
        const isPay    = Boolean(t.is_payment)
        const isRefund = Boolean(t.is_refund) || (amount < 0 && !isPay && !isFee && !isInt)
        const opted    = t._import !== false
        const isBusiness = (typeof t.business === 'boolean') ? t.business : businessDefault

        let linkedReceiptId = null
        if (opted) {
          const optedIdx = optedRows.indexOf(t)
          if (optedIdx >= 0 && receiptIds[optedIdx]) linkedReceiptId = receiptIds[optedIdx]
        }
        let linkedFeeId = null
        if (isFee || isInt) {
          linkedFeeId = feeIds[feeCursor] || null
          feeCursor++
        }

        txInserts.push({
          user_id:         user.id,
          statement_id:    statementId,
          receipt_id:      linkedReceiptId,
          fee_id:          linkedFeeId,
          position:        i,
          date:            t.date,
          merchant:        (t.merchant || '').slice(0, 200),
          raw_description: t.raw_description || null,
          amount,
          category:        (isFee || isInt || isPay) ? null : (t.category || 'misc'),
          kind:            t.kind || (isPay ? 'payment' : isFee ? 'fee' : isInt ? 'interest' : isRefund ? 'refund' : amount < 0 ? 'deposit' : 'purchase'),
          fee_kind:        t.fee_kind || null,
          is_payment:      isPay,
          is_fee:          isFee,
          is_interest:     isInt,
          is_refund:       isRefund,
          imported:        opted && linkedReceiptId !== null,
          business:        isBusiness,
          city:            t.city || null,
          state:           t.state || null,
        })
      }

      try {
        const { error: txErr } = await sb.from('bank_transactions').insert(txInserts)
        if (txErr) {
          warnings.push(`bank_transactions: ${txErr.message}`)
          console.warn('[statement/import] bank_transactions failed:', txErr.message)
        } else {
          txInsertedCount = txInserts.length
        }
      } catch (e) {
        warnings.push(`bank_transactions: ${e.message}`)
      }
    } else {
      warnings.push('bank_transactions: skipped (no statement_id — run migration 017)')
    }

    // ── 5. Best-effort: reconcile + counters ────────────────────────────
    let reconciled = 0
    try {
      const { data: paired, error: rxErr } = await sb.rpc('reconcile_statement_batch', {
        p_import_id: statementImportId,
      })
      if (rxErr) {
        warnings.push(`reconcile: ${rxErr.message}`)
      } else {
        reconciled = Number(paired || 0)
      }
    } catch (e) {
      warnings.push(`reconcile: ${e.message}`)
    }

    if (statementId) {
      try {
        await sb.from('bank_statements')
          .update({
            imported_count:    receiptIds.length,
            fee_count:         feeIds.length,
            reconciled_count:  reconciled,
            transaction_count: txInsertedCount,
          })
          .eq('id', statementId)
      } catch (e) {
        warnings.push(`bank_statements update: ${e.message}`)
      }
    }

    return Response.json({
      imported:            receiptIds.length,
      fees_logged:         feeIds.length,
      transactions:        txInsertedCount,
      reconciled,
      statement_id:        statementId,
      statement_import_id: statementImportId,
      warnings,
    })
  } catch (err) {
    console.error('[statement/import]', err)
    return Response.json({ error: err.message || 'Import failed', warnings }, { status: 500 })
  }
}
