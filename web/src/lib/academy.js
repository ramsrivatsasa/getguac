// GetGuac Academy — the curriculum layer over our existing lessons.
//
// WHAT THIS IS: /academy presents every GetGuac lesson as one ordered course —
// ten tracks, each lesson with objectives, key ideas, an action plan, a worked
// example, mistakes to avoid and a "try it today" exercise. Layout came from a
// masterclass mock-up Ram liked (2026-10-01); its 100 placeholder lessons were
// one generic template with invented statistics, so none of that copy is used.
//
// WHERE THE CONTENT LIVES:
//   - 31 lessons are the articles in lib/articles.js (the lesson body is the
//     article body, so an article edit updates the Academy too). Their pages set
//     the /articles URL as canonical — the Academy is a second way in, not a
//     duplicate to be indexed.
//   - 4 lessons are Academy-native (NATIVE_LESSONS below), written from the
//     money-basics guides in public/goals/. They are canonical at /academy.
//   - EXTRAS adds the course material on top of each body.
//
// RULES FOR EDITING EXTRAS: every worked example is arithmetic on stated,
// labelled inputs — recheck the sums when an input changes. No promised returns,
// no product picks, no live rates presented as current. Credit facts were
// checked 2026-10-01 against FTC, CFPB and myFICO (see
// docs/GUIDES_MONEY_BASICS_REVIEW_2026-10-01.md).

import { ARTICLES } from './articles'
import { CHECKS } from './academy-checks'
import { BUDGET_LESSONS, SAFETY_LESSONS } from './academy-content/budget'
import { DEBT_LESSONS } from './academy-content/debt'
import { STOCK_LESSONS } from './academy-content/stocks'
import { FUND_LESSONS } from './academy-content/funds'
import { RETIRE_LESSONS } from './academy-content/retire'
import { TAX_LESSONS } from './academy-content/tax'
import { HOUSING_LESSONS } from './academy-content/housing'
import { PROTECT_LESSONS, BEHAVIOR_LESSONS } from './academy-content/protect'

export const TRACKS = [
  { id: 'start', name: 'Start here', icon: 'Compass', blurb: 'Where you stand, what you want and how GetGuac helps.', lessons: ['where-you-stand', 'money-goals', 'how-getguac-helps-you-save', 'small-changes-more-room'] },
  { id: 'budget', name: 'Budgeting and cash flow', icon: 'PieChart', blurb: 'A plan built from the month you actually had.', lessons: ['fifty-thirty-twenty', 'zero-based-budgeting', 'fixed-variable-discretionary', 'track-spending-with-receipts', 'sinking-funds', 'irregular-income-budget', 'impulse-purchases', 'lifestyle-inflation', 'monthly-money-date', 'utility-bills-usage'] },
  { id: 'safety', name: 'Emergency fund and savings', icon: 'ShieldCheck', blurb: 'A cushion that stops surprises becoming debt.', lessons: ['emergency-fund-size', 'what-counts-as-emergency', 'fund-your-emergency-fund', 'tiered-cash-reserves', 'high-yield-savings', 'refill-emergency-fund', 'cash-and-inflation'] },
  { id: 'spending', name: 'Smart spending', icon: 'ShoppingCart', blurb: 'Groceries, bills and subscriptions, line by line.', lessons: ['grocery-budget-that-sticks', 'grocery-list-worth-reviewing', 'how-to-read-a-grocery-receipt', 'cancel-unused-subscriptions', 'review-bills-with-confidence'] },
  { id: 'receipts', name: 'Refunds and receipts', icon: 'Receipt', blurb: 'Money still owed to you, and the proof to claim it.', lessons: ['get-the-refund-youre-owed', 'return-windows-what-to-check', 'how-long-to-keep-receipts', 'digital-vs-paper-receipts', 'find-receipts-in-your-email'] },
  { id: 'debt', name: 'Debt and credit', icon: 'CreditCard', blurb: 'Borrow well, pay down fast and protect your score.', lessons: ['good-debt-vs-bad-debt', 'avalanche-vs-snowball', 'debt-consolidation-refinancing', 'credit-cards-without-interest', 'credit-score', 'check-your-credit-report', 'identity-theft-defense', 'dealing-with-collections', 'student-loan-repayment', 'auto-loan-basics', 'mortgage-piti'] },
  { id: 'mindset', name: 'Money mindset', icon: 'Brain', blurb: 'The habits and biases behind every money decision.', lessons: ['loss-aversion', 'herd-behavior-fomo', 'mental-accounting', 'present-bias', 'defining-enough'] },
  { id: 'invest', name: 'Funds and portfolios', icon: 'TrendingUp', blurb: 'How growth works and how funds are built. Education only.', lessons: ['compound-interest', 'index-funds', 'what-is-an-etf', 'etfs-vs-mutual-funds', 'sp-500-explained', 'total-market-funds', 'international-diversification', 'sector-and-thematic-etfs', 'three-fund-portfolio', 'dollar-cost-averaging'] },
  { id: 'stocks', name: 'Stocks and the market', icon: 'BarChart3', blurb: 'How shares, prices and markets work. Never stock picks.', lessons: ['what-is-a-stock', 'common-vs-preferred-stock', 'how-stock-exchanges-work', 'market-capitalization', 'dividends-and-yield', 'price-to-earnings-ratio', 'growth-vs-value', 'ipos-explained', 'stock-splits-and-dilution', 'bull-and-bear-markets'] },
  { id: 'retire', name: 'Retirement accounts', icon: 'Landmark', blurb: '401(k), IRA, HSA, Social Security and withdrawals.', lessons: ['401k-basics', 'ira-basics', 'roth-vs-traditional', 'backdoor-roth-ira', 'hsa-triple-tax', 'social-security-basics', 'four-percent-rule', 'required-minimum-distributions', 'early-withdrawal-rules'] },
  { id: 'tax', name: 'Taxes', icon: 'FileText', blurb: 'Brackets, deductions, gains and records, explained plainly.', lessons: ['marginal-tax-brackets', 'credits-vs-deductions', 'standard-vs-itemized', 'understanding-sales-tax', 'receipts-at-tax-time', 'capital-gains-short-long', 'tax-loss-harvesting', 'w2-vs-1099', 'charitable-giving-taxes', 'when-to-hire-a-tax-pro'] },
  { id: 'housing', name: 'Housing and real estate', icon: 'Home', blurb: 'Big decisions, run with the real numbers.', lessons: ['rent-vs-buy', 'twenty-eight-thirty-six-rule', 'down-payment-and-pmi', 'closing-costs', 'home-maintenance-reserve', 'house-hacking', 'reits-explained'] },
  { id: 'protect', name: 'Protection and estate planning', icon: 'Umbrella', blurb: 'Insurance, wills and the people who depend on you.', lessons: ['term-vs-whole-life-insurance', 'disability-insurance', 'umbrella-insurance', 'will-vs-living-trust', 'powers-of-attorney', '529-college', 'teaching-kids-about-money'] },
]

