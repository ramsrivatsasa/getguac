// GET /api/notify/dispatch
//
// Cron-driven notification dispatcher. Runs daily (see
// vercel.json), scans every active user against five trigger
// categories, and fires FCM pushes via `sendPushToUser`. De-dup
// is handled inside the sender via `notification_log` so the
// dispatcher itself is idempotent — re-running it the same day
// is safe.
//
// Categories:
//   1. rewards_expiring   — a reward expires in ≤ 7 days
//   2. return_window      — a returnable item's return-by date is tomorrow
//   3. bank_bite_digest   — weekly interest + fees recap (sent on Mondays)
//   4. anomaly_alert      — a category is spending >50% above its baseline
//   5. smashlist_day      — a predicted purchase day for a recurring store
//
// Auth: protected by the `CRON_SECRET` env var. Vercel cron is
// configured to send the secret as the Authorization header; any
// other caller without it gets 401.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '../../../../lib/fcm'
import { getCachedSearch } from '../../../../lib/shoppingCache'

// ── Auth helper ─────────────────────────────────────────────────────
function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

function verifyCron(req) {
  const expected = process.env.CRON_SECRET
  if (!expected) return true                          // dev mode — no secret set
  const hdr = req.headers.get('authorization') || ''
  return hdr === `Bearer ${expected}`
}

// Service-role client — bypasses RLS so we can scan every user's
// data in one pass.
function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// ── Trigger 1: rewards expiring within 7 days ───────────────────────
async function dispatchRewardsExpiring() {
  const today = new Date()
  const in7 = new Date(today)
  in7.setDate(in7.getDate() + 7)
  const todayStr = today.toISOString().slice(0, 10)
  const in7Str   = in7.toISOString().slice(0, 10)

  const { data: rewards } = await sb()
    .from('rewards')
    .select('id, user_id, reward_title, store_name, expiry_date')
    .gte('expiry_date', todayStr)
    .lte('expiry_date', in7Str)

  let attempted = 0, sent = 0
  for (const r of rewards || []) {
    const daysLeft = Math.max(1, Math.round((new Date(r.expiry_date) - today) / 86400000))
    const title = `🎁 ${r.store_name || 'Rewards'} expiring soon`
    const body  = `${r.reward_title || 'Your reward'} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
    attempted++
    const res = await sendPushToUser(r.user_id, {
      title, body, route: `/rewards/${r.id}`,
    }, {
      category: 'rewards_expiring',
      eventKey: `reward:${r.id}:expires-${r.expiry_date}`,
    })
    if (res.sent > 0) sent++
  }
  return { attempted, sent }
}

// ── Trigger 2: return window closing tomorrow ───────────────────────
async function dispatchReturnWindow() {
  // refund_policies has an expiry_date; receipts.is_return=false +
  // refund_policies.eligible=true means the item is still returnable.
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomStr = tomorrow.toISOString().slice(0, 10)

  const { data: policies } = await sb()
    .from('refund_policies')
    .select('id, receipt_id, expiry_date, days, eligible, receipts(user_id, store_name)')
    .eq('expiry_date', tomStr)
    .eq('eligible', true)

  let attempted = 0, sent = 0
  for (const p of policies || []) {
    const userId = p.receipts?.user_id
    if (!userId) continue
    const store = p.receipts?.store_name || 'A store'
    const title = `📦 ${store} return window closes tomorrow`
    const body  = `Your last day to return is ${p.expiry_date}. Take a look before it's gone.`
    attempted++
    const res = await sendPushToUser(userId, {
      title, body, route: `/returns`,
    }, {
      category: 'return_window',
      eventKey: `return:${p.id}:closes-${p.expiry_date}`,
    })
    if (res.sent > 0) sent++
  }
  return { attempted, sent }
}

