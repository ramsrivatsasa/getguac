import Link from 'next/link'
import { ArrowRight, Camera, Check, Clock3, Inbox, Lightbulb, LockKeyhole, Receipt, Sparkles } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import ZoomableImage from './ZoomableImage'
import GuideHeroSlideshow from './GuideHeroSlideshow'
import FeatureExplorer from './FeatureExplorer'

export const metadata = {
  title: 'The ultimate GetGuac get-started guide',
  description: 'Set up GetGuac step by step: scan a receipt, automate your inbox, understand your spending, find subscriptions, plan bills, and protect every return window.',
  alternates: { canonical: '/get-started' },
}

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

const GS_CSS = `
.gg-guide { --ink:#16331f; --lime:#b8ef52; --cream:#fbf8ec; --sage:#eaf4df; }
.gg-hero { background:radial-gradient(circle at 82% 12%,rgba(184,239,82,.32),transparent 27%),linear-gradient(145deg,#f7f3df 0%,#eef7e7 58%,#fff 100%); }
.gg-grid { display:grid; grid-template-columns:240px minmax(0,1fr); gap:52px; align-items:start; }
.gg-toc { position:sticky; top:92px; }
.gg-chapter { scroll-margin-top:100px; }
.gg-step { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,.86fr); gap:34px; align-items:center; }
.gg-step:nth-child(even) .gg-copy { order:2; }
.gg-step:nth-child(even) .gg-visual { order:1; }
.gg-visual { position:relative; overflow:hidden; border-radius:28px; padding:22px; background:linear-gradient(145deg,#eef8df,#d8efb1); box-shadow:0 24px 70px -40px rgba(22,51,31,.75); }
.gg-visual img { width:100%; display:block; border-radius:17px; border:1px solid rgba(22,51,31,.1); background:white; }
.gg-visual.phone img { width:64%; margin:auto; border-radius:24px; }
.gg-visual button img { transition:transform .25s ease; }
.gg-visual button:hover img { transform:scale(1.015); }
.gg-feature-shot { overflow:hidden; border-radius:24px; background:#eaf4df; padding:14px; }
.gg-feature-shot img { display:block; border-radius:14px; border:1px solid rgba(22,51,31,.1); background:white; }
.gg-tip { background:#173d27; color:#fff; box-shadow:0 24px 70px -45px rgba(9,32,17,.8); }
@media (max-width:900px) { .gg-grid{grid-template-columns:1fr;gap:28px}.gg-toc{position:static}.gg-step{grid-template-columns:1fr}.gg-step:nth-child(even) .gg-copy,.gg-step:nth-child(even) .gg-visual{order:initial} }
@media (max-width:600px) { .gg-visual{padding:14px;border-radius:22px}.gg-visual.phone img{width:72%} }
`

const chapters = [
  { id: 'first-receipt', label: '1. Capture the real picture' },
  { id: 'make-automatic', label: '2. Make it automatic' },
  { id: 'read-patterns', label: '3. Read your patterns' },
  { id: 'protect-money', label: '4. Protect your money' },
  { id: 'rhythm', label: '5. Keep the habit easy' },
]

