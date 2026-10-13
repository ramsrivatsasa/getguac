'use client'
import Link from 'next/link'
import {Landmark,Clock,Coins} from 'lucide-react'
import PlanSavingsSummary from './PlanSavingsSummary'
import {expenseComparison} from '../lib/find-your-10/expense-comparison.mjs'
import PlanCashComparison from './PlanCashComparison'
import PlanCdOptions from './PlanCdOptions'
import {recurringAnalysis} from '../lib/find-your-10/recurring.mjs'
export default function PlanDepositOptions({data,category='savings'}){
 const plan=recurringAnalysis(data)
 return <div className="space-y-4"><PlanSavingsSummary expense={expenseComparison(data)}/><nav aria-label="Account options" className="flex flex-wrap gap-2">{[['savings','High-yield savings',Landmark],['cd','CDs',Clock],['money-market','Money market',Coins]].map(([id,label,Icon])=><Link key={id} href={`/my-plan/build-wealth?option=${id}`} aria-current={category===id?'page':undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold ${category===id?'border-violet-400 bg-violet-50 text-violet-900':'border-violet-100 bg-white text-violet-800'}`}><Icon size={18}/>{label}</Link>)}</nav>{category==='cd'?<PlanCdOptions data={data} plan={plan}/>:<PlanCashComparison key={category} data={data} plan={plan} quick category={category}/>}</div>
}
