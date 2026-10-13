'use client'
import {useState} from 'react'
import {usableReceipt} from '../lib/find-your-10/opportunities.mjs'
import Link from 'next/link'
import {money} from '../lib/find-your-10/wizard.mjs'
export default function PlanEvidence({task,data,state,onSaved}) {
  const [item,setItem]=useState(''),[refund,setRefund]=useState(''),[fees,setFees]=useState('0'),[comparable,setComparable]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const recorded=state.ledger?.find(l=>l.taskId===task.id)
  if(recorded)return <p>Verified: {money(recorded.amountCents)}</p>
  const choice=state.quickPlan?.choices?.find(c=>c.id===task.choiceId)
  const source=(data.items||[]).find(i=>choice?.sourceIds?.includes(i.id))
  const today=new Date().toISOString().slice(0,10)
  const used=new Set((state.ledger||[]).flatMap(entry=>[entry.evidenceId,entry.refundId]).filter(Boolean))
  const choices=(data.items||[]).filter(i=>Number(i.qty)===1&&!i.returned&&usableReceipt(i.receipts)&&!choice?.sourceIds?.includes(i.id)&&!used.has(i.id)&&i.receipts.date>=(source?.receipts?.date||'')&&i.receipts.date<=today)
  async function save(){
    setBusy(true);setError('')
    try{
      const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),version:state.version,type:'quick-evidence',data:{taskId:task.id,evidenceId:item,refundId:refund||null,fees,comparable}})})
      const result=await response.json();if(!response.ok)throw Error(result.error)
      onSaved(result.state);window.dispatchEvent(new Event('plan-updated'))
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const selectStyle='my-1 block min-h-11 w-full rounded border border-violet-200 bg-white px-2 text-sm'
  return <details><summary>Verify actual savings</summary><label>Replacement receipt item<select className={selectStyle} value={item} onChange={e=>setItem(e.target.value)}><option value="">Choose recorded purchase</option>{choices.filter(i=>!i.receipts?.is_return).map(i=><option key={i.id} value={i.id}>{i.item_name} · {money(Math.round(i.price*100))} · {i.receipts?.date}</option>)}</select></label>{task.mode==='return_replace'&&<label>Refund receipt item<select className={selectStyle} value={refund} onChange={e=>setRefund(e.target.value)}><option value="">Choose recorded refund</option>{choices.filter(i=>i.receipts?.is_return).map(i=><option key={i.id} value={i.id}>{i.item_name} · {money(Math.abs(Math.round(i.price*100)))}</option>)}</select></label>}<label>Extra fees ($)<input className={selectStyle} type="number" min="0" step="0.01" value={fees} onChange={e=>setFees(e.target.value)}/></label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={comparable} onChange={e=>setComparable(e.target.checked)}/>Same purpose and quantity; all costs included</label><button disabled={busy||!comparable||!item||(task.mode==='return_replace'&&!refund)} onClick={save}>{busy?'Verifying…':'Verify receipts'}</button>{error&&<p role="alert">{error}</p>}</details>
}
