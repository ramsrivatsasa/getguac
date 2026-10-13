'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { targetForPath } from '../lib/find-your-10/definition.mjs'
export default function Find10CaptureReturn({ publicShell = false }) {
  const pathname = usePathname()
  const target = targetForPath(pathname)
  const [percent,setPercent]=useState(null)
  useEffect(()=>{
    let active=true
    fetch('/api/find-your-10/progress').then(r=>r.ok?r.json():null).then(result=>{if(active)setPercent(result?.percent||null)}).catch(()=>{})
    return ()=>{active=false}
  },[])
  if(publicShell&&!percent)return null
  if (!target && pathname !== '/profile') return null
  const label=percent?`Your ${percent}% plan`:'Your savings plan'
  return <div className={`${publicShell ? 'mx-auto mt-3 max-w-6xl' : 'mb-4'} flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm`}><span>{label}{target?` · ${target.title}`:''}</span></div>
}
