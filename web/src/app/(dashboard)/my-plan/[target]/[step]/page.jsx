import { notFound, redirect } from 'next/navigation'
import BillPlan from '../../../../../components/BillPlan'
import { loadPlanPage } from '../../../../../lib/find-your-10/page-data'
import { WIZARD_TARGETS, WIZARD_STEPS } from '../../../../../lib/find-your-10/wizard.mjs'
import Find10Wizard from '../../../../../components/Find10Wizard'
export const dynamic = 'force-dynamic'
export default async function WizardPage({ params: routeParams, searchParams: queryParams }) {
  const params = await routeParams
  const searchParams = await queryParams
  if (!WIZARD_TARGETS.includes(params.target) || !WIZARD_STEPS.includes(params.step)) notFound()
  if(params.target==='earn')redirect('/my-plan/build-wealth')
  if(['cut','cheaper'].includes(params.target))redirect(['review','choices'].includes(params.step)?'/my-plan':'/my-plan/actions')
  if(params.target==='bills') {
    if(params.step!=='results')redirect('/my-plan/bills')
    return <BillPlan data={await loadPlanPage()} results/>
  }
  return <Find10Wizard key={`${params.target}/${params.step}`} data={await loadPlanPage()} target={params.target} step={params.step} selected={searchParams.item || ''} />
}
