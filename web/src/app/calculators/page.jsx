import Image from 'next/image'
import MarketingShell from '../../components/MarketingShell'
import PlanCalculators, { CALC_COUNT } from '../../components/PlanCalculators'

// "Calculators", not "Plan & forecast". The nav's Learn menu calls this
// Calculators, the resources hub calls it Calculators, and the route is /plan —
// three names for one page. The visible name is now Calculators everywhere; the
// /plan URL stays so existing links and the sitemap keep working.
export const metadata = {
  title: 'Free calculators: retirement, college, debt payoff',
  description:
    'Free calculators to forecast retirement, healthcare in retirement, a college fund, debt payoff and an emergency fund. Enter your numbers — no account needed.',
  alternates: { canonical: '/calculators' },
}

// Copy from the approved design (demo/openai_new_homepage/resources/calculators.html).
// 🔴 Its metric pill read "14 plain-English calculators" — there are 16, so the
// count comes from CALC_COUNT rather than being retyped.
const STEPS = [
  ['Choose the real goal', 'Retirement, college, debt payoff, mortgage, healthcare or an emergency fund.'],
  ['Use honest inputs', 'Start with what the household can do now—not a perfect future month.'],
  ['Leave with one action', 'See the gap, the timeline and the next monthly move in dollars.'],
]

export default function PlanPage() {
  return (
    // No headerTitle: setting it makes MarketingShell swap the whole menu for a
    // centred page name, which is why this page had no navigation at all.
    <MarketingShell subtitle="calculators">
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <span className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              Plan the life behind the number
            </span>
            <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-[#15281C] sm:text-6xl"
                style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}>
              Turn a big goal into a next step.
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-7 text-gray-600">
              Rachel and Devon did not need another intimidating forecast. They needed to know what
              one realistic monthly move could do for retirement, college and their emergency cushion.
            </p>
            <span className="mt-6 inline-flex items-center rounded-xl bg-emerald-50 px-4 py-2.5 text-[15px] font-bold text-emerald-800 ring-1 ring-emerald-100">
              {CALC_COUNT} plain-English calculators
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <Image
              src="/home/campaign-story/family-payoff-v2.webp"
              alt="A family planning a money goal together"
              width={1536} height={1024} priority
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14">
        <span className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-emerald-700">
          A human-sized way through it
        </span>
        <h2 className="mt-2 border-b border-gray-200 pb-4 text-3xl font-extrabold tracking-tight text-[#15281C] sm:text-4xl"
            style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}>
          Three moments. One clearer next step.
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map(([head, body], i) => (
            <div key={head} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-[12px] font-bold text-emerald-700">0{i + 1}</div>
              <h3 className="mt-2 text-[19px] font-extrabold text-[#15281C]">{head}</h3>
              <p className="mt-2 text-[14.5px] leading-6 text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The design mocked a static checklist here because it had no working
          tool. The real calculators are the better version of that block, so
          they sit under the design's heading. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#15281C] sm:text-3xl"
            style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}>
          Calculators ready when the question arrives
        </h2>
      </section>

      <div className="pb-16 pt-4">
        <PlanCalculators />
      </div>
    </MarketingShell>
  )
}
