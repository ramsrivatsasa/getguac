 'use client'
import {useState} from 'react'
import {utilityGuidance} from '../lib/find-your-10/utility-guidance.mjs'
export default function UtilityChecklist({action,state,onSaved}) {
  const guide=utilityGuidance(action.title)
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function complete(){setBusy(true);setError('');try{
    const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:state.version,requestId:crypto.randomUUID(),type:'utility-guide',data:{id:action.id,done:!action.completedAt}})})
    const result=await response.json();if(!response.ok)throw Error(result.error);onSaved(result.state);window.dispatchEvent(new Event('plan-updated'))
  }catch(e){setError(e.message)}finally{setBusy(false)}}
  return <div className="flex flex-wrap items-center gap-3 border-b border-violet-100 py-2 text-sm"><strong className="w-full sm:w-auto sm:flex-1">Review guides to reduce {action.title.toLowerCase()} usage</strong><a href={guide.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-violet-700">{guide.source} guide ↗</a><button disabled={busy} onClick={complete} className="min-h-11 px-3 font-semibold text-violet-700">{busy?'Saving…':action.completedAt?'Reviewed ✓ · Undo':'Mark reviewed'}</button>{error&&<p role="alert" className="w-full text-red-700">{error}</p>}</div>
}
