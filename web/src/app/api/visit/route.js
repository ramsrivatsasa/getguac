// POST /api/visit — the server half of the first-party visitor counter.
//
// The counter that migration_083 defines had no caller: applying the migration
// alone leaves both tables permanently empty. This is the caller.
//
// WHY FIRST-PARTY AT ALL: Vercel Analytics and PostHog both work, but both are
// a switch somebody else owns and an event cap somebody else sets. This one is
// ours — the numbers live in our database and are queryable with SQL.
//
// PRIVACY — the whole design is here, read it before changing anything:
//  - The visitor hash is computed on the SERVER, never sent by the browser. A
//    client-supplied id would be trivially forgeable and would also mean
//    shipping an identifier to the device, which is the thing we are avoiding.
//  - The hash is sha256(secret + today + ip + user-agent). The IP and the UA
//    are read, hashed and dropped inside this function; neither is ever
//    written anywhere, and there is no column in either table to put them in.
//  - `today` is inside the hash, so the salt effectively rotates daily. The
//    same person tomorrow hashes to something unrelated and cannot be joined
//    to today. That is deliberate: it makes cross-day tracking impossible even
//    for us, at the cost of not being able to report returning visitors.
//  - The response is always 204 with no body. A tracking endpoint must never
//    be able to answer questions about who else has visited.

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { rateLimit, rateKey } from '../../../lib/apiGuard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Obvious crawlers. This is a rough filter, not a security control — the point
// is to stop Googlebot and uptime checks from inflating a number a human is
// going to read and act on.
const BOT_RE = /bot|crawler|spider|crawling|slurp|bingpreview|headlesschrome|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|got\/|node-fetch|facebookexternalhit|preview/i

// Only real pages. Assets and API calls are not pageviews, and letting them
// through would bury /join under /favicon.ico.
const SKIP_RE = /^\/(api|_next|_vercel|embed|turnstile-embed)(\/|$)|\.[a-z0-9]+$/i

const NO_CONTENT = () => new Response(null, { status: 204 })

export async function POST(request) {
  // Every early return is 204, not an error: the caller is a fire-and-forget
  // beacon that must never surface a failure to the visitor, and a distinct
  // status code would tell a prober which requests were counted.
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return NO_CONTENT()

    // Development and Vercel preview traffic used to write into the same
    // production counter as customers, making QA indistinguishable from real
    // clicks. Count production traffic only. The hostname guard also covers a
    // production-mode server started locally.
    if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') return NO_CONTENT()
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const hostname = forwardedHost.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local')) return NO_CONTENT()

    const ua = request.headers.get('user-agent') || ''
    if (!ua || BOT_RE.test(ua)) return NO_CONTENT()

    // The native app's WebView renders these same pages. It has its own
    // analytics, and counting it here would double every mobile session.
    if (/(^|;\s*)guac_embedded=1(;|$)/.test(request.headers.get('cookie') || '')) return NO_CONTENT()

    const rl = await rateLimit(rateKey(request, 'visit'), { limit: 60, windowMs: 60_000 })
    if (!rl.ok) return NO_CONTENT()

    const body = await request.json().catch(() => null)
    let path = typeof body?.path === 'string' ? body.path : ''
    // Query strings are dropped, not stored: they carry UTM tags and, on some
    // routes, tokens and email addresses. Which PAGE the traffic landed on is
    // the question this table exists to answer, and the path alone answers it.
    path = path.split('?')[0].split('#')[0].trim()
    if (!path.startsWith('/') || path.length > 200 || SKIP_RE.test(path)) return NO_CONTENT()

    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || request.headers.get('x-real-ip')
      || ''

    // No IP and no UA means there is nothing to distinguish this visitor by.
    // Count the pageview, skip the unique — better an undercount of visitors
    // than every anonymous request collapsing into one shared hash.
    const day = new Date().toISOString().slice(0, 10)
    const secret = process.env.VISIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY
    const visitorHash = ip
      ? createHash('sha256').update(`${secret}|${day}|${ip}|${ua}`).digest('hex')
      : null

    const sb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    // record_visit is granted to service_role only and returns void.
    await sb.rpc('record_visit', { p_path: path, p_visitor_hash: visitorHash })

    return NO_CONTENT()
  } catch (err) {
    // Analytics must never break a page load, and a counter that throws in
    // logs all day is a counter nobody will keep.
    console.error('[api/visit]', err?.message || err)
    return NO_CONTENT()
  }
}
