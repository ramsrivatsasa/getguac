import {createHash} from 'node:crypto'
import {recurringAnalysis} from './recurring.mjs'
import {expenseComparison} from './expense-comparison.mjs'

export const PLAN_GOAL_OPERATIONS = ['quick-plan','bill-plan','savings-plan','cash-choice','cd-choice','investment-choice']
export function planGoalId(userId) {
 const hex=createHash('sha256').update(`getguac:savings-plan:${userId}`).digest('hex')
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`
}
export function planGoalValues(userId,records,state) {
 const plan=recurringAnalysis(records),expense=expenseComparison({...records,progress:state})
 const target=plan.incomeTargetCents||expense.plannedCents
 if(target<=0)throw Error('Add a savings target before saving your plan.')
 return {id:planGoalId(userId),user_id:userId,name:'My savings plan',goal_type:'other',target_amount:target/100,current_amount:0,monthly_contribution:expense.monthlyCents/100,priority:3,status:'active',notes:'Created from your saved plan. Planned savings are estimates, not goal contributions.'}
}
export async function ensurePlanGoal(sb,userId,records,state) {
 // Stable ID and ignoreDuplicates make retries safe and preserve edits made in Goals.
 const values=planGoalValues(userId,records,state)
 const {error}=await sb.from('financial_goals').upsert(values,{onConflict:'id',ignoreDuplicates:true})
 if(error)throw Error('Your plan was saved, but its linked goal could not be created. Retry Save to finish.')
 return values.id
}
