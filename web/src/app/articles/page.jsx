import MarketingHero from '../../components/MarketingHero'
import Link from 'next/link'
import ToolIcon from '../../components/ToolIcon'
import { ArrowRight } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import AdSlot from '../../components/AdSlot'
import { ARTICLES } from '../../lib/articles'
import ConversionBand from '../../components/ConversionBand'

export const metadata = {
  title: 'Money articles & guides',
  description:
    'Short, practical money guides — compound interest, emergency funds, 401(k) basics, Roth vs Traditional, debt payoff, budgeting, HSAs and 529s. Free.',
  alternates: { canonical: '/articles' },
}

export default function ArticlesPage() {
  return (
    <MarketingShell subtitle="articles" hideSearch>
      <MarketingHero eyebrow="Articles and guides" title="Money," accent="made simple." description="Practical guides on saving, debt and planning, with calculators to explore your own numbers." imageSrc="/home/story-people/protect-couple-tablet-768.webp" imageAlt="A couple reviewing their household records together" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARTICLES.map((a) => (
            <Link key={a.slug} href={`/articles/${a.slug}`} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 p-4 transition-all flex flex-col">
              <ToolIcon label={a.title} size={24} className="mb-3 text-violet-700"/><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{a.category}</span>
              <h2 className="font-bold text-gray-900 leading-snug mt-1">{a.title}</h2>
              <p className="text-sm text-gray-500 mt-1 flex-1">{a.excerpt}</p>
              <span className="text-xs font-bold text-emerald-700 mt-2 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">Read <ArrowRight size={12} /></span>
            </Link>
          ))}
        </div>
        <div className="mt-6"><AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} className="max-w-3xl mx-auto" /></div>
      </div>
      <ConversionBand />
    </MarketingShell>
  )
}
