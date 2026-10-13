'use client'
import Link from 'next/link'
import {useCallback,useEffect,useState} from 'react'
import {ThumbsUp,ThumbsDown} from 'lucide-react'
export default function ArticleFeedback({slug}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[body,setBody]=useState(''),[name,setName]=useState('Reader')
 const url=`/api/articles/${encodeURIComponent(slug)}/feedback`
 const load=useCallback(async()=>{try{const r=await fetch(url);const d=await r.json();if(!r.ok)throw Error(d.error);setData(d);setError('')}catch(e){setError(e.message||'Feedback could not load.')}},[url])
 useEffect(()=>{load()},[load])
 async function send(input){setBusy(true);setMessage('');try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const d=await r.json();if(!r.ok)throw Error(d.error);setMessage(d.message);if(input.action==='comment')setBody('');await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="mt-8 border-t border-slate-200 pt-5" aria-label="Reader feedback">
  <h2 className="text-xl font-bold text-slate-900">Join the conversation</h2>
  <p className="text-sm text-slate-600 mt-1">Was this useful? Share a question or what worked for you. Keep personal financial details private.</p>
  {error&&<p role="alert" className="text-sm text-rose-700 mt-3">{error} <button className="min-h-11 underline" onClick={load}>Retry</button></p>}
  {data&&<>
   <div className="flex flex-wrap gap-2 my-3">
    {[[1,'Like',ThumbsUp,data.likes],[-1,'Dislike',ThumbsDown,data.dislikes]].map(([v,label,Icon,count])=><button key={v} type="button" aria-pressed={data.reaction===v} disabled={busy||!data.signedIn} onClick={()=>send({action:'react',reaction:data.reaction===v?0:v})} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold disabled:opacity-60 ${data.reaction===v?'border-violet-500 bg-violet-50 text-violet-800':'border-slate-200 text-slate-700'}`}><Icon size={16}/>{label} {count}</button>)}
   </div>
   {!data.signedIn?<Link href="/login" className="inline-flex min-h-11 items-center text-violet-700 font-semibold">Sign in to react or comment →</Link>:<form onSubmit={e=>{e.preventDefault();send({action:'comment',body,displayName:name})}} className="space-y-3">
    <label className="block text-sm font-semibold text-slate-700">Public name<input value={name} onChange={e=>setName(e.target.value)} maxLength={40} required className="block mt-1 min-h-11 w-full max-w-sm rounded-xl border border-slate-300 px-3" autoComplete="off"/></label>
    <label className="block text-sm font-semibold text-slate-700">Comment<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={2} maxLength={2000} required rows={3} className="block mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal"/></label>
    <div className="flex flex-wrap items-center gap-3"><button disabled={busy} className="min-h-11 rounded-xl bg-violet-700 px-4 text-white font-semibold disabled:opacity-60">{busy?'Saving…':'Post comment'}</button><span className="text-sm text-slate-600">Comments appear after review.</span></div>
   </form>}
   <p role="status" className="text-sm text-violet-700 mt-2">{message}</p>
   {[...(data.pending||[]),...data.comments].map(c=><article key={c.id} className="border-t border-slate-100 py-3 mt-3"><div className="flex flex-wrap gap-2 items-center text-sm"><strong>{c.display_name}</strong><time dateTime={c.created_at} className="text-slate-500">{new Date(c.created_at).toLocaleDateString('en-US')}</time>{c.status==='pending'&&<span className="text-amber-700">Awaiting review · visible to you</span>}</div><p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-1">{c.body}</p></article>)}
   {!data.comments.length&&!data.pending?.length&&<p className="text-sm text-slate-500 mt-3">Start the conversation with a useful question.</p>}
   {data.comments.length===30&&<p className="text-sm text-slate-500">Showing the latest 30 comments.</p>}
  </>}
  {!data&&!error&&<p className="text-sm text-slate-500 mt-3">Loading reader feedback…</p>}
 </section>
}
