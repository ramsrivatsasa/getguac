'use client'
import PlanSavingsSummary from './PlanSavingsSummary'
import {expenseComparison} from '../lib/find-your-10/expense-comparison.mjs'

import Link from 'next/link'

import QuickPlan from './QuickPlan'
import PlanPageHeader from './PlanPageHeader'
import PlanTargetLinks from './PlanTargetLinks'

import styles from './Find10Plan.module.css'

import { Scissors, Tags, FileText, Landmark, BookOpen, ArrowRight } from 'lucide-react'

import GuacMascot from './GuacMascot'

import { PLAN_NAV_TARGETS } from '../lib/find-your-10/definition.mjs'

import { recurringAnalysis } from '../lib/find-your-10/recurring.mjs'

import { progressTotals } from '../lib/find-your-10/progress.mjs'

import { money } from '../lib/find-your-10/wizard.mjs'

const icons = {cut:Scissors,cheaper:Tags,bills:FileText,earn:Landmark,learn:BookOpen}

const colors = ['bg-violet-100 text-violet-950', 'bg-cyan-100 text-cyan-950', 'bg-blue-100 text-blue-950', 'bg-pink-100 text-pink-950']

const subtitles = ['Keep what matters. Review the rest.', 'Your basket. A better price.', 'Compare cash costs and access.', 'Small lessons for your next decision.']

export default function Find10Overview({ data, details = false }) {

  if (!details) return <div className="space-y-5"><PlanPageHeader title="Find cheaper options" subtitle="Compare purchases and bills, then save your choices to one plan."/><PlanSavingsSummary expense={expenseComparison(data)}/><QuickPlan data={data}/></div>

  const plan = recurringAnalysis(data), totals = data.progress ? progressTotals(data.progress, plan.month) : null

  return <div className={styles.overview}><nav className="flex flex-wrap justify-between gap-3 text-sm font-bold text-violet-800"><Link className="inline-flex min-h-11 items-center" href="/my-plan/settings">Goal & family →</Link></nav><header className="flex items-center gap-4"><GuacMascot size={72}/><div><h1 className="mt-2 text-3xl font-black sm:text-4xl">Your {plan.goalPct}% plan</h1></div></header><section aria-label="Monthly progress" className="rounded-2xl bg-violet-900 p-5 text-white"><div className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-3">{[['Monthly goal', money(plan.incomeTargetCents)], ['Found · estimates', totals ? money(totals.foundCents) : 'Unavailable'], [`Kept · ${plan.month}`, totals ? money(totals.keptCents) : 'Unavailable']].map(([label, value]) => <div key={label}><p className="text-sm text-violet-100">{label}</p><strong className="mt-1 block text-2xl font-black">{value}</strong></div>)}</div><progress className="mt-4 h-2 w-full accent-amber-300" aria-label="Verified savings toward monthly goal" value={totals?.keptCents || 0} max={Math.max(plan.incomeTargetCents, totals?.keptCents || 0, 1)} /><p className="mt-2 text-sm text-violet-100">Chosen estimates become Kept only with later evidence, after costs.</p></section><h2 className="text-xl font-bold">Explore more options</h2><nav aria-label="Your savings targets" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{PLAN_NAV_TARGETS.map((target, i) => { const Icon = icons[target.id]; return <Link key={target.id} href={target.href} className={`${colors[i]} group flex min-h-56 flex-col rounded-2xl p-5 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700`}><div className="flex items-center justify-between"><Icon size={34} aria-hidden="true" /></div><h2 className="mt-5 text-xl font-black">{target.title}</h2><p className="mt-2 text-sm">{subtitles[i]}</p><span className="mt-auto flex items-center justify-between pt-5 text-sm font-bold">{target.id==='learn'?'View learning progress':'View saved plan'}<ArrowRight size={18} /></span></Link> })}</nav></div>

}

