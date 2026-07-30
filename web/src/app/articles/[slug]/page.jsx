import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calculator as CalcIcon, Clock } from 'lucide-react'
import MarketingShell from '../../../components/MarketingShell'
import AdSlot from '../../../components/AdSlot'
import { ARTICLES, getArticle } from '../../../lib/articles'

const SITE_URL = 'https://getguac.app'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function prettyDate(iso) {
  const [y, m] = String(iso).split('-')
  return `${MONTHS[Number(m) - 1] || ''} ${y}`.trim()
}

// Rough reading time from the structured body (paragraphs + headings + lists).
function wordCount(body) {
  return body.reduce((n, item) => {
    if (typeof item === 'string') return n + item.split(/\s+/).length
    if (item && item.h) return n + item.h.split(/\s+/).length
    if (item && item.list) return n + item.list.join(' ').split(/\s+/).length
    return n
  }, 0)
}

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

export function generateMetadata({ params }) {
  const a = getArticle(params.slug)
  if (!a) return {}
  const url = `/articles/${a.slug}`
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: url },
    openGraph: { title: a.title, description: a.excerpt, url, type: 'article' },
  }
}

export default function ArticlePage({ params }) {
  const a = getArticle(params.slug)
  if (!a) notFound()

  // Prefer same-category related; backfill with anything else to always show 3.
  const sameCat = ARTICLES.filter((x) => x.slug !== a.slug && x.category === a.category)
  const others = ARTICLES.filter((x) => x.slug !== a.slug && x.category !== a.category)
  const related = [...sameCat, ...others].slice(0, 3)

  const readMins = a.readMins || Math.max(3, Math.round(wordCount(a.body) / 220))
  const updated = a.updated || '2026-06-30'

  // Article structured data — helps search engines understand this is a real,
  // dated, original article (and helps the AdSense content review).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.excerpt,
    author: { '@type': 'Organization', name: 'GetGuac', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'GetGuac',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
    datePublished: updated,
    dateModified: updated,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/articles/${a.slug}` },
  }

  return (
    <MarketingShell subtitle="articles" hideSearch>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <Link href="/articles" className="text-sm text-emerald-700 font-semibold inline-flex items-center gap-1 hover:underline"><ArrowLeft size={14} /> All articles</Link>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mt-4">{a.category}</span>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-1 leading-tight">{a.title}</h1>
        <div className="mt-3 flex items-center gap-2.5 text-xs text-gray-400 font-semibold">
          <span className="inline-flex items-center gap-1"><Clock size={12} /> {readMins} min read</span>
          <span aria-hidden>·</span>
          <span>Updated {prettyDate(updated)}</span>
        </div>

        <div className="mt-6 space-y-4 text-[15px] text-gray-700 leading-relaxed">
          {a.body.map((item, i) => {
            if (typeof item === 'string') return <p key={i}>{item}</p>
            if (item && item.h) return <h2 key={i} className="text-xl sm:text-2xl font-black text-gray-900 pt-4 leading-snug">{item.h}</h2>
            if (item && item.list) return (
              <ul key={i} className="list-disc pl-5 space-y-1.5 marker:text-emerald-500">
                {item.list.map((li, j) => <li key={j}>{li}</li>)}
              </ul>
            )
            return null
          })}
        </div>

        {a.calc && (
          <Link href={`/plan#${a.calc}`} className="mt-8 block rounded-2xl bg-gradient-to-br from-emerald-600 to-lime-500 text-white p-5 hover:scale-[1.01] transition-transform shadow-sm">
            <div className="font-black inline-flex items-center gap-1.5"><CalcIcon size={16} /> Run the numbers</div>
            <p className="text-emerald-50 text-sm mt-0.5">Try the matching calculator — free, with a Guac-AI strategy built for your numbers.</p>
          </Link>
        )}

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} className="mt-7" tier={2} />

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

        {/* The closing ask. Until now an article ended with a calculator link, 3
            related posts and an ad slot, and never once asked the reader to sign
            up — /articles was the only public surface with no conversion path.
            Placed after "Keep reading" rather than under the body so it doesn't
            sit shoulder-to-shoulder with the "Run the numbers" calculator CTA.
            🔒 COPY LOCK: the headline is "Start Saving Today" and the button is
            "Get Started Free" — both are the site-wide locked strings, not new
            copy. Do not add a user-count line here ("join thousands of…"): that
            claim was cut from /join as false, and it is still false. Every
            feature named below ships today (receipt scan, email pull). */}
        <div className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-center">
          <div className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">Start Saving Today</div>
          <p className="text-sm text-gray-600 mt-1.5 max-w-md mx-auto">
            GetGuac scans your receipts, pulls them straight out of your email, and shows you where the money actually went. Free forever — no card, no fees, no spam.
          </p>
          <Link href="/register" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-3 text-white font-bold text-sm hover:bg-emerald-700 transition-colors no-underline">
            Get Started Free <ArrowRight size={15} />
          </Link>
        </div>
      </article>
    </MarketingShell>
  )
}
