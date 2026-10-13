'use client'
import {useRef,useState} from 'react'
export default function SuggestionFeedback({progress,scope,subject,option,restoreKey,onSaved,disabled=false}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef(null)
  async function save(){
    setBusy(true);setError('')
    try {
      const data=restoreKey?{restore:true,key:restoreKey}:{scope,subject,option:option||null}
      const payload={version:progress?.version||0,type:'suggestion-feedback',data}
      const signature=JSON.stringify(payload)
      if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()}
      const response=await fetch('/api/find-your-10/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:request.current.id})})
      const result=await response.json();if(!response.ok)throw Error(result.error)
      onSaved(result.state)
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <div><button type="button" disabled={busy||disabled} onClick={save} className="min-h-11 px-2 text-sm font-semibold text-slate-600 underline disabled:opacity-50">{busy?'Saving…':restoreKey?'Review again':'Don’t suggest again'}</button>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</div>
}
