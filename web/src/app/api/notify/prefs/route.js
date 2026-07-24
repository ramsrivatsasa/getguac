// GET  /api/notify/prefs  → current user's notification_prefs JSON
// POST /api/notify/prefs  → merge body into notification_prefs
//
// Used by both the web settings page and the mobile settings
// screen. Auth: Supabase session cookie (web) or bearer token
// (mobile). RLS on the profiles table scopes each request to its
// own row.

import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
export const dynamic = 'force-dynamic'

const VALID_KEYS = new Set([
  'rewards_expiring', 'return_window', 'bank_bite_digest',
  'anomaly_alert', 'smashlist_day', 'steals_found', 'reengagement',
  'quiet_hours', 'quiet_start', 'quiet_end',
])

export async function GET() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data, error } = await sb
    .from('profiles')
    .select('notification_prefs')
    .eq('id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prefs: data?.notification_prefs ?? {} })
}

export async function POST(req) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  // Whitelist incoming keys so the client can't write arbitrary
  // JSON into the profiles row.
  const sanitised = {}
  for (const [k, v] of Object.entries(body || {})) {
    if (!VALID_KEYS.has(k)) continue
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) {
      sanitised[k] = v
    }
  }

  // Merge with existing JSON so a partial body only updates the
  // keys the caller sent (rather than clobbering the rest).
  const { data: row } = await sb
    .from('profiles')
    .select('notification_prefs')
    .eq('id', user.id)
    .maybeSingle()
  const merged = { ...(row?.notification_prefs || {}), ...sanitised }

  const { error } = await sb
    .from('profiles')
    .update({ notification_prefs: merged })
    .eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, prefs: merged })
}
