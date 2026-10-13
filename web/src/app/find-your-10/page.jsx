import MarketingShell from '../../components/MarketingShell'
import MarketingHero from '../../components/MarketingHero'
import TenPercentTeaser from '../../components/TenPercentTeaser'
import TrustLine from '../../components/TrustLine'
import { PlanClosing, PlanFamilyAndPrivacy, PlanFaq, PlanFourWeeks, PlanGoalAndProgress, PlanSavingsGrowth, PlanSetupSteps, PlanWealthEducation } from '../../components/TenPercentSections'

// The "Find your 10%" landing page from the v6.3 plan (screens A1/A2, section 1).
// Like /join it is an ad destination, so it stays out of search results and
// does not compete with the homepage.
export const metadata = {
  title: 'Find 10% of your income | GetGuac',
  description: 'Save 10% of your monthly income by spending less and earning more. GetGuac shows results as soon as you add your expenses. Free, no bank login.',
  alternates: { canonical: '/find-your-10' },
  robots: { index: false, follow: true },
}

export default function FindYourTenPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="The GetGuac 10% plan"
        title="Find 10% of your income."
        accent="Save it or earn it."
        description="GetGuac helps you save 10% of what you bring home each month by cutting spending, lowering bills, making your money earn more and finding cheaper options, with results as soon as you add your expenses."
        primaryHref="/register"
        primaryLabel="Start my 10% plan"
        secondaryHref="#how-it-works"
        secondaryLabel="How it works"
        trustText="Free · No card · No bank login"
      >
        <TenPercentTeaser />
      </MarketingHero>
      <TrustLine className="mb-4" />
      <PlanSetupSteps />
      <PlanFourWeeks />
      <PlanGoalAndProgress />
      <PlanSavingsGrowth />
      <PlanWealthEducation />
      <PlanFamilyAndPrivacy />
      <PlanFaq />
      <PlanClosing />
    </MarketingShell>
  )
}
