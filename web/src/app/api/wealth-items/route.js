import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

async function auth() { const sb = createClient(); const { data: { user } } = await sb.auth.getUser(); return { sb, user } }
export async function GET() {
  const { sb, user } = await auth(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [assets, debts] = await Promise.all([sb.from('wealth_accounts').select('*').eq('is_active', true).order('balance', { ascending: false }), sb.from('debt_accounts').select('*').eq('is_active', true).order('apr', { ascending: false })])
  const error = assets.error || debts.error
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ assets: assets.data || [], debts: debts.data || [] })
}
export async function POST(request) {
  const { sb, user } = await auth(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json().catch(() => ({})); const id = String(b.id || ''); let error
  if (b.action === 'delete-asset') ({ error } = await sb.from('wealth_accounts').delete().eq('id', id).eq('user_id', user.id))
  else if (b.action === 'delete-debt') ({ error } = await sb.from('debt_accounts').delete().eq('id', id).eq('user_id', user.id))
  else if (b.kind === 'asset') {
    const balance = Number(b.balance); const types = ['checking','savings','investment','retirement','home','vehicle','business','other_asset']
    if (!String(b.name || '').trim() || !types.includes(b.account_type) || !Number.isFinite(balance) || balance < 0) return NextResponse.json({ error: 'Check the asset details.' }, { status: 400 })
    const values = { user_id: user.id, name: b.name.trim(), account_type: b.account_type, balance, updated_at: new Date().toISOString() }
    ;({ error } = id ? await sb.from('wealth_accounts').update(values).eq('id', id).eq('user_id', user.id) : await sb.from('wealth_accounts').insert(values))
  } else if (b.kind === 'debt') {
    const balance = Number(b.balance), apr = Number(b.apr || 0), minimum = Number(b.minimum_payment || 0), extra = Number(b.extra_payment || 0); const types = ['credit_card','student','auto','mortgage','personal','medical','other']
    if (!String(b.name || '').trim() || !types.includes(b.debt_type) || ![balance,apr,minimum,extra].every(Number.isFinite) || balance < 0 || apr < 0 || apr > 100 || minimum < 0 || extra < 0) return NextResponse.json({ error: 'Check the debt details.' }, { status: 400 })
    const values = { user_id: user.id, name: b.name.trim(), debt_type: b.debt_type, balance, apr, minimum_payment: minimum, extra_payment: extra, due_day: b.due_day ? Number(b.due_day) : null, updated_at: new Date().toISOString() }
    ;({ error } = id ? await sb.from('debt_accounts').update(values).eq('id', id).eq('user_id', user.id) : await sb.from('debt_accounts').insert(values))
  } else return NextResponse.json({ error: 'Unknown item.' }, { status: 400 })
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
}
