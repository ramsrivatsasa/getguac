import { loadPlanPage } from '../../../../lib/find-your-10/page-data'
import { recurringAnalysis } from '../../../../lib/find-your-10/recurring.mjs'
import PlanPreferences from '../../../../components/PlanPreferences'
import PlanFamily from '../../../../components/PlanFamily'
import PlanCaptureReview from '../../../../components/PlanCaptureReview'
export const dynamic = 'force-dynamic'
export default async function Settings() {
  const data = await loadPlanPage()
  return <div className="mx-auto max-w-3xl space-y-5"><h1 className="text-3xl font-black">Goal & family</h1><PlanPreferences plan={recurringAnalysis(data)} lastCheckIn={data.lastCheckIn} /><PlanCaptureReview data={data} /><PlanFamily /></div>
}

