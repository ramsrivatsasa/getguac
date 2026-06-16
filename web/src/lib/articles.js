// Original GetGuac money articles for the Resources / Articles hub (CalcXML-
// style). Concise, evergreen, and cross-linked to the relevant calculator.
// Body is an array of paragraph strings.

export const ARTICLES = [
  {
    slug: 'compound-interest',
    title: 'The magic of compound interest',
    category: 'Investing',
    excerpt: 'Why your first saved dollar is worth far more than your last.',
    calc: 'invest-growth',
    body: [
      'Compound interest is your money earning returns, and then those returns earning returns too. Over a few years it’s barely noticeable. Over a few decades it’s the whole game.',
      'Say you invest $300 a month at a 7% average return. After 10 years you’ve put in $36,000 and have about $52,000. Keep going to 30 years and you’ve put in $108,000 — but it’s worth around $365,000. More than two-thirds of that is pure growth you never contributed.',
      'The lesson: time matters more than amount. Starting five years earlier usually beats saving more later. Automate a monthly amount you won’t miss, leave it alone, and let compounding do the heavy lifting.',
    ],
  },
  {
    slug: 'emergency-fund-size',
    title: 'How big should your emergency fund be?',
    category: 'Saving',
    excerpt: 'The number that keeps a bad month from becoming a debt spiral.',
    calc: 'emergency',
    body: [
      'An emergency fund is cash set aside for true surprises — a job loss, a medical bill, a car that dies. Its only job is to be safe and instantly available so a rough patch doesn’t land on a credit card at 24% interest.',
      'A good target is 3 months of expenses if your income is steady and predictable, and 6+ months if it’s variable, you’re self-employed, or you’re the only earner in your household.',
      'Keep it in a high-yield savings account, not checking and not investments. You’ll earn ~4–5% while staying liquid. Automate a transfer on payday so it fills itself, and only touch it for genuine emergencies.',
    ],
  },
  {
    slug: '401k-basics',
    title: '401(k) basics: don’t leave free money behind',
    category: 'Retirement',
    excerpt: 'The employer match is the best return you’ll ever get.',
    calc: 'retirement',
    body: [
      'A 401(k) is a retirement account through your employer. You contribute from each paycheck before tax, it grows tax-deferred, and many employers match part of what you put in.',
      'That match is the headline. If your employer matches 50% up to 6% of your salary, contributing 6% instantly turns into 9% — an immediate 50% return before the market does anything. Always contribute at least enough to get the full match.',
      'After the match, a Roth IRA is often the next best home for your savings, then back to the 401(k). Increase your contribution by 1% each year or whenever you get a raise — you’ll barely feel it, and future-you will be very glad you did.',
    ],
  },
  {
    slug: 'roth-vs-traditional',
    title: 'Roth vs. Traditional IRA: which is right for you?',
    category: 'Retirement',
    excerpt: 'Pay tax now or pay tax later — and how to choose.',
    calc: 'retirement',
    body: [
      'Both are tax-advantaged retirement accounts; the difference is when you’re taxed. A Traditional IRA gives you a tax deduction today and you pay tax on withdrawals in retirement. A Roth IRA gives no deduction today, but everything — contributions and growth — comes out 100% tax-free later.',
      'Rule of thumb: if you expect to be in a higher tax bracket in retirement (often true for younger savers), the Roth usually wins. If you’re in a high bracket now and want the deduction, Traditional can make sense.',
      'Many people split the difference and hold both for tax flexibility down the road. Either way, the bigger win is simply contributing consistently.',
    ],
  },
  {
    slug: 'avalanche-vs-snowball',
    title: 'Avalanche vs. snowball: the fastest way out of debt',
    category: 'Debt',
    excerpt: 'Two proven payoff methods — and which saves you the most.',
    calc: 'credit-card',
    body: [
      'When you’re juggling several debts, both methods say the same thing: pay the minimum on everything, then throw every extra dollar at one target until it’s gone.',
      'The avalanche method targets the highest interest rate first. It’s the math-optimal choice — you pay the least total interest and get out fastest.',
      'The snowball method targets the smallest balance first. It costs a little more interest, but knocking out a whole debt quickly gives a motivation boost that keeps many people going.',
      'Pick the one you’ll actually stick with. And if a 0% balance-transfer card is available, it can pause interest entirely while you attack the principal.',
    ],
  },
  {
    slug: 'fifty-thirty-twenty',
    title: 'The 50/30/20 budget, explained',
    category: 'Saving',
    excerpt: 'A budget simple enough to actually follow.',
    calc: 'savings-goal',
    body: [
      'The 50/30/20 rule splits your after-tax income into three buckets: 50% to needs (rent, groceries, utilities, minimum debt payments), 30% to wants (dining out, subscriptions, fun), and 20% to savings and extra debt payoff.',
      'It works because it’s simple. You don’t track 40 categories — you just keep three buckets roughly in line. If needs creep above 50%, that’s your signal to look at big fixed costs like housing and transportation.',
      'Treat the 20% as a bill you pay yourself first: automate it on payday so it’s gone before you can spend it. GetGuac’s receipts and bills views make it easy to see which bucket your money is really landing in.',
    ],
  },
  {
    slug: 'hsa-triple-tax',
    title: 'The HSA: the most tax-friendly account you’re not using',
    category: 'Taxes',
    excerpt: 'Triple tax advantage — and a stealth retirement account.',
    calc: 'healthcare',
    body: [
      'A Health Savings Account (HSA) is the only account with a triple tax advantage: money goes in pre-tax, grows tax-free when invested, and comes out tax-free for medical expenses. Nothing else in the tax code does all three.',
      'You need a high-deductible health plan to contribute, and there are annual limits. But unlike a flexible spending account, HSA money rolls over forever — it’s yours.',
      'The pro move: pay small medical bills out of pocket today and let the HSA stay invested for decades. After age 65 you can also withdraw for any purpose (taxed like a regular IRA), which quietly makes it one of the best retirement accounts around.',
    ],
  },
  {
    slug: '529-college',
    title: '529 plans: saving for college the smart way',
    category: 'Family',
    excerpt: 'Tax-free growth for education — and often a state tax break.',
    calc: 'college',
    body: [
      'A 529 plan is a college savings account where your money grows tax-free and comes out tax-free for qualified education expenses — tuition, fees, books, and even some K-12 and apprenticeship costs.',
      'Many states sweeten it with a tax deduction or credit for contributing. Contribution limits are high, and you can change the beneficiary if plans change (to a sibling, or even yourself).',
      'Because tuition has historically risen ~5% a year, aim at a future number, not today’s sticker price, and start early so compounding does more of the work. You don’t have to fund 100% — many families target a third from savings, a third from income, and a third from aid.',
    ],
  },
  {
    slug: 'rent-vs-buy',
    title: 'Rent vs. buy: which actually wins?',
    category: 'Home',
    excerpt: 'It’s not just the mortgage — and time is the deciding factor.',
    calc: 'rent-buy',
    body: [
      'The sticker comparison — rent vs. a mortgage payment — is misleading. Owning also means property taxes, insurance, and maintenance (budget ~1% of the home’s value a year), so the real monthly cost of owning is usually well above the loan payment.',
      'But owning builds equity: part of each payment pays down the loan, and the home may appreciate. Renting buys flexibility and zero maintenance, but you build no equity.',
      'The deciding factor is usually how long you’ll stay. Buying tends to win after about five years, once appreciation and equity outweigh the big upfront costs. If you might move sooner, renting often comes out ahead.',
    ],
  },
  {
    slug: 'credit-score',
    title: 'What actually moves your credit score',
    category: 'Debt',
    excerpt: 'Five factors — and the two that matter most.',
    calc: 'dti',
    body: [
      'Your credit score is built from five things: payment history (~35%), amounts owed (~30%), length of history (~15%), new credit (~10%), and credit mix (~10%). The first two do most of the work.',
      'Payment history is simple: pay on time, every time. A single 30-day-late mark can drop a good score sharply and lingers for years. Set autopay for at least the minimum on everything.',
      'Amounts owed is really your credit utilization — how much of your limit you’re using. Keep it under ~30% (ideally under 10%). Paying a card down before the statement closes, or requesting a higher limit, lowers utilization fast.',
    ],
  },
  {
    slug: 'index-funds',
    title: 'Index funds 101: boring beats clever',
    category: 'Investing',
    excerpt: 'Why owning everything usually beats picking winners.',
    calc: 'invest-growth',
    body: [
      'An index fund buys a tiny slice of an entire market — say, all 500 companies in the S&P 500 — instead of betting on individual stocks. You get instant diversification for a rock-bottom fee.',
      'The case is overwhelming: over long stretches, most actively managed funds underperform a simple low-cost index, and they charge more to do it. Lower fees + broad diversification + time is hard to beat.',
      'Keep it simple: a broad U.S. index, maybe a total-international fund, held inside a tax-advantaged account (401k/IRA), with automatic monthly contributions. Then ignore the headlines and let compounding work.',
    ],
  },
  {
    slug: 'sinking-funds',
    title: 'Sinking funds: budget for the “surprises” that aren’t',
    category: 'Saving',
    excerpt: 'Holidays, car repairs, insurance — predictable, so plan for them.',
    calc: 'savings-goal',
    body: [
      'A sinking fund is money you set aside a little at a time for a known, irregular expense — holidays, annual insurance premiums, car maintenance, a vacation. These aren’t emergencies; they’re predictable, so they shouldn’t blow up your month.',
      'The math is easy: take the total cost, divide by the months until you need it, and save that each month. $1,200 of holiday spending in December? Save $100 a month starting in January.',
      'Keep sinking funds separate from your emergency fund so you’re not raiding your safety net for gifts. Many high-yield savings accounts let you create labeled “buckets” for exactly this.',
    ],
  },
]

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null
}
