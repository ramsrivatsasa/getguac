import { NextResponse } from 'next/server'
import { loadEarningsCalendar, normalizeEarnings } from '../../../../lib/earnings-calendar.mjs'
import { validSymbol, MARKET_SYMBOLS } from '../../../../lib/market-data.mjs'
export const dynamic = 'force-dynamic'
export async function GET(req) {
  const value = new URL(req.url).searchParams.get('symbols')
  const symbols = value == null ? MARKET_SYMBOLS.filter(s => !s.startsWith('^')) : value.split(',')
  if (symbols.length > 50 || !symbols.length || symbols.some(s => !validSymbol(s))) return NextResponse.json({ error: 'Choose up to 50 valid symbols' }, { status: 400 })
  const result = await loadEarningsCalendar()
  return NextResponse.json({ items: normalizeEarnings(result.rows, symbols), asOf: result.asOf, unavailable: result.unavailable, source: 'Finnhub', sourceUrl: 'https://finnhub.io/docs/api/earnings-calendar' }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
