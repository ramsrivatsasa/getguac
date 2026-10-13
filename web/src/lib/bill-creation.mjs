export const BILL_TYPES = [['mortgage','Mortgage'],['car_payment','Car payment'],['utilities','Utilities'],['rent','Rent'],['insurance','Insurance'],['subscription','Subscription'],['loan','Loan'],['credit_card','Credit card'],['taxes','Taxes'],['other','Other']]

export function recurringDueDates(firstDueDate, cadence) {
  const start = new Date(`${firstDueDate}T12:00:00Z`)
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0,10) !== firstDueDate) throw Error('Choose a valid due date.')
  const count = {weekly:52,biweekly:26,monthly:12,quarterly:4,semiannual:2,annual:1,irregular:1}[cadence]
  if (!count) throw Error('Choose a valid frequency.')
  return Array.from({length:count},(_,index)=>{
    const date = new Date(start)
    if (['weekly','biweekly'].includes(cadence)) date.setUTCDate(date.getUTCDate()+index*(cadence==='weekly'?7:14))
    else {
      const month = start.getUTCMonth()+index*({monthly:1,quarterly:3,semiannual:6,annual:12,irregular:0}[cadence])
      date.setUTCDate(1);date.setUTCMonth(month)
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()
      date.setUTCDate(Math.min(start.getUTCDate(),lastDay))
    }
    return date.toISOString().slice(0,10)
  })
}

const checked = result => { if (result.error) throw result.error; return result.data }
export async function saveReadableBill(sb, userId, form, {seriesId,onSeries=()=>{}}={}) {
  const dates = recurringDueDates(form.dueDate,form.cadence), amount = Number(form.amount)
  if (!form.name.trim() || !Number.isFinite(amount) || amount<0 || !BILL_TYPES.some(([type])=>type===form.billType)) throw Error('Enter a bill name, type, amount and due date.')
  // Allocate and retain identity before writing. A lost insert response or
  // reload during cycle creation must not create a second recurring bill.
  seriesId ||= crypto.randomUUID(); onSeries(seriesId)
  checked(await sb.from('bill_series').upsert({id:seriesId,user_id:userId,name:form.name.trim(),provider:form.name.trim(),bill_type:form.billType,cadence:form.cadence,expected_amount:amount,next_due_date:form.dueDate,autopay:form.autopay,source:'manual'},{onConflict:'id',ignoreDuplicates:true}))
  checked(await sb.from('bill_series').select('id').eq('id',seriesId).eq('user_id',userId).single())
  checked(await sb.from('bill_cycles').upsert(dates.map(due_date=>({user_id:userId,bill_series_id:seriesId,due_date,expected_amount:amount,status:form.autopay?'autopay_scheduled':'upcoming'})),{onConflict:'bill_series_id,due_date',ignoreDuplicates:true}))
  const cycles=checked(await sb.from('bill_cycles').select('id,bill_series_id,due_date,expected_amount,statement_amount,paid_amount,status,bill_series(name,cadence,bill_type)').eq('bill_series_id',seriesId).eq('user_id',userId).order('due_date'))
  if(!cycles || dates.some(date=>!cycles.some(c=>c.due_date===date))) throw Error('This bill was saved, but its calendar entries could not be loaded. Retry saving to load them; your bill will not be duplicated.')
  return {seriesId,cycles}
}
