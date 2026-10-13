import Link from 'next/link'
import { Banknote, BarChart3 as ChartNoAxesCombined, BellRing, BookOpen, Building2, CalendarCheck, CalendarClock, Camera, Coins, CreditCard, FileText, Fuel, HeartHandshake, Landmark, ListChecks, LockKeyhole, PhoneCall, Percent, PiggyBank, Repeat, Scale, Scissors, ShieldCheck, ShoppingBasket, Tags, TrendingUp, Unplug, UserPlus, Users, UtensilsCrossed, Wallet } from 'lucide-react'

// Marketing sections for the "Find your 10%" plan (v6.3 Requirements, Design,
// Screens and Flows, sections 1 and 2). Every number below is an example and is
// labelled as one; the goal is a target, never a promised result.
//
// Growth example (CAL-12): $350 deposited at each month end, fixed 4.00% APY,
// effective monthly rate (1.04)^(1/12) - 1 -> $4,276 after 12 months, $23,163
// after 60. Example goal: $4,200/month take-home -> $420.

export const PLAN_SETUP = [
  { id: 'register', step: 'Your move 1', title: 'Join free', text: 'Sign up with Google or your email. No card, no bank login.', Icon: UserPlus },
  { id: 'income', step: 'Your move 2', title: 'Set your 10% goal', text: 'Enter what you bring home, once. That sets your goal. Update it only when life changes.', Icon: Banknote },
  { id: 'capture', step: 'Your move 3', title: 'Add what you spend', text: 'Snap or upload it, or type it in. Keep adding as you go.', items: ['Receipts', 'Bills', 'Other payments, like rent or childcare', 'Debts'], Icon: Camera },
  { id: 'analyze', step: 'GetGuac\u2019s move', title: 'GetGuac finds your 10%', text: 'It reads your spending, spots where your 10% is hiding and lines up your five targets, with the math shown.', Icon: ChartNoAxesCombined, ours: true },
]

export const PLAN_WEEKS = [
  { id: 'cut', week: 'Target 1', target: 'about $120/mo', title: 'GetGuac helps you cut spending', text: 'Your receipts show where money slips away: repeat small buys, categories creeping up. Pick the cuts you\'ll make.', example: 'Coffee, dining out, snacks', Icon: Scissors },
  { id: 'cheaper', week: 'Target 2', target: 'about $142/mo', title: 'GetGuac helps you find cheaper options', text: 'Coupons, cheaper stores, discount buys and alternatives for what you already buy, plus fewer trips and cheaper gas nearby.', example: 'Coupons, store brands, gas', Icon: Tags },
  { id: 'bills', week: 'Target 3', target: 'about $110/mo', title: 'GetGuac helps you lower your bills', text: 'GetGuac reads your bills and flags the ones that look high, with a call script ready. We suggest; we never call or log in for you.', example: 'Internet, phone, unused subscriptions', Icon: FileText },
    { id: 'earn', week: 'Target 4', target: 'about $50/mo', title: 'GetGuac helps make your money work', text: 'GetGuac identifies saving opportunities: money sitting idle that could earn more interest, and high-interest debt that costs more than your savings earn.', example: 'Savings accounts, CDs, money market accounts', Icon: Landmark },
  { id: 'learn', week: 'Target 5', target: null, title: 'GetGuac helps you learn to build wealth', text: 'Plain-language lessons on ETFs, bonds, stocks, retirement accounts and other wealth-building tools, so you understand your options and decide for yourself.', example: 'ETFs, bonds, stocks, retirement accounts', Icon: BookOpen },
]

