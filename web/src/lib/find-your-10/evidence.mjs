import {usableReceipt} from './opportunities.mjs'
// Quick-plan evidence uses captured line items, not an entered savings amount.
export function evidenceAmount(choice, input, data, now) {
  if(input.comparable!==true)throw Error('Confirm the replacement serves the same purpose and quantity.')
  const item=(data.items||[]).find(i=>i.id===input.evidenceId)
  const baseline=(data.items||[]).find(i=>i.id===choice.sourceIds?.[0])
  if(!usableReceipt(item?.receipts)||!usableReceipt(baseline?.receipts))throw Error('Use reviewed purchase receipts with valid dates.')
  const date=String(item?.receipts?.date||'')
  if(!item||!baseline||(baseline.returned&&choice.mode!=='return_replace')||baseline.receipts?.is_return||!Number.isFinite(Number(baseline.price))||Number(baseline.price)<=0||Number(baseline.qty)<=0||item.returned||item.receipts?.is_return||Number(item.qty)!==1||!Number.isFinite(Number(item.price))||Number(item.price)<0||date< String(baseline.receipts?.date||'')||date>now.slice(0,10)||choice.sourceIds.includes(item.id))throw Error('Choose a later replacement line item for one comparable purchase.')
  const fees=String(input.fees??'0')
  if(!/^\d{1,7}(\.\d{1,2})?$/.test(fees))throw Error('Enter valid fees.')
  let baselineCents=Math.min(choice.baselineCents,Math.round(Number(baseline.price)/Number(baseline.qty)*100))
  if(choice.mode==='return_replace'){
    const refund=(data.items||[]).find(i=>i.id===input.refundId)
    if(!usableReceipt(refund?.receipts))throw Error('Use a reviewed refund receipt with a valid date.')
    if(!refund||!refund.receipts?.is_return||Number(refund.qty)!==1||!Number.isFinite(Number(refund.price))||String(refund.receipts.date)<String(baseline.receipts?.date||'')||String(refund.receipts.date)>now.slice(0,10))throw Error('Choose the captured refund line item.')
    baselineCents=Math.min(baselineCents,Math.round(Math.abs(Number(refund.price))*100))
  }
  return {amountCents:Math.max(0,baselineCents-Math.round(Number(item.price)*100)-Math.round(Number(fees)*100)),feeCents:Math.round(Number(fees)*100),period:date.slice(0,7)}
}
