import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react'
import MarketingShell from './MarketingShell'
import ProductScreenPair from './ProductScreenPair'
import { adjacentStages } from '../lib/getguac-circle'
import { TOOL_GROUP } from '../lib/money-journey'

const PEOPLE = {
  capture: ['capture-blonde-produce-v1-768.webp', 'A shopper keeping a receipt with her phone'],
  understand: ['protect-couple-tablet-768.webp', 'A couple reviewing purchases together'],
  remember: ['family-tablet.webp', 'A family keeping its purchase history together'],
  prepare: ['protect-couple-tablet-768.webp', 'A couple planning upcoming household expenses'],
  'shop-smart': ['shop-768.webp', 'Shoppers comparing a product before buying'],
  protect: ['protect-couple-tablet-768.webp', 'A couple reviewing a purchase receipt'],
  'worth-it': ['shop-768.webp', 'Shoppers considering whether a product is worth buying'],
  'next-trip': ['shop-768.webp', 'A couple preparing their next grocery purchase'],
}

export default function FeatureStagePage({ stage }) {
  const { previous, next } = adjacentStages(stage.slug)
  const [photo, photoAlt] = PEOPLE[stage.slug]
  const Icon = stage.Icon
  return <MarketingShell subtitle={stage.name.toLowerCase()}>
    <section className="mx-auto max-w-6xl py-8 sm:py-12">
      <div className="grid items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider" style={{color:stage.color}}><Icon size={16}/><Link href={`/features/${TOOL_GROUP[stage.slug] || 'capture'}`}>{TOOL_GROUP[stage.slug] || 'capture'}</Link> · {stage.name}</p>
          <h1 className="mt-4 text-4xl font-black leading-[1.06] tracking-tight text-slate-950 sm:text-5xl">{stage.hero}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{stage.summary.replace('pictured here', 'below')}</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/register" className="btn-primary">Start free</Link><Link href="#product-proof" className="btn-secondary">{stage.cta}</Link></div>
          <p className="mt-3 text-xs font-bold text-slate-500">Free forever · No card · No bank login required</p>
        </div>
        <img src={`/home/story-people/${photo}`} alt={photoAlt} width={768} height={512} className="h-auto w-full rounded-3xl" fetchPriority="high"/>
      </div>
    </section>
    <section id="product-proof" className="mx-auto max-w-6xl scroll-mt-24 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-black text-slate-950">{stage.name} in GetGuac</h2><p className="text-sm text-slate-500">Select a screen to see the details.</p></div>
      <ProductScreenPair webSrc={stage.web} phoneSrc={stage.phone} webAlt={stage.webAlt} phoneAlt={stage.phoneAlt}/>
      <ul className="mt-6 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">{stage.benefits.map(item=><li key={item} className="flex gap-2 text-sm font-bold text-slate-700"><Check size={18} className="shrink-0" style={{color:stage.color}}/>{item}</li>)}</ul>
      {stage.slug === 'understand' && <p className="mt-5 text-sm leading-6 text-slate-600">Guac AI can explain the records you provide. Check its answers against the original receipts, correct any extracted details, and ask again when something looks wrong. Missing records can change the answer.</p>}
      {stage.slug === 'protect' && <p className="mt-5 text-sm leading-6 text-slate-600">Protect what you have today and prepare for long-term goals. <Link href="/calculators" className="font-bold underline">Explore savings and goal calculators</Link> alongside your purchase protection.</p>}
    </section>
    <section className="mx-auto max-w-6xl py-8"><div className="flex items-start gap-4 border-y border-slate-200 py-6"><LockKeyhole className="shrink-0 text-violet-700"/><div><h2 className="text-xl font-black text-slate-950">Your records stay under your control.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Use the receipts and documents you choose. Export or delete them when you need to.</p><Link href="/security" className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold text-violet-700">Security and privacy <ArrowRight size={16}/></Link></div></div></section>
    <nav aria-label="Adjacent GetGuac stages" className="mx-auto flex max-w-6xl items-center justify-between gap-4 pb-8"><Link href={`/features/${previous.slug}`} className="inline-flex min-h-11 items-center gap-2 font-bold text-slate-600"><ArrowLeft size={16}/>{previous.name}</Link><Link href={`/features/${next.slug}`} className="inline-flex min-h-11 items-center gap-2 font-bold" style={{color:next.color}}>{next.name}<ArrowRight size={16}/></Link></nav>
  </MarketingShell>
}