const TARGET_OPTIONS = {
  cut: {
    lead: 'From your receipts and payments, GetGuac looks at',
    options: [
      { id: 'repeat', label: 'Repeat small buys', Icon: Repeat },
      { id: 'creeping', label: 'Categories creeping up', Icon: TrendingUp },
      { id: 'dining', label: 'Dining out and delivery', Icon: UtensilsCrossed },
      { id: 'impulse', label: 'Snacks and impulse buys', Icon: ShoppingBasket },
      { id: 'typical', label: 'Spending above typical for your household', Icon: Scale },
      { id: 'list', label: 'Shopping-list-only trips', Icon: ListChecks },
    ],
    note: 'You pick the cuts you want to make. Every estimate shows its math.',
  },
  bills: {
    lead: 'GetGuac reads your bills and looks for',
    options: [
      { id: 'high', label: 'Bills that look high', Icon: FileText },
      { id: 'plans', label: 'Cheaper plans for the same service', Icon: Coins },
      { id: 'unused', label: 'Subscriptions you don\'t use', Icon: Unplug },
      { id: 'renewals', label: 'Insurance renewals worth a re-quote', Icon: CalendarClock },
      { id: 'scripts', label: 'Call scripts with your own numbers', Icon: PhoneCall },
      { id: 'late', label: 'Due-date reminders to avoid late fees', Icon: BellRing },
    ],
    note: 'We suggest; we never call or log in for you.',
  },
  earn: {
    lead: 'GetGuac identifies saving opportunities in',
    options: [
      { id: 'hysa', label: 'High-yield savings accounts', Icon: PiggyBank },
      { id: 'cd', label: 'CDs (certificates of deposit)', Icon: CalendarCheck },
      { id: 'mma', label: 'Money market accounts', Icon: Landmark },
      { id: 'creditunion', label: 'Credit union savings and certificates', Icon: Building2 },
      { id: 'idle', label: 'Idle cash sitting in checking', Icon: Wallet },
      { id: 'debt', label: 'High-interest debt to pay down first', Icon: CreditCard },
    ],
    note: 'Insured (FDIC or NCUA) accounts only, ranked by rate, with the date each rate was checked. Paid links are labelled. Lessons on how investing works are education only, never advice.',
  },
  learn: {
    lead: 'GetGuac teaches how these work',
    options: [
      { id: 'funds', label: 'Index funds and ETFs', Icon: ChartNoAxesCombined },
      { id: 'bonds', label: 'Bonds and Treasuries', Icon: Landmark },
      { id: 'stocks', label: 'Stocks', Icon: TrendingUp },
      { id: 'retirement', label: 'Retirement accounts: 401(k), IRA, Roth IRA', Icon: Building2 },
      { id: 'emergency', label: 'Emergency fund first', Icon: PiggyBank },
      { id: 'fees', label: 'Fees, risk and compounding', Icon: Percent },
    ],
    note: 'Education only. GetGuac explains how these work and never recommends specific investments or what to buy or sell. Not investment advice.',
    link: { href: '#learn-investing', label: 'See the lessons' },
  },
  cheaper: {
    lead: 'GetGuac searches online and stores near you for',
    options: [
      { id: 'coupons', label: 'Coupons', Icon: Tags },
      { id: 'stores', label: 'Stores with cheaper prices', Icon: Coins },
      { id: 'discount', label: 'Discount buys', Icon: PiggyBank },
      { id: 'alternatives', label: 'Alternative options', Icon: HeartHandshake },
      { id: 'trips', label: 'Combining shopping trips', Icon: CalendarCheck },
      { id: 'gas', label: 'Cheaper gas on your route', Icon: Fuel },
    ],
    note: 'Every coupon shows its source and expiry. Gas prices come from Google Maps, with the time they were updated. No location tracking.',
  },
}

const EXAMPLE_GOALS = [
  { pct: 10, amount: '$420' },
  { pct: 12, amount: '$504' },
  { pct: 15, amount: '$630' },
  { pct: 20, amount: '$840' },
]

