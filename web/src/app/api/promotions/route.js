import { NextResponse } from 'next/server'
import { createApiClient } from '../../../lib/supabase/server'
import { currentPromotions } from '../../../lib/promotion-presentation.mjs'
import { safeOfferUrl } from '../../../lib/promotion-presentation.mjs'
import { publicPromotionCatalog } from '../../../lib/public-promotion-catalog.mjs'

async function session() {
  const sb = await createApiClient()
  const { data: { user } } = await sb.auth.getUser()
  return { sb, user }
}

export async function GET(request) {
  const { sb, user } = await session()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || 'active,review'
  const search = url.searchParams.get('q')?.trim()
  let query = sb.from('promotions').select('*,stores(id,store_name)').eq('user_id', user.id).in('status', status.split(',').filter(value => ['active', 'review', 'dismissed', 'expired'].includes(value))).order('expires_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(200)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const catalog = await publicPromotionCatalog(sb, user)
  let publicRows = []
  if (catalog.length && status.split(',').includes('active')) {
    const existing = await sb.from('promotions').select('source_ref').eq('user_id', user.id).eq('source', 'ai').in('source_ref', catalog.map(offer => offer.source_ref))
    if (!existing.error) { const saved = new Set((existing.data || []).map(offer => offer.source_ref)); publicRows = catalog.filter(offer => !saved.has(offer.source_ref)).map(offer => ({ ...offer, id: `public:${offer.source_ref}` })) }
  }
  const terms = (search || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const matched = [...(data || []), ...publicRows].filter(row => { const text = [row.merchant_name, row.title, row.description].join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, ''); return terms.every(term => text.includes(term)) })
  return NextResponse.json({ promotions: currentPromotions(matched) })
}

export async function PATCH(request) {
  const { sb, user } = await session()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.id || !['active','review','dismissed'].includes(body.status)) return NextResponse.json({ error: 'Invalid promotion update.' }, { status: 400 })
  if (typeof body.id === 'string' && body.id.startsWith('public:')) {
    const catalog = await publicPromotionCatalog(sb, user)
    const source = catalog.find(offer => offer.source_ref === body.id.slice(7))
    if (!source) return NextResponse.json({ error: 'This public offer is no longer available.' }, { status: 409 })
    const { error } = await sb.from('promotions').upsert({ ...source, user_id: user.id, status: body.status }, { onConflict: 'user_id,source,source_ref', ignoreDuplicates: true })
    return error ? NextResponse.json({ error: 'Offer choice could not be saved.' }, { status: 503 }) : NextResponse.json({ ok: true })
  }
  const existing = await sb.from('promotions').select('*').eq('id', body.id).eq('user_id', user.id).maybeSingle()
  if (existing.error) return NextResponse.json({ error: 'Offer could not be checked.' }, { status: 503 })
  if (!existing.data) return NextResponse.json({ error: 'Offer not found.' }, { status: 404 })
  const offer = existing.data
  if (body.status === 'active' && (!currentPromotions([offer]).length || !offer.benefit_text || !offer.merchant_name || !(safeOfferUrl(offer.redemption_url || offer.source_url) || offer.promo_code))) return NextResponse.json({ error: 'This offer needs an actionable benefit and redemption details before it can be kept.' }, { status: 400 })
  const patch = { status: body.status, updated_at: new Date().toISOString() }
  if (body.status === 'active') patch.metadata = { ...(offer.metadata || {}), kept_by_user_at: patch.updated_at }
  const { error } = await sb.from('promotions').update(patch).eq('id', body.id).eq('user_id', user.id)
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true })
}

