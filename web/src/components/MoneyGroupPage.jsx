import Link from './SiteLink'
import ToolIcon from './ToolIcon'
import MarketingShell from './MarketingShell'
import MarketingHero from './MarketingHero'
import ConversionBand from './ConversionBand'
import CaptureTools from './CaptureTools'
import UnderstandCycle from './UnderstandCycle'
import ProtectCycle from './ProtectCycle'
import { MONEY_GROUPS } from '../lib/money-journey'

const EXPLAINERS = {
 capture: { title:'Start with the information you have.', label:'How your records fit together', steps:[['Money coming in','Income sources and payment schedules.'],['Money you have or owe','Accounts, assets, balances and debts.'],['Money going out','Bills, purchases, documents and receipts.']], note:'You choose what to add. Review extracted information before relying on it.' },
 understand: { title:'Give this month a plan.', label:'Budget planning explained', steps:[['Set your starting point','Record income and the costs you expect.'],['Plan spending and savings','Assign category limits and savings amounts.'],['Compare and adjust','Review recorded expenses against your plan.']], note:'This diagram explains the workflow. Your budget uses the information you enter and the records available.' },
 protect: { title:'Give your goal a place in the month.', label:'Goal tracking explained', steps:[['Choose a target','Set the purpose, amount and timeframe.'],['Record your progress','Keep contributions and your saved amount up to date.'],['Review the pace','See what remains and revisit your plan as life changes.']], note:'This diagram explains the workflow. GetGuac tracks your plan and progress; it does not move money or guarantee savings.' },
}

export default function MoneyGroupPage({group}) {
 const explainer=EXPLAINERS[group.slug]
 const toolLabels={capture:['See ways to add records','Tools to bring your records together.'],understand:['Explore budgets and insights','Tools for clearer decisions.'],protect:['Explore savings and goals','Tools to protect what matters.']}[group.slug]
 return <MarketingShell subtitle={group.name.toLowerCase()}>
   <MarketingHero eyebrow={group.name} title={group.title} description={group.summary} primaryHref="/register" primaryLabel="Start free" secondaryHref="#tools" secondaryLabel={toolLabels[0]} imageSrc={group.photo} imageAlt={group.photoAlt}/>
   <section className="mx-auto max-w-6xl py-8"><div className="rounded-3xl bg-slate-50 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-wider" style={{color:group.color}}>{explainer.label} · Explanatory diagram</p><h2 className="mt-3 text-3xl font-black text-slate-950">{explainer.title}</h2><ol className="mt-6 grid gap-6 md:grid-cols-3">{explainer.steps.map(([title,text],i)=><li key={title} className="border-t border-slate-300 pt-4"><span className="inline-flex items-center gap-3 text-sm font-bold" style={{color:group.color}}><ToolIcon label={title} size={23}/>0{i+1}</span><h3 className="mt-2 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></li>)}</ol><p className="mt-6 text-xs leading-5 text-slate-500">{explainer.note}</p></div></section>
   {group.slug==='capture' ? <CaptureTools items={group.items.map(({Icon,...item})=>item)} color={group.color}/> : group.slug==='understand' ? <UnderstandCycle/> : <ProtectCycle/>}
   <nav aria-label="Explore the other money groups" className="mx-auto flex max-w-6xl flex-wrap gap-4 py-6">{MONEY_GROUPS.filter(g=>g.slug!==group.slug).map(g=><Link key={g.slug} href={`/features/${g.slug}`} className="btn-secondary">{g.name} tools →</Link>)}</nav>
   <ConversionBand/>
 </MarketingShell>
}

