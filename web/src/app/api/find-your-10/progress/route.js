import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '../../../../lib/supabase/server'
import { find10Enabled, find10BackendAllowed, loadRecurringData } from '../../../../lib/find-your-10/integration'
import { applyProgress, emptyProgress } from '../../../../lib/find-your-10/progress.mjs'
import { reconcileProgress } from '../../../../lib/find-your-10/reconcile.mjs'
import { sameRequestOrigin } from '../../../../lib/find-your-10/local-boundary.mjs'
import { syncPlanShopping, prepareShoppingProvenance, ensurePlanShoppingStores } from '../../../../lib/find-your-10/shopping-plan.mjs'
import {PLAN_GOAL_OPERATIONS,ensurePlanGoal,planGoalValues} from '../../../../lib/find-your-10/plan-goal.mjs'
import {missingPlanLocation,PLAN_LOCATION_MESSAGE} from '../../../../lib/plan-location.mjs'

export async function POST(request) {
  if (!find10Enabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!sameRequestOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const backend = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!find10BackendAllowed()) return NextResponse.json({ error: 'Plan saving is not configured.' }, { status: 503 })
  try {
    const sb = createClient(), { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
    const operation = await request.json()
    if(PLAN_GOAL_OPERATIONS.includes(operation.type)&&missingPlanLocation(user.user_metadata).length)return NextResponse.json({error:PLAN_LOCATION_MESSAGE,code:'PLAN_LOCATION_REQUIRED',missing:missingPlanLocation(user.user_metadata)},{status:422})
    const { data: saved, error } = await sb.from('find10_progress').select('state').eq('user_id', user.id).maybeSingle()
    if (error) return NextResponse.json({ error: 'Your saved plan could not be loaded. Please retry.' }, { status: 503 })
    const before = saved?.state || emptyProgress()
    const records = await loadRecurringData(sb, user)
    const reconciled = reconcileProgress(before, records)
    const after = applyProgress(reconciled, operation, records)
    if (['quick-plan','savings-plan'].includes(operation.type)) await ensurePlanShoppingStores(sb, after, records)
    if(PLAN_GOAL_OPERATIONS.includes(operation.type)) planGoalValues(user.id,records,after)
    if (after === reconciled) {
      if(PLAN_GOAL_OPERATIONS.includes(operation.type)) await ensurePlanGoal(sb,user.id,records,after)
      if (['quick-plan','savings-plan','suggestion-feedback'].includes(operation.type)) await syncPlanShopping(sb, after, records, user.id, {insert:operation.type!=='suggestion-feedback'})
      return NextResponse.json({ ok: true, state: after })
    }
    if (['quick-plan','savings-plan'].includes(operation.type)) prepareShoppingProvenance(after, records, user.id)
    const admin = createAdmin(backend, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const result = await admin.rpc('save_find10_progress', { p_user_id: user.id, p_expected_version: before.version, p_state: after })
    if (result.error) throw new Error('Your change could not be saved.')
    if (!result.data) return NextResponse.json({ error: 'Your plan changed in another tab. Refresh before retrying.' }, { status: 409 })
    if(PLAN_GOAL_OPERATIONS.includes(operation.type)) await ensurePlanGoal(sb,user.id,records,after)
    if (['quick-plan','savings-plan','suggestion-feedback'].includes(operation.type)) await syncPlanShopping(sb, after, records, user.id, {insert:operation.type!=='suggestion-feedback'})
    return NextResponse.json({ ok: true, state: after })
  } catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? 'Invalid request.' : error.message || 'Could not save progress.' }, { status: error.status===409?409:400 }) }
}

export async function GET() {
  if (!find10Enabled()) return NextResponse.json({percent:null})
  const sb=createClient(),{data:{user}}=await sb.auth.getUser()
  if(!user)return NextResponse.json({percent:null},{status:401})
  const {goalPercentage}=await import('../../../../lib/find-your-10/definition.mjs')
  const {pendingTaskCount}=await import('../../../../lib/find-your-10/pending-tasks.mjs')
  const {data:progress,error}=await sb.from('find10_progress').select('state').eq('user_id',user.id).maybeSingle()
  if(error)return NextResponse.json({error:'Task count could not load'},{status:503})
  return NextResponse.json({pendingTasks:pendingTaskCount(progress?.state||{}),percent:goalPercentage(user.user_metadata?.find10_goal_pct)},{headers:{'Cache-Control':'no-store'}})
}
