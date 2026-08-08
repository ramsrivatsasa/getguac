'use client'
// The articles + trusted-.gov-guides half of the /resources hub.
//
// It used to also render a "GetGuac tools" grid and its own search box. Both
// are gone:
//   - the tools grid is now the photographic card section the server page
//     renders from lib/static-pages.js, so this was the same six tools twice on
//     one page, in two different visual languages.
//   - two of those six links (/bills and /validate) are DASHBOARD routes. On a
//     public marketing page they bounced a logged-out visitor to the sign-in
//     screen, which is not what "Bills calendar" on a resources hub promises.
//     The card section points at the public /resources/*.html pages instead.
//   - the search box was the page's second one, halfway down, filtering a
//     different half of the page from the one in the hero. ResourceSearch owns
//     it now and filters everything via data-search.
//
// The article list arrives as a prop, deliberately. Importing lib/articles
// here would drag every article BODY into the client bundle (~128 KB of prose)
// when this component only ever reads slug/title/excerpt/category. The server
// page owns the heavy module and hands down just those four fields.

import Link from 'next/link'
import { ExternalLink, Newspaper } from 'lucide-react'
import AdSlot from './AdSlot'

const GUIDES = [
  { title: 'Build a budget that sticks', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/budgeting/', desc: 'A simple, proven way to plan where your money goes each month.' },
  { title: 'Start an emergency fund', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/', desc: 'How much to set aside, and how to get there without feeling it.' },
  { title: 'Saving & investing for retirement', source: 'investor.gov (SEC)', url: 'https://www.investor.gov/financial-tools-calculators', desc: 'Compound-interest calculators and the basics of long-term saving.' },
  { title: 'Your refund & return rights', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/articles/disputing-credit-card-charges', desc: 'What you’re owed when something’s wrong — and how to dispute it.' },
  { title: 'Spot & cancel sneaky subscriptions', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/', desc: 'Find recurring charges you forgot about and shut them down.' },
  { title: 'Understand credit, interest & fees', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/', desc: 'How interest and fees quietly add up — and how to dodge them.' },
]

export default function ResourcesBrowser({ articles = [] }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <div className="space-y-10">
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />

        {articles.length > 0 && (
          <section data-search-group>
            <div className="flex items-center justify-between mb-3">
              <h2 className="gg-h2 inline-flex items-center gap-2"><Newspaper size={18} className="text-guac-600" /> Articles</h2>
              <Link href="/articles" className="text-xs font-bold text-guac-700 hover:underline">All articles →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => (
                <Link key={a.slug} href={`/articles/${a.slug}`} data-search={`${a.category} ${a.title} ${a.excerpt}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-guac-line2 p-4 transition-all flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-guac-700">{a.category}</span>
                  <h3 className="gg-h3 leading-snug mt-1">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section data-search-group>
          <h2 className="gg-h2 mb-1">Money guides</h2>
          <p className="text-xs text-gray-400 mb-3">Trusted, non-commercial sources (no affiliate links).</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GUIDES.map((g) => (
              <a key={g.title} href={g.url} target="_blank" rel="noreferrer" data-search={`${g.title} ${g.desc} ${g.source}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-guac-line2 p-4 transition-all flex flex-col">
                <h3 className="gg-h3 leading-snug">{g.title}</h3>
                <p className="text-sm text-gray-500 mt-1 flex-1">{g.desc}</p>
                <p className="text-[11px] font-semibold text-guac-700 mt-2 inline-flex items-center gap-1">{g.source} <ExternalLink size={11} /></p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