const steps = [
  { n:'01', chapter:'first-receipt', icon:Camera, title:'Start with one real receipt', body:'Use the no-account trial before you set anything up. Photograph a receipt from a store you actually use. Guac-AI reads the merchant, date, tax, total, and individual items so you can judge the result for yourself.', why:'A real receipt answers the only question that matters at the start: will this save me from typing?', action:['/join?try=receipt','Try one receipt'], shot:['/home/goals/phone-receipts.webp','The GetGuac mobile receipts screen showing captured purchases','phone'] },
  { n:'02', chapter:'first-receipt', icon:Receipt, title:'Create your free home for receipts', body:'When the result looks right, create an account with Google or email. Choose a handle you will remember; it also becomes your private @getguac.app receipt address.', why:'Your first trial is temporary. An account lets every new receipt build a useful, searchable history.', action:['/register','Create a free account'] },
  { n:'03', chapter:'make-automatic', icon:Inbox, title:'Send digital receipts straight to GetGuac', body:'Use your GetGuac address at online checkout, forward emailed receipts, or opt in to the inbox connection. New receipts can then arrive and be read without another photo.', why:'Automation is the difference between a tracker you forget and a system that quietly stays current.', note:'You stay in control. Inbox reading is opt-in and can be turned off from your profile.', action:['/how-email-works','See how email receipts work'], shot:['/home/goals/web-receipts.webp','GetGuac receipt history populated from email receipts'] },
  { n:'04', chapter:'make-automatic', icon:Sparkles, title:'Let Guac-AI organize what you actually bought', body:'GetGuac categorizes the items inside a receipt—not only the store total. A supermarket run can become groceries, household supplies, pet care, and more instead of one vague transaction.', why:'Item-level detail turns “Where did it go?” into an answer you can use.', action:['/how-it-works','Follow a receipt through GetGuac'], shot:['/home/goals/web-organized.webp','Line-item spending organized into useful categories'] },
  { n:'05', chapter:'make-automatic', icon:Receipt, title:'Add statements only when they help', body:'Receipt-first tracking works on its own. If you want broader coverage, import a supported bank or card statement PDF, review the rows, and keep only the records that add useful context.', why:'Statements can fill gaps without requiring a bank login or replacing the more detailed story inside your receipts.', action:['/statements','Open statement import'], shot:['/home/goals/web-bank.webp','Optional statement and banking records in GetGuac'] },
  { n:'06', chapter:'read-patterns', icon:Lightbulb, title:'Review your first useful patterns', body:'Open Reports and compare stores, categories, and time periods. Check possible duplicates and recurring charges, then focus on one change worth understanding instead of trying to perfect every label.', why:'The goal is not perfect bookkeeping. It is spotting one decision that leaves more money with you next month.', action:['/reports','Explore your reports'], shot:['/marketing/slides/v2/reports-web.webp','GetGuac reports showing spending patterns and comparisons'] },
  { n:'07', chapter:'read-patterns', icon:Sparkles, title:'Ask Guac AI a question you actually have', body:'Ask about one store, category, purchase, or change in your saved history. Guac AI answers from the receipts and records you provided, so the conversation stays grounded in your money.', why:'A specific question turns a dashboard into an answer you can act on.', action:['/how-it-works','See how Guac AI works'], shot:['/home/goals/web-guac-ai.webp','Guac AI answering a question about saved spending'] },
  { n:'08', chapter:'read-patterns', icon:Lightbulb, title:'Teach GetGuac what was worth it', body:'Rate recent purchases with Worth-It, then revisit GuacScore as those choices accumulate. Honest ratings help separate spending you value from spending that only looked useful at checkout.', why:'Your own definition of value is more useful than a generic rule about what you should buy.', action:['/validate','Rate a recent purchase'], shot:['/home/goals/web-worth-it.webp','Worth-It ratings for recent GetGuac purchases'] },
  { n:'09', chapter:'protect-money', icon:Clock3, title:'Put known bills where you can see them coming', body:'Add the recurring bills and due dates you already know. Your bill calendar gives you a forward view, so the month stops feeling like a string of surprises.', why:'A visible bill is easier to plan for than a charge discovered after it lands.', action:['/bills','Open the bill calendar'], shot:['/home/goals/web-bills.webp','Upcoming bills displayed on the GetGuac calendar'] },
  { n:'10', chapter:'protect-money', icon:LockKeyhole, title:'Protect refunds and return windows', body:'Keep the receipt and let GetGuac track the store return policy when available. Check recent purchases while there is still time to return the wrong size, duplicate order, or thing you never used.', why:'A return window is a countdown on money you may still be able to recover.', action:['/resources/guides/refund-rights.html','Read the refund-rights guide'], shot:['/home/goals/web-returns.webp','Return deadlines tracked for recent purchases'] },
  { n:'11', chapter:'protect-money', icon:Sparkles, title:'Catch quiet leaks before the next purchase', body:'Review GuacWizard Bank Bites for avoidable fees and interest, then use Stash, Steals, Marketplace, and coupons when you are preparing to buy something again.', why:'Keeping more money is a combination of preventing needless charges and comparing the purchases you already plan to make.', action:['/bites','Review Bank Bites'], shot:['/home/goals/web-fees.webp','GuacWizard showing fees and other quiet money leaks'] },
  { n:'12', chapter:'rhythm', icon:Inbox, title:'Let Smashlist prepare the next trip', body:'Review the items GetGuac predicts or remembers, keep only what you need, and group the list by store. Share the list when someone else is shopping with you.', why:'A prepared list reduces repeat decisions and makes the next shopping trip easier to finish.', action:['/shopping','Open Smashlist'], shot:['/home/goals/web-smashlist.webp','A GetGuac Smashlist organized for the next shopping trip'] },
  { n:'13', chapter:'rhythm', icon:Receipt, title:'Keep special records only when useful', body:'Use Car Miles for qualifying trips and tax or charity categories for relevant receipts. These tools stay out of the way until you need a clean record for reimbursement or reporting.', why:'Focused tools are most helpful when they solve a real recordkeeping need without adding daily work.', action:['/car-miles','Open Car Miles'], shot:['/home/goals/web-car-miles.webp','GetGuac Car Miles records prepared for reporting'] },
  { n:'14', chapter:'rhythm', icon:Lightbulb, title:'Learn without turning money into homework', body:'Use Guac Arcade when a short game is a better way to practice a money idea. Saved scores, GuacMoney activity, and leaderboards are optional ways to keep learning engaging.', why:'A habit is easier to keep when the product can be useful, light, and enjoyable.', action:['/games','Play Guac Arcade'], shot:['/home/goals/web-games.webp','The GetGuac Arcade collection of money-themed games'] },
]

