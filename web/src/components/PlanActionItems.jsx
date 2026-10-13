import PlanSavingsSummary from './PlanSavingsSummary'
import {expenseComparison} from '../lib/find-your-10/expense-comparison.mjs'
import PlanPageHeader from './PlanPageHeader'
import PlanTasks from './PlanTasks'
export default function PlanActionItems({data}) {
 return <div className="space-y-5"><PlanPageHeader title="Expenses & bills" subtitle="Follow your saved actions and verify your savings."/><PlanSavingsSummary expense={expenseComparison(data)}/><PlanTasks data={data}/></div>
}
