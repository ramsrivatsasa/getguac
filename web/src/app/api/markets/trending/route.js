import { NextResponse } from 'next/server'
import { createApiClient } from '../../../../lib/supabase/server'
import { getMarketChart, validSymbol } from '../../../../lib/market-data.mjs'
export const dynamic = 'force-dynamic'
let snapshot
export async function GET() {
  const sb = await createApiClient(), { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to view markets' }, { status: 401 })
  try {
    if (snapshot && Date.now() - snapshot.fetchedAt < 300000) return NextResponse.json(snapshot)
    const response = await fetch('https://query1.finance.yahoo.com/v1/finance/trending/US', { cache: 'no-store', signal: AbortSignal.timeout(9000) })
    if (!response.ok) throw new Error('Trending unavailable')
    const feed = (await response.json()).finance?.result?.[0]
    const symbols = [...new Set((feed?.quotes || []).map(q => q.symbol).filter(validSymbol))].slice(0, 20)
    const quotes = []
    for (let i = 0; i < symbols.length; i += 5) {
      const batch = await Promise.allSettled(symbols.slice(i, i + 5).map(symbol => getMarketChart(symbol)))
      quotes.push(...batch.filter(r => r.status === 'fulfilled' && r.value.price !== null).map(r => r.value))
    }
    snapshot = { quotes, source: 'Yahoo Finance', region: 'US', asOf: feed?.jobTimestamp || null, fetchedAt: Date.now() }
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ quotes: [], error: 'Trending data unavailable' }, { status: 503 }) }
}
