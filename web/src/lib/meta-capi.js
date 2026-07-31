// Meta Conversions API — server-side conversion events.
//
// WHY THIS EXISTS: /join's primary control is "Continue with Google", and that
// path deliberately fires NO browser-side conversion event (see the note in
// JoinClient.jsx around the oauth() handler). Two reasons it can't: the click
// hands off to Google BEFORE consent, so a fire there counts abandoned
// consent screens as signups; and the same button signs EXISTING users in,
// so it counted every returning user as a fresh registration.
//
// The account is actually created in /auth/callback — a server route — so
// that is where the event belongs. That is also what the comment in
// JoinClient.jsx prescribes: "Closing that gap means the Conversions API,
// not a tracker on a signed-in page."
//
// Consequence of NOT having this: Meta optimises delivery toward whatever it
// can measure, which was landing-page views. It had no signup signal to learn
// from, and there was no way to tell "nobody signed up" apart from "people
// signed up and we never logged it".
//
// INERT until FB_CAPI_TOKEN is set in the environment. Merging this changes
// nothing until the token is pasted into Vercel — the same pattern MetaPixel
// uses for NEXT_PUBLIC_FB_PIXEL_ID.
//
// ⚠️ FB_CAPI_TOKEN must NOT carry the NEXT_PUBLIC_ prefix. That prefix inlines
// the value into the client bundle at build time (the pixel ID is inlined that
// way today and is readable in /_next/static/chunks/app/join/page-*.js), which
// would hand every visitor a token that can write events to the ad account.

import crypto from 'crypto'

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || ''
const TOKEN = process.env.FB_CAPI_TOKEN || ''
const API_VERSION = 'v21.0'

// Meta requires PII hashed with SHA-256, lowercased and whitespace-trimmed.
// Anything unhashed is rejected for the whole event, not just the field.
function hashed(value) {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return undefined
  return crypto.createHash('sha256').update(v).digest('hex')
}

// Pull one cookie out of a raw Cookie header. We want _fbc and _fbp: the
// click ID and browser ID the pixel drops on /join. Without them Meta has to
// fall back to the hashed email alone and attribution to the ad gets much
// weaker — these are what tie the signup back to the click that paid for it.
function readCookie(cookieHeader, name) {
  if (!cookieHeader) return undefined
  for (const part of String(cookieHeader).split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || undefined
  }
  return undefined
}

// The client IP as seen through Vercel's proxy. x-forwarded-for is a list;
// the left-most entry is the original client.
function clientIp(headers) {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || undefined
}

/**
 * Send one server-side conversion event. Never throws and never blocks the
 * caller for long — a signup must not fail or stall because an ad tracker
 * is down.
 *
 * @param {string} eventName        e.g. 'CompleteRegistration'
 * @param {object} opts
 * @param {Request} opts.request    the incoming request (for IP / UA / cookies)
 * @param {string} [opts.email]     raw email; hashed here, never sent in clear
 * @param {string} [opts.externalId] stable user id; hashed here
 * @param {string} [opts.sourceUrl] the URL the conversion happened on
 * @param {string} [opts.eventId]   dedupe key, if a browser event may also fire
 * @param {object} [opts.customData] e.g. { method: 'google' }
 */
export async function trackServerEvent(eventName, opts = {}) {
  // Inert without both halves of the config. Returning a flag rather than
  // nothing so callers can log the reason when debugging a missing event.
  if (!PIXEL_ID || !TOKEN) return { sent: false, reason: 'not-configured' }

  const { request, email, externalId, sourceUrl, eventId, customData } = opts

  try {
    const headers = request?.headers
    const cookieHeader = headers?.get('cookie')

    const userData = {
      em: hashed(email) ? [hashed(email)] : undefined,
      external_id: hashed(externalId) ? [hashed(externalId)] : undefined,
      client_ip_address: headers ? clientIp(headers) : undefined,
      client_user_agent: headers?.get('user-agent') || undefined,
      fbc: readCookie(cookieHeader, '_fbc'),
      fbp: readCookie(cookieHeader, '_fbp'),
    }

    // Meta rejects an event with no identifier at all. If we somehow have
    // neither an email nor a browser cookie there is nothing to attribute,
    // so drop it rather than spend a request on a guaranteed error.
    if (!userData.em && !userData.external_id && !userData.fbp && !userData.fbc) {
      return { sent: false, reason: 'no-identifier' }
    }

    const payload = {
      data: [{
        event_name: eventName,
        // Seconds, not milliseconds. Meta silently drops events dated more
        // than 7 days back, and a ms timestamp reads as the year 57000.
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: sourceUrl || undefined,
        event_id: eventId || undefined,
        user_data: userData,
        custom_data: customData || undefined,
      }],
    }

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // A signup redirect must not wait on Meta. If the API is slow we
        // abandon the event; losing a conversion data point is strictly
        // better than making the user stare at a hanging OAuth redirect.
        signal: AbortSignal.timeout(2500),
      }
    )

    if (!res.ok) {
      // Body carries Meta's actual complaint (bad token, malformed hash,
      // wrong pixel). Worth logging — a silently rejected event looks
      // identical to no signups at all, which is the exact confusion this
      // whole module exists to end.
      const body = await res.text().catch(() => '')
      console.error(`[meta-capi] ${eventName} rejected (${res.status}):`, body.slice(0, 400))
      return { sent: false, reason: `http-${res.status}` }
    }

    return { sent: true }
  } catch (err) {
    console.error(`[meta-capi] ${eventName} failed:`, err?.message || err)
    return { sent: false, reason: 'exception' }
  }
}
