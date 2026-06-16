'use client'
// Resources hub content + a "Search resources" filter across GetGuac tools,
// money articles, and trusted .gov guides. Client component (holds the search
// state + the icon components).

import { useState } from 'react'
import Link from 'next/link'
import { Search, ExternalLink, CalendarDays, TrendingUp, ShoppingBag, Ticket, Receipt, Shield, Newspaper } from 'lucide-react'
import { ARTICLES } from '../lib/articles'
import AdSlot from './AdSlot'

const TOOLS = [
  { href: '/plan', icon: TrendingUp, title: 'Calculators', desc: 'Retirement, college, mortgage, debt payoff — 14 calculators with Guac-AI strategy.' },
  { href: '/bills', icon: CalendarDays, title: 'Bills calendar', desc: 'See every recurring bill laid out on the days it’s due.' },
  { href: '/marketplace', icon: ShoppingBag, title: 'Marketplace', desc: 'Compare live prices across major retailers in one search.' },
  { href: '/coupons', icon: Ticket, title: 'Coupons', desc: 'Live promo codes for the biggest stores, all in one place.' },
  { href: '/validate', icon: Receipt, title: 'Worth It?', desc: 'Rate purchases and spot the regret spending fast.' },
  { href: '/security', icon: Shield, title: 'Your data & security', desc: 'How GetGuac keeps your money data private and locked down.' },
]

const GUIDES = [
  { title: 'Build a budget that sticks', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/budgeting/', desc: 'A simple, proven way to plan where your money goes each month.' },
  { title: 'Start an emergency fund', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/', desc: 'How much to set aside, and how to get there without feeling it.' },
  { title: 'Saving & investing for retirement', source: 'investor.gov (SEC)', url: 'https://www.investor.gov/financial-tools-calculators', desc: 'Compound-interest calculators and the basics of long-term saving.' },
  { title: 'Your refund & return rights', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/articles/disputing-credit-card-charges', desc: 'What you’re owed when something’s wrong — and how to dispute it.' },
  { title: 'Spot & cancel sneaky subscriptions', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/', desc: 'Find recurring charges you forgot about and shut them down.' },
  { title: 'Understand credit, interest & fees', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/', desc: 'How interest and fees quietly add up — and how to dodge them.' },
]

export default function ResourcesBrowser() {
  const [q, setQ] = useState('')
  const t = q.trim().toLowerCase()
  const m = (...vals) => !t || vals.some((v) => String(v || '').toLowerCase().includes(t))

  const tools = TOOLS.filter((x) => m(x.title, x.desc))
  const articles = ARTICLES.filter((x) => m(x.title, x.excerpt, x.category))
  const guides = GUIDES.filter((x) => m(x.title, x.desc, x.source))
  const total = tools.length + articles.length + guides.length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
      <div className="relative max-w-md mx-auto mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources…"
          className="w-full pl-11 pr-4 py-3 rounded-full border border-emerald-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      <div className="space-y-10">
        {tools.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-gray-900 mb-3">GetGuac tools</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((x) => {
                const Icon = x.icon
                return (
                  <Link key={x.href} href={x.href} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 p-4 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2"><Icon size={18} /></div>
                    <h3 className="font-bold text-gray-900">{x.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{x.desc}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || ''} minHeight={90} />

        {articles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-gray-900 inline-flex items-center gap-2"><Newspaper size={18} className="text-emerald-600" /> Articles</h2>
              <Link href="/articles" className="text-xs font-bold text-emerald-700 hover:underline">All articles →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => (
                <Link key={a.slug} href={`/articles/${a.slug}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 p-4 transition-all flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{a.category}</span>
                  <h3 className="font-bold text-gray-900 leading-snug mt-1">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {guides.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-gray-900 mb-1">Money guides</h2>
            <p className="text-xs text-gray-400 mb-3">Trusted, non-commercial sources (no affiliate links).</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guides.map((g) => (
                <a key={g.title} href={g.url} target="_blank" rel="noreferrer" className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 p-4 transition-all flex flex-col">
                  <h3 className="font-bold text-gray-900 leading-snug">{g.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 flex-1">{g.desc}</p>
                  <p className="text-[11px] font-semibold text-emerald-700 mt-2 inline-flex items-center gap-1">{g.source} <ExternalLink size={11} /></p>
                </a>
              ))}
            </div>
          </section>
        )}

        {total === 0 && <p className="text-center text-gray-500 py-10">No resources match “{q}”.</p>}
      </div>
    </div>
  )
}
