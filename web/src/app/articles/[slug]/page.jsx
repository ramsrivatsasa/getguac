import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calculator as CalcIcon } from 'lucide-react'
import MarketingShell from '../../../components/MarketingShell'
import AdSlot from '../../../components/AdSlot'
import { ARTICLES, getArticle } from '../../../lib/articles'

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

export function generateMetadata({ params }) {
  const a = getArticle(params.slug)
  if (!a) return {}
  return { title: a.title, description: a.excerpt, alternates: { canonical: `/articles/${a.slug}` } }
}

export default function ArticlePage({ params }) {
  const a = getArticle(params.slug)
  if (!a) notFound()
  const related = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3)

  return (
    <MarketingShell subtitle="articles" hideSearch>
      <article className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <Link href="/articles" className="text-sm text-emerald-700 font-semibold inline-flex items-center gap-1 hover:underline"><ArrowLeft size={14} /> All articles</Link>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mt-4">{a.category}</span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-1 leading-tight">{a.title}</h1>

        <div className="mt-5 space-y-4 text-[15px] text-gray-700 leading-relaxed">
          {a.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {a.calc && (
          <Link href={`/plan#${a.calc}`} className="mt-7 block rounded-2xl bg-gradient-to-br from-emerald-600 to-lime-500 text-white p-5 hover:scale-[1.01] transition-transform shadow-sm">
            <div className="font-black inline-flex items-center gap-1.5"><CalcIcon size={16} /> Run the numbers</div>
            <p className="text-emerald-50 text-sm mt-0.5">Try the matching calculator — free, with a Guac-AI strategy built for your numbers.</p>
          </Link>
        )}

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || ''} minHeight={90} className="mt-7" />

        <div className="mt-8">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Keep reading</div>
          <div className="space-y-2">
            {related.map((r) => (
              <Link key={r.slug} href={`/articles/${r.slug}`} className="block rounded-xl border border-gray-100 p-3 hover:border-emerald-200 transition-colors">
                <div className="font-bold text-gray-900 text-sm">{r.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.excerpt}</div>
              </Link>
            ))}
          </div>
        </div>
      </article>
    </MarketingShell>
  )
}