const BASE_NATIVE = [
  {
    slug: 'where-you-stand',
    title: 'Know where you stand before you plan',
    category: 'Start here',
    excerpt: 'Income, spending, what you own and what you owe — the four numbers every plan starts from.',
    readMins: 6,
    updated: '2026-10-01',
    body: [
      'Most money advice starts with what to do next. That only works once you know where you are. Taking stock is a snapshot, not a judgement: four lists, made from numbers you can look up, that together show how much room each month leaves and where you stand overall.',
      { h: 'The four lists' },
      { list: [
        'Income: take-home pay from every regular source, after tax and deductions.',
        'Spending: one full month of what actually went out, from receipts, orders and bills.',
        'What you own: checking, savings, retirement and investment balances, plus major assets at a realistic value.',
        'What you owe: every card and loan, with its balance, interest rate (APR), minimum payment and due date.',
      ] },
      { h: 'Two numbers come out of it' },
      'Monthly cash flow is income minus spending. It tells you how much room the month leaves, and it is what a budget plans. Net worth is what you own minus what you owe. It tells you where you stand overall, and it is what goals and debt payoff move over time.',
      'A negative net worth early on is common. Student loans and car loans often outweigh savings for years. The useful question is not whether the number is good, but which direction it is moving.',
      { h: 'Why the APR belongs on the list' },
      'Two debts with the same balance can cost very different amounts. A $3,000 card balance at 24% costs about $60 a month in interest; a $3,000 loan at 6% costs about $15. Writing the rate next to every balance shows which debt is actually expensive, which is the first decision in any payoff plan.',
      { h: 'Make it a habit, not a project' },
      'Write the figures down with the date, then repeat the snapshot every three to six months. Comparing two snapshots shows progress that a single month never will: debt shrinking, savings growing, spending settling into a pattern you chose.',
    ],
  },
  {
    slug: 'money-goals',
    title: 'Turn “save more” into a goal with a date',
    category: 'Start here',
    excerpt: 'An amount, a date and a monthly number turn an intention into something you can finish.',
    readMins: 6,
    updated: '2026-10-01',
    body: [
      '“Save more” is a wish, not a goal. It gives no signal about whether this month went well, so any spare money tends to be spent before it can become progress. A useful money goal has three parts: an amount, a date and a monthly contribution.',
      { h: 'Specific, measurable, dated' },
      '“A better car” cannot be planned. “$3,000 for a car deposit by next June” can: divide the amount by the months remaining and you have a number to set aside each month and a way to tell whether you are on track.',
      { h: 'Sort goals by time horizon' },
      { list: [
        'Short term (under a year): a starter emergency cushion, a holiday, a repair. Keep this money safe and reachable.',
        'Medium term (one to five years): a car, a home deposit, a wedding. Usually still kept in savings, where its value does not swing with the market.',
        'Long term (beyond five years): retirement and other distant goals, where tax-advantaged accounts and long-term investing usually come in.',
      ] },
      { h: 'Put them in order' },
      'A small emergency cushion and any employer retirement match usually come first, because both protect everything else: the cushion stops the next surprise becoming new debt, and the match is money you would otherwise leave behind. High-interest debt and discretionary goals follow. Your situation can change the order; the point is to choose it on purpose.',
      { h: 'When the numbers do not fit' },
      'If the monthly amounts add up to more than your budget allows, move a date before you drop a goal. A later date with steady progress beats an early date that is abandoned in month three.',
    ],
  },
  {
    slug: 'credit-cards-without-interest',
    title: 'Use credit cards without paying interest',
    category: 'Debt',
    excerpt: 'Pay the full statement balance by the due date and a card costs nothing. Here is exactly how the grace period works.',
    readMins: 6,
    updated: '2026-10-01',
    body: [
      'A credit card can be the cheapest way to pay or one of the most expensive ways to borrow. The difference is almost entirely one habit: whether the full statement balance is paid by the due date.',
      { h: 'The grace period' },
      'Card issuers must deliver your bill at least 21 days before payment is due (CFPB). If you pay the full statement balance within that window, regular purchases usually cost no interest. That interest-free window is the grace period.',
      'Carry a balance and you lose it. Interest is charged on what remains unpaid, and while a balance is carried, new purchases may start accruing interest too. Cash advances and convenience checks usually charge interest from day one, grace period or not.',
      { h: 'Two dates to know' },
      { list: [
        'Statement closing date: the day the balance is calculated and, usually, reported to the credit bureaus.',
        'Due date: the day payment must arrive to avoid a late fee and keep the grace period.',
      ] },
      { h: 'Minimum payments are a floor, not a plan' },
      'Paying the minimum keeps the account in good standing, but the rest of the balance keeps growing at the card’s APR. On a $1,200 balance at 24% APR, paying only a $40 minimum leaves about $23 of interest the next month — and the balance barely moves.',
      { h: 'Where rewards fit' },
      'Rewards are only a gain when no interest is paid. A few percent back is quickly outweighed by a carried balance at a double-digit APR. Choose a card for how you already spend, never as a reason to spend more.',
      { h: 'Credit score side effects' },
      'Payment history is about 35% of a FICO score and amounts owed about 30% (myFICO). Paying on time every month and keeping balances low against the limit are the two habits that matter most — and both come free with paying in full.',
    ],
  },
  {
    slug: 'check-your-credit-report',
    title: 'Check your credit report like a receipt',
    category: 'Debt',
    excerpt: 'All three reports are free every week. Read them line by line, dispute errors with proof and freeze when you are not applying.',
    readMins: 6,
    updated: '2026-10-01',
    body: [
      'Your credit report is a record about you that lenders, landlords and insurers may use — and most people never read it. Checking it is free, it does not affect your score, and it works best the way you check a receipt: line by line, with your own records beside it.',
      { h: 'Where to get it' },
      'Equifax, Experian and TransUnion each keep a separate report. All three have permanently made free weekly reports available at AnnualCreditReport.com, the only site authorized to provide the free reports required by law (FTC). Other sites may charge or try to sell you something.',
      { h: 'What to check' },
      { list: [
        'Personal details: names, addresses and employers should all be yours.',
        'Accounts: every card and loan should be one you opened, with the right balance, limit and status.',
        'Payment history: any late payment listed should match your own statements.',
        'Inquiries: hard inquiries should match applications you actually made.',
      ] },
      { h: 'Report versus score' },
      'The report is the record; a score is calculated from it. For FICO Scores, myFICO lists payment history at 35%, amounts owed at 30%, length of history at 15%, credit mix at 10% and new credit at 10%. An error in the report can therefore move the score.',
      { h: 'Disputing an error' },
      'Contact both the credit bureau and the business that supplied the information. Explain what is wrong, include copies — not originals — of your proof, and keep a record of what you send. The bureau generally has 30 days to investigate (FTC).',
      { h: 'Freeze when you are not applying' },
      'A credit freeze is free, does not affect your score, and blocks new credit being opened in your name until you lift it (FTC). If you are not applying for credit soon, it is one of the simplest protections available. Lift it temporarily when you do apply.',
    ],
  },
]

