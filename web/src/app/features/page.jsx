import { publicMetadata } from '../../lib/public-seo.mjs'
import MarketingShell from '../../components/MarketingShell'
import MarketingHero from '../../components/MarketingHero'
import { MoneyGroupCards, MoneyFeatureDirectory, MoneyAssistant } from '../../components/MoneyJourney'
import ConversionBand from '../../components/ConversionBand'
export const metadata = publicMetadata('/features', 'Receipt Scanning, Budgeting & Savings Tools', 'Explore GetGuac tools for receipt scanning, income and expense tracking, budgets, savings goals, recurring bills, returns and refund records.')
export default function FeaturesPage(){return <MarketingShell><MarketingHero eyebrow="The GetGuac toolkit" title="A place for every" accent="part of your money life." description="Start with what matters today: getting organized, understanding the month, or protecting your next goal." primaryHref="/register" primaryLabel="Start free" secondaryHref="#all-tools" secondaryLabel="Browse the tools" imageSrc="/home/story-people/openai-hero-giggling-family-baby-v2-768.webp" imageAlt="A family spending time together at home"/>
 <section className="mx-auto max-w-6xl py-8"><h2 className="mb-6 text-3xl font-black">Three groups. One connected picture.</h2><MoneyGroupCards/></section>
 <section id="all-tools" className="mx-auto max-w-6xl scroll-mt-24 py-8"><h2 className="mb-3 text-3xl font-black">Find the tool you need.</h2><p className="mb-6 leading-7 text-slate-600">Choose a group to find your next tool. Some tools require sign-in.</p><MoneyFeatureDirectory/></section><MoneyAssistant/><ConversionBand/></MarketingShell>}
