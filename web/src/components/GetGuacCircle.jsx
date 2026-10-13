'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GETGUAC_STAGES } from '../lib/getguac-circle'
import { track } from '../lib/analytics'
import ProductScreenPair from './ProductScreenPair'

export default function GetGuacCircle({ initialStage='capture', compact=false, showDetail=true }) {
  const initial = Math.max(0, GETGUAC_STAGES.findIndex(stage => stage.slug === initialStage))
  const [index, setIndex] = useState(initial)
  const stage = GETGUAC_STAGES[index]
  function choose(next) { setIndex(next); track('circle_stage_selected', { stage: GETGUAC_STAGES[next].slug, placement: compact ? 'compact' : 'full' }) }
  function navigateTabs(event, current) {
    const keys = { ArrowRight:(current+1)%GETGUAC_STAGES.length, ArrowLeft:(current-1+GETGUAC_STAGES.length)%GETGUAC_STAGES.length, Home:0, End:GETGUAC_STAGES.length-1 }
    if (keys[event.key] === undefined) return
    event.preventDefault(); choose(keys[event.key]); document.getElementById(`gg-circle-tab-${keys[event.key]}`)?.focus()
  }
  return <section aria-label="The GetGuac Circle" className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
    <div className="px-3 pt-3 sm:px-4"><div role="tablist" aria-label="GetGuac journey stages" className="flex items-stretch gap-1 overflow-x-auto pb-2 lg:grid lg:grid-cols-8">
      {GETGUAC_STAGES.map((item,i) => { const Icon=item.Icon; const selected=i===index; return <button key={item.slug} id={`gg-circle-tab-${i}`} type="button" role="tab" aria-selected={selected} aria-controls="gg-circle-panel" tabIndex={selected?0:-1} onKeyDown={event=>navigateTabs(event,i)} onClick={()=>choose(i)} className={`group min-h-[74px] min-w-[104px] shrink-0 rounded-xl lg:min-w-0 px-1 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${selected?'bg-slate-50 ring-1 ring-slate-200':'hover:bg-slate-50/80'}`} style={{color:selected?item.color:'#647067',outlineColor:item.color}}><span className="mx-auto grid h-8 w-8 place-items-center rounded-full" style={{background:selected?item.color:item.soft,color:selected?'white':item.color}}><Icon size={17}/></span><span className="mt-1.5 block text-xs font-black uppercase leading-4 tracking-normal">{item.name}</span></button> })}
    </div></div>
    <div className="mx-4 mt-2 h-0.5 overflow-hidden rounded-full bg-slate-100"><span className="gg-circle-progress block h-full rounded-full transition-all duration-300" style={{width:`${(index+1)/GETGUAC_STAGES.length*100}%`,background:stage.color}}/></div>
    {showDetail && <div id="gg-circle-panel" role="tabpanel" aria-labelledby={`gg-circle-tab-${index}`} className={`grid items-center gap-5 p-5 sm:p-6 ${compact?'':'lg:grid-cols-[.9fr_1.1fr]'}`} style={{background:`linear-gradient(135deg,${stage.soft},#fff)`}}>
      <div><p className="text-xs font-black uppercase tracking-[.14em]" style={{color:stage.color}}>Stage {index+1} of 8 · {stage.short}</p><h2 className="mt-2 text-2xl font-black leading-tight text-[#15281c] sm:text-3xl">{stage.hero}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{stage.summary}</p><ul className="mt-3 grid gap-1.5">{stage.benefits.map(x=><li key={x} className="flex items-start gap-2 text-sm font-bold text-slate-700"><span className="mt-0.5" style={{color:stage.color}}>✓</span>{x}</li>)}</ul><Link href={`/features/${stage.slug}`} onClick={()=>track('feature_stage_cta_clicked',{stage:stage.slug})} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-black" style={{color:stage.color}}>{stage.cta} <ArrowRight size={15}/></Link></div>
      {!compact && <ProductScreenPair webSrc={stage.web} phoneSrc={stage.phone} webAlt={stage.webAlt} phoneAlt={stage.phoneAlt} compact phoneSide="right" />}
    </div>}
  </section>
}
