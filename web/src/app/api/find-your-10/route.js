import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { find10Enabled, find10BackendAllowed, loadRecurringData } from '../../../lib/find-your-10/integration'
import { CAPTURE_STEPS, incomeReady } from '../../../lib/find-your-10/recurring.mjs'
import { GOAL_PERCENTAGES } from '../../../lib/find-your-10/definition.mjs'
import { sameRequestOrigin } from '../../../lib/find-your-10/local-boundary.mjs'

export async function POST(request) {
  if (!find10Enabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!find10BackendAllowed()) return NextResponse.json({ error: 'Plan saving is not configured.' }, { status: 503 })
  if (!sameRequestOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const sb = createClient(); const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save your progress.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (body?.action === 'goal') {
    if (!GOAL_PERCENTAGES.includes(body.pct)) return NextResponse.json({ error: 'Choose a whole percentage from 10 to 20.' }, { status: 400 })
    const { error } = await sb.auth.updateUser({ data: { find10_goal_pct: body.pct } })
    return NextResponse.json(error ? { error: 'Your goal was not saved. Please retry.' } : { ok: true }, { status: error ? 503 : 200 })
  }
  if (body?.action === 'check-in') {
    if (!user.user_metadata?.find10_capture_completed_at) return NextResponse.json({ error: 'Finish initial capture review first.' }, { status: 400 })
    const date = new Date(); const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (body.month !== month) return NextResponse.json({ error: 'Reload to review the current month.' }, { status: 409 })
    const { error } = await sb.auth.updateUser({ data: { find10_last_check_in: month } })
    return NextResponse.json(error ? { error: 'Your check-in was not saved. Please retry.' } : { ok: true }, { status: error ? 503 : 200 })
  }
  if (!CAPTURE_STEPS.every(step => body?.reviewed?.[step.id] === true)) return NextResponse.json({ error: 'Review receipts, bills, additional payments and debt first.' }, { status: 400 })
  try {
    const data = await loadRecurringData(sb, user)
    if (!incomeReady(data.incomeSources)) return NextResponse.json({ error: 'Save your income information first.' }, { status: 400 })
    // The onboarding marker is not financial evidence and conveys no entitlement.
    // Existing income, receipt, bill and debt tables remain the sources of truth.
    const completed = user.user_metadata?.find10_capture_completed_at || new Date().toISOString()
    const { error } = await sb.auth.updateUser({ data: { find10_capture_completed_at: completed } })
    if (error) throw new Error('Your capture progress could not be saved. Please retry.')
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 503 }) }
}
