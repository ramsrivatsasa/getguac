// POST /api/receipts/save
//
// THE one endpoint every client uses to persist a parsed receipt. Web,
// Android, iOS, and (eventually) the email poller all funnel through here
// so the pipeline (dedup → store resolve → Tier 2 → insert) runs in
// exactly one place.
//
// Idempotency
// -----------
// Clients with offline outboxes (mobile especially) retry after network
// returns. To make replay safe, they pass an `Idempotency-Key` header
// (any opaque string, typically a uuid generated when the user captured
// the receipt). If we've seen that key before for this user, we return
// the original result (same receipt_id, same merged flag) WITHOUT
// re-running the pipeline. Keys live for 7 days; after that the request
// is treated as new — by then the outbox should have given up anyway.
//
// Contract
// --------
// Request (JSON):
//   {
//     parsed: {...},                      // shape from /api/parse-receipt
//     receipt_link?: string,              // pre-uploaded Supabase storage URL
//     extra_page_urls?: string[],         // multi-page captures
//     business_purchase?: boolean,
//     validation_comment?: string,
//     user_category?: string,             // user picked a category in the form
//   }
//   Header (optional but recommended): Idempotency-Key: <opaque-string>
//
// Response:
//   { receipt_id: "uuid", merged: boolean, replayed?: true }
//
//   replayed=true means we returned a cached result from a prior call
//   with the same Idempotency-Key (offline outbox retry case).

import { rateLimit, rateKey } from '../../../../lib/apiGuard'
import { createApiClient } from '../../../../lib/supabase/server'
import { saveReceipt } from '../../../../lib/save-receipt'

export const runtime = 'nodejs'
export const maxDuration = 30

// 60 saves/min/user is generous for normal use + outbox flushes.
const RATE_LIMIT = { limit: 60, windowMs: 60_000 }

// Idempotency-Key is allowed to be 16–200 chars, alphanumeric + dash/underscore.
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{16,200}$/

export async function POST(request) {
  try {
    const rl = await rateLimit(rateKey(request, 'receipts-save'), RATE_LIMIT)
    if (!rl.ok) {
      return Response.json(
        { error: `Too many saves. Try again in ${rl.retryAfter}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      )
    }

    const supabase = createApiClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const userId = user.id

    let body
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || !body.parsed) {
      return Response.json({ error: 'Missing `parsed` in request body' }, { status: 400 })
    }

    // Idempotency check — replay protection for offline outbox retries.
    const rawKey = request.headers.get('Idempotency-Key') || request.headers.get('idempotency-key')
    let idempotencyKey = null
    if (rawKey) {
      if (!IDEMPOTENCY_KEY_RE.test(rawKey)) {
        return Response.json(
          { error: 'Idempotency-Key must be 16-200 chars of [A-Za-z0-9_-]' },
          { status: 400 },
        )
      }
      idempotencyKey = rawKey

      const { data: cached } = await supabase
        .from('idempotency_keys')
        .select('receipt_id, merged')
        .eq('user_id', userId)
        .eq('key', idempotencyKey)
        .maybeSingle()

      if (cached?.receipt_id) {
        return Response.json({
          receipt_id: cached.receipt_id,
          merged: Boolean(cached.merged),
          replayed: true,
        })
      }
    }

    let result
    try {
      result = await saveReceipt(supabase, userId, body.parsed, {
        receipt_link: body.receipt_link,
        extra_page_urls: body.extra_page_urls,
        business_purchase: body.business_purchase,
        validation_comment: body.validation_comment,
        user_category: body.user_category,
      })
    } catch (e) {
      console.error('[receipts/save] pipeline error:', e)
      return Response.json({ error: e.message || 'Save failed' }, { status: 500 })
    }

    // Record idempotency outcome so a retry of THIS save returns the
    // same receipt_id (instead of a no-op merge that might race with
    // post-save edits). Best-effort: if the insert races (two retries
    // arrive simultaneously) the unique constraint protects us — we
    // just log and continue.
    if (idempotencyKey) {
      await supabase
        .from('idempotency_keys')
        .insert({
          user_id: userId,
          key: idempotencyKey,
          receipt_id: result.receipt_id,
          merged: result.merged,
        })
        .then(() => {}, (e) => {
          if (e?.code !== '23505') console.warn('[receipts/save] idempotency record failed:', e.message)
        })
    }

    return Response.json({
      receipt_id: result.receipt_id,
      merged: result.merged,
    })
  } catch (err) {
    console.error('[receipts/save] unhandled:', err)
    return Response.json({ error: err.message || 'Save failed' }, { status: 500 })
  }
}
