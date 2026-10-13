'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scissors, Tags, FileText, Landmark, BookOpen } from 'lucide-react'
import { PLAN_NAV_TARGETS } from '../lib/find-your-10/definition.mjs'
const icons = {cut:Scissors,cheaper:Tags,bills:FileText,earn:Landmark,learn:BookOpen}
export default function PlanTargetLinks({ compact = false }) {
  const pathname = usePathname()
  return <nav aria-label="Savings plan tools" className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
    {PLAN_NAV_TARGETS.map(target => { const Icon = icons[target.id]; const active = pathname === target.href || (target.id === 'earn' && ['/my-plan/cash-accounts', '/my-plan/earn/'].some(path => pathname.startsWith(path))) || (target.id === 'learn' && pathname.startsWith('/my-plan/learn/')); return <Link key={target.id} href={target.href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold text-violet-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700 ${active ? 'border-violet-300 bg-violet-50' : 'border-violet-100 bg-white hover:bg-violet-50'}`}><Icon size={18} className="shrink-0" /><span>{target.title}</span></Link> })}
  </nav>
}
