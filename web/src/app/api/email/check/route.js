// Email-alias availability checker. Called as the user types in the picker.
//
// GET /api/email/check?alias=ram
//   → { alias: "ram", status: "available" | "taken" | "reserved" | "invalid",
//       suggestions: ["ram1", "ram_sa", "ram-7k4f"]?  (only when not available) }
//
// Suggestions are generated server-side using the user's profile (first name +
// last name when available) and a couple of numeric / random fallbacks.

import { createClient } from '../../../../lib/supabase/server'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'
export const runtime = 'nodejs'

const VALID_RE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$/

function sanitize(raw) {
  return String(raw || '').toLowerCase().trim().replace(/[^a-z0-9._-]/g, '')
}

function rand4() {
  return Math.random().toString(36).slice(2, 6)
}

async function suggestAlternatives(sb, base, profile) {
  const candidates = []
  const seen = new Set()
  const push = (a) => {
    if (!a || a.length < 3 || a.length > 32) return
    if (!VALID_RE.test(a)) return
    if (seen.has(a)) return
    seen.add(a)
    candidates.push(a)
  }

  // Use profile name when present
  const first = sanitize(profile?.first_name)
  const last  = sanitize(profile?.last_name)
  if (first)         push(first)
  if (last)          push(last)
  if (first && last) {
    push(`${first}${last}`)
    push(`${first}.${last}`)
    push(`${first}-${last}`)
    push(`${first.charAt(0)}${last}`)        // jdoe
    push(`${first}${last.charAt(0)}`)        // johnd
  }

  // Base + numeric/random suffixes
  for (let i = 1; i <= 5; i++) push(`${base}${i}`)
  push(`${base}-${rand4()}`)
  push(`${base}.${rand4()}`)
  push(`${base}_hq`)
  push(`real-${base}`)
  push(`the-${base}`)

  // Check availability in bulk — one query
  const lowered = candidates.map(c => c.toLowerCase())
  const [{ data: takenRows }, { data: reservedRows }] = await Promise.all([
    sb.from('profiles').select('email_alias').in('email_alias', lowered),
    sb.from('reserved_email_aliases').select('alias').in('alias', lowered),
  ])
  const taken    = new Set((takenRows    || []).map(r => r.email_alias?.toLowerCase()))
  const reserved = new Set((reservedRows || []).map(r => r.alias?.toLowerCase()))
  return candidates.filter(c => !taken.has(c.toLowerCase()) && !reserved.has(c.toLowerCase())).slice(0, 5)
}

export async function GET(request) {
  try {
    const rl = rateLimit(rateKey(request, 'email-check'), { limit: 60, windowMs: 60_000 })
    if (!rl.ok) return Response.json({ error: 'rate limited' }, { status: 429 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

    const url = new URL(request.url)
    const raw = url.searchParams.get('alias') || ''
    const alias = sanitize(raw)

    if (!alias) return Response.json({ alias: '', status: 'invalid' })

    const { data: status, error } = await sb.rpc('check_alias_available', { p_alias: alias })
    if (error) {
      console.error('[email/check]', error.message)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (status === 'available') {
      return Response.json({ alias, status: 'available', suggestions: [] })
    }

    // Suggestions only when not available
    const { data: profile } = await sb.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle()
    const suggestions = await suggestAlternatives(sb, alias, profile)
    return Response.json({ alias, status, suggestions })
  } catch (err) {
    console.error('[email/check]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
