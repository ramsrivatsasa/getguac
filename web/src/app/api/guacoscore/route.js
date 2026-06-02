// GET /api/guacoscore?days=30
//
// Single canonical GuacScore endpoint shared by web (indirectly — web
// imports the lib directly) and mobile (calls this endpoint). Same
// engine, same numbers, no JS-vs-Dart drift.
//
// Source of truth lives in web/src/lib/guacoscore.js. This route
// wires the lib to a Supabase-authenticated HTTP surface so iOS /
// Android can compute identical scores without porting the math.
//
// Mirrors the /api/analysis pattern: the math is in the lib, the
// API is a thin shell that does auth + fetch + call. RLS limits
// each fetch to the caller's own rows.
//
// Request:
//   query params:
//     days — number; window of receipts + bank-fees to score.
//            Omitted or 0 → lifetime (matches dashboard tile).
//            30/90/365 etc. → trailing window (matches /guacanomics).
//
// Response (200):
//   {
//     scope: 'lifetime' | { days, sinceDate },
//     score, grade, ratedCount, weightedSpend, bankPenalty,
//     bankBite: { interest, fees, total },
//   }
//
// Auth: requires a valid Supabase session cookie. 401 without one.

import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { calculateGuacoScore } from '../../../lib/guacoscore'
import { isPaymentReceipt } from '../../../lib/payment-rows'

export async function GET(req) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const daysRaw = parseInt(searchParams.get('days') || '0', 10)
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 0
  // Snap the cutoff to midnight so the boundary doesn't depend on
  // the wall-clock time of the request (mirrors the same fix the
  // /guacanomics page applies client-side).
  let sinceDate = null
  if (days > 0) {
    const d = new Date(Date.now() - days * 86400000)
    d.setHours(0, 0, 0, 0)
    sinceDate = d
  }
  const sinceIso = sinceDate ? sinceDate.toISOString().slice(0, 10) : null

  // Fetch receipts + bank fees in parallel. RLS scopes both to the
  // current user. We only need the columns calculateGuacoScore +
  // isPaymentReceipt actually read.
  let receiptsQuery = sb
    .from('receipts')
    .select('id,store_name,date,total_amount,is_payment,rating')
    .limit(5000)
  let feesQuery = sb
    .from('bank_fees')
    .select('kind, amount, date')
  if (sinceIso) {
    receiptsQuery = receiptsQuery.gte('date', sinceIso)
    feesQuery = feesQuery.gte('date', sinceIso)
  }
  const [{ data: receipts }, { data: bankFees }] = await Promise.all([
    receiptsQuery, feesQuery,
  ])

  const spending = (receipts || []).filter(r => !isPaymentReceipt(r))

  let interest = 0, fees = 0
  for (const f of (bankFees || [])) {
    const v = Math.abs(Number(f.amount || 0))
    if (f.kind === 'interest') interest += v
    else if (f.kind === 'fee' || f.kind === 'penalty') fees += v
  }
  const bankBite = { interest, fees, total: interest + fees }

  const result = calculateGuacoScore(spending, { bankBite })

  return NextResponse.json({
    scope: days > 0 ? { days, sinceDate: sinceIso } : 'lifetime',
    score: result.score,
    grade: result.grade,
    ratedCount: result.ratedCount,
    weightedSpend: result.weightedSpend,
    bankPenalty: result.bankPenalty,
    bankBite,
  })
}