/* eslint-disable max-len */
export const EXTRAS = {
  'where-you-stand': {
    objectives: ['List income, spending, assets and debts in one place', 'Calculate monthly cash flow and net worth', 'Spot which debt costs the most from its APR'],
    ideas: [
      { t: 'Cash flow and net worth answer different questions', d: 'Cash flow says how much room this month leaves. Net worth says where you stand overall. A plan needs both.' },
      { t: 'Direction beats the starting value', d: 'A net worth of −$250 that was −$2,000 six months ago is real progress. Compare snapshots, not yourself to others.' },
      { t: 'The rate is part of the balance', d: 'Interest per month is roughly balance × APR ÷ 12. Writing it down shows which debt is expensive to keep.' },
    ],
    plan: [
      { t: 'Gather take-home pay', d: 'Use a typical month after tax, including side income and benefits.' },
      { t: 'Capture one month of spending', d: 'Scan receipts and forward email orders so the month is complete.' },
      { t: 'List balances on one date', d: 'Every account you own and every debt you owe, with APR, minimum and due date.' },
      { t: 'Calculate and date it', d: 'Own minus owe, income minus spending. Write the date beside both numbers.' },
      { t: 'Book the next snapshot', d: 'Put a reminder three to six months out and compare.' },
    ],
    example: {
      title: 'A first snapshot: slightly negative, and a clear starting point',
      intro: 'An illustrative early-career picture. Savings are growing, but loans still outweigh them.',
      head: ['Item', 'Own or owe', 'Amount'],
      rows: [['Checking', 'Own', '$1,850'], ['Savings', 'Own', '$2,400'], ['Retirement account', 'Own', '$6,500'], ['Credit card (24% APR)', 'Owe', '−$3,000'], ['Car loan (6% APR)', 'Owe', '−$8,000'], ['Net worth', '', '−$250']],
      takeaway: '$10,750 owned minus $11,000 owed. The card is the smaller debt but costs about $60 a month in interest, against about $40 for the car loan — so it is the first target.',
    },
    mistakes: ['Using gross salary instead of take-home pay', 'Valuing a car or home at what you paid rather than what it would sell for', 'Leaving out small debts such as store cards or buy-now-pay-later'],
    exercise: 'Write down every debt you have with its APR. Multiply each balance by its APR and divide by 12. Circle the largest number — that is your most expensive debt.',
    apply: [
      { href: '/goals/take-stock.html', label: 'Guide: take stock in GetGuac', d: 'Step by step, with Reports and Wealth Path.' },
      { href: '/calculators#net-worth', label: 'Net worth calculator', d: 'Own minus owe, on one date.' },
    ],
  },
  'money-goals': {
    objectives: ['Write goals with an amount, a date and a monthly number', 'Sort goals by time horizon', 'Order goals so the first one protects the rest'],
    ideas: [
      { t: 'A date turns a wish into a plan', d: 'Amount ÷ months remaining = the monthly contribution. Without a date there is nothing to divide by.' },
      { t: 'Horizon decides where money sits', d: 'Money needed soon belongs somewhere safe and reachable; money for decades away can take more risk.' },
      { t: 'Three funded goals beat ten wishes', d: 'Every active goal needs a real monthly amount. Park the rest on a someday list.' },
    ],
    plan: [
      { t: 'Brainstorm everything', d: 'Write every goal down without sorting.' },
      { t: 'Price and date each one', d: 'Today’s cost and a realistic month.' },
      { t: 'Choose the top three', d: 'Starter cushion and any employer match usually lead.' },
      { t: 'Divide and automate', d: 'Set a transfer for each monthly number on payday.' },
      { t: 'Review monthly', d: 'Behind? Change the amount or the date on purpose.' },
    ],
    example: {
      title: 'Three goals, one monthly figure',
      intro: 'Each monthly amount is the target divided by the months until its date.',
      head: ['Goal', 'Target', 'Time', 'Per month'],
      rows: [['Starter emergency cushion', '$1,000', '5 months', '$200'], ['Holiday', '$600', '10 months', '$60'], ['Car deposit', '$3,000', '24 months', '$125'], ['Total', '', '', '$385']],
      takeaway: 'If $385 does not fit, move the holiday to 15 months ($40) before cutting the cushion. Illustration only; amounts ignore interest and price changes.',
    },
    mistakes: ['Setting goals with no date', 'Funding many goals a little instead of a few properly', 'Keeping short-term goal money somewhere its value can fall'],
    exercise: 'Pick one goal. Write its amount and date, divide to get the monthly number, and schedule that transfer for your next payday.',
    apply: [
      { href: '/goals/money-goals.html', label: 'Guide: set money goals', d: 'Goals beside your accounts in Wealth Path.' },
      { href: '/calculators#savings-goal', label: 'Savings goal calculator', d: 'Amount and date in, monthly number out.' },
    ],
  },
  'how-getguac-helps-you-save': {
    objectives: ['Know which leaks GetGuac surfaces', 'Turn a finding into an action', 'Understand what GetGuac does not do'],
    ideas: [
      { t: 'Start with money already leaving', d: 'Recurring charges, fees and price gaps are easier to stop than income is to raise.' },
      { t: 'One receipt is data; many are a pattern', d: 'Repeat items, price drift and duplicate charges only show up across months.' },
      { t: 'A finding is not a saving', d: 'Money is saved when you act — cancel, return, switch — and the next statement confirms it.' },
    ],
    plan: [
      { t: 'Capture a month', d: 'Scan receipts, forward order emails, upload a card statement.' },
      { t: 'Review recurring charges', d: 'Keep, cancel or rotate each one.' },
      { t: 'Check fees and interest', d: 'Start with the highest real-dollar cost.' },
      { t: 'Check open returns', d: 'Act on anything still inside its window.' },
      { t: 'Confirm on the next statement', d: 'Record only what actually changed.' },
    ],
    example: {
      title: 'What one month of review can find',
      intro: 'Illustrative findings from a single month of receipts and one card statement.',
      head: ['Finding', 'Size', 'Per year'],
      rows: [['Unused subscription cancelled', '$14.00 a month', '$168.00'], ['One overdraft avoided next time', '$35.00', '$35.00'], ['Repeat item bought at the cheaper store', '$0.50 × 2 a month', '$12.00'], ['Total', '', '$215.00']],
      takeaway: 'None of these cut anything you enjoy. Results depend on your own purchases and records.',
    },
    mistakes: ['Expecting savings without capturing receipts', 'Counting a quoted discount as money already saved', 'Reviewing once and never again'],
    exercise: 'Upload one recent card statement and find the single largest fee or interest charge on it.',
    apply: [
      { href: '/goals/reduce-waste.html', label: 'Guide: reduce quiet waste', d: 'Recurring charges life moved past.' },
      { href: '/goals/wizard.html', label: 'GuacWizard', d: 'Fees and interest ranked by real cost.' },
    ],
  },
  'small-changes-more-room': {
    objectives: ['Use keep, swap, reduce and pause to judge a purchase', 'Price a change honestly, including its costs', 'Tell a plan from a result'],
    ideas: [
      { t: 'Keeping is a valid choice', d: 'If something earns its place, keep it. The point is choosing, not cutting.' },
      { t: 'Frequency multiplies everything', d: 'A $3 difference matters little once and a lot twelve times a month.' },
      { t: 'Count the friction', d: 'Extra travel, time or a lower-quality swap can cancel the saving.' },
    ],
    plan: [
      { t: 'Pick one frequent purchase', d: 'Something you buy at least weekly.' },
      { t: 'Price each option', d: 'Keep, swap, reduce or pause — monthly and yearly.' },
      { t: 'Choose and record it', d: 'Write the choice down as a plan.' },
      { t: 'Check the receipts', d: 'After a month, see what actually happened.' },
    ],
    example: {
      title: 'One $8 habit, four choices',
      intro: 'An illustrative purchase made 12 times a month at $8, with a $5 comparable option.',
      head: ['Choice', 'What changes', 'Per month', 'Per year'],
      rows: [['Keep', 'Nothing', '$0', '$0'], ['Swap', '4 of 12 visits to the $5 option', '$12', '$144'], ['Reduce', '12 visits down to 8', '$32', '$384'], ['Pause', 'Skip it for one month', '$96 once', '$96']],
      takeaway: 'Each row is a different trade-off, not a ranking. Pick the one you would still be happy with in three months.',
    },
    mistakes: ['Treating every purchase as a problem', 'Ignoring the cost of switching', 'Counting a planned change as a completed saving'],
    exercise: 'Choose one purchase you make every week and fill in the four-row table for it.',
    apply: [
      { href: '/goals/learn.html', label: 'Guide: learn from every trip', d: 'Worth-It ratings for real purchases.' },
    ],
  },
  'fifty-thirty-twenty': {
    objectives: ['Split take-home pay into needs, wants and savings', 'Sort grey-area costs honestly', 'Adjust the split when needs run high'],
    ideas: [
      { t: 'Use take-home, not salary', d: 'The split applies to what reaches your account.' },
      { t: 'The split is a direction', d: 'Where housing is expensive, 60/25/15 can be the honest starting point.' },
      { t: 'Pay the 20% first', d: 'Move savings on payday so the decision is already made.' },
    ],
    plan: [
      { t: 'Find take-home pay', d: 'Average the last three months if it varies.' },
      { t: 'Tag a month of spending', d: 'Needs, wants or savings and extra debt.' },
      { t: 'Compare with 50/30/20', d: 'Note which bucket is off and by how much.' },
      { t: 'Automate savings', d: 'Set the transfer for payday.' },
      { t: 'Check three numbers monthly', d: 'One total per bucket, nothing more.' },
    ],
    example: {
      title: 'When needs take 60%',
      intro: 'An illustrative $3,600 take-home month in a high-rent city.',
      head: ['Bucket', 'Classic 50/30/20', 'Adjusted 60/25/15'],
      rows: [['Needs', '$1,800', '$2,160'], ['Wants', '$1,080', '$900'], ['Savings and extra debt', '$720', '$540']],
      takeaway: 'Wants shrink first so savings never drop to zero. Revisit the split when rent, income or a debt changes.',
    },
    mistakes: ['Splitting gross pay', 'Treating 30% for wants as a spending target', 'Abandoning the split after one bad month'],
    exercise: 'Total last month’s needs and divide by take-home pay. Write the percentage down — that is your real starting split.',
    apply: [
      { href: '/goals/first-budget.html', label: 'Guide: build your first budget', d: 'Set categories from a real month.' },
      { href: '/calculators#take-home', label: 'Take-home pay calculator', d: 'Start from the right number.' },
    ],
  },
  'track-spending-with-receipts': {
    objectives: ['Build a baseline from receipts, not memory', 'Choose categories that fit your life', 'Turn a problem category into one specific change'],
    ideas: [
      { t: 'Memory rounds down', d: 'Small, frequent purchases are the ones people forget.' },
      { t: 'Month one is for seeing', d: 'Do not cut anything until you know the baseline.' },
      { t: 'A receipt is information', d: 'Treat it as a diagnosis, not a verdict.' },
    ],
    plan: [
      { t: 'Capture everything for a month', d: 'Paper, email and app receipts, at the moment they arrive.' },
      { t: 'Use five to seven categories', d: 'Ones that match how you actually spend.' },
      { t: 'Total weekly', d: 'A short weekly review keeps it current.' },
      { t: 'Compare guess with reality', d: 'Write down your estimate before you total.' },
      { t: 'Pick one change', d: 'In the category with the biggest gap.' },
    ],
    example: {
      title: 'The guess versus the receipts',
      intro: 'An illustrative first month: the estimate was written down before the receipts were totalled.',
      head: ['Category', 'Guessed', 'Receipts said', 'Gap'],
      rows: [['Dining out', '$150', '$236', '+$86'], ['Groceries', '$450', '$512', '+$62'], ['Household', '$60', '$94', '+$34'], ['Total', '$660', '$842', '+$182']],
      takeaway: 'The biggest gap — dining out — gets one specific change, such as one fewer takeaway a week, not a ban.',
    },
    mistakes: ['Skipping “small” purchases', 'Cutting before measuring', 'Using a generic category list that does not fit'],
    exercise: 'Write down what you think you spent on dining out last month. Then total the receipts and compare.',
    apply: [
      { href: '/goals/understand.html', label: 'Guide: understand where it went', d: 'Item-level spending from receipts.' },
      { href: '/goals/categories.html', label: 'Categories', d: 'Let spending sort itself.' },
    ],
  },
  'sinking-funds': {
    objectives: ['Turn irregular bills into monthly amounts', 'Keep sinking funds apart from the emergency fund', 'Catch up when a bill is already close'],
    ideas: [
      { t: 'Predictable is not the same as monthly', d: 'Annual premiums and holidays are certain; only their timing is lumpy.' },
      { t: 'Divide by months remaining', d: 'Cost ÷ months until due = the set-aside.' },
      { t: 'Label every bucket', d: 'A named pot is harder to raid than a general balance.' },
    ],
    plan: [
      { t: 'List last year’s irregular costs', d: 'Use receipts and statements, not memory.' },
      { t: 'Estimate this year’s cost', d: 'Round up; these usually run over.' },
      { t: 'Divide and total', d: 'Add the monthly amounts into one line.' },
      { t: 'Automate transfers', d: 'On payday, into labelled savings buckets.' },
    ],
    example: {
      title: 'Four irregular costs become one monthly line',
      intro: 'Illustrative annual costs, set aside evenly over 12 months.',
      head: ['Cost', 'Per year', 'Per month'],
      rows: [['Car insurance ($720 twice a year)', '$1,440', '$120'], ['Holidays and gifts', '$1,200', '$100'], ['Car registration', '$180', '$15'], ['Annual vet visit', '$360', '$30'], ['Total', '$3,180', '$265']],
      takeaway: '$265 a month, every month, replaces four stressful months a year.',
    },
    mistakes: ['Paying predictable costs from the emergency fund', 'Underestimating holidays and repairs', 'Keeping the money in everyday checking'],
    exercise: 'Find one bill you pay once or twice a year. Divide it by the months until it is due and set up that transfer.',
    apply: [
      { href: '/goals/bills.html', label: 'Bills calendar', d: 'See irregular bills before they land.' },
      { href: '/calculators#savings-goal', label: 'Savings goal calculator', d: 'Monthly amount for a dated cost.' },
    ],
  },
  'emergency-fund-size': {
    objectives: ['Calculate monthly essentials', 'Choose a target between three and six months', 'Set a first milestone you will reach'],
    ideas: [
      { t: 'Count essentials, not all spending', d: 'In a crisis, wants pause. Size the fund on what must be paid.' },
      { t: 'Risk sets the months', d: 'Single income, self-employment or dependants push toward six or more.' },
      { t: 'One month first', d: 'An early milestone builds the habit before the full target.' },
    ],
    plan: [
      { t: 'Total essential costs', d: 'Housing, utilities, food, transport, insurance, minimum payments.' },
      { t: 'Pick your months', d: 'Use income stability and dependants.' },
      { t: 'Set milestone one', d: 'One month of essentials.' },
      { t: 'Automate a fixed transfer', d: 'Treat it like a bill.' },
      { t: 'Refill after use', d: 'Rebuilding becomes the next goal.' },
    ],
    example: {
      title: 'Sizing the fund from essentials',
      intro: 'Illustrative monthly essentials for a single-income household.',
      head: ['Essential', 'Per month'],
      rows: [['Rent', '$1,300'], ['Utilities', '$180'], ['Groceries', '$450'], ['Transport', '$250'], ['Insurance', '$150'], ['Minimum debt payments', '$120'], ['Essentials total', '$2,450']],
      takeaway: 'Milestone one: $2,450. Three months: $7,350. Six months: $14,700.',
    },
    mistakes: ['Sizing on total spending instead of essentials', 'Keeping the fund in the spending account', 'Using it for planned costs that belong in a sinking fund'],
    exercise: 'Add up your essential costs from last month and write down your one-month milestone.',
    apply: [
      { href: '/goals/emergency.html', label: 'Guide: fund the cushion', d: 'Start with money already yours.' },
      { href: '/calculators#emergency', label: 'Emergency fund calculator', d: 'Size it against your essentials.' },
    ],
  },
  'fund-your-emergency-fund': {
    objectives: ['Find money already leaking from your spending', 'Combine one-off recoveries with a monthly transfer', 'Track progress month by month'],
    ideas: [
      { t: 'Recoveries start the balance', d: 'Refunds owed and cancelled subscriptions are money you already had.' },
      { t: 'Automation keeps it growing', d: 'A fixed transfer you barely notice outlasts willpower.' },
      { t: 'Prove the amount first', d: 'Set the transfer to what you actually freed, not a hopeful round number.' },
    ],
    plan: [
      { t: 'Claim open refunds', d: 'Anything still inside its return window.' },
      { t: 'Cancel one unused charge', d: 'Redirect that amount to the fund.' },
      { t: 'Set a payday transfer', d: 'An amount you can keep.' },
      { t: 'Log the running total', d: 'Monthly, until the first milestone.' },
    ],
    example: {
      title: 'Reaching a $1,000 starter cushion',
      intro: 'Illustrative: an $86 refund in month one, two cancelled subscriptions worth $23 a month, and a $150 monthly transfer.',
      head: ['Month', 'Added', 'Running total'],
      rows: [['1', '$259 (refund + $23 + $150)', '$259'], ['2', '$173', '$432'], ['3', '$173', '$605'], ['4', '$173', '$778'], ['5', '$173', '$951'], ['6', '$173', '$1,124']],
      takeaway: 'Month six passes $1,000 without cutting anything the household uses.',
    },
    mistakes: ['Waiting to find spare money before starting', 'Setting a transfer too large to keep', 'Leaving recovered money in checking where it gets spent'],
    exercise: 'Find one subscription you have not used in a month. Cancel it and move that amount to savings today.',
    apply: [
      { href: '/goals/recover.html', label: 'Returns and refunds', d: 'Money still owed to you.' },
      { href: '/goals/emergency.html', label: 'Guide: fund the cushion', d: 'The full method.' },
    ],
  },
  'high-yield-savings': {
    objectives: ['Compare savings accounts on APY, fees and access', 'Know what an HYSA is for and not for', 'Check FDIC or NCUA insurance'],
    ideas: [
      { t: 'Same safety, different yield', d: 'Insured deposits are protected up to the limit whatever the rate.' },
      { t: 'Fees can erase the yield', d: 'Compare net interest after fees, not the headline rate.' },
      { t: 'Promotional is not standard', d: 'A teaser rate is temporary; check the rate after it ends.' },
    ],
    plan: [
      { t: 'Total your idle cash', d: 'Money not needed for daily spending.' },
      { t: 'Compare three accounts', d: 'APY, monthly fee, minimum and transfer time.' },
      { t: 'Confirm insurance', d: 'FDIC for banks, NCUA for credit unions.' },
      { t: 'Move it and recheck yearly', d: 'Rates drift.' },
    ],
    example: {
      title: 'A higher rate can still earn less',
      intro: 'Illustrative rates, not current offers, on a $3,000 balance for one year.',
      head: ['Account', 'APY', 'Fees per year', 'Net interest'],
      rows: [['A', '4.00%', '$60 ($5 a month)', '$60'], ['B', '3.50%', '$0', '$105']],
      takeaway: 'Account B earns $45 more despite the lower rate. Always subtract fees.',
    },
    mistakes: ['Choosing on a promotional rate alone', 'Ignoring monthly fees and minimums', 'Keeping long-term growth money in cash'],
    exercise: 'Look up the APY and any fees on your current savings account and write them down.',
    apply: [
      { href: '/calculators#cd-savings', label: 'Savings and CD calculator', d: 'See interest on your balance.' },
      { href: '/calculators#emergency', label: 'Emergency fund calculator', d: 'Size what belongs in savings.' },
    ],
  },
  'grocery-budget-that-sticks': {
    objectives: ['Set a grocery number from real receipts', 'Convert it to a weekly figure', 'Use unit prices to compare swaps'],
    ideas: [
      { t: 'Start from the honest baseline', d: 'A target slightly below real spending holds; a wished-for number breaks in week one.' },
      { t: 'Weekly numbers are easier to feel', d: 'Monthly ÷ 4.3 gives a figure you can shop against.' },
      { t: 'The unit price tells the truth', d: 'It catches shrinkflation and fake bargains.' },
    ],
    plan: [
      { t: 'Total recent grocery receipts', d: 'Four to six weeks.' },
      { t: 'Set a slightly lower target', d: 'Tighten gradually.' },
      { t: 'Divide by 4.3', d: 'That is your weekly number.' },
      { t: 'Swap three repeat items', d: 'Same size, compared by unit price.' },
    ],
    example: {
      title: 'Three same-size swaps',
      intro: 'Illustrative shelf prices, each pair the same size.',
      head: ['Item', 'Usual brand', 'Store brand', 'Saved per week'],
      rows: [['Cereal, 18 oz', '$4.49', '$2.99', '$1.50'], ['Pasta sauce, 24 oz', '$3.79', '$2.29', '$1.50'], ['Shredded cheese, 8 oz', '$3.49', '$2.49', '$1.00'], ['Total', '', '', '$4.00']],
      takeaway: '$4 a week is $208 a year, from three items — if quality and ingredients suit you.',
    },
    mistakes: ['Setting the target too low', 'Comparing different pack sizes', 'Shopping without a list'],
    exercise: 'Total last month’s grocery receipts and divide by 4.3. That is your honest weekly baseline.',
    apply: [
      { href: '/goals/grocery.html', label: 'Guide: know the grocery bill first', d: 'Item-level history from receipts.' },
      { href: '/goals/steals.html', label: 'Steals', d: 'Price-check repeat items.' },
    ],
  },
  'grocery-list-worth-reviewing': {
    objectives: ['Check what is already at home before shopping', 'Choose sizes that match what you use', 'Compare the same amount, not the same price'],
    ideas: [
      { t: 'The cheapest item is the one you skip', d: 'Duplicates of things already at home cost full price.' },
      { t: 'Waste is a price increase', d: 'Half a pack thrown away doubles its real cost.' },
      { t: 'Last receipt is a reference', d: 'Today’s shelf price may differ.' },
    ],
    plan: [
      { t: 'Check pantry and fridge', d: 'Cross off what is already there.' },
      { t: 'Match quantity to use', d: 'Buy what last week actually used.' },
      { t: 'Compare per unit', d: 'Same amount, same quality.' },
      { t: 'Record the receipt', d: 'So the next list starts from a real price.' },
    ],
    example: {
      title: 'A five-minute list review',
      intro: 'Illustrative prices for one weekly list.',
      head: ['Item', 'Before review', 'After review', 'Difference'],
      rows: [['Olive oil (one already at home)', '$8.99', '$0', '$8.99'], ['Spinach 10 oz to 5 oz (half usually wasted)', '$3.99', '$2.49', '$1.50'], ['Yogurt 4-packs, two to one (one expired last time)', '$5.98', '$2.99', '$2.99'], ['Total', '', '', '$13.48']],
      takeaway: 'Nothing was given up — only duplicates and waste were removed.',
    },
    mistakes: ['Shopping without checking stock', 'Buying the big pack that never gets finished', 'Swapping to an item that does not suit dietary needs'],
    exercise: 'Before your next shop, check every list item against what is already at home.',
    apply: [
      { href: '/goals/stash.html', label: 'Stash', d: 'Remember what is already home.' },
      { href: '/goals/prepare.html', label: 'Shopping List', d: 'A list built from what you buy.' },
    ],
  },
  'how-to-read-a-grocery-receipt': {
    objectives: ['Find promotions that did not ring up', 'Sanity-check the tax line', 'Compare stores fairly'],
    ideas: [
      { t: 'Promotions need a matching line', d: 'If the deal is not printed, it was not applied.' },
      { t: 'Tax is a quick multiplication', d: 'Taxable subtotal × local rate should be close to the tax line.' },
      { t: 'Receipts become a price history', d: 'Over time they show which items crept up.' },
    ],
    plan: [
      { t: 'Scan line prices', d: 'Look for anything out of place.' },
      { t: 'Match each promotion', d: 'Every deal should have a discount line.' },
      { t: 'Check the tax', d: 'Subtotal × rate.' },
      { t: 'Fix it at the desk', d: 'Before leaving, with the receipt.' },
    ],
    example: {
      title: 'A 30-second check that found $0.98',
      intro: 'Illustrative receipt with a “2 for $6” offer and an 8% local rate.',
      head: ['Check', 'Expected', 'Receipt', 'Action'],
      rows: [['2-for-$6 item (rang $3.49 each)', '$6.00', '$6.98', 'Ask for $0.98'], ['Tax on $40.00 taxable', '$3.20', '$3.20', 'None']],
      takeaway: 'Small errors repeat across trips; the check takes less time than the queue.',
    },
    mistakes: ['Only reading the total', 'Assuming promotions always apply', 'Comparing two stores on different items'],
    exercise: 'On your next receipt, find one promotion and confirm its discount line.',
    apply: [
      { href: '/goals/read.html', label: 'Guac-AI reads every receipt', d: 'Items, tax and totals extracted.' },
    ],
  },
  'cancel-unused-subscriptions': {
    objectives: ['List every recurring charge', 'Decide keep, cancel or rotate', 'Prevent renewals you did not choose'],
    ideas: [
      { t: 'Annualise every charge', d: '× 12 shows what a small fee really costs.' },
      { t: 'Rotate instead of stacking', d: 'One streaming service at a time often covers what you watch.' },
      { t: 'Trials need a reminder', d: 'Set it the day you sign up.' },
    ],
    plan: [
      { t: 'Build the list', d: 'Statements, email renewals and app-store subscriptions.' },
      { t: 'Mark last use', d: 'Next to each charge.' },
      { t: 'Keep, cancel or rotate', d: 'Decide each one.' },
      { t: 'Repeat quarterly', d: 'New charges creep back in.' },
    ],
    example: {
      title: 'Rotating three streaming services',
      intro: 'Illustrative prices; each service kept for four months of the year in turn.',
      head: ['Approach', 'Per month', 'Per year'],
      rows: [['All three all year ($15.49 + $10.99 + $7.99)', '$34.47', '$413.64'], ['One at a time, rotating', 'varies', '$137.88'], ['Difference', '', '$275.76']],
      takeaway: 'Same shows, a third of the cost — if you are happy to watch them in turn.',
    },
    mistakes: ['Keeping services “just in case”', 'Forgetting free trials', 'Auditing once and never again'],
    exercise: 'Search your email for “renew” and list every subscription you find.',
    apply: [
      { href: '/goals/reduce-waste.html', label: 'Guide: reduce quiet waste', d: 'Recurring charges surfaced.' },
      { href: '/resources/guides/subscriptions.html', label: 'Subscription audit guide', d: 'The full checklist.' },
    ],
  },
  'review-bills-with-confidence': {
    objectives: ['Explain why a bill changed', 'Ask a provider for written options', 'Compare total cost, including switching'],
    ideas: [
      { t: 'Promotions expire', d: 'Many increases are a discount ending, not a new price.' },
      { t: 'Compare over the same period', d: 'Two years shows what one month hides.' },
      { t: 'Get it in writing', d: 'A quote is not a saving until the statement shows it.' },
    ],
    plan: [
      { t: 'Compare two statements', d: 'The current one and a comparable earlier one.' },
      { t: 'Ask what changed', d: 'Request options that keep the service you use.' },
      { t: 'Price each option', d: 'Including fees and the post-promotion rate.' },
      { t: 'Confirm on the next bill', d: 'Check the change actually happened.' },
    ],
    example: {
      title: 'Promotional price versus flat price over two years',
      intro: 'Illustrative internet plans with the same speed.',
      head: ['Plan', 'Months 1–12', 'Months 13–24', 'Two-year total'],
      rows: [['Promotion ($50, then $75)', '$600', '$900', '$1,500'], ['Flat $60', '$720', '$720', '$1,440']],
      takeaway: 'The cheaper first year costs $60 more over two years. Set a reminder for when a promotion ends.',
    },
    mistakes: ['Comparing only the first month', 'Forgetting switching or equipment fees', 'Treating a verbal quote as final'],
    exercise: 'Find one bill that rose in the last year and write down exactly what changed.',
    apply: [
      { href: '/goals/bills.html', label: 'Bills calendar', d: 'Every bill before it lands.' },
      { href: '/goals/wizard.html', label: 'GuacWizard', d: 'Fees on your statements.' },
    ],
  },
  'get-the-refund-youre-owed': {
    objectives: ['Track return windows from the purchase date', 'Claim price adjustments', 'Catch double charges and billing errors'],
    ideas: [
      { t: 'The clock starts at purchase', d: 'Not when you open the box.' },
      { t: 'Ask; the answer is often yes', d: 'Price adjustments and defect exceptions exist to be used.' },
      { t: 'Merchant first, chargeback last', d: 'Direct contact is usually faster.' },
    ],
    plan: [
      { t: 'Keep the receipt', d: 'Digital copy on the day.' },
      { t: 'Note the deadline', d: 'For anything you might return.' },
      { t: 'Review statements monthly', d: 'Look for duplicates and wrong prices.' },
      { t: 'Act before the window closes', d: 'One day late is the same as a month.' },
    ],
    example: {
      title: 'One month of refund checks',
      intro: 'Illustrative amounts found in a single monthly review.',
      head: ['Type', 'How it was found', 'Amount'],
      rows: [['Price adjustment on a jacket', 'Same item on sale 10 days later', '$36.00'], ['Double charge', 'Card statement review', '$24.99'], ['Unused blender returned', 'Return window still open', '$49.99'], ['Total', '', '$110.98']],
      takeaway: 'None needed a dispute — just a receipt and a deadline.',
    },
    mistakes: ['Waiting too long', 'Throwing receipts away', 'Using debit instead of credit for large purchases'],
    exercise: 'List every purchase from the past month you might still return, with its last return day.',
    apply: [
      { href: '/goals/recover.html', label: 'Returns and refunds', d: 'Windows tracked until the refund lands.' },
      { href: '/resources/guides/refund-rights.html', label: 'Refund rights guide', d: 'Step by step.' },
    ],
  },
  'return-windows-what-to-check': {
    objectives: ['Work out the last return day', 'Know which categories have short windows', 'Handle gifts bought early'],
    ideas: [
      { t: 'Category beats store', d: 'Electronics often have shorter windows than clothing.' },
      { t: 'Gifts break the assumption', d: 'Bought in November, opened in December, often outside 30 days.' },
      { t: 'Price adjustments run on their own clock', d: 'Separate from the return window.' },
    ],
    plan: [
      { t: 'Check the policy at checkout', d: 'Especially for electronics and opened items.' },
      { t: 'Write the last day', d: 'Purchase date plus the window.' },
      { t: 'Ask for gift receipts', d: 'And check holiday extensions.' },
      { t: 'Keep packaging until sure', d: 'Condition rules can apply.' },
    ],
    example: {
      title: 'Same purchase date, different deadlines',
      intro: 'Illustrative windows for items bought on 10 November.',
      head: ['Item', 'Window', 'Last return day', 'Opened 25 December?'],
      rows: [['Sweater', '30 days', '10 December', 'Too late'], ['Headphones', '15 days', '25 November', 'Too late'], ['Gift with extended holiday policy', 'Until 15 January', '15 January', 'Still returnable']],
      takeaway: 'Check the gift policy before buying early; it decides whether a return is possible.',
    },
    mistakes: ['Assuming every store allows 30 days', 'Counting from when you opened the item', 'Losing packaging needed for a return'],
    exercise: 'For your last three purchases, write the last return day next to each.',
    apply: [
      { href: '/goals/recover.html', label: 'Returns and refunds', d: 'Deadlines tracked for you.' },
    ],
  },
  'how-long-to-keep-receipts': {
    objectives: ['Sort receipts into five tiers', 'Decide at the moment a receipt arrives', 'Know when to keep records for years'],
    ideas: [
      { t: 'Most receipts are short-lived', d: 'Check the charge, then let them go.' },
      { t: 'Warranties outlast returns', d: 'Keep proof for the full coverage period.' },
      { t: 'Tax records live longest', d: 'Generally at least three years after filing; check current IRS guidance.' },
    ],
    plan: [
      { t: 'Ask one question', d: 'Will this ever matter again?' },
      { t: 'Digitise the keepers', d: 'Thermal paper fades.' },
      { t: 'Note the reason', d: 'Especially for business purchases.' },
      { t: 'Clear tier 1 monthly', d: 'After the statement matches.' },
    ],
    example: {
      title: 'Sorting a stack of five',
      intro: 'Illustrative receipts sorted into tiers.',
      head: ['Receipt', 'Tier', 'Keep until'],
      rows: [['Coffee', '1', 'The charge clears'], ['Jacket', '2', 'The return window closes'], ['Washing machine', '3', 'The warranty ends'], ['Charity donation', '4', 'At least three years after filing'], ['New roof', '5', 'You sell the home, plus a few years']],
      takeaway: 'One question at the door replaces a shoebox you never sort.',
    },
    mistakes: ['Keeping everything forever', 'Keeping only the paper copy', 'Discarding warranty proof after the return window'],
    exercise: 'Take five receipts from your wallet or drawer and assign each one a tier.',
    apply: [
      { href: '/goals/tax-records.html', label: 'Guide: tax-ready records', d: 'Tag receipts as you go.' },
    ],
  },
  'digital-vs-paper-receipts': {
    objectives: ['Capture a legible digital copy', 'Name and store receipts so they can be found', 'Back up what matters'],
    ideas: [
      { t: 'Capture on the day', d: 'The print is crispest when it is new.' },
      { t: 'Searchable beats stored', d: 'Store, date and amount must be attached to the image.' },
      { t: 'One copy is not a backup', d: 'Keep important records in more than one place.' },
    ],
    plan: [
      { t: 'Photograph flat, whole and lit', d: 'Store name to total, no glare.' },
      { t: 'Name date first', d: 'YYYY-MM-DD_store_amount.' },
      { t: 'Sync off the phone', d: 'So a lost phone is not a lost archive.' },
      { t: 'Keep originals that need paper', d: 'Titles and signed agreements.' },
    ],
    example: {
      title: 'A naming pattern that sorts itself',
      intro: 'Illustrative file names for receipts filed manually.',
      head: ['File name', 'Why it works'],
      rows: [['2026-09-14_HomeDepot_249.87.jpg', 'Sorts by date automatically'], ['2026-09-20_Costco_132.40.jpg', 'Store and amount visible at a glance'], ['2026-10-01_Dentist_85.00.pdf', 'Searchable for tax or insurance']],
      takeaway: 'Date first means you scan the folder instead of searching it.',
    },
    mistakes: ['Photographing at an angle or in shadow', 'A camera roll with no names', 'Only one copy, on one device'],
    exercise: 'Photograph the most valuable receipt you still have on paper and name it date first.',
    apply: [
      { href: '/goals/read.html', label: 'Guac-AI reads every receipt', d: 'Store, date and total extracted.' },
      { href: '/goals/organize.html', label: 'Organize every purchase', d: 'Photo and email in one place.' },
    ],
  },
  'find-receipts-in-your-email': {
    objectives: ['Run targeted inbox searches', 'Label receipts as you find them', 'Use statements to find what is missing'],
    ideas: [
      { t: 'Retrieval, not collection', d: 'Your inbox already holds most receipts.' },
      { t: 'Not every merchant says “receipt”', d: 'Search by sender for the rest.' },
      { t: 'The statement is the master list', d: 'It shows what you are missing.' },
    ],
    plan: [
      { t: 'Run the keyword pass', d: 'receipt, invoice, order confirmation.' },
      { t: 'Run the renewal pass', d: '“will renew”, “subscription”.' },
      { t: 'Label as you go', d: 'One Receipts label.' },
      { t: 'Add a filter', d: 'So future receipts label themselves.' },
    ],
    example: {
      title: 'Four passes in one sitting',
      intro: 'Gmail search operators; other mail apps have close equivalents.',
      head: ['Pass', 'Search', 'Finds'],
      rows: [['Keywords', 'receipt OR invoice OR "order confirmation"', 'Most standard receipts'], ['Sender', 'from:amazon.com', 'One merchant’s orders'], ['Attachments', 'has:attachment invoice', 'PDF bills and invoices'], ['Renewals', '"will renew" OR "auto-renew"', 'Forgotten subscriptions']],
      takeaway: 'The renewal pass is the one that usually pays for the afternoon.',
    },
    mistakes: ['Searching everything first and filing later', 'Relying on keywords alone', 'Giving inbox access without checking what is stored'],
    exercise: 'Run the renewal search in your inbox and list every subscription it finds.',
    apply: [
      { href: '/goals/inbox.html', label: 'A shopping inbox of your own', d: 'Receipts forwarded and filed.' },
    ],
  },
  'good-debt-vs-bad-debt': {
    objectives: ['Apply the two-question test', 'Calculate your debt-to-income ratio', 'See how term length changes total cost'],
    ideas: [
      { t: 'Rate and purpose decide', d: 'Low rate plus a lasting asset leans good; high rate plus something used up leans bad.' },
      { t: 'A low payment can hide a high cost', d: 'Longer terms shrink the payment and grow the interest.' },
      { t: 'Even good debt needs a limit', d: 'DTI keeps borrowing in proportion.' },
    ],
    plan: [
      { t: 'List each debt’s rate and purpose', d: 'Sort into good, grey and bad.' },
      { t: 'Calculate DTI', d: 'Monthly debt payments ÷ gross monthly income.' },
      { t: 'Price any new loan in total', d: 'Payment × months, not just the payment.' },
      { t: 'Clear the costliest first', d: 'High-rate debt that bought something used up.' },
    ],
    example: {
      title: 'The same $20,000 car loan at 7% APR',
      intro: 'Standard loan arithmetic; figures rounded to the dollar.',
      head: ['Term', 'Monthly payment', 'Total paid', 'Total interest'],
      rows: [['48 months', '$479', '$22,988', '$2,988'], ['72 months', '$341', '$24,551', '$4,551']],
      takeaway: 'The longer loan costs $138 less a month and about $1,563 more overall.',
    },
    mistakes: ['Judging affordability by the monthly payment', 'Calling a high-rate balance an investment', 'Ignoring DTI before a big application'],
    exercise: 'For your largest debt, multiply the monthly payment by the months left and compare it with the balance.',
    apply: [
      { href: '/calculators#dti', label: 'Debt-to-income calculator', d: 'Your guardrail number.' },
      { href: '/calculators#auto-loan', label: 'Auto loan calculator', d: 'Compare terms before signing.' },
    ],
  },
  'avalanche-vs-snowball': {
    objectives: ['Choose avalanche or snowball', 'Roll freed payments forward', 'Keep every minimum current'],
    ideas: [
      { t: 'The method you keep beats the better one', d: 'Avalanche saves most; snowball keeps many people going.' },
      { t: 'Rolling is the engine', d: 'Each cleared debt’s payment joins the next.' },
      { t: 'Minimums are non-negotiable', d: 'Missed payments add fees and harm your credit.' },
    ],
    plan: [
      { t: 'List debts', d: 'Balance, APR, minimum.' },
      { t: 'Pick the order', d: 'By APR or by balance.' },
      { t: 'Set the attack payment', d: 'Everything above minimums to one target.' },
      { t: 'Roll and repeat', d: 'Add the cleared payment to the next target.' },
    ],
    example: {
      title: 'How $300 a month rolls forward',
      intro: 'Using the three cards from the lesson above: minimums of $25, $60 and $110, with $105 extra.',
      head: ['Phase', 'Target', 'Payment to target'],
      rows: [['1', 'Card A ($800, 22%)', '$130 ($25 minimum + $105)'], ['2', 'Card B ($3,000, 17%)', '$190 ($60 + $130 rolled)'], ['3', 'Card C ($5,500, 12%)', '$300 ($110 + $190 rolled)']],
      takeaway: 'The total never changes — $300 a month — but the payment aimed at each target keeps growing.',
    },
    mistakes: ['Spreading extra money across every debt', 'Spending on a card once it reaches zero', 'Quitting after one setback'],
    exercise: 'Write your debts in avalanche order and in snowball order. Pick one and set your attack payment.',
    apply: [
      { href: '/goals/pay-down-debt.html', label: 'Guide: pay down debt', d: 'Debts and APRs in Wealth Path.' },
      { href: '/calculators#credit-card', label: 'Credit card payoff calculator', d: 'See your payoff date.' },
    ],
  },
  'credit-cards-without-interest': {
    objectives: ['Explain the grace period', 'Know the statement and due dates', 'See what a carried balance costs'],
    ideas: [
      { t: 'Full balance, every month', d: 'That one habit makes a card free.' },
      { t: 'Autopay the minimum as insurance', d: 'Then pay the rest yourself, or autopay the full balance.' },
      { t: 'Rewards follow, not lead', d: 'They only count when no interest is paid.' },
    ],
    plan: [
      { t: 'Find both dates', d: 'Statement closing and due date.' },
      { t: 'Set minimum autopay', d: 'A safety net against late fees.' },
      { t: 'Pay the statement balance', d: 'Before the due date.' },
      { t: 'Pause the card if a balance is carried', d: 'Until it is cleared.' },
    ],
    example: {
      title: 'One $1,200 statement at 24% APR',
      intro: 'Next month’s interest estimated as unpaid balance × APR ÷ 12.',
      head: ['You pay', 'Left unpaid', 'Approx. interest next month'],
      rows: [['$1,200 (full balance)', '$0', '$0.00'], ['$600', '$600', 'about $12.00'], ['$40 minimum', '$1,160', 'about $23.20']],
      takeaway: 'Issuers calculate interest daily, so your statement will differ slightly — but the pattern holds.',
    },
    mistakes: ['Paying only the minimum', 'Taking cash advances', 'Choosing a card for rewards you would pay interest to earn'],
    exercise: 'Find your card’s statement closing date and due date and add both to your calendar.',
    apply: [
      { href: '/goals/credit-cards.html', label: 'Guide: use the card, skip the interest', d: 'Interest and fees from statements.' },
      { href: '/goals/bills.html', label: 'Bills calendar', d: 'Every due date ahead of time.' },
    ],
  },
  'credit-score': {
    objectives: ['Name the five FICO factors', 'Lower reported utilization', 'Avoid moves that hurt your score'],
    ideas: [
      { t: 'Two factors carry most of the weight', d: 'Payment history and amounts owed are about 65% together.' },
      { t: 'Timing changes utilization', d: 'The balance on the statement date is usually what gets reported.' },
      { t: 'Old accounts help', d: 'Closing one can raise utilization and shorten history.' },
    ],
    plan: [
      { t: 'Autopay every minimum', d: 'Protect payment history.' },
      { t: 'Pay before the statement closes', d: 'Lower the reported balance.' },
      { t: 'Keep old cards open', d: 'With a small recurring charge.' },
      { t: 'Space out applications', d: 'Especially before a big loan.' },
    ],
    example: {
      title: 'Same spending, lower reported utilization',
      intro: 'Illustrative: one card with a $3,000 limit and $1,200 of monthly spending.',
      head: ['When you pay', 'Balance reported', 'Utilization'],
      rows: [['After the statement closes', '$1,200', '40%'], ['$900 paid before it closes', '$300', '10%']],
      takeaway: 'Nothing about your spending changed — only the date of the payment.',
    },
    mistakes: ['Paying on the due date when the statement already reported a high balance', 'Closing your oldest card', 'Several applications before a mortgage'],
    exercise: 'Divide your current card balances by your total limits. That is your utilization today.',
    apply: [
      { href: '/calculators#dti', label: 'Debt-to-income calculator', d: 'The other number lenders check.' },
      { href: '/academy/check-your-credit-report', label: 'Next: check your credit report', d: 'Make sure the record is right.' },
    ],
  },
  'check-your-credit-report': {
    objectives: ['Get all three reports free', 'Check them line by line', 'Dispute an error and freeze your credit'],
    ideas: [
      { t: 'Free weekly, from one official site', d: 'AnnualCreditReport.com, for all three bureaus.' },
      { t: 'Your records are the proof', d: 'Statements and confirmations settle disputes.' },
      { t: 'A freeze is free protection', d: 'It blocks new credit in your name until you lift it.' },
    ],
    plan: [
      { t: 'Pull all three reports', d: 'Equifax, Experian and TransUnion.' },
      { t: 'Check details, accounts, payments, inquiries', d: 'With statements beside you.' },
      { t: 'Dispute errors in writing', d: 'To the bureau and the business that reported it.' },
      { t: 'Freeze when not applying', d: 'Lift it temporarily when you apply.' },
    ],
    example: {
      title: 'The five FICO factors and the records that support them',
      intro: 'Weights as published by myFICO for FICO Scores, checked 1 October 2026.',
      head: ['Factor', 'Weight', 'Check it against'],
      rows: [['Payment history', '35%', 'Statements and payment confirmations'], ['Amounts owed', '30%', 'Card balances and limits'], ['Length of credit history', '15%', 'Account open dates'], ['Credit mix', '10%', 'Your list of debts'], ['New credit', '10%', 'Applications you made']],
      takeaway: 'Other scoring models weigh factors differently; the report is what all of them read.',
    },
    mistakes: ['Paying a site for reports that are free', 'Sending original documents with a dispute', 'Trusting anyone who promises to remove accurate information'],
    exercise: 'Request one free report today and check every account on it is yours.',
    apply: [
      { href: '/goals/credit-report.html', label: 'Guide: check your credit report', d: 'With your GetGuac records beside it.' },
      { href: 'https://www.annualcreditreport.com', label: 'AnnualCreditReport.com', d: 'The official free-report site.' },
    ],
  },
  'compound-interest': {
    objectives: ['Explain how growth compounds', 'Estimate doubling time with the rule of 72', 'See why the same maths works against debt'],
    ideas: [
      { t: 'Time is the multiplier', d: 'Starting earlier matters more than starting bigger.' },
      { t: 'Compounding works both ways', d: 'A card balance compounds against you at its APR.' },
      { t: 'Withdrawals reset the clock', d: 'Money taken out stops compounding.' },
    ],
    plan: [
      { t: 'Start with any amount', d: 'Small and early beats large and late.' },
      { t: 'Automate contributions', d: 'On payday.' },
      { t: 'Reinvest returns', d: 'Let growth earn growth.' },
      { t: 'Leave it alone', d: 'Check a couple of times a year.' },
    ],
    example: {
      title: 'The rule of 72',
      intro: 'Divide 72 by an annual rate for a rough doubling time. An approximation, not a forecast.',
      head: ['Annual rate', 'Rough years to double', 'Where you might see it'],
      rows: [['6%', '12', 'Illustrative long-run growth'], ['8%', '9', 'Illustrative long-run growth'], ['24%', '3', 'A credit card balance left unpaid']],
      takeaway: 'Returns are never guaranteed — but card interest is, which is why clearing it comes first.',
    },
    mistakes: ['Waiting until you earn more', 'Dipping into investments for non-emergencies', 'Ignoring compounding on debt'],
    exercise: 'Divide 72 by your highest card APR. That is roughly how fast that balance doubles if left alone.',
    apply: [
      { href: '/calculators#invest-growth', label: 'Investment growth calculator', d: 'Illustrate a monthly amount over time.' },
    ],
  },
  'index-funds': {
    objectives: ['Explain what an index fund owns', 'Compare expense ratios in dollars', 'Understand a simple two-to-three fund mix'],
    ideas: [
      { t: 'Owning the market spreads risk', d: 'One company’s bad year barely moves a broad fund.' },
      { t: 'Fees compound too', d: 'A percentage fee is charged every year on a growing balance.' },
      { t: 'Simple is enough', d: 'More overlapping funds do not add diversification.' },
    ],
    plan: [
      { t: 'Use tax-advantaged accounts first', d: 'Workplace plan and IRA.' },
      { t: 'Compare expense ratios', d: 'In dollars on your balance.' },
      { t: 'Keep the mix simple', d: 'Broad funds over many niche ones.' },
      { t: 'Automate and ignore headlines', d: 'Review once or twice a year.' },
    ],
    example: {
      title: 'What an expense ratio costs on $10,000',
      intro: 'One year’s fee at three illustrative expense ratios.',
      head: ['Expense ratio', 'Fee on $10,000 per year'],
      rows: [['0.05%', '$5'], ['0.50%', '$50'], ['1.00%', '$100']],
      takeaway: 'GetGuac explains how funds work; it does not recommend specific funds or investments.',
    },
    mistakes: ['Chasing last year’s best fund', 'Holding many overlapping funds', 'Investing in taxable accounts before tax-advantaged ones'],
    exercise: 'Find the expense ratio of a fund you hold, or one in your workplace plan, and convert it to dollars on your balance.',
    apply: [
      { href: '/calculators#invest-growth', label: 'Investment growth calculator', d: 'See how fees change the outcome.' },
    ],
  },
  'dollar-cost-averaging': {
    objectives: ['Explain why a fixed amount buys more when prices fall', 'Automate a per-paycheck amount', 'Know the lump-sum nuance'],
    ideas: [
      { t: 'The schedule decides, not your nerves', d: 'You never need to time the market.' },
      { t: 'Most people already do it', d: 'Investing from each paycheck is dollar-cost averaging.' },
      { t: 'Pausing breaks it', d: 'The value comes from buying through dips.' },
    ],
    plan: [
      { t: 'Pick an amount per paycheck', d: 'One you can keep in a tight month.' },
      { t: 'Automate transfer and purchase', d: 'Same day as payday.' },
      { t: 'Check twice a year', d: 'Not twice a day.' },
      { t: 'Raise it with each raise', d: 'A small step each time.' },
    ],
    example: {
      title: 'Small amounts, every paycheck',
      intro: 'Amounts invested per year with 26 biweekly paychecks, before any growth.',
      head: ['Per paycheck', 'Per year'],
      rows: [['$25', '$650'], ['$50', '$1,300'], ['$100', '$2,600']],
      takeaway: 'Contributions only; any growth is uncertain and not shown.',
    },
    mistakes: ['Stopping when markets fall', 'Waiting for the “right time”', 'Letting fees eat small purchases'],
    exercise: 'Choose one per-paycheck amount and write down where it would go.',
    apply: [
      { href: '/calculators#invest-growth', label: 'Investment growth calculator', d: 'A steady amount over time.' },
    ],
  },
  '401k-basics': {
    objectives: ['Capture the full employer match', 'Understand vesting', 'Raise contributions painlessly'],
    ideas: [
      { t: 'The match comes first', d: 'Not contributing enough to get it leaves pay behind.' },
      { t: 'Pre-tax softens the change', d: 'A traditional contribution lowers take-home by less than the amount saved.' },
      { t: 'Raise with your raise', d: 'Adding 1% when pay rises is barely felt.' },
    ],
    plan: [
      { t: 'Read your match formula', d: 'In your benefits portal.' },
      { t: 'Contribute at least to the match', d: 'Then review the rest of your goals.' },
      { t: 'Check vesting', d: 'Before changing jobs.' },
      { t: 'Schedule a 1% increase', d: 'Many plans can automate it yearly.' },
    ],
    example: {
      title: 'What each 1% costs on a $50,000 salary',
      intro: 'Contributions before tax; biweekly pay (26 paychecks).',
      head: ['Contribution', 'Per year', 'Per paycheck'],
      rows: [['6%', '$3,000', '$115.38'], ['7%', '$3,500', '$134.62'], ['8%', '$4,000', '$153.85']],
      takeaway: 'Each extra 1% is about $19 a paycheck before tax — less after, for a traditional contribution.',
    },
    mistakes: ['Contributing less than the match', 'Cashing out when changing jobs', 'Never reviewing the default investment'],
    exercise: 'Look up your employer’s match formula and check your contribution reaches it.',
    apply: [
      { href: '/calculators#retirement', label: 'Retirement calculator', d: 'See where your rate leads.' },
    ],
  },
  'roth-vs-traditional': {
    objectives: ['Compare tax now with tax later', 'See why equal rates give equal results', 'Value having both'],
    ideas: [
      { t: 'It is a bet on your tax rate', d: 'Lower now favours Roth; higher now favours Traditional.' },
      { t: 'Equal rates, equal outcome', d: 'If your rate is the same now and later, the results match.' },
      { t: 'Contributing beats choosing', d: 'Delay costs more than the “wrong” account.' },
    ],
    plan: [
      { t: 'Estimate your rate now', d: 'Your current bracket.' },
      { t: 'Guess your rate in retirement', d: 'Higher, lower or about the same.' },
      { t: 'Pick, or split', d: 'Both accounts give flexibility later.' },
      { t: 'Check current limits yearly', d: 'They change; use IRS figures.' },
    ],
    example: {
      title: '$1,000 of earnings, grown four times',
      intro: 'Simplified illustration: growth ×4, taxed at the stated rates, ignoring limits and other rules.',
      head: ['Tax now → later', 'Traditional', 'Roth', 'Better'],
      rows: [['22% → 12%', '$3,520', '$3,120', 'Traditional'], ['12% → 22%', '$3,120', '$3,520', 'Roth'], ['22% → 22%', '$3,120', '$3,120', 'Same']],
      takeaway: 'Traditional: $1,000 grows to $4,000, then taxed. Roth: taxed first, then the remainder grows untaxed.',
    },
    mistakes: ['Delaying while deciding', 'Assuming deductibility without checking income limits', 'Ignoring Roth income limits'],
    exercise: 'Write down your current tax bracket and whether you expect it to be higher or lower in retirement.',
    apply: [
      { href: '/calculators#retirement', label: 'Retirement calculator', d: 'Model contributions over time.' },
    ],
  },
  'hsa-triple-tax': {
    objectives: ['Name the three HSA tax benefits', 'Compare HSA and FSA', 'Keep receipts for later reimbursement'],
    ideas: [
      { t: 'Three tax breaks in one account', d: 'In, growth and qualified withdrawals.' },
      { t: 'It rolls over', d: 'Unlike most FSAs, the balance stays yours.' },
      { t: 'Receipts are IOUs', d: 'Medical receipts can support later tax-free reimbursement.' },
    ],
    plan: [
      { t: 'Confirm HDHP eligibility', d: 'An HSA requires a qualifying plan.' },
      { t: 'Contribute through payroll', d: 'If your employer offers it.' },
      { t: 'Capture medical receipts', d: 'Keep them for the long term.' },
      { t: 'Check annual limits', d: 'They change each year; use IRS figures.' },
    ],
    example: {
      title: 'Federal income tax on a $3,000 contribution',
      intro: 'Illustrative, in the 22% federal bracket. State tax and payroll taxes vary and are not included.',
      head: ['', 'Amount'],
      rows: [['Contribution', '$3,000'], ['Federal income tax not paid at 22%', '$660']],
      takeaway: 'Qualified medical withdrawals later are tax-free as well. Not tax advice — check your plan and current rules.',
    },
    mistakes: ['Skipping the HSA because the deductible feels scary', 'Spending it down every year by default', 'Losing medical receipts'],
    exercise: 'Check whether your health plan is HSA-eligible and whether your employer contributes.',
    apply: [
      { href: '/calculators#healthcare', label: 'Healthcare cost calculator', d: 'Compare plan options.' },
      { href: '/goals/tax-records.html', label: 'Guide: tax-ready records', d: 'Keep medical receipts findable.' },
    ],
  },
  'understanding-sales-tax': {
    objectives: ['Budget for tax on planned purchases', 'Check the tax line on a receipt', 'Use tax-free holidays carefully'],
    ideas: [
      { t: 'The tag is not the price', d: 'Add your local rate to every planned purchase.' },
      { t: 'Exemptions vary by state', d: 'Groceries and prescriptions are often treated differently.' },
      { t: 'Holidays have fine print', d: 'Category and price caps apply.' },
    ],
    plan: [
      { t: 'Learn your combined rate', d: 'State plus local.' },
      { t: 'Add it to planned purchases', d: 'Especially large ones.' },
      { t: 'Spot-check receipts', d: 'Taxable subtotal × rate.' },
      { t: 'Check holiday rules first', d: 'Before timing a purchase.' },
    ],
    example: {
      title: 'Tax on planned purchases',
      intro: 'Illustrative rates; check your own state and local rate.',
      head: ['Purchase', 'Rate', 'Tax'],
      rows: [['$1,000 of planned purchases', '7.25%', '$72.50'], ['$800 laptop on an eligible tax-free weekend', '6%', '$48 not charged']],
      takeaway: 'Tax-free holidays only cover listed categories under set price caps.',
    },
    mistakes: ['Budgeting with shelf prices', 'Assuming online orders are tax-free', 'Missing tax charged on exempt items'],
    exercise: 'Look up your combined local sales-tax rate and add it to your next large planned purchase.',
    apply: [
      { href: '/goals/read.html', label: 'Guac-AI reads every receipt', d: 'Tax lines itemised.' },
    ],
  },
  'receipts-at-tax-time': {
    objectives: ['Know which receipts have tax value', 'Record the reason at the time', 'Keep self-employed records properly'],
    ideas: [
      { t: 'Most personal receipts do not matter', d: 'A few categories do.' },
      { t: 'Self-employment changes everything', d: 'Business expenses need records by default.' },
      { t: 'Purpose is part of the record', d: 'A note made now is impossible to rebuild later.' },
    ],
    plan: [
      { t: 'List categories that apply to you', d: 'Business, charity, medical, mileage.' },
      { t: 'Tag receipts the same week', d: 'With the purpose.' },
      { t: 'Review totals before exporting', d: 'Catch miscategorised lines.' },
      { t: 'Ask a professional when unsure', d: 'GetGuac organises; it does not give tax advice.' },
    ],
    example: {
      title: 'What to keep, and why',
      intro: 'Illustrative receipts for a self-employed person.',
      head: ['Receipt', 'Category', 'Note to add'],
      rows: [['Printer ink', 'Business supplies', 'Client invoices'], ['Lunch with a client', 'Business meal', 'Who and what for'], ['Food bank donation', 'Charity', 'Written acknowledgement'], ['Weekly groceries', 'Personal', 'None needed']],
      takeaway: 'What qualifies depends on your situation and current rules — check with a tax professional.',
    },
    mistakes: ['Rebuilding a year from statements', 'No purpose on business receipts', 'Assuming every receipt is deductible'],
    exercise: 'Tag this week’s receipts that could matter for tax and add a one-line purpose to each.',
    apply: [
      { href: '/goals/tax-records.html', label: 'Guide: arrive at tax time organised', d: 'Business, charity and sales tax kept apart.' },
      { href: '/goals/miles.html', label: 'Car Miles', d: 'Purpose-tagged mileage.' },
    ],
  },
  'rent-vs-buy': {
    objectives: ['Count the full cost of owning', 'Include transaction costs', 'Weigh flexibility against equity'],
    ideas: [
      { t: 'Mortgage is not the cost of owning', d: 'Add tax, insurance and maintenance.' },
      { t: 'Buying and selling cost money', d: 'Those costs must be recovered before buying wins.' },
      { t: 'Time decides', d: 'The longer you stay, the more buying can make sense.' },
    ],
    plan: [
      { t: 'Price the all-in monthly cost', d: 'Mortgage, tax, insurance, upkeep.' },
      { t: 'Add transaction costs', d: 'Closing now and selling later.' },
      { t: 'Estimate how long you will stay', d: 'Honestly.' },
      { t: 'Run both scenarios', d: 'With the rent-vs-buy calculator.' },
    ],
    example: {
      title: 'Costs to recover before buying wins',
      intro: 'Illustrative: buy at $380,000, sell later at $400,000, with stated percentages.',
      head: ['Cost', 'Assumption', 'Amount'],
      rows: [['Closing costs when buying', '3% of $380,000', '$11,400'], ['Selling costs', '6% of $400,000', '$24,000'], ['Transaction costs total', '', '$35,400'], ['Maintenance, every year on top', '1% of $380,000', '$3,800']],
      takeaway: '$35,400 has to come back through equity and appreciation — on top of yearly upkeep — before owning beats renting.',
    },
    mistakes: ['Comparing rent only with the mortgage payment', 'Assuming prices always rise', 'Buying with no buffer for repairs'],
    exercise: 'Add property tax, insurance and 1% maintenance to a mortgage payment you are considering.',
    apply: [
      { href: '/calculators#rent-buy', label: 'Rent vs. buy calculator', d: 'Your numbers, both ways.' },
      { href: '/calculators#afford-home', label: 'Home affordability calculator', d: 'A price that leaves a buffer.' },
    ],
  },
  '529-college': {
    objectives: ['Explain how a 529 plan works', 'Check your state tax benefit', 'Plan with the thirds framework'],
    ideas: [
      { t: 'Small and early compounds', d: 'Eighteen years does most of the work.' },
      { t: 'You stay in control', d: 'The beneficiary can usually be changed.' },
      { t: 'Do not fund 100% alone', d: 'Savings, income and aid usually share the cost.' },
    ],
    plan: [
      { t: 'Check your state’s plan', d: 'And any state tax benefit.' },
      { t: 'Start a monthly amount', d: 'Any amount, as early as possible.' },
      { t: 'Choose age-based or de-risk', d: 'As enrolment approaches.' },
      { t: 'Review yearly', d: 'Against a future cost estimate.' },
    ],
    example: {
      title: '$100 a month from birth to 18',
      intro: 'Illustrative constant returns, compounded monthly. Returns are not guaranteed and can be negative.',
      head: ['Assumed annual return', 'Contributed', 'Illustrative value at 18'],
      rows: [['5%', '$21,600', 'about $34,900'], ['7%', '$21,600', 'about $43,100']],
      takeaway: 'The contributions are the same; time and return make the difference.',
    },
    mistakes: ['Waiting until the teenage years', 'Ignoring a state tax deduction', 'High-fee options inside the plan'],
    exercise: 'Look up whether your state offers a tax benefit for 529 contributions.',
    apply: [
      { href: '/calculators#college', label: 'College savings calculator', d: 'Model your own numbers.' },
    ],
  },
}

