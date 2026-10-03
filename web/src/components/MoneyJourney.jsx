import Link from './SiteLink'
import { ChevronDown, Gamepad2, ReceiptText, Star, WandSparkles, TrendingUp, Ticket, Copy, ArrowRight, Mic, Inbox, Newspaper, ShieldCheck, Download, Sparkles, Tags, Users, FileText, Gauge } from 'lucide-react'
import { MONEY_GROUPS } from '../lib/money-journey'
import GuacMascot from './GuacMascot'


const EXTRA_TOOLS = {
 capture: [
  {id:'dedup',name:'Duplicate review',Icon:Copy,text:'Find repeated receipt records so you can review the purchases counted.',href:'/goals/duplicates.html'},
  {id:'voice',name:'Voice and PDF capture',Icon:Mic,text:'Use supported voice entry or PDF uploads to add purchase information.',href:'/get-started'},
  {id:'inbox',name:'Shopping inbox',Icon:Inbox,text:'Keep receipt and store messages together outside your personal inbox.',href:'/goals/inbox.html'}
 ],
 understand: [
  {id:'for-you',name:'Guides and tools for you',Icon:Sparkles,text:'Explore suggestions based on available purchases, bills and goals, and give feedback on what is useful.',href:'/dashboard'},
  {id:'price-history',name:'Repeat-purchase price history',Icon:Tags,text:'Review recorded item prices when comparing purchases over time.',href:'/reports'},
  {id:'guacanomics',name:'Guacanomics and GuacScore',Icon:Gauge,text:'Review spending indicators with the purchase records behind them.',href:'/guacanomics'},
  {id:'bank-bites',name:'Bank Bites',Icon:FileText,text:'Review fees and interest found in supported statements.',href:'/goals/wizard.html'},
  {id:'tax',name:'Tax records',Icon:FileText,text:'Organize recorded taxes and purchase information for your own review.',href:'/goals/reports.html'},
  {id:'news',name:'Money news',Icon:Newspaper,text:'Read money-related news alongside your learning resources.',href:'/articles'},
  {id:'games',name:'Money games',Icon:Sparkles,text:'Explore money concepts through short learning activities and games.',href:'/games'}
 ],
 protect: [
  {id:'coupons',name:'Coupons and promotions',Icon:Tags,text:'Check available offers separately from receipts and recorded spending.',href:'/coupons'},
  {id:'privacy',name:'Privacy and account controls',Icon:ShieldCheck,text:'Understand how your records and account access are protected.',href:'/security'},
  {id:'export',name:'Export and deletion',Icon:Download,text:'Keep a copy of your records or remove data using account controls.',href:'/security'}
 ]
}

