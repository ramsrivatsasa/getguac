import MarketingShell from '../../components/MarketingShell'
import MarketingHero from '../../components/MarketingHero'
import { MoneyGroupCards } from '../../components/MoneyJourney'
import ConversionBand from '../../components/ConversionBand'
export const metadata={title:'Why GetGuac: Your Money in Context',description:'Connect everyday money records to your budget, choices and longer-term goals.',alternates:{canonical:'/why-getguac'}}
export default function WhyGetGuacPage(){return <MarketingShell><MarketingHero eyebrow="Why GetGuac" title="The details matter." accent="So does the bigger picture." description="A purchase is one part of your money life. GetGuac brings records, budgeting and goals into the same journey, so you can move from information to a useful next step." imageSrc="/home/story-people/openai-hero-giggling-family-baby-v2-768.webp" imageAlt="A family enjoying time together at home" secondaryHref="/how-it-works" secondaryLabel="See how it works"/><section className="mx-auto max-w-6xl py-8"><h2 className="mb-6 text-3xl font-black">A clear home for each part.</h2><MoneyGroupCards/></section><ConversionBand/></MarketingShell>}
