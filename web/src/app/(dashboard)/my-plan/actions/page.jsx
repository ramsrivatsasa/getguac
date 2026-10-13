import { loadPlanPage } from '../../../../lib/find-your-10/page-data'
import PlanActionItems from '../../../../components/PlanActionItems'
export const dynamic = 'force-dynamic'
export default async function ActionsPage() {
  return <PlanActionItems data={await loadPlanPage()} />
}
