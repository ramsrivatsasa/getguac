import MarketingShell from '../../components/MarketingShell'
import ResourcesBrowser from '../../components/ResourcesBrowser'
import { ARTICLES } from '../../lib/articles'
import { GUIDES, TOOLS, GOALS } from '../../lib/static-pages'

// Plain <a>, not next/link: these are real .html files in public/, not routes.
// next/link would attempt a client-side navigation to a route that does not
// exist and fall back to a hard load anyway.
function PageCard({ href, title, blurb }) {
  return (
    <a href={href} className="block rounded-2xl bg-white p-4 no-underline ring-1 ring-emerald-900/10 transition hover:ring-emerald-500/40">
      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{blurb}</p>
      <p className="mt-1 font-extrabold leading-snug text-[#15281C]">{title}</p>
    </a>
  )
}

function PageSection({ id, eyebrow, heading, sub, items, cols = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <section id={id} className="max-w-5xl mx-auto px-4 sm:px-6 py-8 scroll-mt-24">
      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{eyebrow}</p>
      <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-gray-900">{heading}</h2>
      <p className="mt-1 text-gray-600">{sub}</p>
      <div className={`mt-5 grid gap-3 ${cols}`}>
        {items.map((i) => <PageCard key={i.href} {...i} />)}
      </div>
    </section>
  )
}

// Only the card fields — never `body`. This page is a server component, so the
// full corpus stays on the server and just this index crosses to the browser.
const ARTICLE_INDEX = ARTICLES.map(({ slug, title, excerpt, category }) => ({ slug, title, excerpt, category }))

export const metadata = {
  title: 'Resources — money guides, articles & tools',
  description:
    'Free guides, articles, and tools to take control of your money: budgeting, emergency funds, retirement, refund rights, calculators, and trusted .gov guides.',
  alternates: { canonical: '/resources' },
}

export default function ResourcesPage() {
  return (
    <MarketingShell subtitle="resources" hideSearch>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 sm:pt-9 pb-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">📚 Resources</span>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-[1.08]">
          Take control of{' '}
          <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">your money.</span>
        </h1>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">Free tools, articles, and trusted guides — budgeting, saving, planning, and knowing your rights.</p>
      </section>

      {/* GUIDES AND TOOLS. These are real pages in public/ that were reachable
          from nowhere except the noindex sitemap — nine finished pages a
          visitor could not arrive at. A guide is HOW TO DO IT; the articles
          below are the essays explaining why. */}
      <PageSection
        id="guides"
        eyebrow="Guides"
        heading="How to actually do it"
        sub="Short, practical walkthroughs — the steps, the milestones, and the tool for each one."
        items={GUIDES}
        cols="sm:grid-cols-2"
      />

      <PageSection
        id="tools"
        eyebrow="Tools"
        heading="Work it out for yourself"
        sub="Calculators and planners you can use without an account."
        items={TOOLS}
      />

      {/* GOAL STORIES. All 21 are linked from the homepage — as cards in a
          22-card carousel, which put reduce-waste.html fourteen clicks deep.
          Listed flat here so every one is a single click from the hub. */}
      <PageSection
        id="goals"
        eyebrow="Goal stories"
        heading="See it working, one goal at a time"
        sub="Twenty-one short stories showing what changes when a receipt stops being clutter."
        items={GOALS}
      />

      <ResourcesBrowser articles={ARTICLE_INDEX} />
    </MarketingShell>
  )
}