export const PLAN_FAQ = [
  { q: 'Will I really save 10%?', a: 'Ten percent is a goal, not a promise. GetGuac shows you where it could come from, with the math, and tracks what you actually keep. Results depend on the changes you choose to make.' },
  { q: 'What do "Found" and "Kept" mean?', a: 'Found is the monthly saving you\'ve identified and chosen to act on. Kept is what your later receipts, bills and statements show actually happened. Kept is the number that counts.' },
  { q: 'Do I need to link my bank?', a: 'No. You add receipts, bills and payments yourself, forward email receipts, or upload a statement if you want a month of history at once.' },
  { q: 'Can I aim higher than 10%?', a: 'Yes. Pick 11%, 12%, 15% or anything up to 20%. A higher goal means GetGuac looks harder for cuts and changes. If a goal is more than you can spare after essentials, it tells you.' },
  { q: 'Do you tell me what to invest in?', a: 'No. GetGuac compares insured savings accounts, CDs and money market accounts, and teaches how ETFs, bonds, stocks and retirement accounts work. It never recommends specific investments. The choice is always yours.' },
  { q: 'Is my income shared with anyone?', a: 'No. It stays private to you and is never sent to advertisers. With the optional family goal, members share totals only, never receipts, stores, bills or personal income.' },
  { q: 'What does it cost?', a: 'GetGuac is free. Some offers may include links that earn us a fee; they are always labelled and never change the order we show things in.' },
]

function SectionHead({ kicker, title, text, center = false }) {
  return (
    <div className={`tp-head ${center ? 'mx-auto text-center' : ''} max-w-3xl`}>
      {kicker && <p className="tp-head-kicker text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700">{kicker}</p>}
      <h2 className="tp-head-title mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      {text && <p className="tp-head-text mt-3 text-lg leading-8 text-slate-600">{text}</p>}
    </div>
  )
}

