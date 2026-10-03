'use client'

import { useRef, useState } from 'react'
import Link from './SiteLink'
import { ArrowRight, Camera, Car, Check, FileText, Landmark, Mail, Search, Wallet } from 'lucide-react'
import ZoomableImage from '../app/get-started/ZoomableImage'

const ICONS = { receipts:Camera, income:Wallet, accounts:Landmark, documents:FileText, email:Mail, miles:Car }
const SCREENS = {
  receipts:{src:'/marketing/current/receipts.webp',width:1440,height:900,alt:'GetGuac Receipts screen showing searchable purchase records with stores, categories, dates and totals',phoneSrc:'/home/goals/phone-receipts.webp',phoneWidth:360,phoneHeight:757,phoneAlt:'GetGuac mobile Receipts screen showing searchable purchase records'},
  documents:{src:'/marketing/current/bank.webp',width:1148,height:718,alt:'GetGuac Bank workspace with statement upload and recorded fee and interest totals',phoneSrc:'/home/goals/phone-bank.webp',phoneWidth:360,phoneHeight:757,phoneAlt:'GetGuac mobile statement upload screen explaining review and privacy controls'},
  email:{src:'/marketing/current/inbox.webp',width:1148,height:718,alt:'GetGuac Inbox workspace with message search and retailer connection controls',phoneSrc:'/home/goals/phone-inbox.png',phoneWidth:720,phoneHeight:1544,phoneAlt:'GetGuac mobile Inbox showing retailer receipts filed as purchase messages'},
  miles:{src:'/marketing/current/car-miles.webp',width:1148,height:718,alt:'GetGuac Car Miles form for entering routes, dates, mileage and trip purpose',phoneSrc:'/home/goals/phone-car-miles.webp',phoneWidth:360,phoneHeight:760,phoneAlt:'GetGuac mobile Car Miles screen showing trips organized by purpose'},
}

function RecordDiagram({item}) {
  const account=item.id==='accounts'
  const rows=account
    ? [['What you have','Accounts + assets'],['What you owe','Debts'],['You review','Balances'],['Adds context to','Your position']]
    : [['Income source','You choose'],['Timing','Pay schedule'],['You review','Amount + dates'],['Adds context to','Your budget']]
  const Icon=ICONS[item.id]
  return <div className="flex aspect-[900/563] min-h-[300px] items-center justify-center bg-[#fffaf5] p-5 sm:p-8">
    <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_45px_rgba(124,45,18,.10)]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-[#9a3412]"><Icon size={22}/></span><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#9a3412]">Explanatory record</p><p className="font-black text-slate-950">{account?'Financial position':'Income schedule'}</p></div></div>
        <Check size={20} className="text-emerald-700" aria-label="Ready to review"/>
      </div>
      <dl className="grid grid-cols-2 gap-3 pt-4 text-sm">{rows.map(([term,value])=><div key={term} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-500">{term}</dt><dd className="mt-1 font-bold text-slate-900">{value}</dd></div>)}</dl>
      <p className="mt-4 text-xs leading-5 text-slate-500">You enter and review this information. GetGuac does not move money or require a bank login.</p>
    </div>
  </div>
}

export default function CaptureTools({items,color}) {
  const [selectedId,setSelectedId]=useState('receipts')
  const tabs=useRef([])
  const selected=items.find(item=>item.id===selectedId)||items[0]
  const screen=SCREENS[selected.id]
  const onKeyDown=(event,index)=>{
    if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
    event.preventDefault()
    let next=index
    if(event.key==='Home') next=0
    else if(event.key==='End') next=items.length-1
    else next=(index+(event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1)+items.length)%items.length
    setSelectedId(items[next].id)
    tabs.current[next]?.focus()
  }
  return <section id="tools" className="mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-14">
    <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em]" style={{color}}>Choose what you already have</p><h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">One searchable home for your records.</h2><p className="mt-3 leading-7 text-slate-600">Start with a receipt. Add the other records that help you see the fuller picture—only when you want them.</p></div>
    <div className="mt-7 overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_24px_70px_rgba(124,45,18,.09)] lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="border-b border-orange-100 bg-[#fffaf5] p-3 lg:border-b-0 lg:border-r lg:p-4" role="tablist" aria-label="Ways to add records">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">{items.map((item,index)=>{const active=item.id===selected.id; const Icon=ICONS[item.id]; return <button ref={node=>{tabs.current[index]=node}} key={item.id} id={`capture-tab-${item.id}`} type="button" role="tab" aria-selected={active} aria-controls="capture-tool-panel" tabIndex={active?0:-1} onClick={()=>setSelectedId(item.id)} onKeyDown={event=>onKeyDown(event,index)} className={`group flex min-h-14 min-w-[190px] items-center gap-3 rounded-2xl px-3 py-2 text-left transition motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:w-full lg:min-w-0 ${active?'bg-white shadow-sm ring-1 ring-orange-100':'hover:bg-white/70'}`} style={{outlineColor:color}}><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active?'bg-orange-50':'bg-white'}`} style={{color}}><Icon size={20}/></span><span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">{item.tabLabel}</span><span className="block text-sm font-black leading-5 text-slate-900">{item.shortName}</span></span><ArrowRight size={16} className={`ml-auto hidden shrink-0 transition motion-reduce:transition-none lg:block ${active?'translate-x-0 opacity-100':'-translate-x-1 opacity-0'}`} aria-hidden="true"/></button>})}</div>
      </div>
      <div id="capture-tool-panel" role="tabpanel" aria-labelledby={`capture-tab-${selected.id}`} className="min-w-0 p-4 sm:p-6">
        <div className="flex flex-col gap-5"><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end"><div className="min-w-0 max-w-xl"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color}}>{selected.kicker}</p><h3 className="mt-2 text-2xl font-black text-slate-950">{selected.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{selected.text}</p></div><Link href={selected.href} className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 xl:justify-self-end" style={{backgroundColor:color,outlineColor:color}}>{selected.action}<ArrowRight size={16} aria-hidden="true"/></Link></div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{screen?<><div className="hidden aspect-[900/563] items-center justify-center overflow-hidden sm:flex"><ZoomableImage key={screen.src} src={screen.src} alt={screen.alt} width={screen.width} height={screen.height} imageClassName="block h-auto w-full object-contain" className="rounded-none"/></div><div className="flex justify-center bg-[#f4f7f1] p-4 sm:hidden"><ZoomableImage key={screen.phoneSrc} src={screen.phoneSrc} alt={screen.phoneAlt} width={screen.phoneWidth} height={screen.phoneHeight} imageClassName="block h-auto w-full object-contain" className="max-w-[220px] rounded-[2rem]"/></div></>:<RecordDiagram item={selected}/>} {selected.id==='receipts'&&<div className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-md sm:flex"><Search size={15} style={{color}} aria-hidden="true"/>Search by store, item or category</div>}</div>
          <p className="text-xs leading-5 text-slate-500">{screen?'GetGuac product example. Layouts may vary by app version. Select another source to preview it.':'Diagram showing the information you can choose to record.'}</p></div>
      </div>
    </div>
    <p className="mt-4 text-sm font-semibold text-slate-600">Free forever · No card · No bank login required</p>
  </section>
}
