'use client'
import {useRef,useState} from 'react'
import {money} from '../lib/find-your-10/wizard.mjs'
export default function BillQuote({action,state,onSaved}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),request=useRef(null)
  async function save(event){
    event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError('');setNotice('')
    try {
      const payload={version:state.version,type:'bill-quote',data:{id:action.id,optionId:action.optionId,monthly:form.get('monthly'),switching:form.get('switching'),terms:form.get('terms'),eligible:form.get('eligible')==='on',comparable:form.get('comparable')==='on'}}
      const signature=JSON.stringify(payload);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()}
      const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})})
      const result=await response.json();if(!response.ok)throw Error(result.error)
      onSaved(result.state);setNotice('Quote saved. Savings remain estimates until a later bill confirms them.');window.dispatchEvent(new Event('plan-updated'))
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <details className="mt-2 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-violet-700">{action.confirmedQuote?'Review confirmed quote':'Confirm provider quote'}</summary>
    {action.confirmedQuote&&<p className="mb-2">{money(action.confirmedQuote.monthlyCents)}/month · {money(action.confirmedQuote.switchingCents)} one-time · estimated first-year difference {money(action.estimateCents*12-action.confirmedQuote.switchingCents)}</p>}
    <form onSubmit={save} className="space-y-2"><p>Use the provider’s quote for your service address and all lines. Include equipment, taxes, fees and lost bundle discounts.</p><fieldset disabled={busy} className="space-y-2">
    <div className="flex flex-wrap gap-3"><label className="grid gap-1">Full monthly total ($)<input name="monthly" required type="number" min="0" step="0.01" defaultValue={action.confirmedQuote? action.confirmedQuote.monthlyCents/100:''} className="min-h-11 w-40 rounded border px-2"/></label><label className="grid gap-1">One-time costs ($)<input name="switching" required type="number" min="0" step="0.01" defaultValue={action.confirmedQuote? action.confirmedQuote.switchingCents/100:''} className="min-h-11 w-40 rounded border px-2"/></label></div>
    <label className="grid gap-1">Contract, promotion and cancellation terms<textarea name="terms" required maxLength={500} defaultValue={action.confirmedQuote?.terms||''} className="min-h-20 w-full rounded border p-2"/></label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="eligible" required/>The provider confirmed eligibility.</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="comparable" required/>This covers comparable service and all recurring charges.</label>
    <button className="min-h-11 rounded-full bg-violet-800 px-4 font-semibold text-white">{busy?'Saving…':'Save confirmed quote'}</button></fieldset></form>{error&&<p role="alert" className="mt-2 text-red-700">{error}</p>}{notice&&<p role="status" className="mt-2 text-violet-800">{notice}</p>}
  </details>
}
