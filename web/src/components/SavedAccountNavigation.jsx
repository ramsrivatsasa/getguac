'use client'
import {useEffect,useRef} from 'react'
import Link from 'next/link'
import {planButton,planSecondary} from './Find10Primitives'

export default function SavedAccountNavigation({category,savedToken,message='Your choice is in your plan. Where would you like to go?'}) {
  const dialog=useRef(null)
  useEffect(()=>{if(savedToken&&!dialog.current.open)dialog.current.showModal()},[savedToken])
  const next=category==='expenses'?{href:'/my-plan/build-wealth',label:'Continue to account choices'}:category==='savings'?{href:'/my-plan/build-wealth?option=cd',label:'Continue to CDs'}:category==='cd'?{href:'/my-plan/build-wealth?option=money-market',label:'Continue to money market'}:{href:'/my-plan/details',label:'Continue to main plan'}
  return <dialog ref={dialog} aria-labelledby="account-choice-saved-title" className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-md overflow-y-auto rounded-2xl border border-violet-100 bg-white p-5 shadow-xl backdrop:bg-black/30">
    <h2 id="account-choice-saved-title" className="text-xl font-bold">Choice saved</h2>
    <p className="mt-2 text-sm text-slate-600">{message}</p>
    <nav aria-label="After saving your choice" className="mt-4 flex flex-wrap gap-2">
      <button type="button" className={planSecondary} onClick={()=>dialog.current.close()}>Stay on this page</button>
      <Link href={next.href} className={planButton} onClick={()=>dialog.current.close()}>Next option →</Link>
      <Link href="/dashboard" className={planSecondary} onClick={()=>dialog.current.close()}>Dashboard</Link>
    </nav>
  </dialog>
}