// ── Trigger 3: bank-bite weekly digest (Mondays only) ───────────────
async function dispatchBankBiteDigest() {
  // Day of week: 0 = Sunday … 1 = Monday.
  const dow = new Date().getUTCDay()
  if (dow !== 1) return { attempted: 0, sent: 0, skipped: 'not Monday' }

  // Last 7 days of bank_fees per user. Sum interest + fees; if the
  // total > $0, send a recap.
  const sevenAgo = new Date()
  sevenAgo.setDate(sevenAgo.getDate() - 7)
  const sevenStr = sevenAgo.toISOString().slice(0, 10)

  const { data: fees } = await sb()
    .from('bank_fees')
    .select('user_id, kind, amount, date')
    .gte('date', sevenStr)

  const byUser = new Map()
  for (const f of fees || []) {
    const u = f.user_id
    if (!u) continue
    if (!byUser.has(u)) byUser.set(u, { interest: 0, fees: 0 })
    const v = Math.abs(Number(f.amount || 0))
    if (f.kind === 'interest') byUser.get(u).interest += v
    else if (f.kind === 'fee' || f.kind === 'penalty') byUser.get(u).fees += v
  }

  let attempted = 0, sent = 0
  const weekKey = sevenStr
  for (const [userId, totals] of byUser) {
    const total = totals.interest + totals.fees
    if (total <= 0) continue
    const title = `💸 $${total.toFixed(2)} lost to interest + fees`
    const body  = `Last 7 days: $${totals.interest.toFixed(2)} interest, $${totals.fees.toFixed(2)} fees. Tap to see the leak.`
    attempted++
    const res = await sendPushToUser(userId, {
      title, body, route: `/guacwizard`,
    }, {
      category: 'bank_bite_digest',
      eventKey: `digest:week-${weekKey}`,
    })
    if (res.sent > 0) sent++
  }
  return { attempted, sent }
}

// ── Trigger 4: spending anomaly alert ───────────────────────────────
async function dispatchAnomalyAlert() {
  // Lightweight rule: for each user, compute last-30d vs prior-30d
  // category totals; flag any category where current > 1.5× prior
  // AND current > $50 absolute floor. Send one push per user with
  // the worst offender.
  const today = new Date()
  const day30 = new Date(today); day30.setDate(day30.getDate() - 30)
  const day60 = new Date(today); day60.setDate(day60.getDate() - 60)
  const t = today.toISOString().slice(0, 10)
  const d30 = day30.toISOString().slice(0, 10)
  const d60 = day60.toISOString().slice(0, 10)

  // Pull receipts for the full 60-day window in one query, group
  // client-side. Limit 5000 — anyone with more is already in the
  // "needs server-side aggregate" territory; covered separately.
  const { data: receipts } = await sb()
    .from('receipts')
    .select('user_id, category, total_amount, date')
    .gte('date', d60)
    .lte('date', t)
    .limit(20000)

  const byUserCat = new Map() // user:cat -> { curr, prev }
  for (const r of receipts || []) {
    if (!r.user_id || !r.category) continue
    const k = `${r.user_id}:${r.category}`
    const amt = Number(r.total_amount || 0)
    if (amt <= 0) continue
    if (!byUserCat.has(k)) byUserCat.set(k, { curr: 0, prev: 0 })
    if (r.date >= d30) byUserCat.get(k).curr += amt
    else if (r.date >= d60) byUserCat.get(k).prev += amt
  }

  // Pick the worst offender per user.
  const worstByUser = new Map()
  for (const [k, v] of byUserCat) {
    const [userId, cat] = k.split(':')
    if (v.curr < 50 || v.prev < 1) continue
    const ratio = v.curr / v.prev
    if (ratio < 1.5) continue
    const score = (ratio - 1) * v.curr  // amount × intensity
    const prev = worstByUser.get(userId)
    if (!prev || score > prev.score) {
      worstByUser.set(userId, { cat, curr: v.curr, prev: v.prev, ratio, score })
    }
  }

  let attempted = 0, sent = 0
  for (const [userId, w] of worstByUser) {
    const pct = Math.round((w.ratio - 1) * 100)
    const title = `🚨 ${w.cat} spending spiked ${pct}%`
    const body  = `Last 30 days: $${w.curr.toFixed(2)} vs $${w.prev.toFixed(2)} prior. Worth a look?`
    attempted++
    const res = await sendPushToUser(userId, {
      title, body, route: `/reports`,
    }, {
      category: 'anomaly_alert',
      // De-dup per week so one persistent spike doesn't notify daily.
      eventKey: `anomaly:${w.cat}:week-${weekKeyFor(today)}`,
    })
    if (res.sent > 0) sent++
  }
  return { attempted, sent }
}

function weekKeyFor(d) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  // ISO-ish year-week — good enough for de-dup. Locale-agnostic.
  const onejan = new Date(t.getFullYear(), 0, 1)
  const week = Math.ceil((((t - onejan) / 86400000) + onejan.getDay() + 1) / 7)
  return `${t.getFullYear()}-w${week}`
}