// Every Academy-only lesson: the four above plus the 65 in lib/academy-content/
// (which carry their own extras and quiz). The sitemap lists all of these.
export const NATIVE_LESSONS = [
  ...BASE_NATIVE, ...BUDGET_LESSONS, ...SAFETY_LESSONS, ...DEBT_LESSONS, ...STOCK_LESSONS, ...FUND_LESSONS,
  ...RETIRE_LESSONS, ...TAX_LESSONS, ...HOUSING_LESSONS, ...PROTECT_LESSONS, ...BEHAVIOR_LESSONS,
]

const NATIVE_BY_SLUG = Object.fromEntries(NATIVE_LESSONS.map((l) => [l.slug, l]))

// Quiz options are authored with the right answer mostly second, which would
// make "always pick B" a winning strategy. Shuffle each question's options in
// an order seeded by slug + question index: random-looking, but identical on
// the server and in the browser (no hydration mismatch) and stable between
// visits. `answer` is remapped to the option's new position.
function seeded(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 }
}
function shuffleCheck(slug, check) {
  return {
    ...check,
    questions: check.questions.map((q, qi) => {
      const rand = seeded(`${slug}:${qi}`)
      const order = q.options.map((_, i) => i)
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
      return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
    }),
  }
}

// The full ordered course. Throws on a slug that resolves to nothing — a dead
// lesson card is worse than a failed build.
export function academyLessons() {
  const out = []
  let n = 0
  for (const track of TRACKS) {
    for (const slug of track.lessons) {
      const native = NATIVE_BY_SLUG[slug]
      const article = native ? null : ARTICLES.find((a) => a.slug === slug)
      const src = native || article
      if (!src) throw new Error(`Academy lesson has no source: ${slug}`)
      const extras = src.extras || EXTRAS[slug]
      const check = src.check || CHECKS[slug]
      if (!extras) throw new Error(`Academy lesson has no extras: ${slug}`)
      if (!check) throw new Error(`Academy lesson has no quiz: ${slug}`)
      n += 1
      out.push({
        n,
        slug,
        native: Boolean(native),
        trackId: track.id,
        trackName: track.name,
        title: src.title,
        excerpt: src.excerpt,
        readMins: src.readMins || 7,
        updated: src.updated || '2026-06-30',
        calc: src.calc || null,
        body: src.body,
        extras,
        check: shuffleCheck(slug, check),
      })
    }
  }
  return out
}

export function academyLesson(slug) {
  return academyLessons().find((l) => l.slug === slug) || null
}
