import Link from 'next/link'
import { ArrowRight, Brain, Camera, Gauge, ShieldCheck, Star, TrendingUp, WalletCards } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import ZoomableImage from '../get-started/ZoomableImage'

export const metadata = {
  title: 'GuacScore: Know Whether Your Spending Was Worth It',
  description: 'Learn how GetGuac turns your Worth-It ratings, purchase amounts, and avoidable bank costs into a personal 0–100 GuacScore.',
  alternates: { canonical: '/guacscore' },
}

const bands = [
  ['90–100', 'Smash Master', 'Most rated dollars consistently delivered strong value.', 'Protect the habits and reasons behind your best decisions.'],
  ['75–89', 'Solid Smasher', 'The majority of rated spending felt worthwhile, with a few weaker decisions.', 'Review the largest low-rated purchases before changing what already works.'],
  ['60–74', 'Steady Guac', 'Rated spending shows a useful foundation alongside visible opportunities.', 'Choose one repeated store, category, fee, or buying trigger to improve.'],
  ['40–59', 'Treat Mode', 'A meaningful share of rated dollars did not deliver the expected value.', 'Start with expensive regrets and purchases that may still be returned.'],
  ['0–39', 'Just Starting', 'The current rated spending needs attention or the score has limited rating history.', 'Add honest ratings, read the reasons, and improve one decision at a time.'],
]

