'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import PlanInvestmentOptions from './PlanInvestmentOptions'

import {PLAN_LESSONS} from '../lib/find-your-10/lessons.mjs'
import {planButton,planPanel} from './Find10Primitives'
export default function PlanLearning({data,step,busy,save}){
  const state=data.progress,lesson=PLAN_LESSONS.find(l=>l.id===state?.learning?.selectedId)||PLAN_LESSONS[0]
  const [answer,setAnswer]=useState('')
  useEffect(()=>setAnswer(''),[lesson.id])
  const completed={...(state?.wizard?.learn?.completedAt?{'account-costs':state.wizard.learn.completedAt}:{}),...state?.learning?.completed}

  if(['story','results'].includes(step))return <PlanInvestmentOptions data={data}/>
  return <>{['story','results'].includes(step)&&<PlanInvestmentOptions data={data}/>}<section className={`${planPanel} space-y-4`}>
    <Link className="inline-flex min-h-11 items-center font-bold text-violet-800" href="/my-plan/build-wealth">Open your complete monthly savings plan →</Link><h2 className="text-xl font-bold">{step==='story'?'One useful idea at a time':step==='results'?'Your learning progress':lesson.title}</h2>
    {['story','results'].includes(step)?<><p className="text-sm text-slate-600">{Object.keys(completed).filter(id=>PLAN_LESSONS.some(l=>l.id===id)).length}/{PLAN_LESSONS.length} lessons complete · learning adds no money to your savings totals.</p><div className="divide-y">{PLAN_LESSONS.map(l=><div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="font-semibold">{l.title}{completed[l.id]?' · Done':''}</span><button className="min-h-11 px-3 text-violet-800" disabled={busy} onClick={()=>save('learning-choice',{id:l.id},'/my-plan/learn/review')}>{completed[l.id]?'Review':'Start'} →</button></div>)}</div><Link className="inline-flex min-h-11 items-center text-violet-800" href="/learn">Explore all articles →</Link></>:<>
      <p className="text-sm leading-relaxed">{lesson.text}</p>
      {step==='choices'&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();save('learning-check',{id:lesson.id,answer},'/my-plan/learn/action')}}><fieldset className="space-y-2"><legend className="mb-2 font-semibold">{lesson.question}</legend>{lesson.options.map(([value,label])=><label key={value} className="flex min-h-11 items-center gap-3 rounded-lg border p-3"><input required type="radio" name="lessonAnswer" value={value} checked={answer===value} onChange={()=>setAnswer(value)}/>{label}</label>)}</fieldset><button disabled={busy||!answer} className={planButton}>Check my answer</button></form>}
      {step==='action'&&<p className="font-semibold">{completed[lesson.id]?'Lesson complete. Try the idea with your next planned decision.':'Complete the knowledge check to record this lesson.'}</p>}
      <Link className="inline-flex min-h-11 items-center text-violet-800" href={`/articles/${lesson.article}`}>Read the practical guide →</Link>
      {step==='action'&&<Link className="ml-4 inline-flex min-h-11 items-center text-violet-800" href="/my-plan/learn/results">Choose another lesson →</Link>}
    </>}
  </section></>
}
