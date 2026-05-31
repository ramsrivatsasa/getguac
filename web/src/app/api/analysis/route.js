// GET /api/analysis?period=monthly&count=3
//
// Centralized dashboard-analysis endpoint. Returns the same eight
// summary metrics (current + prior + delta) that the web dashboard
// renders, computed via web/src/lib/analysisEngine.js. Mobile is
// expected to call this endpoint instead of re-implementing the
// math in Dart.
//
// Request:
//   query params:
//     period — 'daily' | 'weekly' | 'monthly' | 'yearly' (default 'monthly')
//     count  — number of period units (default 3)
//
// Response (200):
//   {
//     period, periodCount,
//     rangeStart, rangeEnd,
//     priorRangeStart, priorRangeEnd,
//     metrics: {
//       transactions, totalSpent, taxPaid, bankFees,
//       purchases, payments, interestPaid, feesPaid,
//     }
//   }
//
//   Each metric carries { current, prior, deltaPct, deltaArrow, deltaLabel }
//
// Auth: requires a valid Supabase session cookie. Returns 401
// without one. Row-level security in Supabase already scopes the
// data fetches to the current user, so this endpoint never sees
// anyone else's receipts/statements.

import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { computeDashboardAnalysis } from '../../../lib/analysisEngine'

const VALID_PERIODS = new Set(['daily', 'weekly', 'monthly', 'yearly'])

export async function GET(req) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const periodParam = searchParams.get('period') || 'monthly'
  const period = VALID_PERIODS.has(periodParam) ? periodParam : 'monthly'
  const countParam = parseInt(searchParams.get('count') || '3', 10)
  const periodCount = Number.isFinite(countParam) && countParam > 0 ? countParam : 3

  // Fire all four reads in parallel. RLS limits each to the caller's
  // own rows. Receipts column list mirrors the dashboard's server
  // fetch so the engine sees the same fields.
  const [{ data: receipts }, { data: statements }, { data: fees }, { data: transactions }] = await Promise.all([
    sb.from('receipts').select('id,store_name,date,total_amount,tax_paid,category,is_return').limit(5000),
    sb.from('bank_statements').select('*'),
    sb.from('bank_fees').select('*'),
    sb.from('bank_transactions').select('*'),
  ])

  const analysis = computeDashboardAnalysis({
    receipts: receipts ?? [],
    statements: statements ?? [],
    fees: fees ?? [],
    transactions: transactions ?? [],
    period,
    periodCount,
  })

  return NextResponse.json(analysis)
}
