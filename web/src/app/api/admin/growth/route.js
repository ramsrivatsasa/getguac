// Admin-only Growth AI API.
// GET  -> privacy-safe aggregate acquisition/activation/notification metrics.
// POST -> generate an approval-ready growth plan and record its aggregate
//         outcome context so future runs can learn from what changed.

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createApiClient } from '../../../../lib/supabase/server'
import { generateGrowthPlan } from '../../../../lib/growth-agent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function requireAdmin() {
  const client = createApiClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: Response.json({ error: 'Not signed in' }, { status: 401 }) }
  const { data: profile } = await client.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return { error: Response.json({ error: 'Admin only' }, { status: 403 }) }
  return { user }
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function dayDiff(value) {
  return (Date.now() - Date.parse(value)) / 86_400_000
}

function unique(values) {
  return new Set((values || []).filter(Boolean)).size
}

function rate(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null
}

async function listAuthUsers(db) {
  const users = []
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const batch = data?.users || []
    users.push(...batch)
    if (batch.length < 1000) break
  }
  return users
}

function splitWindow(rows, valueForDate) {
  const current = []
  const previous = []
  for (const row of rows || []) {
    const age = dayDiff(valueForDate(row))
    if (age >= 0 && age < 30) current.push(row)
    else if (age >= 30 && age < 60) previous.push(row)
  }
  return { current, previous }
}

async function collectMetrics() {
  const db = serviceClient()
  const [trafficResult, pathsResult, authUsers, receiptsResult, notificationsResult, tokensResult, historyResult] = await Promise.all([
    db.rpc('site_traffic', { p_days: 60 }),
    db.rpc('site_top_paths', { p_days: 30, p_limit: 12 }),
    listAuthUsers(db),
    db.from('receipts').select('user_id, created_at').gte('created_at', isoDaysAgo(60)).limit(50_000),
    db.from('notification_log').select('user_id, category, sent_at').gte('sent_at', isoDaysAgo(60)).limit(50_000),
    db.from('push_tokens').select('user_id, platform, created_at').limit(50_000),
    db.from('audit_log').select('detail, created_at').eq('action', 'growth_agent_run').eq('status', 'ok').order('created_at', { ascending: false }).limit(5),
  ])

  const traffic = trafficResult.data || []
  const trafficWindows = splitWindow(traffic, (row) => `${row.day}T12:00:00Z`)
  const sumTraffic = (rows) => rows.reduce((acc, row) => ({
    views: acc.views + Number(row.views || 0),
    visitors: acc.visitors + Number(row.visitors || 0),
  }), { views: 0, visitors: 0 })

  const signups = splitWindow(authUsers, (user) => user.created_at)
  const receipts = receiptsResult.data || []
  const receiptWindows = splitWindow(receipts, (row) => row.created_at)
  const currentSignupIds = new Set(signups.current.map((user) => user.id))
  const previousSignupIds = new Set(signups.previous.map((user) => user.id))
  const activatedCurrent = new Set(receipts.filter((row) => currentSignupIds.has(row.user_id)).map((row) => row.user_id))
  const activatedPrevious = new Set(receipts.filter((row) => previousSignupIds.has(row.user_id)).map((row) => row.user_id))

  const notifications = notificationsResult.data || []
  const notificationWindows = splitWindow(notifications, (row) => row.sent_at)
  const tokenRows = tokensResult.data || []
  const byPlatform = {}
  for (const row of tokenRows) byPlatform[row.platform || 'unknown'] = (byPlatform[row.platform || 'unknown'] || 0) + 1

  const currentTraffic = sumTraffic(trafficWindows.current)
  const previousTraffic = sumTraffic(trafficWindows.previous)
  const metrics = {
    periodDays: 30,
    traffic: {
      current: currentTraffic,
      previous: previousTraffic,
      visitorChangePct: previousTraffic.visitors ? Math.round(((currentTraffic.visitors - previousTraffic.visitors) / previousTraffic.visitors) * 1000) / 10 : null,
      topPaths: pathsResult.data || [],
    },
    signups: {
      current: signups.current.length,
      previous: signups.previous.length,
      changePct: signups.previous.length ? Math.round(((signups.current.length - signups.previous.length) / signups.previous.length) * 1000) / 10 : null,
    },
    activation: {
      currentUsers: activatedCurrent.size,
      previousUsers: activatedPrevious.size,
      currentRate: rate(activatedCurrent.size, signups.current.length),
      previousRate: rate(activatedPrevious.size, signups.previous.length),
      receiptsCurrent: receiptWindows.current.length,
      receiptUsersCurrent: unique(receiptWindows.current.map((row) => row.user_id)),
    },
    notifications: {
      currentSent: notificationWindows.current.length,
      previousSent: notificationWindows.previous.length,
      reachedUsersCurrent: unique(notificationWindows.current.map((row) => row.user_id)),
      pushEnabledUsers: unique(tokenRows.map((row) => row.user_id)),
      tokensByPlatform: byPlatform,
    },
    tracking: {
      metaPixelConfigured: Boolean(process.env.NEXT_PUBLIC_FB_PIXEL_ID),
      metaConversionsConfigured: Boolean(process.env.NEXT_PUBLIC_FB_PIXEL_ID && process.env.FB_CAPI_TOKEN),
      firstPartyTrafficConfigured: !trafficResult.error,
    },
    collectedAt: new Date().toISOString(),
  }

  const history = (historyResult.data || []).map((row) => ({
    createdAt: row.created_at,
    summary: row.detail?.summary || '',
    provider: row.detail?.provider || '',
    metrics: row.detail?.metrics || {},
    campaign: row.detail?.campaign || {},
  }))
  const warnings = [trafficResult.error, pathsResult.error, receiptsResult.error, notificationsResult.error, tokensResult.error]
    .filter(Boolean)
    .map((error) => error.message)

  return { metrics, history, warnings }
}

function number(value, max = 10_000_000) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(0, parsed)) : 0
}

function cleanCampaign(body) {
  return {
    spend: number(body?.spend, 1_000_000),
    linkClicks: number(body?.linkClicks),
    landingPageViews: number(body?.landingPageViews),
    accountsCreated: number(body?.accountsCreated),
    firstReceipts: number(body?.firstReceipts),
    campaignName: String(body?.campaignName || '').trim().slice(0, 120),
    notes: String(body?.notes || '').trim().slice(0, 800),
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  try {
    const data = await collectMetrics()
    return Response.json(data)
  } catch (error) {
    console.error('[admin/growth] metrics failed:', error.message)
    return Response.json({ error: 'Could not collect growth metrics.', detail: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const body = await request.json().catch(() => ({}))
  const campaign = cleanCampaign(body)

  try {
    const { metrics, history, warnings } = await collectMetrics()
    const generated = await generateGrowthPlan({ metrics, campaign, history })
    const db = serviceClient()
    await db.from('audit_log').insert({
      user_id: auth.user.id,
      action: 'growth_agent_run',
      status: 'ok',
      detail: {
        provider: generated.provider,
        summary: generated.plan.summary,
        metrics: {
          visitors: metrics.traffic.current.visitors,
          signups: metrics.signups.current,
          activated: metrics.activation.currentUsers,
          activationRate: metrics.activation.currentRate,
        },
        campaign,
        plan: generated.plan,
      },
    })
    return Response.json({ ...generated, metrics, campaign, warnings, approvalRequired: true })
  } catch (error) {
    console.error('[admin/growth] generation failed:', error.message)
    return Response.json({ error: 'Growth AI could not generate a plan.', detail: error.message }, { status: 500 })
  }
}
