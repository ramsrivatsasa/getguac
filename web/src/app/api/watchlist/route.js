import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { readWatchlists, changeWatchlists } from '../../../lib/watchlists.mjs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const sb = createClient(), { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to load your watchlist' }, { status: 401 })
  return NextResponse.json(readWatchlists(user.user_metadata), { headers: { 'Cache-Control': 'private, no-store' } })
}
export async function PUT(request) {
  const origin = request.headers.get('origin')
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin && new URL(origin).host !== request.headers.get('host')) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 }) }
    catch { return NextResponse.json({ error: 'Invalid origin' }, { status: 403 }) }
  }
  const sb = createClient(), { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save your watchlist' }, { status: 401 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  let state
  try { state = changeWatchlists(readWatchlists(user.user_metadata), body, crypto.randomUUID()) }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }) }
  const { error } = await sb.auth.updateUser({ data: { guac_watchlists: state.lists, guac_active_watchlist: state.activeId, guac_watchlist: state.symbols } })
  if (error) return NextResponse.json({ error: 'Watchlist could not be saved. Try again.' }, { status: 503 })
  return NextResponse.json(state, { headers: { 'Cache-Control': 'private, no-store' } })
}