const ALL_FEATURES = [
  { group:'Capture & organize', title:'Receipt scanner', body:'Photograph paper receipts, add screenshots, PDFs, or batches.', href:'/receipts', image:'/home/goals/web-receipts.webp' },
  { group:'Capture & organize', title:'GetGuac email inbox', body:'Forward digital receipts to your private @getguac.app address.', href:'/how-email-works', image:'/home/goals/phone-receipts.webp', phone:true },
  { group:'Capture & organize', title:'Statement import', body:'Optionally turn bank or card statement PDFs into trackable rows.', href:'/statements', image:'/home/goals/web-bank.webp' },
  { group:'Capture & organize', title:'Guac-AI parsing', body:'Extract stores, dates, totals, tax, payment details, and every line item.', href:'/how-it-works', image:'/home/goals/phone-guac-ai.webp', phone:true },
  { group:'Capture & organize', title:'Categories and duplicates', body:'Automatically organize purchases and collapse duplicate captures.', href:'/reports', image:'/home/goals/web-organized.webp' },
  { group:'Understand your money', title:'Dashboard and reports', body:'Explore stores, categories, time periods, trends, and tax-ready views.', href:'/reports', image:'/marketing/slides/v2/reports-web.webp' },
  { group:'Understand your money', title:'Guac AI questions', body:'Ask conversational questions about the receipts and spending you saved.', href:'/how-it-works', image:'/home/goals/web-guac-ai.webp' },
  { group:'Understand your money', title:'Worth-It ratings', body:'Rate purchases in seconds and learn which spending was truly worthwhile.', href:'/validate', image:'/home/goals/web-worth-it.webp' },
  { group:'Understand your money', title:'GuacScore', body:'See a simple score that improves as your spending choices improve.', href:'/validate', image:'/home/goals/phone-guacscore.webp', phone:true },
  { group:'Keep more', title:'Subscriptions and recurring charges', body:'Surface repeat payments and see what is likely coming next.', href:'/reports', image:'/home/goals/web-subs.webp' },
  { group:'Keep more', title:'GuacWizard bank bites', body:'Find avoidable fees, interest, penalties, and other quiet money leaks.', href:'/bites', image:'/home/goals/web-fees.webp' },
  { group:'Keep more', title:'Returns and refunds', body:'Track return windows, policies, refund progress, and price-drop deadlines.', href:'/returns', image:'/home/goals/web-returns.webp' },
  { group:'Shop smarter', title:'Stash', body:'Build a living library of products you own, love, regret, and rebuy.', href:'/stash', image:'/home/goals/web-stash.webp' },
  { group:'Shop smarter', title:'Smashlist', body:'Predict what you will need next and create shareable shopping lists.', href:'/shopping', image:'/home/goals/web-smashlist.webp' },
  { group:'Shop smarter', title:'Steals', body:'Search current prices for the exact products you buy repeatedly.', href:'/steals', image:'/home/goals/web-steals.webp' },
  { group:'Shop smarter', title:'Marketplace and coupons', body:'Compare public deals, stores, coupons, and promo codes without an account.', href:'/marketplace', image:'/home/goals/web-marketplace.webp' },
  { group:'Plan & grow', title:'Bills calendar', body:'See recurring bills and known due dates before they arrive.', href:'/bills', image:'/home/goals/web-bills.webp' },
  { group:'Plan & grow', title:'GuacMoney', body:'Make refunds, savings, smarter choices, referrals, and activity visible.', href:'/how-it-works', image:'/home/goals/web-guacmoney.webp' },
  { group:'Plan & grow', title:'Car Miles', body:'Save tax- and reimbursement-ready mileage without background tracking.', href:'/car-miles', image:'/home/goals/web-car-miles.webp' },
  { group:'Plan & grow', title:'Tax and charity reports', body:'Separate useful business, tax, charity, and spending records.', href:'/reports', image:'/home/goals/web-tax.webp' },
  { group:'Play & learn', title:'Guac Arcade', body:'Play 15 free money-themed games, earn GuacMoney, and join leaderboards.', href:'/games', image:'/home/goals/web-games.webp' },
  { group:'Privacy & control', title:'Private by design', body:'No bank login required, row-level security, and delete controls for your data.', href:'/security', image:'/home/goals/web-bank.webp' },
]

