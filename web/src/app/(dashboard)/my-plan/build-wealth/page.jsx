import {redirect} from 'next/navigation'
import PlanTargetLinks from '../../../../components/PlanTargetLinks'
import Link from 'next/link'
import {loadPlanPage} from '../../../../lib/find-your-10/page-data'
import PlanPageHeader from '../../../../components/PlanPageHeader'
import WealthJourney from '../../../../components/WealthJourney'
import PlanDepositOptions from '../../../../components/PlanDepositOptions'
export const dynamic='force-dynamic'
export default async function Page({searchParams}){const query=await searchParams;if(query?.option==='investments')redirect('/my-plan/learn/results');const data=await loadPlanPage();return <div className="space-y-5"><PlanPageHeader title="Make your money work" subtitle="Compare options, choose what fits, and save it to your plan."/><PlanDepositOptions data={data} category={['cd','money-market'].includes(query?.option)?query.option:'savings'}/><details className="rounded-xl border border-violet-100 p-4"><summary className="flex min-h-11 cursor-pointer items-center font-bold text-violet-800">Your preferences & monthly progress</summary><WealthJourney data={data}/></details></div>}