export function PlanSetupSteps() {
  return (
    <section id="how-it-works" className="tp-setup mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-14">
      <SectionHead kicker="How it works" title="Three simple moves from you. GetGuac will find your 10%." text="Set it up once. Every receipt and bill you add after that moves you closer to your 10%." />
      <ol className="tp-setup-list mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_SETUP.map(({ id, step, title, text, items, Icon, ours }) => (
          <li key={id} className={`tp-setup-item rounded-3xl border p-5 ${ours ? 'tp-setup-item-ours border-emerald-700 bg-emerald-700' : 'border-slate-200 bg-white'}`}>
            <span className={`tp-setup-icon flex h-11 w-11 items-center justify-center rounded-2xl ${ours ? 'bg-white text-emerald-700' : 'bg-emerald-50 text-emerald-700'}`}><Icon size={22} aria-hidden="true" /></span>
            <p className={`tp-setup-step mt-4 text-xs font-extrabold uppercase tracking-wider ${ours ? 'text-emerald-100' : 'text-emerald-700'}`}>{step}</p>
            <h3 className={`tp-setup-title mt-1 text-lg font-black ${ours ? 'text-white' : 'text-slate-950'}`}>{title}</h3>
            <p className={`tp-setup-text mt-2 text-sm leading-6 ${ours ? 'text-emerald-50' : 'text-slate-600'}`}>{text}</p>
            {items && (
              <ul className="tp-setup-items mt-3 space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="tp-setup-subitem flex items-start gap-2 text-sm font-semibold text-slate-800"><span aria-hidden="true" className="tp-setup-dot mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />{item}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

export function PlanFourWeeks({ showOptions = true }) {
  return (
    <section id="targets" className="tp-weeks mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-14">
      <SectionHead kicker="Five targets" title="Five ways GetGuac helps you save and grow." text="All five start as soon as you add your expenses, bills and payments. Enter everything in your first week and GetGuac shows results right away. Keep adding and they get sharper." />
      <ol className={`tp-weeks-list mt-8 grid gap-4 ${showOptions ? 'lg:grid-cols-2' : 'md:grid-cols-2'}`}>
        {PLAN_WEEKS.map(({ id, week, target, title, text, example, Icon }) => {
          const detail = showOptions ? TARGET_OPTIONS[id] : null
          return (
            <li key={id} className={`tp-weeks-item flex flex-col rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 ${id === 'learn' ? 'lg:col-span-2' : ''}`}>
              <div className="tp-weeks-head flex gap-4">
                <span className="tp-weeks-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white"><Icon size={22} aria-hidden="true" /></span>
                <div className="tp-weeks-body min-w-0 flex-1">
                  <p className="tp-weeks-label text-xs font-extrabold uppercase tracking-wider text-emerald-700">{week}</p>
                  <h3 className="tp-weeks-title mt-1 text-xl font-black text-slate-950">{title}</h3>
                  <p className="tp-weeks-target mt-1 text-sm font-bold text-emerald-700">{target ? `Target: ${target}*` : 'Education only, no dollar target'}</p>
                  <p className="tp-weeks-text mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  {!detail && <p className="tp-weeks-example mt-3 text-xs font-semibold text-slate-500">Such as: {example}</p>}
                </div>
              </div>
              {detail && (
                <div className="tp-weeks-options mt-4 flex-1 rounded-2xl bg-emerald-50 p-4">
                  <p className="tp-weeks-options-title text-sm font-black text-emerald-900">{detail.lead}</p>
                  <ul className={`tp-weeks-options-list mt-3 grid gap-2 sm:grid-cols-2 ${id === 'learn' ? 'lg:grid-cols-3' : ''}`}>
                    {detail.options.map(({ id: optionId, label, Icon: OptionIcon }) => (
                      <li key={optionId} className="tp-weeks-option flex items-start gap-2 text-sm font-semibold text-slate-800"><OptionIcon size={16} aria-hidden="true" className="tp-weeks-option-icon mt-0.5 shrink-0 text-emerald-700" />{label}</li>
                    ))}
                  </ul>
                  <p className="tp-weeks-options-note mt-3 text-xs leading-5 text-slate-600">{detail.note}</p>
                  {detail.link && <Link href={detail.link.href} className="tp-weeks-options-link mt-2 inline-flex min-h-11 items-center text-sm font-bold text-emerald-700">{detail.link.label} →</Link>}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="tp-weeks-after mt-5 text-sm text-slate-600">* Based on a suggested income of $4,200 a month (a $420 goal). Your own targets will reflect your transactions, spending habits and the options you choose. Every month, a check-in shows what held, what slipped and what&apos;s new.</p>
    </section>
  )
}

export function PlanGoalAndProgress() {
  return (
    <section id="found-kept" className="tp-progress mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-14">
      <div className="tp-progress-grid grid items-start gap-6 lg:grid-cols-2">
        <div className="tp-progress-copy">
          <SectionHead kicker="Your goal, your pace" title="Start at 10%. Go further if you can." text="Pick 11%, 12%, 15% or anything up to 20% for more aggressive saving. A higher goal means GetGuac looks harder for you." />
          <table className="tp-goals-table mt-6 w-full max-w-md text-left text-sm">
            <caption className="tp-goals-caption mb-2 text-left text-xs text-slate-500">Based on $4,200 a month take-home</caption>
            <thead className="tp-goals-thead"><tr className="tp-goals-row border-b border-slate-200"><th scope="col" className="tp-goals-th py-2 font-bold text-slate-700">Goal</th><th scope="col" className="tp-goals-th py-2 font-bold text-slate-700">Per month</th></tr></thead>
            <tbody className="tp-goals-tbody">
              {EXAMPLE_GOALS.map(({ pct, amount }) => (
                <tr key={pct} className="tp-goals-row border-b border-slate-100"><td className="tp-goals-td py-2 font-semibold text-slate-900">{pct}%</td><td className="tp-goals-td py-2 font-black text-emerald-700">{amount}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="tp-goalmore-title mt-8 text-sm font-black text-emerald-900">What a higher goal changes</p>
          <ul className="tp-goalmore-list mt-3 max-w-md space-y-3">
            <li className="tp-goalmore-item flex gap-3 text-sm leading-6 text-slate-700"><ShieldCheck size={18} aria-hidden="true" className="tp-goalmore-icon mt-0.5 shrink-0 text-emerald-700" /><span className="tp-goalmore-text"><b className="tp-goalmore-strong text-slate-950">GetGuac looks harder.</b> Deeper cuts, more bill changes and more cheaper options across all five targets.</span></li>
            <li className="tp-goalmore-item flex gap-3 text-sm leading-6 text-slate-700"><ShieldCheck size={18} aria-hidden="true" className="tp-goalmore-icon mt-0.5 shrink-0 text-emerald-700" /><span className="tp-goalmore-text"><b className="tp-goalmore-strong text-slate-950">Change it any time.</b> Raise it or lower it whenever you like. Everything you have already Kept stays in your savings record.</span></li>
            <li className="tp-goalmore-item flex gap-3 text-sm leading-6 text-slate-700"><ShieldCheck size={18} aria-hidden="true" className="tp-goalmore-icon mt-0.5 shrink-0 text-emerald-700" /><span className="tp-goalmore-text"><b className="tp-goalmore-strong text-slate-950">An honest check.</b> If a goal is more than you can spare after essentials, GetGuac tells you and suggests one that fits.</span></li>
            <li className="tp-goalmore-item flex gap-3 text-sm leading-6 text-slate-700"><ShieldCheck size={18} aria-hidden="true" className="tp-goalmore-icon mt-0.5 shrink-0 text-emerald-700" /><span className="tp-goalmore-text"><b className="tp-goalmore-strong text-slate-950">Ready for more?</b> When you reach your goal, GetGuac invites you to aim a little higher. You decide.</span></li>
          </ul>
        </div>
        <div className="tp-meter-card rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8">
          <p className="tp-meter-kicker text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700">Found and Kept</p>
          <h3 className="tp-meter-title mt-2 text-2xl font-black text-slate-950">Two honest numbers.</h3>
          <p className="tp-meter-intro mt-2 text-sm leading-6 text-slate-600">Your 10% meter shows what GetGuac has found for you, and what you have really kept. You always see both.</p>
          <div className="tp-meter-bar mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Goal $420: Kept $30, found but not yet kept $90, still to find $300">
            <span className="tp-meter-kept block h-full bg-emerald-700" style={{ width: '7%' }} />
            <span className="tp-meter-found block h-full bg-emerald-300" style={{ width: '22%' }} />
          </div>
          <ul className="tp-meter-key mt-3 grid gap-1.5 text-sm">
            <li className="tp-meter-key-item flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="tp-meter-swatch-kept h-3 w-3 shrink-0 rounded-sm bg-emerald-700" />Kept <b className="tp-meter-key-value text-slate-950">$30</b></li>
            <li className="tp-meter-key-item flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="tp-meter-swatch-found h-3 w-3 shrink-0 rounded-sm bg-emerald-300" />Found, not yet kept <b className="tp-meter-key-value text-emerald-700">$90</b></li>
            <li className="tp-meter-key-item flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="tp-meter-swatch-left h-3 w-3 shrink-0 rounded-sm bg-slate-200" />Still to find <b className="tp-meter-key-value text-slate-950">$300</b></li>
          </ul>
          <p className="tp-meter-total mt-2 text-sm text-slate-700">Found in total: <b className="tp-meter-total-value text-emerald-700">$120</b> of your $420 goal</p>
          <dl className="tp-meter-defs mt-5 space-y-3 text-sm leading-6">
            <div className="tp-meter-def"><dt className="tp-meter-term inline font-black text-slate-950">Found</dt> <dd className="tp-meter-desc inline text-slate-600">is every monthly saving GetGuac has spotted that you have chosen to act on. It shows what is possible.</dd></div>
            <div className="tp-meter-def"><dt className="tp-meter-term inline font-black text-slate-950">Kept</dt> <dd className="tp-meter-desc inline text-slate-600">is the part your later receipts, bills and statements prove really happened. It is the number that counts, and it goes into your savings record.</dd></div>
          </dl>
          <p className="tp-meter-flow-title mt-6 text-sm font-black text-emerald-900">How one saving moves from Found to Kept</p>
          <ol className="tp-meter-flow mt-3 space-y-2">
            <li className="tp-meter-flow-step flex gap-3 text-sm leading-6 text-slate-700"><span className="tp-meter-flow-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">1</span><span className="tp-meter-flow-text"><b className="tp-meter-flow-strong text-slate-950">GetGuac spots it.</b> Your phone bill is $140 a month; plans with the same lines cost about $90.</span></li>
            <li className="tp-meter-flow-step flex gap-3 text-sm leading-6 text-slate-700"><span className="tp-meter-flow-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">2</span><span className="tp-meter-flow-text"><b className="tp-meter-flow-strong text-slate-950">You choose it.</b> Tap &ldquo;I&apos;ll do this&rdquo; and Found grows by $50 a month.</span></li>
            <li className="tp-meter-flow-step flex gap-3 text-sm leading-6 text-slate-700"><span className="tp-meter-flow-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">3</span><span className="tp-meter-flow-text"><b className="tp-meter-flow-strong text-slate-950">Your next bill proves it.</b> When the new $90 bill arrives, $50 moves into Kept.</span></li>
            <li className="tp-meter-flow-step flex gap-3 text-sm leading-6 text-slate-700"><span className="tp-meter-flow-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">4</span><span className="tp-meter-flow-text"><b className="tp-meter-flow-strong text-slate-950">It adds to your savings.</b> Every Kept dollar is recorded month by month, so you can watch it grow.</span></li>
          </ol>
          <div className="tp-meter-facts mt-5 grid gap-3 sm:grid-cols-2">
            <div className="tp-meter-fact rounded-2xl bg-emerald-50 p-3"><p className="tp-meter-fact-title text-xs font-black text-emerald-900">What counts as proof</p><p className="tp-meter-fact-text mt-1 text-xs leading-5 text-slate-700">A lower bill, fewer or cheaper purchases on new receipts, or a bank statement. Saying &ldquo;done&rdquo; alone is not enough.</p></div>
            <div className="tp-meter-fact rounded-2xl bg-emerald-50 p-3"><p className="tp-meter-fact-title text-xs font-black text-emerald-900">When things change</p><p className="tp-meter-fact-text mt-1 text-xs leading-5 text-slate-700">A refund, a deleted receipt or a correction updates Kept, so your numbers always stay true.</p></div>
          </div>
          <p className="tp-meter-note mt-4 text-xs text-slate-500">Illustration based on $4,200 a month take-home.</p>
        </div>
      </div>
    </section>
  )
}

export function PlanSavingsGrowth() {
  return (
    <section id="your-savings" className="tp-growth mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-14">
      <div className="tp-growth-card grid gap-6 rounded-3xl bg-slate-950 p-6 text-white sm:p-10 lg:grid-cols-[1.1fr_.9fr]">
        <div className="tp-growth-copy">
          <p className="tp-growth-kicker text-xs font-extrabold uppercase tracking-[.16em] text-emerald-300">Your savings</p>
          <h2 className="tp-growth-title mt-3 text-3xl font-black leading-tight sm:text-4xl">Every saving you keep is recorded, and can grow.</h2>
          <p className="tp-growth-text mt-4 text-base leading-7 text-slate-300">GetGuac keeps a running record of what you&apos;ve Kept, month by month, and shows what that money could earn if you move it into an insured savings account or CD.</p>
        </div>
        <div className="tp-growth-figures rounded-2xl bg-white/5 p-5 sm:p-6">
          <p className="tp-growth-example text-sm text-slate-300">If you move about <b className="tp-growth-strong text-white">$350 a month</b> at 4.00% APY</p>
          <dl className="tp-growth-list mt-4 space-y-4">
            <div className="tp-growth-row flex items-baseline justify-between border-b border-white/10 pb-3"><dt className="tp-growth-term text-slate-300">After 1 year</dt><dd className="tp-growth-value text-2xl font-black text-emerald-300">≈ $4,276</dd></div>
            <div className="tp-growth-row flex items-baseline justify-between"><dt className="tp-growth-term text-slate-300">After 5 years</dt><dd className="tp-growth-value text-2xl font-black text-emerald-300">≈ $23,163</dd></div>
          </dl>
          <p className="tp-growth-fine mt-4 text-xs leading-5 text-slate-400">Assumes deposits at each month end and that today&apos;s rate stays the same, which it may not. Insured deposit accounts only. Money earns interest only once you move it. Not investment advice.</p>
        </div>
      </div>
    </section>
  )
}

const WEALTH_TOPICS = [
  { id: 'foundation', title: 'Savings first', text: 'An emergency fund in an insured account, and high-interest debt paid down, before investing.', know: 'Investing money you may need soon can mean selling at a loss.', Icon: PiggyBank },
  { id: 'funds', title: 'Index funds and ETFs', text: 'One purchase that holds a small slice of many investments at once.', know: 'Watch the yearly fee (expense ratio). Values go up and down.', Icon: ChartNoAxesCombined },
  { id: 'bonds', title: 'Bonds and Treasuries', text: 'Lending money to a government or company in return for interest.', know: 'When interest rates rise, existing bond prices usually fall.', Icon: Landmark },
  { id: 'stocks', title: 'Stocks', text: 'Owning a small part of a company.', know: 'A single company can swing sharply; spreading money out lowers that risk.', Icon: TrendingUp },
  { id: 'retirement', title: 'Retirement accounts', text: '401(k), IRA and Roth IRA: accounts with tax benefits for long-term saving.', know: 'An employer match is extra money; each account has its own rules.', Icon: Building2 },
  { id: 'growth', title: 'Time, fees and compounding', text: 'How growth builds on growth over years, and how fees quietly reduce it.', know: 'Past returns do not guarantee future ones.', Icon: Percent },
]

export function PlanWealthEducation() {
  return (
    <section id="learn-investing" className="tp-learn mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-14">
      <SectionHead kicker="Learn to build wealth" title="Understand your options. Then decide for yourself." text="Short, plain-language lessons on how ETFs, bonds, stocks and other wealth-building tools work: what they are, what they cost and what can go wrong." />
      <ul className="tp-learn-list mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WEALTH_TOPICS.map(({ id, title, text, know, Icon }) => (
          <li key={id} className="tp-learn-item flex flex-col rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <span className="tp-learn-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={22} aria-hidden="true" /></span>
            <h3 className="tp-learn-title mt-4 text-lg font-black text-slate-950">{title}</h3>
            <p className="tp-learn-text mt-2 text-sm leading-6 text-slate-600">{text}</p>
            <p className="tp-learn-know mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">Good to know: {know}</p>
          </li>
        ))}
      </ul>
      <div className="tp-learn-disclaimer mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <BookOpen size={20} aria-hidden="true" className="tp-learn-disclaimer-icon mt-0.5 shrink-0 text-slate-500" />
        <p className="tp-learn-disclaimer-text text-xs leading-5 text-slate-600">Education only. GetGuac explains how these work; it does not recommend specific investments or tell you what to buy or sell. Not investment advice. GetGuac is not a registered investment adviser. Investing involves risk, including the loss of money.</p>
      </div>
    </section>
  )
}

export function PlanFamilyAndPrivacy() {
  return (
    <section id="family-privacy" className="tp-family mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-14">
      <div className="tp-family-grid grid gap-4 md:grid-cols-2">
        <div className="tp-family-card rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <span className="tp-family-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Users size={22} aria-hidden="true" /></span>
          <h3 className="tp-family-title mt-4 text-2xl font-black text-slate-950">Share the load, optionally.</h3>
          <p className="tp-family-text mt-3 text-base leading-7 text-slate-600">Household members can join one family 10% goal, so everyone&apos;s captures count. Each person chooses to join and can leave any time.</p>
          <p className="tp-family-private mt-3 text-sm font-semibold text-emerald-800">Only totals are shared. Receipts, stores, bills and personal income stay private.</p>
        </div>
        <div className="tp-privacy-card rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <span className="tp-privacy-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><LockKeyhole size={22} aria-hidden="true" /></span>
          <h3 className="tp-privacy-title mt-4 text-2xl font-black text-slate-950">Private by design.</h3>
          <ul className="tp-privacy-list mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li className="tp-privacy-item flex gap-2"><ShieldCheck size={18} aria-hidden="true" className="tp-privacy-check mt-0.5 shrink-0 text-emerald-700" />No bank login required.</li>
            <li className="tp-privacy-item flex gap-2"><ShieldCheck size={18} aria-hidden="true" className="tp-privacy-check mt-0.5 shrink-0 text-emerald-700" />Your income, balances and debts are never sent to advertisers.</li>
            <li className="tp-privacy-item flex gap-2"><ShieldCheck size={18} aria-hidden="true" className="tp-privacy-check mt-0.5 shrink-0 text-emerald-700" />Investing lessons are education only, never picks.</li>
            <li className="tp-privacy-item flex gap-2"><ShieldCheck size={18} aria-hidden="true" className="tp-privacy-check mt-0.5 shrink-0 text-emerald-700" />We suggest bill changes; we never call or log in for you.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export function PlanFaq() {
  return (
    <section id="faq" className="tp-faq mx-auto max-w-4xl scroll-mt-24 py-10 sm:py-14">
      <SectionHead kicker="Questions" title="Good questions, straight answers." center />
      <div className="tp-faq-list mt-8 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
        {PLAN_FAQ.map(({ q, a }) => (
          <details key={q} className="tp-faq-item group p-5 sm:p-6">
            <summary className="tp-faq-q flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-slate-950">{q}<span aria-hidden="true" className="tp-faq-sign text-xl text-emerald-700 group-open:rotate-45">+</span></summary>
            <p className="tp-faq-a mt-3 text-base leading-7 text-slate-600">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function PlanClosing() {
  return (
    <section className="tp-closing mx-auto max-w-6xl py-10 sm:py-14">
      <div className="tp-closing-card flex flex-col items-start gap-6 rounded-3xl bg-emerald-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="tp-closing-copy max-w-2xl">
          <p className="tp-closing-kicker text-xs font-extrabold uppercase tracking-[.16em] text-emerald-100">Find your 10%</p>
          <h2 className="tp-closing-title mt-2 text-3xl font-black leading-tight sm:text-4xl">Save it or earn it. Start free.</h2>
          <p className="tp-closing-text mt-3 text-emerald-50">No card. No bank login. See results as soon as you add your expenses.</p>
        </div>
        <Link href="/register" className="tp-closing-cta inline-flex min-h-12 items-center rounded-full bg-white px-6 font-black text-emerald-800 hover:bg-emerald-50">Start my 10% plan</Link>
      </div>
    </section>
  )
}

// Compact overview for the homepage: the five targets, linking to the full page.
export function PlanOverview() {
  return (
    <section id="ten-percent-plan" className="tp-overview mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-12">
      <SectionHead kicker="The 10% plan" title="Save 10% of your income, by spending less and earning more." text="Three simple moves from you, then GetGuac works on five targets from day one and shows results as soon as you add your expenses, then checks in every month." />
      <ol className="tp-overview-list mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PLAN_WEEKS.map(({ id, week, target, title, text, Icon }) => (
          <li key={id} className="tp-overview-item rounded-3xl border border-slate-200 bg-white p-5">
            <span className="tp-overview-icon flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white"><Icon size={20} aria-hidden="true" /></span>
            <p className="tp-overview-week mt-3 text-xs font-extrabold uppercase tracking-wider text-emerald-700">{week}</p>
            <h3 className="tp-overview-title mt-1 text-lg font-black text-slate-950">{title}</h3>
            <p className="tp-overview-target mt-1 text-xs font-bold text-emerald-700">{target ? `Target: ${target}*` : 'Education only'}</p>
            <p className="tp-overview-text mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </li>
        ))}
      </ol>
      <p className="tp-overview-note mt-4 text-xs text-slate-500">* Based on a suggested income of $4,200 a month (a $420 goal). Your own targets will reflect your transactions, spending habits and the options you choose.</p>
      <Link href="/find-your-10" className="tp-overview-link mt-6 inline-flex min-h-11 items-center font-bold text-emerald-700">See how the 10% plan works →</Link>
    </section>
  )
}