const FEATURE_STARTS = {
  'Receipt scanner': 'Open Receipts, choose Add, then photograph a paper receipt or select a receipt image or PDF. Review the store, date, total, and line items after Guac-AI finishes.',
  'GetGuac email inbox': 'Use your private @getguac.app address at checkout or forward an existing digital receipt to it. New email receipts will be organized with your other purchases.',
  'Statement import': 'Open Statements and upload a supported bank or card statement PDF. Review the imported rows and keep this optional if receipt-only tracking already fits you.',
  'Guac-AI parsing': 'Add a clear receipt and let Guac-AI extract its details. Check the result once; corrections help keep the saved purchase accurate and searchable.',
  'Categories and duplicates': 'Let categories build automatically as receipts arrive. Review unusual categories and run duplicate review when the same purchase may have entered more than once.',
  'Dashboard and reports': 'After several receipts are saved, open Reports and choose a useful period. Start with one question, such as where grocery spending changed this month.',
  'Guac AI questions': 'Open Guac AI and ask a specific question grounded in your saved receipts, such as what you spent at one store or which category increased.',
  'Worth-It ratings': 'Open Validate or a saved receipt and rate whether the purchase was worthwhile. A quick honest rating is more useful than trying to review everything perfectly.',
  'GuacScore': 'Rate a small group of recent purchases first. Revisit GuacScore after more ratings exist so it reflects your real pattern rather than one shopping trip.',
  'Subscriptions and recurring charges': 'Open recurring charges after enough history has accumulated. Review each detected repeat payment and decide whether to keep, investigate, or cancel it.',
  'GuacWizard bank bites': 'Import a statement, open Bank Bites, and review detected fees or interest. Focus on one avoidable charge and the action that prevents it next time.',
  'Returns and refunds': 'Open Returns after saving a recent receipt. Confirm the item and deadline, then update the status as the return and refund move forward.',
  'Stash': 'Save a few itemized receipts, then open Stash. Review the products GetGuac remembered and use an item card to rebuy, rate, or compare it.',
  'Smashlist': 'Open Smashlist and review predicted or previously purchased items. Add what you actually need, group the list by store, and share it when shopping with others.',
  'Steals': 'Choose an item you rebuy from Stash or Smashlist, open Steals, and compare matching sizes and quantities before deciding where to buy.',
  'Marketplace and coupons': 'Open Marketplace without signing in, search for a product, and compare current store offers. Check coupons before completing a purchase.',
  'Bills calendar': 'Add the recurring bills you already know with their due dates. Review the calendar weekly so upcoming charges are visible before they land.',
  'GuacMoney': 'Use GetGuac normally and let verified activity build the total. Treat GuacMoney as a scoreboard for visible value, not money that must be redeemed.',
  'Car Miles': 'Open Car Miles when starting a qualifying trip, add the route, and choose the correct purpose. Review the log before exporting it for records.',
  'Tax and charity reports': 'Categorize relevant receipts and mileage as they occur. Open Reports for the appropriate period and review the records before using an export.',
  'Guac Arcade': 'Open Games, choose any title, and finish a round. Sign in when you want eligible activity, saved high scores, and leaderboard participation.',
  'Private by design': 'Review Security and your account controls before importing sensitive records. Use only the optional connections you understand and delete data whenever needed.',
}

