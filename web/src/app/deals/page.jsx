import Link from 'next/link'
import { ArrowRight, Mail, Search, Sparkles } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import StageMarker from '../../components/StageMarker'
import MarketingHero from '../../components/MarketingHero'
import ConversionBand from '../../components/ConversionBand'

export const metadata = {
  title: 'Deals: Relevant Offers Without the Inbox Noise',
  description: 'GetGuac separates promotions from receipts and helps you compare useful offers from email, the web and AI-assisted search.',
  alternates: { canonical: '/deals' },
}

const SOURCES = [
  { Icon: Mail, color: '#C25D13', soft: '#FFF1E7', title: 'Promotion emails', body: 'Offer mail is kept out of your receipt history, then organized with its source and expiry when it may be useful.' },
  { Icon: Search, color: '#2563A8', soft: '#EDF5FF', title: 'Web search', body: 'Search for a product when you are ready to compare, or revisit a saved search without starting over.' },
  { Icon: Sparkles, color: '#6D4BC3', soft: '#F3EFFF', title: 'Guac-AI signals', body: 'Major promotions can be surfaced around the products and stores already relevant to your shopping plans.' },
]

export default function DealsPage() {
  return <MarketingShell subtitle="deals">
    <>
      <MarketingHero eyebrow="Protect · Shop smarter" title="Useful offers. Clearer choices." description="Keep promotions separate from purchases. Compare the offers that matter to your next trip, with sources and expiry dates in view." primaryHref="/marketplace" primaryLabel="Search current offers" secondaryHref="/features/protect" secondaryLabel="Explore protection tools" imageSrc="/home/story-people/shop-768.webp" imageAlt="A couple comparing products on a shopping trip"/>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="grid border-y border-slate-200 sm:grid-cols-3">{SOURCES.map(({Icon,color,soft,title,body},index)=><article key={title} className={`py-7 sm:px-7 ${index?'border-t border-slate-200 sm:border-l sm:border-t-0':''}`}><span className="grid h-11 w-11 place-items-center rounded-2xl" style={{background:soft,color}}><Icon size={21}/></span><h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>)}</div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8"><StageMarker active="protect" label="Part of your Protect toolkit"/></section>
      <ConversionBand title="Start with what you already buy." description="Save the purchase record, then compare offers when you need something again." secondaryHref="/coupons" secondaryLabel="Browse coupons"/>
    </>
  </MarketingShell>
}
