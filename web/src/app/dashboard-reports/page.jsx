import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bookmark,
  BriefcaseBusiness,
  CalendarRange,
  Download,
  Gift,
  Lightbulb,
  PieChart,
  ReceiptText,
  Repeat2,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import ZoomableImage from '../get-started/ZoomableImage'

export const metadata = {
  title: 'GetGuac Dashboard & Reports: From Receipts to Useful Decisions',
  description: 'See everything in the GetGuac dashboard and Reports workspace, including spending patterns, subscriptions, business receipts, tax summaries, and CSV exports.',
  alternates: { canonical: '/dashboard-reports' },
}

const dashboardFeatures = [
  [CalendarRange, 'One timeframe everywhere', 'Switch between daily, weekly, monthly, yearly, and custom-count windows so the scores, transactions, and charts answer the same question.'],
  [Sparkles, 'Four decision signals', 'GuacScore, GuacWizard, GuacMoney, and Rewards summarize purchase value, financial health, savings captured, and benefits still available.'],
  [AlertTriangle, 'Spending anomalies', 'Surface unusual category or merchant behavior before it disappears inside a monthly total.'],
  [Bookmark, 'Saved searches', 'Keep products you are watching close, then move directly into personalized Steals when better offers appear.'],
  [WalletCards, 'Financial snapshot tiles', 'Review transactions, spending, tax, purchases, payments, interest, bank fees, and other costs for the selected period.'],
  [Store, 'Spending by store', 'Compare the merchants receiving the most money and open the underlying receipts directly from the chart.'],
  [Gift, 'Rewards and expirations', 'See useful rewards before they expire instead of discovering them after the value is gone.'],
  [ReceiptText, 'Recent transactions', 'Open the latest receipt records with merchant, date, amount, tax, and personal or business status.'],
]

const reportFeatures = [
  [PieChart, 'Spending by category', 'A dollar-based category breakdown with amount, share, and short-window trend comparisons.'],
  [Store, 'Top stores by spend', 'Sortable merchant totals, receipt counts, and average purchase amounts reveal concentration.'],
  [Repeat2, 'Repeat purchases', 'See items bought two or more times, including quantity, dollars, latest date, and stores.'],
  [Search, 'One-time orders', 'Separate single purchases from household staples so experiments and impulse buys are easier to review.'],
  [BriefcaseBusiness, 'Tax summary', 'Business spending, business tax, charitable giving, and recorded sales tax stay visible for the selected period.'],
  [Download, 'CSV export', 'Download verified business and charity rows with Date, Store, Category, Amount, Tax, Business, and Notes fields.'],
  [Tags, 'Subscriptions', 'Detected recurring merchants show cadence, average charge, latest charge, monthly cost, and price movement.'],
  [TrendingUp, 'Period comparisons', 'Use the same daily, weekly, monthly, yearly, and count controls to compare a consistent slice of history.'],
]

const taxRows = [
  ['Business', 'Receipts explicitly marked as business purchases', 'Spend, recorded tax, receipt count, and exportable source rows'],
  ['Charity', 'Receipts categorized as charity', 'Donation total, receipt count, and exportable source rows'],
  ['Sales tax paid', 'Positive tax amounts recorded on eligible purchase receipts', 'Tax total and the number of receipts contributing to it'],
  ['CSV export', 'Verified business and charity rows in the chosen period', 'Date, Store, Category, Amount, Tax, Business, and Notes'],
]

function SectionHeading({ eyebrow, title, body }) {
  return <div className="max-w-3xl">
    <p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15281C] sm:text-5xl">{title}</h2>
    {body && <p className="mt-5 text-lg leading-8 text-[#5C6B60]">{body}</p>}
  </div>
}

