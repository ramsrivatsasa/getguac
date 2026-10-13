import {planTasks,planPeriod} from './lifecycle.mjs'
export function pendingBillTasks(state,period=planPeriod()) {
 return (state?.actions||[]).filter(a=>a.optionId&&a.accepted&&!a.completedAt&&!(state.ledger||[]).some(e=>e.actionId===a.id&&e.period===period&&e.verifiedAt&&!e.evidenceAdjusted))
}
export function pendingTaskCount(state,period=planPeriod()) {
 return planTasks(state,period).filter(t=>!t.completedAt).length+pendingBillTasks(state,period).length
}
