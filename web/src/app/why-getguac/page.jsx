import MarketingShell from '../../components/MarketingShell'
import MarketingHero from '../../components/MarketingHero'
import { MoneyGroupCards } from '../../components/MoneyJourney'
import ConversionBand from '../../components/ConversionBand'
import Link from 'next/link'
import { Tags, ListChecks, Newspaper, ArrowRight, RotateCcw, ChevronDown } from 'lucide-react'

export const metadata = {
  title: 'Protect your wallet. Choose with confidence. | GetGuac',
  description: 'See how GetGuac helps you compare prices, pause impulse buying, review recurring costs and stay informed about inflation and recalls.',
  alternates: { canonical: '/why-getguac' },
}

const protections = [
  {
    title: 'Compare with confidence.', Icon: Tags,
    context: 'Surveillance pricing · Personalized pricing · Digital redlining · Zip-code pricing',
    how: 'Use your recorded purchase prices and relevant retailer comparisons to review an offer against your own history. Check the product, size and pack before choosing an alternative.',
    tools: ['Purchase history', 'Price comparisons'], href: '/marketplace', action: 'Compare shopping options',
    detail: 'Surveillance and personalized pricing can use information about shoppers to influence prices. Zip-code pricing varies by location; digital redlining describes unequal digital treatment tied to location or personal characteristics. A price difference alone does not establish why a retailer set it.',
  },
  {
    title: 'Shop at your own pace.', Icon: ListChecks,
    context: 'Rage bait marketing · Algorithmic targeting · Behavioral tracking',
    how: 'Let your budget, shopping list and Worth-It feedback support your next decision. Review previous purchases and your priorities, and give yourself time to consider a limited-time offer.',
    tools: ['Budgets & lists', 'Worth-It feedback'], href: '/features/understand', action: 'Explore spending tools',
    detail: 'Rage bait marketing seeks attention through strong emotional reactions. Algorithmic targeting selects messages for particular audiences; behavioral tracking records activity that can inform those messages. GetGuac helps you consider your own spending context when deciding whether an offer suits you.',
  },
  {
    title: 'Stay ahead of the details.', Icon: Newspaper,
    context: 'Inflation · Recalls · Recurring costs',
    how: 'Keep bills and subscription costs in view. Follow dated inflation, economic, stock and ETF reporting, plus product recalls and health-related safety notices, with original source links to check the details.',
    tools: ['Bills & records', 'News & safety'], href: '/learn', action: 'Explore news and learning',
    detail: 'News helps you understand changing prices and safety notices. Check the source, date and the exact product affected by a recall. Market coverage is educational; GetGuac does not provide stock picks or buy/sell recommendations.',
  },
]

export default function WhyGetGuacPage() {
  return <MarketingShell>
    <MarketingHero eyebrow="Why GetGuac" title="Protect your wallet." accent="Choose with confidence."
      description="Your money, your priorities. GetGuac brings purchase history, price comparisons and spending plans together to help you consider offers thoughtfully and make choices that feel right for you."
      imageSrc="/home/story-people/openai-hero-giggling-family-baby-v2-768.webp" imageAlt="A family enjoying time together at home"
      secondaryHref="#consumer-protection" secondaryLabel="How GetGuac helps" />
    <section id="consumer-protection" aria-labelledby="protection-title" className="mx-auto max-w-6xl scroll-mt-24 py-6 sm:py-8">
      <h2 id="protection-title" className="text-3xl font-black text-slate-950">Less pressure. More perspective.</h2>
      <p className="mt-2 mb-5 max-w-3xl text-base leading-7 text-slate-600">Practical tools to help protect your spending decisions from price pressure, impulse buying and overlooked costs.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {protections.map(({ title, Icon, context, how, tools, href, action, detail }) => <article key={title} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5">
          <Icon size={25} className="mb-3 text-violet-700" aria-hidden="true" />
          <h3 className="text-xl font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-violet-700 md:min-h-12">{context}</p>
          <p className="mt-3 flex-1 text-sm leading-6 text-slate-700">{how}</p>
          <ul aria-label="GetGuac tools" className="mt-3 flex flex-wrap gap-2">{tools.map(tool => <li key={tool} className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{tool}</li>)}</ul>
          <details className="group mt-2 text-sm text-slate-600"><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600">What these terms mean<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" /></summary><p className="pb-3 leading-6">{detail}</p></details>
          <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-700">{action}<ArrowRight size={16} aria-hidden="true" /></Link>
        </article>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p className="max-w-3xl leading-6">Protection starts with a clearer picture. GetGuac supports your decisions with records and comparisons. You choose what to keep, change or follow up.</p>
        <Link href="/goals/recover.html" className="inline-flex min-h-11 items-center gap-2 font-bold text-violet-700"><RotateCcw size={16} aria-hidden="true" />Track returns and refunds</Link>
      </div>
    </section>
    <section className="mx-auto max-w-6xl py-8"><h2 className="mb-6 text-3xl font-black">A clear home for each part.</h2><MoneyGroupCards /></section>
    <ConversionBand />
  </MarketingShell>
}