// ── Trigger 5: smashlist day (predicted-purchase reminder) ──────────
async function dispatchSmashlistDay() {
  // Soft trigger — relies on the `shopping_list` table populated by
  // /api/smashlist/predict. We just pick rows where the next_due
  // is today (or within 2 days) and the user hasn't been pinged
  // already this week.
  const today = new Date()
  const in2 = new Date(today); in2.setDate(in2.getDate() + 2)
  const tStr = today.toISOString().slice(0, 10)
  const i2Str = in2.toISOString().slice(0, 10)

  let rows
  try {
    const { data } = await sb()
      .from('shopping_list')
      .select('id, user_id, store_name, item_name, next_due')
      .gte('next_due', tStr)
      .lte('next_due', i2Str)
    rows = data
  } catch {
    // Table or column may not exist in older deploys — skip silently.
    return { attempted: 0, sent: 0, skipped: 'shopping_list unavailable' }
  }

  let attempted = 0, sent = 0
  const weekKey = weekKeyFor(today)
  // Group by user so we send ONE push per user listing the top
  // store rather than spamming per-item.
  const byUser = new Map()
  for (const r of rows || []) {
    if (!r.user_id || !r.store_name) continue
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Map())
    const stores = byUser.get(r.user_id)
    stores.set(r.store_name, (stores.get(r.store_name) || 0) + 1)
  }
  for (const [userId, stores] of byUser) {
    // Pick the store with the most predicted items.
    let topStore = null, topN = 0
    for (const [s, n] of stores) if (n > topN) { topStore = s; topN = n }
    if (!topStore) continue
    const title = `🛒 ${topStore} day`
    const body  = topN === 1
      ? `1 item you usually buy is due. Tap to see your Smashlist.`
      : `$topN items you usually buy are due. Tap to see your Smashlist.`
    attempted++
    const res = await sendPushToUser(userId, {
      title, body, route: `/shopping`,
    }, {
      category: 'smashlist_day',
      eventKey: `smashlist:${topStore}:week-${weekKey}`,
    })
    if (res.sent > 0) sent++
  }
  return { attempted, sent }
}

// ── Trigger 6: new Steals found on saved searches ───────────────────
// Reads each user's saved-search results from the shared shopping_cache
// (warmed daily by /api/cron/shopping-cache — so this adds ZERO SerpApi
// calls) and counts on-sale items ("steals"). One digest push per user
// per day with the count.
async function dispatchStealsFound() {
  const todayStr = new Date().toISOString().slice(0, 10)

  const { data: saves } = await sb()
    .from('saved_searches')
    .select('user_id, query')
    .not('query', 'is', null)

  const byUser = new Map()  // userId → [query, …]
  for (const s of saves || []) {
    if (!s.user_id || !s.query) continue
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, [])
    byUser.get(s.user_id).push(s.query)
  }

  let attempted = 0, sent = 0
  for (const [userId, queries] of byUser) {
    let steals = 0
    const seen = new Set()
    for (const q of queries) {
      const payload = await getCachedSearch(q)   // cache only — no API call
      for (const r of payload?.results || []) {
        const price = Number(r.price) || 0
        const orig = Number(r.original_price) || 0
        if (orig > price && price > 0) {         // on sale = a steal
          const key = `${(r.title || r.matched_name || '').toLowerCase()}|${r.store}`
          if (!seen.has(key)) { seen.add(key); steals++ }
        }
      }
    }
    if (steals <= 0) continue
    const title = `🥑 ${steals} new Steal${steals === 1 ? '' : 's'} found`
    const body  = steals === 1
      ? '1 deal on your saved searches — tap to grab it.'
      : `${steals} deals on your saved searches — tap to see them.`
    attempted++
    const res = await sendPushToUser(userId, {
      title, body, route: '/steals',
    }, {
      category: 'steals_found',
      eventKey: `steals:${userId}:${todayStr}`,   // one per user per day
    })
    if (res.sent > 0) sent++
  }
  return { attempted, sent }
}

// ── Entry point ─────────────────────────────────────────────────────
export async function GET(req) {
  if (!verifyCron(req)) return unauthorized()

  const results = {}
  // Run sequentially so logs are linear and one failing trigger
  // doesn't break the others.
  try { results.rewards_expiring  = await dispatchRewardsExpiring() } catch (e) { results.rewards_expiring  = { error: e.message } }
  try { results.return_window     = await dispatchReturnWindow()    } catch (e) { results.return_window     = { error: e.message } }
  try { results.bank_bite_digest  = await dispatchBankBiteDigest()  } catch (e) { results.bank_bite_digest  = { error: e.message } }
  try { results.anomaly_alert     = await dispatchAnomalyAlert()    } catch (e) { results.anomaly_alert     = { error: e.message } }
  try { results.smashlist_day     = await dispatchSmashlistDay()    } catch (e) { results.smashlist_day     = { error: e.message } }
  try { results.steals_found      = await dispatchStealsFound()     } catch (e) { results.steals_found      = { error: e.message } }

  return NextResponse.json({ ok: true, results })
}
