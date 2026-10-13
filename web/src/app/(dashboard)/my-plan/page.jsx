import { loadPlanPage } from '../../../lib/find-your-10/page-data'
import Find10Overview from '../../../components/Find10Overview'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export default async function PlanPage() {
  return <Find10Overview data={await loadPlanPage()} />
}
