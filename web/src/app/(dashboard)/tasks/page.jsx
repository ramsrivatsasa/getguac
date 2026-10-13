import {loadPlanPage} from '../../../lib/find-your-10/page-data'
import PlanTasks from '../../../components/PlanTasks'
import GuacMascot from '../../../components/GuacMascot'
export const dynamic='force-dynamic'
export default async function TasksPage(){
 const data=await loadPlanPage()
 return <div className="space-y-4"><header className="flex items-center gap-3"><GuacMascot size={56}/><div><h1 className="text-2xl font-bold">Tasks</h1><p className="text-sm text-slate-600">Your saved plan, ready to act on.</p></div></header><PlanTasks data={data} pendingOnly/></div>
}