export default function GuacScorePage() {
  return <MarketingShell subtitle="GuacScore">
      <main className="bg-[#fffdf8] text-[#15281C]">
      <section className="border-b border-[#E4EDE4] bg-[radial-gradient(circle_at_88%_10%,rgba(104,185,238,.25),transparent_28%),radial-gradient(circle_at_12%_85%,rgba(244,140,120,.18),transparent_26%),linear-gradient(145deg,#fff5dc,#eff9e8_58%,#fff)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f0b84a]/35 bg-[#fff5dc] px-3 py-1.5 text-xs font-black uppercase tracking-[.15em] text-[#12341f]"><Gauge size={15}/> A clearer spending life</span>
            <h1 className="mt-5 text-4xl font-black sm:text-6xl">See what your money <span className="text-[#168A4B]">gave back.</span></h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#45564A]">GetGuac turns everyday receipts into a story you can learn from—what helped, what disappointed, what quietly repeated, and what deserves a different choice next time.</p>
            <p className="mt-3 max-w-xl font-extrabold text-[#15281C]">GuacScore makes that progress visible without judging the life behind the purchase.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/validate" className="btn-primary">Rate a purchase <ArrowRight size={17}/></Link><Link href="/get-started#step-11" className="btn-secondary">Return to Get Started</Link></div>
          </div>
          <figure className="relative mx-auto w-full max-w-[500px]">
            <div className="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-[#f0b84a]"/>
            <img className="relative aspect-[4/3] w-full rounded-[28px] object-cover object-[38%_center] shadow-2xl shadow-[#12341f]/15" src="/home/story-people/family-tablet-hero-v3.webp" alt="A family enjoying a clearer view of their spending together" width="1200" height="800"/>
            <figcaption className="absolute -bottom-4 right-4 rounded-2xl border border-[#cfe5d2] bg-white px-4 py-3 shadow-xl"><span className="block text-[10px] font-black uppercase tracking-[.14em] text-[#168A4B]">The GetGuac habit</span><strong className="text-sm">See it. Rate it. Improve it.</strong></figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[.72fr_1fr]">
          <div className="mx-auto w-full max-w-[350px] rounded-[34px] bg-gradient-to-br from-[#fff5dc] via-[#eff9e8] to-[#eaf7ff] p-4 shadow-2xl shadow-[#12341f]/15"><ZoomableImage src="/home/goals/phone-guacscore.webp" alt="GetGuac mobile GuacScore showing a score, grade, rated purchases, bank costs, and spending trend" width={600} height={1260}/></div>
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">One story, many helpers</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Better habits begin with better memory.</h2><p className="mt-5 text-lg leading-8 text-[#5C6B60]">Most spending disappears into a bank total. GetGuac keeps the useful context—the items, the reason, the feeling afterward, and the money you may still recover—so each purchase can improve the next one.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                [Camera,'Capture what happened','Receipts and email records preserve the items, store, tax, total, and return context.'],
                [Brain,'Understand the pattern','Guac AI, reports, categories, and subscriptions turn scattered purchases into something explainable.'],
                [Star,'Decide what was worth it','A two-second Worth-It rating teaches GuacScore what value means in your real life.'],
                [ShieldCheck,'Protect the progress','Bills, returns, GuacWizard, Stash, Steals, and Shopping List help the next decision arrive with more context.'],
              ].map(([Icon,title,body],index)=><article key={title} className={`rounded-2xl border border-[#E4EDE4] p-5 ${['bg-[#fff5dc]','bg-[#eaf7ff]','bg-[#fff0ec]','bg-[#f1efff]'][index]}`}><Icon className={['text-[#d97706]','text-[#168A4B]','text-[#f48c78]','text-[#8a7cf4]'][index]} size={22}/><h3 className="mt-3 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5C6B60]">{body}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#f0b84a]/25 bg-[#fff5dc] py-16 sm:py-20"><div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.16em] text-[#d97706]">How GuacScore works</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Your ratings shape the score. The rest completes the story.</h2><p className="mt-4 text-lg leading-8 text-[#5C6B60]">GuacScore is not a credit score and does not judge necessary spending. It scores the purchases you rate, weights them by their dollar amount, and accounts for avoidable bank costs in the same period.</p></div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Star, 'Rate the purchase', 'Give a saved purchase a one-to-five Worth-It rating. Unrated purchases are excluded from the score.'],
            [WalletCards, 'Weight by the dollars', 'Purchase amount matters. A costly regret affects the score more than a small disappointing purchase.'],
            [TrendingUp, 'Account for quiet leaks', 'When available for the same period, interest and bank fees can reduce the score by a capped Bank Bite penalty.'],
            [ShieldCheck, 'Track money returned', 'Refunds reduce Net Spent and appear in the spending trend. Refund rows are tracked separately instead of being treated as newly rated purchases.'],
          ].map(([Icon,title,body],index)=><article key={title} className="rounded-3xl border border-[#ead9ad] bg-white p-6 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${['bg-[#eff9e8] text-[#168A4B]','bg-[#eaf7ff] text-[#168A4B]','bg-[#fff0ec] text-[#f48c78]','bg-[#f1efff] text-[#8a7cf4]'][index]}`}><Icon size={20}/></span><p className="mt-5 text-xs font-black text-[#d97706]">0{index+1}</p><h3 className="mt-1 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-[#5C6B60]">{body}</p></article>)}
        </div>
      </div></section>

      <section className="border-b border-[#E4EDE4] bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.95fr_1.05fr]">
          <figure className="overflow-hidden rounded-[28px] shadow-xl shadow-[#12341f]/10"><img className="aspect-[16/10] w-full object-cover" src="/home/campaign-story/roommates-plan-v2.webp" alt="Friends reviewing shared purchases and discussing which spending decisions delivered value" width="1536" height="1024"/></figure>
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">The useful conversation</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">A score matters when it leads to one honest question.</h2><p className="mt-5 text-lg leading-8 text-[#5C6B60]">Was the purchase essential, important, simply OK, an intentional splurge, or a regret? GuacScore helps a person—or a household—review the outcome without turning the conversation into blame.</p><p className="mt-4 rounded-2xl bg-[#eff9e8] p-5 font-bold leading-7 text-[#12341f]">The goal is not a perfect number. It is a clearer reason for what you choose to repeat next month.</p></div>
        </div>
      </section>

      <section className="border-b border-[#cfe5d2] bg-[#eaf7ff] py-16 text-[#15281C] sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr]">
          <div className="overflow-hidden rounded-[28px] border border-white bg-white p-4 shadow-xl shadow-[#68b9ee]/15"><ZoomableImage src="/marketing/slides/v2/guacanomics-web.webp" alt="GetGuac web Guacanomics screen showing GuacScore, Worth-It ratings, spending, refunds, fees, and trends" width={1200} height={800}/></div>
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">Read the pattern</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">The number is the start, not the verdict.</h2><p className="mt-5 text-lg leading-8 text-[#45564A]">Use the score with its supporting details: how many purchases you rated, the dollars represented, your Worth-It mix, and any Bank Bite penalty. A score built from two ratings is an invitation to add context—not a conclusion.</p><ul className="mt-6 space-y-3 text-[#45564A]"><li>• Change the time window to compare recent and longer-term patterns.</li><li>• Rate more purchases before treating a short-term movement as meaningful.</li><li>• Open expensive low-rated purchases and ask what you would do differently.</li></ul></div>
        </div>
      </section>

      <section className="border-b border-[#E4EDE4] bg-[#F1F8EE] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">What Guacanomics has</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">The score, the dollars, and the patterns behind both.</h2><p className="mt-5 text-lg leading-8 text-[#5C6B60]">Guacanomics is the full analysis page behind GuacScore. Choose 30 days, 90 days, 12 months, or all time; every total and chart updates to the same period so the picture stays comparable.</p></div>
          <div className="mt-12"><p className="text-xs font-black uppercase tracking-[.15em] text-[#168A4B]">Your summary strip</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Net Spent','Gross purchases minus refunds: the amount that actually stayed spent.'],
              ['Refunded','Money returned in the selected period, plus the number of completed returns.'],
              ['Bank Bite','Interest and fees shown separately so avoidable costs cannot hide inside purchases.'],
              ['Receipts','Purchase count and average receipt amount for the selected period.'],
              ['Tax Paid','Total tax recorded, with business-purchase dollars shown underneath.'],
            ].map(([title,body],index)=><article key={title} className={`rounded-2xl border border-[#E4EDE4] p-5 ${['bg-[#eff9e8]','bg-[#fff0ec]','bg-[#fff5dc]','bg-[#eaf7ff]','bg-[#f1efff]'][index]}`}><h3 className="text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5C6B60]">{body}</p></article>)}
          </div></div>

          <div className="mt-12"><p className="text-xs font-black uppercase tracking-[.15em] text-[#168A4B]">See where the money moved</p><div className="mt-4 grid gap-5 md:grid-cols-2">
            {[
              ['Spending Trend','Plots purchases and refunds month by month. Use it to see whether a spike was lasting spending or money that later came back.'],
              ['Top Stores','Ranks up to eight merchants by purchase dollars. The bars make concentration visible before individual transactions blur together.'],
              ['Purchases vs Refunds','Compares gross purchases with returned money and places Net Out in the center of the chart.'],
              ['Spend by Category','Shows category receipts, dollars, and percentage share. Bank Bite appears as its own category when fees or interest exist.'],
            ].map(([title,body])=><article key={title} className="rounded-3xl border border-[#E4EDE4] bg-white p-6"><h3 className="text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-[#5C6B60]">{body}</p></article>)}
          </div></div>

          <div className="mt-12"><p className="text-xs font-black uppercase tracking-[.15em] text-[#168A4B]">Understand whether it was worth it</p><div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              ['Worth-It overview','Summarizes the average star rating, regret dollars, and how many purchases still need a rating.'],
              ['Spend by Rating','Groups rated purchase dollars into Essential, Important, OK, Splurge, and Regret—not merely a count of taps.'],
              ['Rating Coverage','Shows rated purchases against total purchases. More coverage makes GuacScore more representative.'],
              ['Top Tags','Surfaces recurring reasons such as “on sale,” “impulse,” or “needed it” after those tags appear in ratings.'],
              ['Biggest Spends','Lists the five largest purchases with store, date, amount, tax, and business status for focused review.'],
              ['GuacScore','Combines rated-purchase value, dollar weighting, and the capped Bank Bite deduction into the 0–100 signal.'],
            ].map(([title,body])=><article key={title} className="rounded-3xl border border-[#E4EDE4] bg-white p-6"><h3 className="text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-[#5C6B60]">{body}</p></article>)}
          </div></div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-[#E4EDE4] bg-white"><div className="bg-[#fff0ec] px-6 py-5 text-[#15281C]"><h3 className="text-2xl font-black">How the key numbers are calculated</h3></div>{[
            ['Net Spent','Gross purchase dollars − refunded dollars'],
            ['Average Receipt','Gross purchase dollars ÷ purchase count'],
            ['Category Share','Category dollars ÷ all categorized dollars in the range'],
            ['Regret Dollars','Spend rated Splurge or Regret, with Bank Bite included as regret when present'],
            ['GuacScore','Dollar-weighted Worth-It ratings, minus a capped penalty for interest and fees'],
          ].map(([label,formula])=><div key={label} className="grid gap-1 border-b border-[#E4EDE4] px-6 py-4 last:border-0 sm:grid-cols-[180px_1fr]"><strong>{label}</strong><span className="text-[#5C6B60]">{formula}</span></div>)}</div>
          <div className="mt-8 rounded-3xl border border-[#cfe5d2] bg-white p-7"><h3 className="text-2xl font-black">How to use it to improve a habit</h3><div className="mt-5 grid gap-5 text-[#45564A] md:grid-cols-3"><p className="rounded-2xl bg-[#eff9e8] p-4"><strong className="block text-[#168A4B]">1. Complete the picture</strong>Rate a few recent purchases and confirm returns or refunds.</p><p className="rounded-2xl bg-[#fff5dc] p-4"><strong className="block text-[#d97706]">2. Find one costly pattern</strong>Look at regret dollars, Bank Bite, top stores, and category concentration.</p><p className="rounded-2xl bg-[#fff0ec] p-4"><strong className="block text-[#c85f4e]">3. Change one repeat decision</strong>Keep what delivered value and adjust one purchase, fee, or subscription before it repeats.</p></div></div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center"><p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">Understand your score</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Encouraging at every stage.</h2></div>
        <div id="score-definitions" className="mt-9 overflow-x-auto rounded-3xl border border-[#E4EDE4] bg-white">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-[#eff9e8] text-[11px] font-black uppercase tracking-[.1em] text-[#168A4B]"><tr><th className="px-5 py-4">Score</th><th className="px-5 py-4">Stage</th><th className="px-5 py-4">What it means</th><th className="px-5 py-4">Useful next step</th></tr></thead>
            <tbody>{bands.map(([range,label,meaning,next])=><tr key={range} className="border-t border-[#E4EDE4]"><th scope="row" className="whitespace-nowrap px-5 py-4 text-[#168A4B]">{range}</th><td className="whitespace-nowrap px-5 py-4 font-bold">{label}</td><td className="px-5 py-4 text-sm leading-6 text-[#5C6B60]">{meaning}</td><td className="px-5 py-4 text-sm leading-6 text-[#5C6B60]">{next}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-10 rounded-3xl border border-[#f0b84a]/30 bg-[linear-gradient(135deg,#fff5dc,#fff0ec_52%,#eff9e8)] p-7 text-center"><h2 className="text-2xl font-black">Build a score from your real life.</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-[#5C6B60]">Start with a small group of recent purchases. Rate them honestly, then revisit GuacScore as your history becomes more representative.</p><Link href="/validate" className="btn-primary mt-6">Open Worth-It <ArrowRight size={17}/></Link></div>
      </section>
    </main>
  </MarketingShell>
}