export function MoneyGroupCards() {
  return <div className="grid gap-5 md:grid-cols-3">{MONEY_GROUPS.map(group=><article key={group.slug} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
    <img src={group.photo} alt={group.photoAlt} width={768} height={512} loading="lazy" className="h-auto w-full"/>
    <div className="flex flex-1 flex-col p-5 sm:p-6"><p className="flex items-center gap-2 text-sm font-bold" style={{color:group.color}}><group.Icon size={18}/>{group.name}</p><h3 className="mt-3 text-2xl font-black leading-tight text-slate-950 md:min-h-[2.5em] xl:min-h-0">{group.cardTitle || group.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{group.summary}</p><Link href={`/features/${group.slug}`} className="mt-5 inline-flex min-h-11 items-center justify-between gap-2 text-sm font-bold" style={{color:group.color}}>{group.action}<ArrowRight size={17} className="shrink-0"/></Link></div>
  </article>)}</div>
}

const TOOL_SUMMARIES = {
 receipts:'Scan, save and find purchases', income:'Record pay and payment schedules', accounts:'Balances, assets and debts', documents:'Upload and review statements', email:'Bring digital receipts together', miles:'Log trips by purpose',
 dedup:'Review repeated receipts', voice:'Add supported voice or PDF records', inbox:'Keep store messages together',
 dashboard:'Your money at a glance', budget:'Plan and compare your month', reports:'See spending by category', scores:'Explore your money indicators', 'worth-it':'Remember purchases worth repeating', calculators:'Try your own money scenarios', learning:'Build everyday money knowledge',
 'for-you':'Explore personalized suggestions', 'price-history':'Compare past purchase prices', guacanomics:'Review spending and your score', 'bank-bites':'Find statement fees and interest', tax:'Organize recorded purchase taxes', news:'Follow money news', games:'Learn through play',
 retirement:'Explore your retirement scenario', wealth:'Review assets, debts and net worth', family:'Manage household connections', goals:'Set targets and track progress', bills:'Review upcoming and recurring costs', returns:'Track deadlines and refund status', rewards:'Review rewards and GuacMoney', shopping:'Plan your next shopping trip', deals:'Compare offers before you buy', stash:'Remember what you already own', marketplace:'Compare products across retailers', coupons:'Browse coupons and promotions', sharing:'Manage household connections', privacy:'Review privacy and access controls', export:'Export records or remove data'
}
const TOOL_ICONS = {scores:WandSparkles, 'worth-it':Star, 'price-history':TrendingUp, tax:ReceiptText, games:Gamepad2, coupons:Ticket}
const GROUP_HINTS = {capture:'Bring your records together',understand:'Find clarity in your numbers',protect:'Look after your money and plans'}
const GROUP_TINTS = {capture:'#fff7ed',understand:'#eff6ff',protect:'#f5f3ff'}

export function MoneyFeatureDirectory() {
 return <div className="space-y-3">{MONEY_GROUPS.map(group=><details key={group.slug} className="group rounded-2xl border border-slate-200 bg-white open:border-slate-300">
  <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 rounded-2xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:gap-4 sm:px-5 [&::-webkit-details-marker]:hidden">
   <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor:GROUP_TINTS[group.slug],color:group.color}}><group.Icon size={23} aria-hidden="true"/></span>
   <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-base font-bold text-slate-950">{group.name}</span><span className="text-xs font-medium text-slate-500">{group.items.length + EXTRA_TOOLS[group.slug].length} tools</span></span><span className="mt-1 block text-sm text-slate-600">{GROUP_HINTS[group.slug]}</span></span>
   <ChevronDown size={19} aria-hidden="true" className="shrink-0 text-slate-500 group-open:rotate-180"/>
  </summary>
  <ul className="grid gap-1 border-t border-slate-100 p-2 sm:grid-cols-2 sm:p-3 lg:grid-cols-3">{[...group.items,...EXTRA_TOOLS[group.slug]].map(item=>{const Icon=TOOL_ICONS[item.id] || item.Icon; return <li key={item.id} className="min-w-0"><Link href={item.href} className="flex h-full min-h-20 items-center gap-3 rounded-xl px-3 py-3 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600">
   <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor:GROUP_TINTS[group.slug],color:group.color}}><Icon size={21} aria-hidden="true"/></span>
   <span className="min-w-0"><span className="block text-sm font-bold leading-5 text-slate-900">{item.shortName || item.name}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{TOOL_SUMMARIES[item.id]}</span></span>
  </Link></li>})}</ul>
 </details>)}</div>
}

export function MoneyAssistant() {
  return <section id="guac-ai" className="mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-12"><div className="grid items-center gap-7 rounded-3xl bg-violet-50 p-6 sm:p-8 md:grid-cols-[1.1fr_.9fr]">
    <div><div className="flex items-center gap-3"><GuacMascot size={64}/><p className="text-sm font-bold text-violet-700">Guac AI · With you across all three</p></div><h2 className="mt-4 text-3xl font-black text-slate-950">A little help making sense of it.</h2><p className="mt-3 leading-7 text-slate-600">Ask questions about your money, explain a pattern, or think through a next step. Answers depend on the records available; review them before acting.</p><Link href="/chat" className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-violet-700">Open Guac AI <ArrowRight size={17}/></Link></div>
    <div><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Questions you can ask</p><ul className="space-y-3">{['What should I review in my budget this month?','Help me think through my savings goal.','Explain this change in my spending.'].map(question=><li key={question} className="rounded-2xl bg-white px-5 py-4 text-sm font-semibold leading-6 text-slate-700">{question}</li>)}</ul><p className="mt-3 text-xs leading-5 text-slate-500">Suggested prompts. Nothing is sent until you choose to send it.</p></div>
  </div></section>
}


