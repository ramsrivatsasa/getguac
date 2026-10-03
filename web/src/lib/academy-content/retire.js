// Academy-native lessons: Retirement accounts (6). Rules checked 2026-10-01:
// RMD age 73 (75 for those turning 74 after 2032) — IRS; 72(t) SEPP — IRS;
// Social Security FRA 67 for 1960+, 70% at 62, 124% at 70 — SSA.
// Annual contribution limits change every year: never hard-code them here.

const Q = (q, options, answer, why) => ({ q, options, answer, why })
const U = '2026-10-01'
const TAX = 'Not tax advice — rules and limits change; check IRS guidance or a tax professional.'

export const RETIRE_LESSONS = [
  {
    slug: 'ira-basics', title: 'IRAs: your own retirement account', category: 'Retirement', readMins: 6, updated: U,
    excerpt: 'An individual retirement account works alongside — or instead of — a workplace plan, with traditional and Roth versions.',
    body: [
      'An individual retirement account (IRA) is a tax-advantaged retirement account you open yourself at a bank or brokerage, separate from any employer. Anyone with earned income can generally contribute, up to an annual limit set by the IRS.',
      { h: 'Traditional and Roth' },
      { list: ['Traditional IRA: contributions may be tax-deductible; withdrawals in retirement are taxed as income.', 'Roth IRA: contributions are made after tax; qualified withdrawals in retirement are tax-free.'] },
      { h: 'Rules to know' },
      'Roth IRA eligibility phases out at higher incomes, and traditional IRA deductibility can phase out if you or your spouse have a workplace plan. Both have an annual contribution limit that the IRS updates — check the current year’s figures.',
      { h: 'An IRA holds investments' },
      'Opening an IRA is only step one. Money you contribute often lands as cash until you choose investments inside the account. Many people forget this step.',
      { h: 'Rollovers' },
      'When you leave a job, you can usually roll a workplace plan into an IRA. A direct rollover — sent straight from one provider to another — avoids withholding problems. ' + TAX,
    ],
    extras: {
      objectives: ['Compare traditional and Roth IRAs', 'Know the income and limit rules exist', 'Invest the money after contributing'],
      ideas: [
        { t: 'An IRA is an account, not an investment', d: 'You choose what it holds.' },
        { t: 'Tax now or tax later', d: 'Roth versus traditional.' },
        { t: 'Limits change yearly', d: 'Check the IRS each year.' },
      ],
      plan: [
        { t: 'Check eligibility', d: 'Earned income; Roth income limits.' },
        { t: 'Choose traditional or Roth', d: 'Based on your tax rate now vs later.' },
        { t: 'Contribute regularly', d: 'Automate monthly.' },
        { t: 'Invest the contributions', d: 'Do not leave them as cash.' },
      ],
      example: {
        title: 'Cash left uninvested', intro: 'Illustrative: $500 a month contributed for a year, left in cash earning 0.5%, versus invested in a fund earning an illustrative 6% (not guaranteed).',
        head: ['Choice', 'Contributed', 'Approx. growth in year one'],
        rows: [['Left as cash at 0.5%', '$6,000', 'about $14'], ['Invested at an illustrative 6%', '$6,000', 'about $168']],
        takeaway: 'The account type gave the tax benefit; only investing the money gave it a chance to grow. Investment returns can be negative.',
      },
      mistakes: ['Contributing but never investing', 'Ignoring Roth income limits', 'Doing an indirect rollover by accident'],
      exercise: 'If you have an IRA, log in and check whether any of it is sitting in cash.',
      apply: [{ href: '/academy/roth-vs-traditional', label: 'Lesson: Roth vs. traditional', d: 'Which suits you.' }, { href: 'https://www.irs.gov/retirement-plans/individual-retirement-arrangements-iras', label: 'IRS: IRAs', d: 'Current limits and rules.' }],
    },
    check: {
      questions: [
        Q('Who can generally contribute to an IRA?', ['Anyone with earned income, within limits', 'Only employees with a 401(k)', 'Only retirees', 'Only the self-employed'], 0, 'Roth eligibility also depends on income.'),
        Q('Qualified Roth IRA withdrawals in retirement are…', ['Taxed as income', 'Tax-free', 'Penalised', 'Not allowed'], 1, 'Tax was paid on the way in.'),
        Q('After contributing to an IRA you should…', ['Do nothing', 'Choose investments inside it', 'Close it', 'Withdraw it'], 1, 'Contributions may sit as cash otherwise.'),
      ],
      puzzle: { q: 'You contribute $250 every two weeks (26 times a year). How much is that per year?', answer: '$6,500', steps: '$250 × 26 = $6,500. Check it is within the current IRS limit.' },
    },
  },
  {
    slug: 'backdoor-roth-ira', title: 'The backdoor Roth IRA', category: 'Retirement', readMins: 5, updated: U,
    excerpt: 'A two-step route to a Roth IRA for people above the income limit — with a pro-rata rule that trips many up.',
    body: [
      'Direct Roth IRA contributions phase out at higher incomes. The “backdoor” Roth is a widely used two-step process for people above that limit: contribute to a traditional IRA without deducting it, then convert it to a Roth IRA.',
      { h: 'The two steps' },
      { list: ['Make a non-deductible contribution to a traditional IRA (reported on IRS Form 8606).', 'Convert that money to a Roth IRA.'] },
      { h: 'The pro-rata rule' },
      'If you already have pre-tax money in any traditional, SEP or SIMPLE IRA, the IRS treats a conversion as coming proportionally from pre-tax and after-tax money across all of them. Part of the conversion can then be taxable, even if you only meant to convert the new contribution.',
      { h: 'Why it matters' },
      'People with large pre-tax IRA balances may owe unexpected tax on a backdoor conversion. Some first move pre-tax IRA money into a workplace plan, if the plan allows, but this needs care.',
      { h: 'Get help' },
      'Because the reporting is specific and mistakes are costly, many people use a tax professional for their first backdoor Roth. ' + TAX,
    ],
    extras: {
      objectives: ['Describe the two backdoor steps', 'Explain the pro-rata rule', 'Know when to get professional help'],
      ideas: [
        { t: 'Two steps, one goal', d: 'Non-deductible contribution, then conversion.' },
        { t: 'All IRAs count together', d: 'For the pro-rata rule.' },
        { t: 'Form 8606 matters', d: 'It tracks after-tax money.' },
      ],
      plan: [
        { t: 'Confirm you are over the Roth limit', d: 'Using current IRS figures.' },
        { t: 'Check existing pre-tax IRA balances', d: 'All traditional, SEP and SIMPLE IRAs.' },
        { t: 'Model the tax', d: 'Before converting.' },
        { t: 'File Form 8606', d: 'Or have a professional do it.' },
      ],
      example: {
        title: 'The pro-rata rule in numbers', intro: 'Illustrative: $6,000 new after-tax contribution and $54,000 existing pre-tax IRA money; $6,000 converted.',
        head: ['Item', 'Amount'],
        rows: [['Total IRA money', '$60,000'], ['After-tax share', '10% ($6,000 ÷ $60,000)'], ['Of the $6,000 converted, tax-free', '$600'], ['Of the $6,000 converted, taxable', '$5,400']],
        takeaway: 'With no other pre-tax IRA money, almost all of the conversion would have been tax-free.',
      },
      mistakes: ['Ignoring other pre-tax IRAs', 'Forgetting Form 8606', 'Assuming the backdoor is always tax-free'],
      exercise: 'Add up all your pre-tax traditional, SEP and SIMPLE IRA balances.',
      apply: [{ href: '/academy/ira-basics', label: 'Lesson: IRA basics', d: 'Start here.' }],
    },
    check: {
      questions: [
        Q('The backdoor Roth is mainly used by…', ['People above the Roth income limit', 'Teenagers', 'Retirees only', 'Anyone with a 401(k) loan'], 0, 'Direct contributions phase out at higher incomes.'),
        Q('The pro-rata rule looks at…', ['Only the new contribution', 'All your traditional, SEP and SIMPLE IRAs together', 'Only your 401(k)', 'Nothing'], 1, 'Conversions are proportional across them.'),
        Q('Which IRS form tracks non-deductible contributions?', ['W-2', '8606', '1099-INT', 'W-4'], 1, 'Form 8606.'),
      ],
      puzzle: { q: 'You have $20,000 pre-tax IRA money and add $5,000 after-tax. You convert $5,000. How much is taxable?', answer: '$4,000', steps: 'After-tax share: $5,000 ÷ $25,000 = 20%. Taxable: 80% × $5,000 = $4,000.' },
    },
  },
  {
    slug: 'required-minimum-distributions', title: 'Required minimum distributions (RMDs)', category: 'Retirement', readMins: 5, updated: U,
    excerpt: 'Most pre-tax retirement accounts require withdrawals to start at 73 — rising to 75 for people who turn 74 after 2032.',
    body: [
      'Pre-tax retirement accounts let money grow without yearly tax, but not forever. Required minimum distributions (RMDs) are the minimum amounts the IRS requires you to withdraw each year once you reach a set age.',
      { h: 'The age' },
      'Under the SECURE 2.0 Act, the RMD age is 73 for people who turn 72 after 2022 and 73 before 2033. For people who turn 74 after 31 December 2032, it rises to 75 (IRS). Your first RMD can be delayed until 1 April of the following year, but then two RMDs fall in the same year.',
      { h: 'Which accounts' },
      { list: ['Traditional IRAs, SEP and SIMPLE IRAs.', 'Most workplace plans such as 401(k) and 403(b) — with an exception in some plans if you still work there.', 'Roth IRAs do not require withdrawals during the owner’s lifetime.'] },
      { h: 'How the amount is set' },
      'Generally, the account balance at the end of the previous year is divided by a life-expectancy factor from IRS tables. The factor shrinks with age, so the required percentage rises.',
      { h: 'Missing one' },
      'Missing an RMD can trigger an excise tax on the amount not withdrawn. Many providers will calculate and automate RMDs. ' + TAX,
    ],
    extras: {
      objectives: ['Know the current RMD ages', 'Identify which accounts have RMDs', 'Calculate an RMD from a balance and factor'],
      ideas: [
        { t: 'Tax deferral has an end date', d: 'RMDs start the withdrawals.' },
        { t: 'Roth IRAs are different', d: 'No lifetime RMDs for the owner.' },
        { t: 'Delaying the first can double up', d: 'Two RMDs in one year.' },
      ],
      plan: [
        { t: 'Find your RMD age', d: 'By birth year.' },
        { t: 'List accounts with RMDs', d: 'IRAs and workplace plans.' },
        { t: 'Ask providers to automate', d: 'Most will.' },
        { t: 'Plan the tax', d: 'RMDs are generally taxable income.' },
      ],
      example: {
        title: 'Calculating one RMD', intro: 'Illustrative: prior year-end balance $400,000 and a life-expectancy factor of 26.5.',
        head: ['Item', 'Value'],
        rows: [['Prior year-end balance', '$400,000'], ['Factor (illustrative)', '26.5'], ['RMD for the year', 'about $15,094'], ['As a percentage', 'about 3.8%']],
        takeaway: '$400,000 ÷ 26.5 ≈ $15,094. Use the IRS table for your actual factor.',
      },
      mistakes: ['Missing the first deadline', 'Taking two RMDs in one year without planning the tax', 'Assuming Roth IRAs require withdrawals'],
      exercise: 'Using your birth year, write down your RMD age.',
      apply: [{ href: 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-required-minimum-distributions-rmds', label: 'IRS: RMDs', d: 'Rules and tables.' }],
    },
    check: {
      questions: [
        Q('Current RMD age for most people turning 73 before 2033?', ['59½', '70½', '73', '80'], 2, 'SECURE 2.0 set 73; 75 for those turning 74 after 2032.'),
        Q('Do Roth IRAs require withdrawals in the owner’s lifetime?', ['Yes', 'No', 'Only after 60', 'Only in odd years'], 1, 'Roth IRAs are exempt for the owner.'),
        Q('An RMD is generally calculated as…', ['Balance × 10%', 'Prior year-end balance ÷ IRS factor', 'A fixed $1,000', 'Income × 2'], 1, 'Factors come from IRS tables.'),
      ],
      puzzle: { q: 'Prior year-end balance $250,000, factor 25.0. What is the RMD?', answer: '$10,000', steps: '$250,000 ÷ 25 = $10,000.' },
    },
  },
  {
    slug: 'early-withdrawal-rules', title: 'Early withdrawals and the 72(t) exception', category: 'Retirement', readMins: 5, updated: U,
    excerpt: 'Withdrawals before 59½ usually add a 10% tax. Substantially equal periodic payments are one exception — with strict rules.',
    body: [
      'Retirement accounts are designed for retirement. Withdrawals before age 59½ are generally subject to an additional 10% tax on top of regular income tax, unless an exception applies.',
      { h: 'Common exceptions' },
      'The IRS lists several exceptions, which differ between IRAs and workplace plans — for example disability and certain other situations. Check the IRS exceptions table for your account type before relying on one.',
      { h: 'Substantially equal periodic payments (72(t))' },
      'One exception is a series of substantially equal periodic payments (SEPP) calculated over your life expectancy using IRS-approved methods. Once started, the series must continue unchanged until the later of five years after the first payment or age 59½.',
      { h: 'The trap' },
      'Changing the payments early — other than for death, disability or certain specified cases — brings back the 10% additional tax on all prior payments in the series, plus interest (IRS).',
      { h: 'Alternatives to consider first' },
      { list: ['An emergency fund for short-term needs.', 'Roth IRA contributions, which can generally be withdrawn without tax or penalty.', 'Professional advice before starting a SEPP.'] },
      TAX,
    ],
    extras: {
      objectives: ['Know the 59½ rule and 10% additional tax', 'Describe the 72(t) SEPP exception', 'Understand the modification penalty'],
      ideas: [
        { t: 'Early access costs extra', d: '10% plus income tax, generally.' },
        { t: 'SEPP is a long commitment', d: 'Five years or 59½, whichever is later.' },
        { t: 'Breaking it is expensive', d: 'Penalty applies retroactively.' },
      ],
      plan: [
        { t: 'Check other options first', d: 'Emergency fund, Roth contributions.' },
        { t: 'Read the IRS exceptions table', d: 'For your account type.' },
        { t: 'Model the SEPP length', d: 'Five years or to 59½.' },
        { t: 'Get professional help', d: 'Before starting.' },
      ],
      example: {
        title: 'How long a SEPP must run', intro: 'The later of five years after the first payment or age 59½.',
        head: ['Age at first payment', '5 years later', 'Age 59½', 'Must continue until'],
        rows: [['50', '55', '59½', '59½'], ['56', '61', '59½', '61'], ['58', '63', '59½', '63']],
        takeaway: 'Starting at 56 means payments are locked in until 61 — past 59½.',
      },
      mistakes: ['Withdrawing early without checking exceptions', 'Changing SEPP payments too soon', 'Forgetting income tax still applies'],
      exercise: 'Write the age when penalty-free withdrawals generally begin and one alternative source of money before then.',
      apply: [{ href: 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-exceptions-to-tax-on-early-distributions', label: 'IRS: early distribution exceptions', d: 'The official table.' }],
    },
    check: {
      questions: [
        Q('Early withdrawals before 59½ generally add…', ['No tax', 'A 10% additional tax', 'A 50% tax', 'A bonus'], 1, 'Plus regular income tax, unless an exception applies.'),
        Q('A SEPP must continue until…', ['One year', 'The later of 5 years or age 59½', 'Age 70', 'You choose'], 1, 'Strict timing rules.'),
        Q('Modifying a SEPP early can…', ['Lower tax', 'Bring back the 10% tax on prior payments plus interest', 'Do nothing', 'Close the account'], 1, 'The recapture is retroactive.'),
      ],
      puzzle: { q: 'You start a SEPP at age 57. Until what age must it continue?', answer: '62', steps: '57 + 5 = 62, which is later than 59½.' },
    },
  },
  {
    slug: 'social-security-basics', title: 'Social Security: when to claim', category: 'Retirement', readMins: 6, updated: U,
    excerpt: 'Claiming at 62 permanently reduces benefits; waiting past full retirement age increases them up to 70.',
    body: [
      'Social Security retirement benefits are based on your earnings history. When you start them changes the monthly amount for the rest of your life.',
      { h: 'Full retirement age' },
      'Full retirement age (FRA) is 67 for people born in 1960 or later (SSA). Claiming at FRA pays 100% of your primary insurance amount (PIA).',
      { h: 'Claiming early or late' },
      { list: ['At 62, the earliest age, benefits are reduced — to 70% of PIA for someone whose FRA is 67.', 'Each year you wait past FRA adds delayed retirement credits of 8% a year, up to age 70 — 124% of PIA for someone whose FRA is 67.'] },
      { h: 'How to choose' },
      'There is no single right age. Health, other savings, whether you are still working and a spouse’s benefits all matter. Waiting gives a larger lifetime monthly payment; claiming early gives more years of smaller payments.',
      { h: 'Check your own record' },
      'Your my Social Security account at SSA.gov shows your earnings record and estimated benefits at different ages. Check the earnings record for errors — missing years lower your benefit.',
    ],
    extras: {
      objectives: ['Know full retirement age for your birth year', 'Compare benefits at 62, 67 and 70', 'Check your record at SSA.gov'],
      ideas: [
        { t: 'The choice is permanent', d: 'It sets your monthly amount for life.' },
        { t: '8% a year for waiting', d: 'From FRA to 70.' },
        { t: 'Your record drives the benefit', d: 'Check it for gaps.' },
      ],
      plan: [
        { t: 'Create a my Social Security account', d: 'At SSA.gov.' },
        { t: 'Check your earnings record', d: 'Year by year.' },
        { t: 'Note estimates at 62, FRA and 70', d: 'From your statement.' },
        { t: 'Fit it into your plan', d: 'With other savings.' },
      ],
      example: {
        title: 'One benefit, three claiming ages', intro: 'Illustrative PIA of $2,000 a month; FRA 67 (born 1960 or later); percentages from SSA.',
        head: ['Claim at', 'Share of PIA', 'Monthly benefit'],
        rows: [['62', '70%', '$1,400'], ['67', '100%', '$2,000'], ['70', '124%', '$2,480']],
        takeaway: 'Waiting from 62 to 70 raises the monthly amount by $1,080 — in exchange for eight fewer years of payments. Cost-of-living adjustments not shown.',
      },
      mistakes: ['Claiming early without comparing', 'Never checking the earnings record', 'Ignoring spousal considerations'],
      exercise: 'Log in to SSA.gov and note your estimated benefit at 62, at FRA and at 70.',
      apply: [{ href: 'https://www.ssa.gov/myaccount/', label: 'my Social Security', d: 'Your record and estimates.' }, { href: '/calculators#retirement', label: 'Retirement calculator', d: 'Combine with savings.' }],
    },
    check: {
      questions: [
        Q('Full retirement age for people born in 1960 or later?', ['62', '65', '67', '70'], 2, 'SSA.'),
        Q('Delayed retirement credits add about…', ['2% a year', '8% a year up to 70', '20% a year', 'Nothing'], 1, 'Two-thirds of 1% a month.'),
        Q('Claiming at 62 with FRA 67 gives…', ['100% of PIA', '70% of PIA', '124% of PIA', '50%'], 1, 'A permanent reduction.'),
      ],
      puzzle: { q: 'PIA $1,800, FRA 67. What is the monthly benefit at 62 and at 70?', answer: '$1,260 at 62; $2,232 at 70', steps: '$1,800 × 0.70 = $1,260. $1,800 × 1.24 = $2,232.' },
    },
  },
  {
    slug: 'four-percent-rule', title: 'The 4% rule and safe withdrawals', category: 'Retirement', readMins: 6, updated: U,
    excerpt: 'A rule of thumb from historical research for how much a retirement portfolio might support — useful as a starting point, not a promise.',
    body: [
      'The “4% rule” comes from research by financial planner William Bengen in the 1990s. Using historical US market data, he found that withdrawing 4% of a portfolio in the first year of retirement, then adjusting that amount for inflation each year, would have lasted at least 30 years in every period he studied.',
      { h: 'How to use it as a rough guide' },
      'Multiply your desired yearly withdrawal by 25 to estimate the portfolio it implies (25 × 4% = 100%). Wanting $40,000 a year from savings implies about $1,000,000.',
      { h: 'Why it is not a guarantee' },
      { list: ['It is based on past US returns, which may not repeat.', 'It assumes a particular mix of stocks and bonds and a 30-year retirement.', 'Fees, taxes and a longer retirement change the result.', 'Bad returns early in retirement matter more than later ones.'] },
      { h: 'Flexible withdrawals' },
      'Many planners suggest adjusting withdrawals to markets — spending a little less after bad years. Combined with Social Security and any pension, this can make a plan more resilient.',
    ],
    extras: {
      objectives: ['Explain where the 4% rule came from', 'Use ×25 to estimate a target', 'List the rule’s limits'],
      ideas: [
        { t: 'A historical finding', d: 'Not a promise about the future.' },
        { t: '×25 is a quick target', d: 'Yearly withdrawal × 25.' },
        { t: 'Early years matter most', d: 'Sequence of returns risk.' },
      ],
      plan: [
        { t: 'Estimate yearly spending in retirement', d: 'From today’s spending.' },
        { t: 'Subtract guaranteed income', d: 'Social Security, pensions.' },
        { t: 'Multiply the gap by 25', d: 'A rough target.' },
        { t: 'Review with a professional', d: 'As retirement nears.' },
      ],
      example: {
        title: 'From spending to a rough target', intro: 'Illustrative: $55,000 yearly spending and $25,000 from Social Security.',
        head: ['Step', 'Amount'],
        rows: [['Yearly spending', '$55,000'], ['Minus Social Security', '−$25,000'], ['Gap from savings', '$30,000'], ['× 25 (4% rule of thumb)', '$750,000']],
        takeaway: 'A starting point for planning, not a guarantee the money will last.',
      },
      mistakes: ['Treating 4% as guaranteed', 'Ignoring taxes and fees', 'Not adjusting after bad market years'],
      exercise: 'Estimate your yearly retirement gap and multiply it by 25.',
      apply: [{ href: '/calculators#retirement', label: 'Retirement calculator', d: 'Model your own numbers.' }, { href: '/calculators#million', label: 'Millionaire calculator', d: 'Time to a target.' }],
    },
    check: {
      questions: [
        Q('The 4% rule is based on…', ['A law', 'Historical US market research', 'A bank promise', 'Social Security rules'], 1, 'Bengen’s 1990s research.'),
        Q('A quick target from the rule is…', ['Spending × 4', 'Yearly withdrawal × 25', 'Salary × 10', 'Age × 1,000'], 1, '1 ÷ 0.04 = 25.'),
        Q('Which matters most to how long money lasts?', ['Returns in the last year', 'Returns early in retirement', 'The bank’s name', 'The month you retire'], 1, 'Sequence of returns risk.'),
      ],
      puzzle: { q: 'You expect to need $36,000 a year from savings. What portfolio does the 4% rule of thumb suggest?', answer: '$900,000', steps: '$36,000 × 25 = $900,000 (equivalently $36,000 ÷ 0.04).' },
    },
  },
]
