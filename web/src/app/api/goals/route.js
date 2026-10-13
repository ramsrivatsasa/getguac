import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

async function auth() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  return { sb, user }
}

export async function GET() {
  const { sb, user } = await auth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await sb.from('financial_goals').select('*').order('status').order('priority').order('target_date', { nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ goals: data || [] })
}

export async function POST(request) {
  const { sb, user } = await auth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const id = String(body.id || '')
  if (body.action === 'delete') {
    const { error } = await sb.from('financial_goals').delete().eq('id', id).eq('user_id', user.id)
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
  }
  if (body.action === 'status') {
    if (!['active', 'paused', 'completed'].includes(body.status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    const { error } = await sb.from('financial_goals').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
  }
  if (body.action === 'contribute') {
    const amount = Number(body.amount)
    if (!id || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Enter a valid contribution.' }, { status: 400 })
    const { data: goal, error: readError } = await sb.from('financial_goals').select('current_amount,target_amount').eq('id', id).eq('user_id', user.id).single()
    if (readError || !goal) return NextResponse.json({ error: readError?.message || 'Goal not found.' }, { status: 404 })
    const current = Number(goal.current_amount || 0)
    const target = Number(goal.target_amount || 0)
    const next = Math.min(target, current + amount)
    const { error } = await sb.from('financial_goals').update({ current_amount: next, status: next >= target ? 'completed' : 'active', updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true, current_amount: next, added: next - current })
  }
  const name = String(body.name || '').trim(); const target = Number(body.target_amount); const current = Number(body.current_amount || 0); const monthly = Number(body.monthly_contribution || 0)
  const type = String(body.goal_type || 'other'); const priority = Number(body.priority || 3)
  const types = ['emergency','debt','home','retirement','travel','education','vehicle','family','purchase','other']
  if (!name || !types.includes(type) || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0 || !Number.isFinite(monthly) || monthly < 0 || priority < 1 || priority > 5) return NextResponse.json({ error: 'Check the goal details.' }, { status: 400 })
  const values = { user_id: user.id, name, goal_type: type, target_amount: target, current_amount: current, monthly_contribution: monthly, target_date: body.target_date || null, priority, status: current >= target ? 'completed' : (body.status || 'active'), updated_at: new Date().toISOString() }
  const query = id ? sb.from('financial_goals').update(values).eq('id', id).eq('user_id', user.id) : sb.from('financial_goals').insert(values)
  const { error } = await query
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
}