export default function DashboardReportsPage() {
  return <MarketingShell subtitle="Dashboard & Reports">
    <main className="bg-[#fffdf8] text-[#15281C]">
      <section className="border-b border-[#E4EDE4] bg-[radial-gradient(circle_at_88%_12%,rgba(104,185,238,.24),transparent_27%),radial-gradient(circle_at_12%_86%,rgba(240,184,74,.20),transparent_26%),linear-gradient(145deg,#fff5dc,#eff9e8_58%,#fff)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe5d2] bg-white/85 px-3 py-1.5 text-xs font-black uppercase tracking-[.15em] text-[#168A4B]"><BarChart3 size={15}/> The story behind the totals</span>
            <h1 className="mt-5 text-4xl font-black sm:text-6xl">Your dashboard tells you <span className="text-[#168A4B]">what needs attention.</span> Reports explain why.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#45564A]">A saved receipt is more than proof of purchase. Across time, it becomes a record of stores, categories, tax, subscriptions, repeated items, business costs, rewards, refunds, and the decisions that shaped the month.</p>
            <p className="mt-3 max-w-xl font-extrabold">The dashboard is the briefing. Reports is the evidence behind it.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/dashboard" className="btn-primary">Open my dashboard <ArrowRight size={17}/></Link><Link href="/reports" className="btn-secondary">Open Reports</Link></div>
          </div>
          <figure className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#f48c78]"/>
            <img className="relative aspect-[4/3] w-full rounded-[28px] object-cover shadow-2xl shadow-[#12341f]/15" src="/home/campaign-story/capture-kitchen-v2.webp" alt="A shopper saving a receipt so everyday spending can become useful insight" width="1536" height="1024"/>
            <figcaption className="absolute -bottom-4 left-4 rounded-2xl border border-[#cfe5d2] bg-white px-4 py-3 shadow-xl"><span className="block text-[10px] font-black uppercase tracking-[.14em] text-[#168A4B]">One receipt at a time</span><strong className="text-sm">Capture it. Understand it. Act on it.</strong></figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading eyebrow="Dashboard: your financial briefing" title="Much more than a shortcut to Reports." body="The dashboard brings the most time-sensitive signals together. It helps answer: What changed? What deserves attention today? Where can I act before money, a return window, a reward, or a better price is lost?"/>
        <div className="mt-10 overflow-hidden rounded-[30px] border border-[#E4EDE4] bg-[#eff9e8] p-4 shadow-xl shadow-[#12341f]/10"><ZoomableImage src="/marketing/slides/v2/dashboard-web.webp" alt="GetGuac desktop dashboard showing decision scores, spending anomalies, saved searches, personalized deals, and navigation to every money feature" width={1200} height={750}/></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardFeatures.map(([Icon,title,body],index)=><article key={title} className={`rounded-3xl border border-[#E4EDE4] p-5 ${['bg-[#fff5dc]','bg-[#eff9e8]','bg-[#fff0ec]','bg-[#eaf7ff]'][index%4]}`}><Icon size={22} className={['text-[#d97706]','text-[#168A4B]','text-[#c85f4e]','text-[#397ea8]'][index%4]}/><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5C6B60]">{body}</p></article>)}
        </div>
      </section>

      <section className="border-y border-[#cfe5d2] bg-[#eaf7ff] py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.72fr_1fr]">
          <div className="mx-auto w-full max-w-[340px] rounded-[34px] bg-white p-4 shadow-2xl shadow-[#68b9ee]/15"><ZoomableImage src="/showcase/dashboard.png" alt="GetGuac mobile dashboard showing GuacScore, GuacWizard, spending anomalies, financial tiles, and spending by store" width={560} height={1216}/></div>
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">The same story on mobile</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Check the signal while the decision is still fresh.</h2><p className="mt-5 text-lg leading-8 text-[#45564A]">The mobile dashboard keeps the period controls, decision scores, anomalies, financial cards, and store chart close. That makes it useful after checkout, during a weekly review, or before returning to a store.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><p className="rounded-2xl bg-white p-4 font-bold">Tap a store bar to reach its receipts.</p><p className="rounded-2xl bg-white p-4 font-bold">Open Worth-It or Guacanomics from the top.</p><p className="rounded-2xl bg-white p-4 font-bold">Review unusual spending before it repeats.</p><p className="rounded-2xl bg-white p-4 font-bold">Add the next receipt without leaving the flow.</p></div></div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1fr]">
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#168A4B]">Dashboard and Reports work together</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Turn a household question into a useful next step.</h2><p className="mt-5 text-lg leading-8 text-[#5C6B60]">A household may notice an anomaly on the dashboard, open Reports to compare the category and merchants behind it, then return to the receipt or recurring charge that needs action. The value is not another chart—it is a shorter path from “something changed” to “here is what we will do.”</p><div className="mt-6 rounded-3xl bg-[#fff5dc] p-6"><p className="font-black text-[#d97706]">A practical example</p><p className="mt-2 leading-7 text-[#45564A]">The dashboard flags a household-category jump. Reports shows one store and two repeated items caused most of it. The family keeps the useful staple, changes the duplicate purchase, and checks next month to see whether the pattern improved.</p></div></div>
          <figure className="overflow-hidden rounded-[28px] shadow-xl shadow-[#12341f]/10"><img className="aspect-[16/10] w-full object-cover" src="/home/campaign-story/family-payoff-v2.webp" alt="A family using their spending history to make a calmer household decision" width="1536" height="1024"/></figure>
        </div>
      </section>

      <section className="border-y border-[#E4EDE4] bg-[#F1F8EE] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading eyebrow="Reports: the evidence workspace" title="Compare the dollars behind the dashboard signals." body="Reports groups the selected receipt history into categories, stores, items, subscriptions, and tax-preparation summaries. It is designed for questions that need more than a headline number."/>
          <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1fr_.38fr]">
            <div className="overflow-hidden rounded-[28px] border border-[#E4EDE4] bg-white p-4 shadow-xl shadow-[#12341f]/10"><ZoomableImage src="/marketing/slides/v2/reports-web.webp" alt="GetGuac desktop Reports workspace showing spending by category, tax summary, recurring subscriptions, and period controls" width={1200} height={750}/></div>
            <div className="mx-auto w-full max-w-[310px] rounded-[32px] bg-white p-3 shadow-xl shadow-[#12341f]/10"><ZoomableImage src="/showcase/reports.png" alt="GetGuac mobile Reports workspace showing category spending, tax summary, and CSV export" width={560} height={1216}/></div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reportFeatures.map(([Icon,title,body],index)=><article key={title} className={`rounded-3xl border border-[#E4EDE4] p-5 ${index%2===0?'bg-white':'bg-[#fffdf8]'}`}><Icon size={22} className="text-[#168A4B]"/><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5C6B60]">{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-[#fff5dc] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <figure className="overflow-hidden rounded-[28px] shadow-xl shadow-[#12341f]/10"><img className="aspect-[16/10] w-full object-cover" src="/home/story-people/prepare.webp" alt="A couple organizing receipts and reviewing spending records together" width="1200" height="800"/></figure>
            <SectionHeading eyebrow="Business and tax preparation" title="Build the record during the year—not the scramble at the end." body="When a receipt is saved and reviewed while the purchase is still familiar, its merchant, date, amount, tax, category, business status, and notes are easier to verify. Reports then gathers the relevant rows into a period summary and export."/>
          </div>

          <div className="mt-10 overflow-hidden rounded-[28px] border border-[#ead9ad] bg-white p-4 shadow-xl shadow-[#12341f]/10"><ZoomableImage src="/home/goals/web-tax.webp" alt="GetGuac desktop Tax summary showing business spending, charitable giving, sales tax paid, and Export CSV" width={1200} height={280}/></div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[.38fr_1fr] lg:items-center">
            <div className="mx-auto w-full max-w-[300px] rounded-[32px] bg-white p-3 shadow-xl shadow-[#12341f]/10"><ZoomableImage src="/home/goals/phone-tax.webp" alt="GetGuac mobile Tax summary showing business, charity, sales-tax, and recurring-charge details" width={600} height={1260}/></div>
            <div>
              <h3 className="text-2xl font-black sm:text-3xl">What the tax summary actually does</h3>
              <div className="mt-6 overflow-x-auto rounded-3xl border border-[#ead9ad] bg-white"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-[#fff0ec] text-[11px] font-black uppercase tracking-[.1em] text-[#c85f4e]"><tr><th className="px-5 py-4">View</th><th className="px-5 py-4">What enters it</th><th className="px-5 py-4">What it provides</th></tr></thead><tbody>{taxRows.map(([view,input,output])=><tr key={view} className="border-t border-[#E4EDE4]"><th scope="row" className="whitespace-nowrap px-5 py-4">{view}</th><td className="px-5 py-4 text-sm leading-6 text-[#5C6B60]">{input}</td><td className="px-5 py-4 text-sm leading-6 text-[#5C6B60]">{output}</td></tr>)}</tbody></table></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <article className="rounded-2xl bg-[#eff9e8] p-5"><ShieldCheck className="text-[#168A4B]" size={22}/><h4 className="mt-3 font-black">Cleaner business review</h4><p className="mt-2 text-sm leading-6 text-[#5C6B60]">Separate receipts marked business from personal purchases, preserve the source record, and include a short note when context matters.</p></article>
                <article className="rounded-2xl bg-[#eaf7ff] p-5"><Download className="text-[#397ea8]" size={22}/><h4 className="mt-3 font-black">Accountant-ready starting point</h4><p className="mt-2 text-sm leading-6 text-[#5C6B60]">Export business and charity rows, then review classifications and supporting documents with your accountant or tax software.</p></article>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-[#f0b84a]/40 bg-white p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#d97706]">Important recordkeeping distinction</p>
            <p className="mt-3 leading-7 text-[#45564A]">GetGuac organizes the purchase data you save; it does not decide whether an expense or contribution is deductible, replace required supporting documents, or provide tax advice. Confirm classifications, eligibility, and retention requirements with a qualified professional. The IRS says business records should clearly show income and expenses and supporting documents should identify details such as payee, amount, date, proof of payment, and what was purchased. Charitable contributions can require specific bank records, receipts, or written acknowledgments.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-[#168A4B]"><a href="https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep" target="_blank" rel="noopener noreferrer">IRS business recordkeeping <ArrowRight className="inline" size={14}/></a><a href="https://www.irs.gov/publications/p526" target="_blank" rel="noopener noreferrer">IRS Publication 526 <ArrowRight className="inline" size={14}/></a></div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading eyebrow="Useful in real life" title="Reporting should end with a decision, not another tab." body="The best report visit starts with one question and ends with one action. Choose a period, inspect the relevant category, store, item, subscription, or tax row, then change or protect one part of the pattern."/>
          <div className="mt-10 grid items-center gap-8 overflow-hidden rounded-[30px] border border-[#E4EDE4] bg-[#eaf7ff] p-5 sm:p-7 lg:grid-cols-[1.05fr_.95fr]">
            <figure className="overflow-hidden rounded-[24px]"><img className="aspect-[16/10] w-full object-cover" src="/home/campaign-story/roommates-plan-v2.webp" alt="Friends reviewing shared purchases and choosing one spending pattern to improve" width="1536" height="1024"/></figure>
            <div className="p-2 sm:p-4"><p className="text-xs font-black uppercase tracking-[.15em] text-[#397ea8]">A five-minute review can be enough</p><h3 className="mt-3 text-2xl font-black sm:text-4xl">The useful story is the one people can recognize themselves in.</h3><p className="mt-4 leading-7 text-[#45564A]">Maybe roommates are separating shared groceries from personal purchases. Maybe a couple is checking why one category climbed. Maybe a freelancer is finding business receipts before meeting an accountant. The same Reports workspace starts with different human questions—and keeps the underlying receipt close enough to verify the answer.</p></div>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="rounded-3xl border border-[#E4EDE4] bg-[#eff9e8] p-6"><p className="text-xs font-black text-[#168A4B]">HOUSEHOLD</p><h3 className="mt-2 text-xl font-black">“Why was this month more expensive?”</h3><p className="mt-3 leading-7 text-[#5C6B60]">Compare category share, top stores, repeat items, and one-time orders. Keep the spending that supported the household and investigate the concentrated change.</p></article>
            <article className="rounded-3xl border border-[#E4EDE4] bg-[#fff0ec] p-6"><p className="text-xs font-black text-[#c85f4e]">BUSINESS</p><h3 className="mt-2 text-xl font-black">“Are my source records organized?”</h3><p className="mt-3 leading-7 text-[#5C6B60]">Review receipts marked business, recorded tax, notes, and original receipt details before exporting the period for professional review.</p></article>
            <article className="rounded-3xl border border-[#E4EDE4] bg-[#eaf7ff] p-6"><p className="text-xs font-black text-[#397ea8]">PERSONAL HABITS</p><h3 className="mt-2 text-xl font-black">“What keeps quietly repeating?”</h3><p className="mt-3 leading-7 text-[#5C6B60]">Inspect subscriptions, price increases, repeat purchases, saved searches, and Worth-It outcomes to decide what still deserves a place.</p></article>
          </div>
          <div className="mt-10 rounded-3xl bg-[linear-gradient(135deg,#fff5dc,#fff0ec_52%,#eff9e8)] p-8 text-center"><Lightbulb className="mx-auto text-[#d97706]" size={28}/><h2 className="mt-4 text-2xl font-black sm:text-3xl">Ask one useful question. Follow it to the receipt.</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-[#5C6B60]">Start with the dashboard signal, use Reports to understand the pattern, and keep the source records close enough to verify the story.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/dashboard" className="btn-primary">Open Dashboard <ArrowRight size={17}/></Link><Link href="/reports" className="btn-secondary">Open Reports</Link><Link href="/get-started#step-08" className="btn-secondary">Return to Get Started</Link></div></div>
        </div>
      </section>
    </main>
  </MarketingShell>
}
