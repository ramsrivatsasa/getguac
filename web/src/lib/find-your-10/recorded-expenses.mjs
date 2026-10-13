import {purchaseGroups,purchaseWindow} from './wizard.mjs'
import {usableItem,usableReceipt} from './opportunities.mjs'

// Receipt totals are visible even before item details are entered or extracted.
// They are display records, never invented comparison items or savings choices.
export function recordedExpenses(data, now=new Date()) {
  const itemReceipts=new Set((data.items||[]).filter(usableItem).map(row=>row.receipt_id))
  const today=now.toISOString().slice(0,10)
  const totals=(data.receipts||[]).filter(r=>usableReceipt(r)&&!r.is_return&&r.date<=today&&Number(r.total_amount)>0&&!itemReceipts.has(r.id))
  // One window for both itemized purchases and total-only receipts. Separate
  // fallbacks previously mixed recent items with months-old receipt totals.
  const window=purchaseWindow({items:[...(data.items||[]),...totals.map(r=>({id:r.id,receipt_id:r.id,item_name:'Receipt total',price:Number(r.total_amount),qty:1,receipts:r}))]},now)
  const inWindow=row=>row.receipts.date>window.start&&row.receipts.date<=window.end
  const groups=purchaseGroups(data,now).map(g=>({...g,rows:g.rows.filter(inWindow)})).filter(g=>g.rows.length)
  const receiptGroups=totals.filter(r=>r.date>window.start&&r.date<=window.end).map(r=>({key:`receipt:${r.id}`,title:'Receipt total',receiptTotal:true,rows:[{id:r.id,receipt_id:r.id,price:Number(r.total_amount),qty:1,receipts:r}]}))
  return {groups:[...groups,...receiptGroups],window}
}
