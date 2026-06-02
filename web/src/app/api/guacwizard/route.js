// GET /api/guacwizard?days=30
//
// Canonical GuacWizard endpoint — same lib (`wizardScore.js`) the
// web dashboard tile and /guacwizard page run on, exposed over HTTP
// so mobile (and any future platform) can compute identical scores
// without porting the math.
//
// Mirrors the /api/guacoscore pattern: thin wrapper around the lib,
// RLS-scoped data fetch, no client trust required.
//
// Request:
//   query params:
//     days — number; trailing window for the score (1, 30, 90, 365).
//            Omitted or 0 → lifetime (matches dashboard tile when in
//            "all time" mode). Mobile typically sends the dashboard's
//            (period, periodCount) translated to days.
//
// Response (200):
//   {
//     scope: 'lifetime' | { days, sinceDate },
//     score, reasons: [{label, why}, ...],
//     summary: { totalInterest, totalFees, totalPayments,
//                totalPurch, totalRefunds, netDebtChange,
//                accountCount },
//   }
//
// Auth: requires a valid Supabase session cookie. 401 without one.

import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { computeWizardScore } from '../../../lib/wizardScore'
import { generateInsights } from '../../../lib/financeInsights'

export async function GET(req) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const daysRaw = parseInt(searchParams.get('days') || '0', 10)
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 0

  // Snap the cutoff to local midnight so the boundary doesn't drift
  // by wall-clock time. Same fix the GuacScore path uses.
  let sinceDate = null
  if (days > 0) {
    const d = new Date(Date.now() - days * 86400000)
    d.setHours(0, 0, 0, 0)
    sinceDate = d
  }
  const sinceIso = sinceDate ? sinceDate.toISOString().slice(0, 10) : null

  // RLS limits each query to the caller's rows. Three bank tables
  // power the score: statements (account/APR data), fees (interest
  // and bank fees), transactions (purchases/payments/refunds).
  let stmtQ = sb.from('bank_statements').select('*')
  let feeQ  = sb.from('bank_fees').select('*')
  let txnQ  = sb.from('bank_transactions').select('*')
  if (sinceIso) {
    // bank_fees + bank_transactions both have a top-level `date`.
    // bank_statements is the trickier table — use period_end so a
    // statement counts in the window when its CYCLE ended in the
    // window, regardless of upload date.
    stmtQ = stmtQ.gte('period_end', sinceIso)
    feeQ = feeQ.gte('date', sinceIso)
    txnQ = txnQ.gte('date', sinceIso)
  }
  const [{ data: statements }, { data: fees }, { data: transactions }] = await Promise.all([
    stmtQ, feeQ, txnQ,
  ])

  // generateInsights drives the bankAccountTotals → summary + accounts
  // pipeline that computeWizardScore expects. We pass `sinceDate` so
  // the lib's period_start helper short-circuits to the cutoff we
  // already computed (rather than re-parsing a period key).
  const insightsBundle = generateInsights({
    statements: statements ?? [],
    fees: fees ?? [],
    transactions: transactions ?? [],
  }, sinceDate ?? 'lifetime')

  const { score, reasons } = computeWizardScore(insightsBundle)

  return NextResponse.json({
    scope: days > 0 ? { days, sinceDate: sinceIso } : 'lifetime',
    score,
    reasons,
    summary: insightsBundle.summary,
  })
}