function Step({ step }) {
  const Icon = step.icon
  return <article id={`step-${step.n}`} className="gg-step gg-chapter border-t border-emerald-950/10 py-12 first:border-0 first:pt-0">
    <div className="gg-copy">
      <div className="flex items-center gap-3"><span className="text-4xl font-black text-lime-600" style={DISPLAY}>{step.n}</span></div>
      <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173d27] text-[#b8ef52]"><Icon size={21}/></div>
      <h3 className="mt-4 text-2xl font-black leading-tight text-[#16331f] sm:text-3xl" style={DISPLAY}>{step.title}</h3>
      <p className="mt-4 text-[17px] leading-8 text-gray-700">{step.body}</p>
      <div className="mt-5 rounded-2xl bg-[#f5f8ed] p-4 text-[15px] leading-6 text-[#31533a]"><strong>Why this matters:</strong> {step.why}</div>
      {step.note && <p className="mt-4 flex gap-2 text-sm leading-6 text-emerald-800"><LockKeyhole className="mt-0.5 shrink-0" size={16}/>{step.note}</p>}
      <Link href={step.action[0]} className="mt-6 inline-flex items-center gap-2 font-extrabold text-[#4d7c0f] hover:text-[#365909]">{step.action[1]} <ArrowRight size={17}/></Link>
    </div>
    {step.shot && <div className={`gg-visual ${step.shot[2] || ''}`}><ZoomableImage src={step.shot[0]} alt={step.shot[1]} width={step.shot[2] ? 420 : 1200} height={step.shot[2] ? 860 : 780}/></div>}
  </article>
}

