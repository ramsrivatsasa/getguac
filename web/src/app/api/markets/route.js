import { NextResponse } from 'next/server'
import { createApiClient } from '../../../lib/supabase/server'
import { getMarketChart, MARKET_SYMBOLS, PERIODS, validSymbol } from '../../../lib/market-data.mjs'
export const dynamic = 'force-dynamic'
export async function GET(request) {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view markets' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const period = params.get('period') || '1D'
  const symbols = [...new Set((params.get('symbols') || MARKET_SYMBOLS.join(',')).split(',').map(s => s.trim().toUpperCase()))]
  if (!PERIODS[period] || symbols.length > 50 || !symbols.length || symbols.some(s => !validSymbol(s))) return NextResponse.json({ error: 'Invalid symbol or period' }, { status: 400 })
  const results = []
  // Bound provider concurrency and preserve per-symbol failures.
  for (let i = 0; i < symbols.length; i += 6) results.push(...await Promise.all(symbols.slice(i, i + 6).map(async symbol => {
    try { return await getMarketChart(symbol, period) } catch { return { symbol, error: 'Quote unavailable' } }
  })))
  return NextResponse.json({ quotes: results }, { headers: { 'Cache-Control': 'private, no-store' } })
}
