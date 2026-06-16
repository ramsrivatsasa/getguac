import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import AdSlot from '../../components/AdSlot'
import { ARTICLES } from '../../lib/articles'

export const metadata = {
  title: 'Money articles & guides',
  description:
    'Short, practical money guides — compound interest, emergency funds, 401(k) basics, Roth vs Traditional, debt payoff, budgeting, HSAs and 529s. Free.',
  alternates: { canonical: '/articles' },
}

export default function ArticlesPage() {
  return (
    <MarketingShell subtitle="articles" hideSearch>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">📰 Articles</span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-[1.08]">
          Money, made{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">simple.</span>
        </h1>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">Short, practical guides on saving, investing, debt, and planning — each paired with a calculator.</p>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ARTICLES.map((a) => (
            <Link key={a.slug} href={`/articles/${a.slug}`} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 p-4 transition-all flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{a.category}</span>
              <h2 className="font-bold text-gray-900 leading-snug mt-1">{a.title}</h2>
              <p className="text-sm text-gray-500 mt-1 flex-1">{a.excerpt}</p>
              <span className="text-xs font-bold text-emerald-700 mt-2 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">Read <ArrowRight size={12} /></span>
            </Link>
          ))}
        </div>
        <div className="mt-6"><AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || ''} minHeight={90} className="max-w-3xl mx-auto" /></div>
      </div>
    </MarketingShell>
  )
}