export default function GetStartedPage() {
  return <MarketingShell subtitle="get-started">
    <style>{GS_CSS}</style>
    <main className="gg-guide text-[#16331f]">
      <GuideHeroSlideshow />
      <section className="hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-emerald-800"><Sparkles size={14}/> The ultimate GetGuac guide</span>
            <p className="mt-6 text-5xl font-black leading-[.98] tracking-tight sm:text-7xl" style={DISPLAY}>One receipt.<br/><span className="text-lime-600">A clearer money life.</span></p>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#48614d]">A practical, step-by-step guide to getting GetGuac working for you—from your first scan to a receipt system that catches patterns, bills, subscriptions, and return deadlines.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/join?try=receipt" className="btn-primary">Try one receipt <ArrowRight size={17}/></Link><a href="#guide" className="btn-secondary">Read the guide</a></div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]"><div className="absolute -left-5 -top-5 h-24 w-24 rounded-full bg-[#b8ef52]"/><img className="relative rounded-[32px] shadow-2xl shadow-emerald-950/20" src="/home/story-people/openai-hero-giggling-family-baby-v2.webp" alt="A family enjoying the confidence that comes from clearer spending" width="1200" height="900"/><div className="absolute -bottom-5 right-4 rounded-2xl bg-white p-4 shadow-xl"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">The GetGuac promise</p><p className="mt-1 font-black">See it. Understand it. Keep more.</p></div></div>
        </div>
      </section>

      <section className="hidden">
        <div className="grid gap-5 md:grid-cols-3">
          {[['30 minutes','of hands-on setup'],['No bank login','receipt-first by design'],['Free forever','no card or paywall']].map(([a,b])=><div key={a} className="rounded-3xl border border-emerald-950/10 bg-white p-6"><p className="text-2xl font-black" style={DISPLAY}>{a}</p><p className="mt-1 text-sm text-gray-500">{b}</p></div>)}
        </div>
      </section>

      <section id="guide" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="gg-grid">
          <aside className="gg-toc rounded-3xl bg-[#173d27] p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#b8ef52]">Table of contents</p>
            <nav className="mt-5 space-y-1">{chapters.map(c=><a key={c.id} href={`#${c.id}`} className="block rounded-xl px-3 py-2 text-sm font-bold text-white/75 hover:bg-white/10 hover:text-white">{c.label}</a>)}</nav>
            <div className="mt-5 border-t border-white/15 pt-5">
              <Link href="/how-it-works" className="group block rounded-2xl bg-[#b8ef52] p-4 text-[#173d27] transition hover:bg-lime-300">
                <span className="block text-[11px] font-black uppercase tracking-[.15em]">Explore next</span>
                <span className="mt-1 flex items-center justify-between gap-3 font-black">Our Features Guide <ArrowRight className="transition group-hover:translate-x-1" size={17}/></span>
                <span className="mt-2 block text-xs font-semibold leading-5 text-[#31533a]">See the complete interactive How It Works story.</span>
              </Link>
              <a href="#all-features" className="mt-3 block rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/10 hover:text-white">All 22 feature guides <ArrowRight className="ml-1 inline" size={15}/></a>
            </div>
            <div className="mt-6 border-t border-white/15 pt-6"><p className="text-sm leading-6 text-white/65">New here? Do only step one today. You can try it without creating an account.</p></div>
          </aside>
          <div>
            <section className="rounded-[32px] bg-[#fbf8ec] p-7 sm:p-9">
              <p className="text-xs font-black uppercase tracking-[.18em] text-lime-700">Before you begin</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl" style={DISPLAY}>Bring less than you think.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600">You do not need a budget, a spreadsheet, or your bank password. Bring one recent receipt and access to the email where stores send receipts.</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">{['One paper or digital receipt','Your email address','A few known bill dates','Curiosity—not perfect records'].map(x=><li key={x} className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-bold"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-200"><Check size={14}/></span>{x}</li>)}</ul>
            </section>

            <div className="mt-10">
              {chapters.map((chapter, i)=><section key={chapter.id} id={chapter.id} className="gg-chapter">
                <div className="mb-7 mt-14"><p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">Chapter {i+1}</p><h2 className="mt-2 text-3xl font-black sm:text-4xl" style={DISPLAY}>{chapter.label.replace(/^\d+\. /,'')}</h2></div>
                {steps.filter(s=>s.chapter===chapter.id).map(s=><Step key={s.n} step={s}/>)}
              </section>)}
            </div>

            <section className="mt-10 rounded-[32px] bg-[#eaf4df] p-7 sm:p-10">
              <p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">A rhythm that lasts</p><h2 className="mt-2 text-3xl font-black sm:text-4xl" style={DISPLAY}>Keep the system light.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">GetGuac works best as a light weekly rhythm, not a daily chore. Let receipts arrive automatically, then review only the signals that are useful to you.</p>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">{[['Each week','Add any paper receipts and glance at new return deadlines.'],['Each month','Review categories, recurring charges, and the next bill dates.'],['When life changes','Keep useful categories; ignore the rest. The system should fit you.']].map(([a,b])=><div key={a} className="rounded-2xl bg-white p-5"><p className="font-black">{a}</p><p className="mt-2 text-sm leading-6 text-gray-600">{b}</p></div>)}</div>
              <div className="mt-9 border-t border-emerald-950/10 pt-8">
                <p className="text-xs font-black uppercase tracking-[.18em] text-lime-700">Keep learning</p>
                <h3 className="mt-2 text-2xl font-black sm:text-3xl" style={DISPLAY}>Want to learn more?</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">Go deeper whenever you are ready. These are the best next places to understand the product and make more of your receipts.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['/how-it-works','Our Features Guide','See the complete interactive story of how GetGuac learns from every receipt.'],
                    ['/faq','Frequently Asked Questions','Quick answers about receipts, privacy, email, and what is free.'],
                    ['/resources#guides','Read the money guides','Practical help with subscriptions, refunds, fees, and smarter shopping.'],
                    ['/tour','Watch the product tour','See the important GetGuac screens and workflows in action.'],
                    ['/security','Security and privacy','Understand how your data is protected and stays under your control.'],
                    ['/features','Browse every feature','Compare the complete toolkit by the benefit it provides.'],
                  ].map(([href,title,body])=><Link key={href} href={href} className="group rounded-2xl bg-white p-4 ring-1 ring-emerald-950/10 transition hover:-translate-y-0.5 hover:shadow-md"><span className="flex items-center justify-between gap-3 font-black text-[#173d27]">{title}<ArrowRight className="shrink-0 text-lime-700 transition group-hover:translate-x-1" size={16}/></span><span className="mt-1.5 block text-xs leading-5 text-gray-500">{body}</span></Link>)}
                </div>
              </div>
            </section>

            <section className="gg-tip mt-10 rounded-[32px] p-7 sm:p-10"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b8ef52] text-[#173d27]"><Lightbulb/></div><h2 className="mt-5 text-3xl font-black" style={DISPLAY}>What not to do yet</h2><ul className="mt-5 space-y-3 text-white/75">{['Do not hunt for every old receipt. Start now and let history build forward.','Do not wait for perfect categories. Useful patterns beat tidy labels.','Do not connect anything you do not understand. Email automation is optional and reversible.','Do not try every feature on day one. Complete the next useful step, then stop.'].map(x=><li key={x} className="flex gap-3"><Check className="mt-1 shrink-0 text-[#b8ef52]" size={17}/><span className="leading-7">{x}</span></li>)}</ul></section>
          </div>
        </div>
      </section>

      <section id="all-features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">Everything included</p><h2 className="mt-3 text-4xl font-black sm:text-6xl" style={DISPLAY}>Your guide to all 22 features.</h2><p className="mt-5 text-lg leading-8 text-gray-600">Every GetGuac tool is listed here. Choose one for a practical starting step and a large, zoomable view of the real app.</p></div>
        <FeatureExplorer features={ALL_FEATURES} starts={FEATURE_STARTS}/>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8"><p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">What good looks like</p><h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black sm:text-5xl" style={DISPLAY}>A month from now, money feels less mysterious.</h2><div className="mx-auto mt-9 grid max-w-4xl gap-3 text-left sm:grid-cols-2">{['Receipts arrive without constant effort.','You know what you bought—not only where.','A forgotten recurring charge is visible.','Upcoming bills no longer feel sudden.','Return deadlines are caught before they close.','Your spending questions have real answers.'].map(x=><div key={x} className="flex gap-3 rounded-2xl border border-emerald-950/10 p-4 font-bold"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-200"><Check size={14}/></span>{x}</div>)}</div><div className="mt-10 flex flex-wrap justify-center gap-3"><Link href="/join?try=receipt" className="btn-primary">Start with one receipt <ArrowRight size={17}/></Link><Link href="/why-getguac" className="btn-secondary">Why GetGuac is different</Link></div></section>
    </main>
  </MarketingShell>
}
