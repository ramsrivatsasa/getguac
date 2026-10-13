import { randomBytes } from 'node:crypto'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '../../../../lib/supabase/server'
import { find10Enabled, loadRecurringData } from '../../../../lib/find-your-10/integration'
import { sameRequestOrigin, assertLocalBackend } from '../../../../lib/find-your-10/local-boundary.mjs'
import { progressTotals } from '../../../../lib/find-your-10/progress.mjs'
import { rateLimit, rateKey } from '../../../../lib/apiGuard'

async function context() {
  if (!find10Enabled()) throw Error('Not available')
  assertLocalBackend()
  const sb = createClient(), { data: { user } } = await sb.auth.getUser()
  if (!user) throw Error('Sign in first')
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const membership = await admin.from('find10_family_members').select('*').eq('user_id', user.id).maybeSingle()
  if (membership.error) throw Error('Family sharing could not be loaded')
  return { admin, user, membership: membership.data }
}
export async function GET() {
  try {
    const { admin, user, membership } = await context()
    if (!membership) return Response.json({ family: null })
    const { data: family, error } = await admin.from('find10_families').select('*').eq('id', membership.family_id).single()
    if (error) throw Error('Family goal unavailable')
    const members = await admin.from('find10_family_members').select('user_id,share_totals').eq('family_id', family.id)
    if (members.error) throw Error('Family totals unavailable')
    const shared = members.data.filter(m => m.share_totals).map(m => m.user_id)
    const date = new Date(), month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    let totals = { foundCents: 0, keptCents: 0 }
    if (shared.length) {
      const states = await admin.from('find10_progress').select('user_id').in('user_id', shared)
      if (states.error) throw Error('Family totals unavailable')
      for (const row of states.data) {
        const records = await loadRecurringData(admin, { id: row.user_id })
        if (!records.progress) throw Error('Family totals unavailable')
        const value = progressTotals(records.progress, month)
        totals.foundCents += value.foundCents; totals.keptCents += value.keptCents
      }
    }
    // Never return identities, income, individual contributions or raw records.
    return Response.json({ family: { name: family.name, inviteCode: family.owner_id === user.id ? family.invite_code : null, members: members.data.length, sharingMembers: shared.length, sharing: membership.share_totals, month, ...totals } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return Response.json({ error: e.message }, { status: 400 }) }
}
export async function POST(request) {
  if (!sameRequestOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 })
  const limit = await rateLimit(rateKey(request, 'find10-family'), { limit: 15, windowMs: 60000 })
  if (!limit.ok) return Response.json({ error: 'Please wait before trying again.' }, { status: 429 })
  try {
    const { admin, user, membership } = await context(), body = await request.json()
    if (body.action === 'sharing') {
      if (!membership || typeof body.enabled !== 'boolean') throw Error('Choose whether to share your totals')
      const result = await admin.from('find10_family_members').update({ share_totals: body.enabled }).eq('user_id', user.id)
      if (result.error) throw Error('Sharing preference was not saved')
    } else if (body.action === 'leave') {
      if (membership) {
        const family = await admin.from('find10_families').select('owner_id').eq('id', membership.family_id).single()
        if (family.error) throw Error('Family goal unavailable')
        if (family.data.owner_id === user.id) {
          const result = await admin.from('find10_families').delete().eq('id', membership.family_id).eq('owner_id', user.id)
          if (result.error) throw Error('Could not close this family group')
        } else {
          const result = await admin.from('find10_family_members').delete().eq('user_id', user.id)
          if (result.error) throw Error('Could not leave this family group')
        }
      }
    } else {
      if (membership) throw Error('Leave your existing family group first')
      if (body.shareTotals !== true) throw Error('Choose to share Found and Kept totals before joining')
      let familyId
      if (body.action === 'create') {
        const name = String(body.name || '').trim()
        if (!name || name.length > 60) throw Error('Enter a family goal name (up to 60 characters)')
        const result = await admin.from('find10_families').insert({ owner_id: user.id, name, invite_code: randomBytes(12).toString('hex') }).select('id').single()
        if (result.error) throw Error('Could not create the family goal')
        familyId = result.data.id
      } else if (body.action === 'join') {
        const code = String(body.code || '').trim().toLowerCase()
        if (!/^[a-f0-9]{24}$/.test(code)) throw Error('Check the family invitation code')
        const result = await admin.from('find10_families').select('id').eq('invite_code', code).maybeSingle()
        if (result.error || !result.data) throw Error('Invitation not found')
        familyId = result.data.id
      } else throw Error('Unknown family action')
      const joined = await admin.from('find10_family_members').insert({ user_id: user.id, family_id: familyId, share_totals: true })
      if (joined.error) {
        if (body.action === 'create') await admin.from('find10_families').delete().eq('id', familyId).eq('owner_id', user.id)
        throw Error('Could not join the family goal')
      }
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 400 }) }
}
