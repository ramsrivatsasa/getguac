
import Link from 'next/link'
import { loadPlanPage } from '../../../../lib/find-your-10/page-data'
import Find10DashboardCard from '../../../../components/Find10DashboardCard'
import PlanTasks from '../../../../components/PlanTasks'
import SavedGroceryBasket from '../../../../components/SavedGroceryBasket'
export const dynamic = 'force-dynamic'
export default async function PlanDetailsPage() {
  const data=await loadPlanPage()
  return <div className="space-y-4"><Find10DashboardCard data={data} href="/my-plan" actionLabel="Edit plan"/><PlanTasks data={data}/><SavedGroceryBasket/><nav className="flex flex-wrap justify-between gap-3 text-sm font-semibold text-violet-700"><Link className="inline-flex min-h-11 items-center" href="/my-plan/settings">Goal & family →</Link></nav></div>
}
