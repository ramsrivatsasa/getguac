// Academy-native lessons: Taxes (8). Bracket and deduction AMOUNTS change every
// year, so examples use clearly labelled made-up brackets; lessons link to the
// IRS for current figures. Stable rules used: long-term = held more than one
// year; $3,000 yearly net capital loss deduction ($1,500 married filing
// separately); wash-sale 30-day window; self-employment tax 15.3%; 2026
// non-itemizer cash charitable deduction $1,000 / $2,000 MFJ (IRS, checked
// 2026-10-01; excludes donor-advised funds).

const Q = (q, options, answer, why) => ({ q, options, answer, why })
const U = '2026-10-01'
const TAX = 'Not tax advice — rules and amounts change; check IRS.gov or a tax professional.'

export const TAX_LESSONS = [
  {
    slug: 'marginal-tax-brackets', title: 'Marginal tax brackets, demystified', category: 'Taxes', readMins: 6, updated: U,
    excerpt: 'A raise never lowers your take-home pay because of a higher bracket. Only the dollars above each threshold are taxed at the higher rate.',
    body: [
      'US federal income tax uses marginal brackets: income is split into bands, and each band is taxed at its own rate. Moving into a higher bracket only affects the dollars inside that higher band.',
      { h: 'The common myth' },
      '“A raise will push me into a higher bracket and I will take home less.” It will not. Only the extra dollars are taxed at the higher rate; everything below is taxed as before.',
      { h: 'Marginal versus effective rate' },
      { list: ['Marginal rate: the rate on your next dollar of taxable income.', 'Effective rate: total tax ÷ total income — usually much lower than the marginal rate.'] },
      { h: 'Taxable income, not salary' },
      'Brackets apply to taxable income — income after deductions such as the standard deduction and pre-tax retirement contributions. That is why a pre-tax 401(k) contribution saves tax at your marginal rate.',
      { h: 'Current numbers' },
      'Bracket thresholds and rates are set by law and adjusted for inflation. Look up the current year on IRS.gov. ' + TAX,
    ],
    extras: {
      objectives: ['Explain marginal brackets', 'Calculate tax across bands', 'Tell marginal from effective rate'],
      ideas: [
        { t: 'Bands, not a single rate', d: 'Each slice of income has its own rate.' },
        { t: 'A raise always helps', d: 'Only new dollars are taxed higher.' },
        { t: 'Deductions save at the marginal rate', d: 'The rate on your top dollars.' },
      ],
      plan: [
        { t: 'Find your taxable income', d: 'From last year’s return.' },
        { t: 'Look up current brackets', d: 'On IRS.gov.' },
        { t: 'Find your marginal rate', d: 'The band your last dollar falls in.' },
        { t: 'Calculate your effective rate', d: 'Total tax ÷ income.' },
      ],
      example: {
        title: 'Tax across made-up brackets', intro: 'Hypothetical brackets for illustration only: 10% up to $10,000; 20% from $10,000 to $40,000; 30% above $40,000. Taxable income $50,000.',
        head: ['Band', 'Income in band', 'Rate', 'Tax'],
        rows: [['$0–$10,000', '$10,000', '10%', '$1,000'], ['$10,000–$40,000', '$30,000', '20%', '$6,000'], ['Above $40,000', '$10,000', '30%', '$3,000'], ['Total', '$50,000', '', '$10,000']],
        takeaway: 'Marginal rate 30%, but effective rate $10,000 ÷ $50,000 = 20%.',
      },
      mistakes: ['Refusing a raise to avoid a bracket', 'Confusing marginal and effective rates', 'Using salary instead of taxable income'],
      exercise: 'Using last year’s return, divide total tax by total income to find your effective rate.',
      apply: [{ href: 'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets', label: 'IRS: tax rates and brackets', d: 'Current figures.' }, { href: '/calculators#take-home', label: 'Take-home pay calculator', d: 'See tax on a paycheck.' }],
    },
    check: {
      questions: [
        Q('Moving into a higher bracket means…', ['All income is taxed higher', 'Only dollars in the higher band are taxed higher', 'Take-home pay falls', 'You pay no tax'], 1, 'That is how marginal brackets work.'),
        Q('Effective rate equals…', ['Top bracket rate', 'Total tax ÷ total income', 'Salary ÷ 12', 'Always 10%'], 1, 'Usually lower than the marginal rate.'),
        Q('Brackets apply to…', ['Gross salary', 'Taxable income after deductions', 'Net worth', 'Savings'], 1, 'Deductions reduce taxable income.'),
      ],
      puzzle: { q: 'Using the made-up brackets (10% to $10,000; 20% to $40,000; 30% above), what is the tax on $30,000 of taxable income?', answer: '$5,000', steps: '$10,000 × 10% = $1,000. $20,000 × 20% = $4,000. Total $5,000 (effective 16.7%).' },
    },
  },
  {
    slug: 'capital-gains-short-long', title: 'Short-term and long-term capital gains', category: 'Taxes', readMins: 5, updated: U,
    excerpt: 'Hold an investment for more than a year and gains are usually taxed at lower long-term rates.',
    body: [
      'A capital gain is the profit when you sell an investment for more than you paid. In a taxable account, how long you held it changes how it is taxed.',
      { h: 'Short-term versus long-term' },
      { list: ['Short-term: held one year or less — taxed at your ordinary income rates.', 'Long-term: held more than one year — taxed at long-term capital gains rates, which are generally lower.'] },
      { h: 'Cost basis' },
      'Your cost basis is what you paid, including reinvested dividends. Gain = sale price − cost basis. Keeping records — or letting your broker track them — avoids paying tax twice on reinvested dividends.',
      { h: 'Losses offset gains' },
      'Capital losses offset capital gains. If losses exceed gains, up to $3,000 a year ($1,500 if married filing separately) can offset ordinary income, and the rest carries forward to future years.',
      { h: 'Tax-advantaged accounts' },
      'Inside 401(k)s and IRAs, buying and selling does not create yearly capital gains tax. ' + TAX,
    ],
    extras: {
      objectives: ['Tell short-term from long-term gains', 'Calculate a gain from cost basis', 'Know how losses offset gains'],
      ideas: [
        { t: 'One year and a day', d: 'The line between short and long term.' },
        { t: 'Basis includes reinvested dividends', d: 'Or you pay tax twice.' },
        { t: 'Retirement accounts avoid yearly gains tax', d: 'Trading inside them is not taxed each year.' },
      ],
      plan: [
        { t: 'Check purchase dates', d: 'Before selling.' },
        { t: 'Confirm cost basis', d: 'In your broker statements.' },
        { t: 'Prefer long-term where sensible', d: 'Do not let tax override a plan.' },
        { t: 'Use losses carefully', d: 'They offset gains.' },
      ],
      example: {
        title: 'One sale, two holding periods', intro: 'Bought for $4,000, sold for $6,000. Illustrative rates: ordinary 22%, long-term 15%.',
        head: ['Held', 'Gain', 'Rate', 'Tax'],
        rows: [['11 months (short-term)', '$2,000', '22%', '$440'], ['13 months (long-term)', '$2,000', '15%', '$300']],
        takeaway: 'Waiting two more months saved $140 here — rates depend on your income.',
      },
      mistakes: ['Selling a day before the one-year mark without checking', 'Forgetting reinvested dividends in basis', 'Letting tax drive every decision'],
      exercise: 'Find the purchase date of one investment in a taxable account and note when it becomes long-term.',
      apply: [{ href: 'https://www.irs.gov/taxtopics/tc409', label: 'IRS Topic 409: capital gains', d: 'Current rules and rates.' }],
    },
    check: {
      questions: [
        Q('Long-term means held…', ['Any time', 'More than one year', 'Exactly 6 months', 'Over 10 years'], 1, 'One year or less is short-term.'),
        Q('Short-term gains are taxed at…', ['Zero', 'Ordinary income rates', 'A flat 5%', 'Long-term rates'], 1, 'Same as wages.'),
        Q('Net capital losses can offset ordinary income up to…', ['$300 a year', '$3,000 a year ($1,500 MFS)', 'Unlimited', 'Nothing'], 1, 'Excess carries forward.'),
      ],
      puzzle: { q: 'You bought for $2,500, reinvested $300 of dividends, and sold for $3,600. What is the gain?', answer: '$800', steps: 'Basis $2,500 + $300 = $2,800. $3,600 − $2,800 = $800.' },
    },
  },
  {
    slug: 'standard-vs-itemized', title: 'Standard deduction or itemising?', category: 'Taxes', readMins: 5, updated: U,
    excerpt: 'You take whichever is larger. Most people take the standard deduction — and from 2026, non-itemisers can also deduct some cash gifts to charity.',
    body: [
      'Deductions lower taxable income. Each year you choose between the standard deduction — a fixed amount set by the IRS for your filing status — and itemising, which adds up specific eligible expenses.',
      { h: 'Common itemised deductions' },
      { list: ['State and local taxes, up to a cap.', 'Mortgage interest on a qualifying home.', 'Charitable contributions.', 'Medical expenses above a percentage of income.'] },
      { h: 'The decision' },
      'Itemise only if your eligible total is larger than your standard deduction. Tax software compares both. Because the standard deduction is large, most filers take it.',
      { h: 'New from 2026' },
      'Beginning with tax year 2026, people who do not itemise can deduct up to $1,000 ($2,000 for married couples filing jointly) of cash gifts to eligible charities. Non-cash gifts and gifts to donor-advised funds do not qualify (IRS).',
      { h: 'Bunching' },
      'Some households “bunch” deductible expenses, such as donations, into alternate years — itemising in one and taking the standard deduction in the next. ' + TAX,
    ],
    extras: {
      objectives: ['Compare standard and itemised deductions', 'Know the main itemised categories', 'Use the 2026 non-itemiser charitable deduction'],
      ideas: [
        { t: 'Take the larger one', d: 'Standard or itemised.' },
        { t: 'Most take the standard deduction', d: 'It is large.' },
        { t: 'Bunching can help', d: 'Concentrate deductions in one year.' },
      ],
      plan: [
        { t: 'Look up your standard deduction', d: 'Current year, filing status.' },
        { t: 'Total eligible itemised costs', d: 'From receipts.' },
        { t: 'Compare', d: 'Pick the larger.' },
        { t: 'Keep charity receipts', d: 'Either way, from 2026.' },
      ],
      example: {
        title: 'Itemise or not?', intro: 'Made-up standard deduction of $15,000 for illustration.',
        head: ['Itemised item', 'Amount'],
        rows: [['State and local taxes (within cap)', '$7,000'], ['Mortgage interest', '$5,500'], ['Cash donations', '$1,200'], ['Itemised total', '$13,700'], ['Standard deduction (made-up)', '$15,000']],
        takeaway: '$13,700 < $15,000, so take the standard deduction — and from 2026 the cash donations may still count under the non-itemiser rule, up to its limit.',
      },
      mistakes: ['Itemising when the standard deduction is larger', 'Discarding donation receipts', 'Assuming donor-advised fund gifts count for the non-itemiser deduction'],
      exercise: 'Add up last year’s mortgage interest, state and local taxes and donations, and compare with your standard deduction.',
      apply: [{ href: 'https://www.irs.gov/taxtopics/tc501', label: 'IRS Topic 501: itemise or not', d: 'Official guidance.' }, { href: '/goals/tax-records.html', label: 'Guide: tax-ready records', d: 'Keep charity receipts.' }],
    },
    check: {
      questions: [
        Q('You should usually…', ['Always itemise', 'Take whichever deduction is larger', 'Never deduct', 'Take both'], 1, 'Software compares them.'),
        Q('From 2026, non-itemisers can deduct cash charity gifts up to…', ['Unlimited', '$1,000 ($2,000 married filing jointly)', '$100', '$10,000'], 1, 'IRS, non-cash and DAF gifts excluded.'),
        Q('“Bunching” means…', ['Filing late', 'Concentrating deductible expenses in alternate years', 'Filing jointly', 'Skipping taxes'], 1, 'Itemise one year, standard the next.'),
      ],
      puzzle: { q: 'Your itemised costs total $16,400 and your standard deduction is $15,000. Which do you take, and by how much does it beat the other?', answer: 'Itemise; $1,400 more', steps: '$16,400 − $15,000 = $1,400.' },
    },
  },
  {
    slug: 'credits-vs-deductions', title: 'Tax credits versus tax deductions', category: 'Taxes', readMins: 4, updated: U,
    excerpt: 'A deduction lowers taxable income; a credit lowers the tax itself. Dollar for dollar, a credit is usually worth more.',
    body: [
      'Deductions and credits both reduce tax, but in different places.',
      { h: 'Deductions' },
      'A deduction reduces taxable income. Its value depends on your marginal rate: a $1,000 deduction in the 22% bracket saves about $220.',
      { h: 'Credits' },
      'A credit reduces the tax bill directly, dollar for dollar. A $1,000 credit saves $1,000 of tax.',
      { h: 'Refundable and non-refundable' },
      { list: ['Non-refundable credits can reduce tax to zero but no further.', 'Refundable credits can produce a refund even if you owe no tax.', 'Some credits are partly refundable.'] },
      { h: 'Do not miss them' },
      'Credits exist for things such as children, education and certain energy improvements, with eligibility rules that change. The IRS website lists current credits; free help is available through the IRS Volunteer Income Tax Assistance (VITA) program for eligible filers. ' + TAX,
    ],
    extras: {
      objectives: ['Explain how deductions and credits differ', 'Value a deduction at your marginal rate', 'Tell refundable from non-refundable credits'],
      ideas: [
        { t: 'Deduction: income; credit: tax', d: 'Different places in the calculation.' },
        { t: 'Credits are dollar for dollar', d: 'Usually worth more.' },
        { t: 'Refundable credits can pay you', d: 'Even with no tax owed.' },
      ],
      plan: [
        { t: 'Find your marginal rate', d: 'To value deductions.' },
        { t: 'List credits you may qualify for', d: 'On IRS.gov.' },
        { t: 'Check refundability', d: 'For each credit.' },
        { t: 'Use free help if eligible', d: 'VITA.' },
      ],
      example: {
        title: '$1,000 deduction versus $1,000 credit', intro: 'Illustrative 22% marginal rate.',
        head: ['Item', 'Reduces', 'Tax saved'],
        rows: [['$1,000 deduction', 'Taxable income by $1,000', '$220'], ['$1,000 credit', 'Tax owed by $1,000', '$1,000']],
        takeaway: 'Same headline number, very different value.',
      },
      mistakes: ['Treating deductions and credits as equal', 'Missing refundable credits by not filing', 'Ignoring eligibility rules'],
      exercise: 'List one credit you might qualify for and check its current rules on IRS.gov.',
      apply: [{ href: 'https://www.irs.gov/credits-deductions', label: 'IRS: credits and deductions', d: 'Current list.' }, { href: 'https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers', label: 'IRS: free tax help (VITA)', d: 'For eligible filers.' }],
    },
    check: {
      questions: [
        Q('A tax credit reduces…', ['Taxable income', 'Tax owed, dollar for dollar', 'Salary', 'Nothing'], 1, 'Credits come off the tax itself.'),
        Q('A $2,000 deduction at a 12% marginal rate saves about…', ['$2,000', '$240', '$120', '$24'], 1, '$2,000 × 12%.'),
        Q('A refundable credit…', ['Can create a refund beyond tax owed', 'Never helps', 'Only lowers income', 'Costs money'], 0, 'Even with zero tax owed.'),
      ],
      puzzle: { q: 'You owe $800 before credits and have a $1,200 refundable credit. What is the result?', answer: 'A $400 refund', steps: '$800 − $1,200 = −$400, refunded because the credit is refundable (subject to its rules).' },
    },
  },
  {
    slug: 'tax-loss-harvesting', title: 'Tax-loss harvesting, carefully', category: 'Taxes', readMins: 5, updated: U,
    excerpt: 'Selling an investment at a loss can offset gains — but the wash-sale rule disallows the loss if you rebuy too soon.',
    body: [
      'Tax-loss harvesting means selling an investment in a taxable account at a loss to offset capital gains, and possibly up to $3,000 of ordinary income a year.',
      { h: 'The wash-sale rule' },
      'If you buy the same or a “substantially identical” investment within 30 days before or after the sale, the loss is disallowed for now and added to the basis of the new purchase. Purchases in other accounts you control, including IRAs, can count.',
      { h: 'Staying invested' },
      'Some investors sell and immediately buy a similar but not substantially identical investment so their market exposure barely changes. What counts as substantially identical is not always clear-cut.',
      { h: 'Limits' },
      { list: ['It only applies in taxable accounts.', 'It defers tax rather than eliminating it in many cases, because the new basis is lower.', 'Trading costs and spreads reduce the benefit.'] },
      TAX,
    ],
    extras: {
      objectives: ['Explain tax-loss harvesting', 'Apply the 30-day wash-sale window', 'Know its limits'],
      ideas: [
        { t: 'Losses have a use', d: 'They offset gains.' },
        { t: '30 days both sides', d: 'The wash-sale window.' },
        { t: 'Often a deferral', d: 'Lower basis means more gain later.' },
      ],
      plan: [
        { t: 'Check for losses', d: 'In taxable accounts only.' },
        { t: 'Mark the 61-day window', d: '30 days before and after.' },
        { t: 'Check all your accounts', d: 'Including IRAs and automatic purchases.' },
        { t: 'Record the trade', d: 'For tax time.' },
      ],
      example: {
        title: 'Offsetting a gain', intro: 'Illustrative: a $3,000 gain from one sale and a $2,000 unrealised loss in another holding.',
        head: ['Item', 'Amount'],
        rows: [['Realised gain', '$3,000'], ['Harvested loss', '−$2,000'], ['Net taxable gain', '$1,000']],
        takeaway: 'Only works if no substantially identical purchase happens within 30 days before or after the sale.',
      },
      mistakes: ['Rebuying the same fund within 30 days', 'Forgetting automatic reinvestment triggers a purchase', 'Harvesting inside retirement accounts'],
      exercise: 'Write down the date 30 days after any planned loss sale, and pause automatic purchases of that fund until then.',
      apply: [{ href: '/academy/capital-gains-short-long', label: 'Lesson: capital gains', d: 'How gains are taxed.' }],
    },
    check: {
      questions: [
        Q('The wash-sale window covers…', ['7 days', '30 days before and after the sale', 'One year', 'Only the sale day'], 1, '61 days in total.'),
        Q('Tax-loss harvesting applies in…', ['401(k)s', 'Taxable accounts', 'Savings accounts', 'HSAs'], 1, 'Retirement accounts do not create yearly gains tax.'),
        Q('A disallowed wash-sale loss is…', ['Lost forever', 'Added to the new purchase’s basis', 'Doubled', 'Refunded'], 1, 'It is deferred.'),
      ],
      puzzle: { q: 'You sell at a $1,500 loss on 10 March. What is the first day you could rebuy the same fund without a wash sale?', answer: '10 April (31 days later)', steps: 'March has 31 days. A purchase on 9 April is day 30 — still inside the window — so 10 April is the first safe day.' },
    },
  },
  {
    slug: 'w2-vs-1099', title: 'W-2 employee versus 1099 contractor', category: 'Taxes', readMins: 6, updated: U,
    excerpt: 'Contractors pay both halves of Social Security and Medicare, make estimated payments and keep their own records.',
    body: [
      'Employees receive a W-2; independent contractors and freelancers usually receive 1099 forms. The tax difference is large and often surprises new freelancers.',
      { h: 'Withholding' },
      'Employers withhold income tax and payroll taxes from each paycheck. Contractors are paid in full and must pay their own taxes, usually through quarterly estimated payments.',
      { h: 'Self-employment tax' },
      'Employees and employers split Social Security and Medicare taxes. The self-employed pay both halves — 15.3% on net self-employment earnings (12.4% Social Security up to a yearly wage cap, plus 2.9% Medicare) — and can deduct half of it.',
      { h: 'Business expenses' },
      'Contractors can deduct ordinary and necessary business expenses, which lowers net earnings. That makes receipts and records essential.',
      { h: 'Practical habits' },
      { list: ['Set aside a share of every payment for tax in a separate account.', 'Make quarterly estimated payments.', 'Track business expenses as they happen.', 'Consider a tax professional in your first freelance year.'] },
      TAX,
    ],
    extras: {
      objectives: ['Compare W-2 and 1099 tax treatment', 'Calculate self-employment tax', 'Set up estimated payments and records'],
      ideas: [
        { t: 'No withholding, no safety net', d: 'Contractors pay their own taxes.' },
        { t: 'Both halves of payroll tax', d: '15.3% self-employment tax.' },
        { t: 'Records lower tax', d: 'Business expenses reduce net earnings.' },
      ],
      plan: [
        { t: 'Open a tax savings account', d: 'Separate from spending.' },
        { t: 'Move a share of each payment', d: 'The day it arrives.' },
        { t: 'Calendar quarterly deadlines', d: 'Estimated payments.' },
        { t: 'Tag business receipts weekly', d: 'With purpose.' },
      ],
      example: {
        title: 'Self-employment tax on $40,000 net earnings', intro: 'Simplified: the IRS applies 15.3% to 92.35% of net earnings.',
        head: ['Step', 'Amount'],
        rows: [['Net self-employment earnings', '$40,000'], ['× 92.35%', '$36,940'], ['× 15.3% self-employment tax', '$5,651.82'], ['Half deductible', '$2,825.91']],
        takeaway: 'This is before income tax — which is why setting money aside from every payment matters.',
      },
      mistakes: ['Spending the whole payment', 'Missing quarterly estimates', 'Not tracking business expenses'],
      exercise: 'If you freelance, open a separate account and move a fixed share of your next payment into it.',
      apply: [{ href: '/goals/tax-records.html', label: 'Guide: tax-ready records', d: 'Business receipts tagged as you go.' }, { href: '/goals/miles.html', label: 'Car Miles', d: 'Business mileage records.' }],
    },
    check: {
      questions: [
        Q('Who usually has taxes withheld from pay?', ['1099 contractors', 'W-2 employees', 'Neither', 'Both equally'], 1, 'Contractors pay their own.'),
        Q('Self-employment tax rate on net earnings is…', ['7.65%', '15.3%', '22%', '0%'], 1, 'Both halves of Social Security and Medicare.'),
        Q('Contractors usually pay taxes…', ['Once in April only', 'Through quarterly estimated payments', 'Never', 'Monthly to the bank'], 1, 'To avoid underpayment penalties.'),
      ],
      puzzle: { q: 'Using the simplified method, what is self-employment tax on $20,000 of net earnings?', answer: 'About $2,825.91', steps: '$20,000 × 0.9235 = $18,470. × 0.153 = $2,825.91.' },
    },
  },
  {
    slug: 'charitable-giving-taxes', title: 'Charitable giving and taxes', category: 'Taxes', readMins: 5, updated: U,
    excerpt: 'Keep the right records, know the 2026 non-itemiser deduction, and understand donor-advised funds.',
    body: [
      'Giving can reduce tax in some situations, but only with the right records and the right kind of gift.',
      { h: 'Records' },
      'Keep a bank record or written acknowledgement for every donation. Larger gifts require a written acknowledgement from the charity, and non-cash gifts have extra rules. Check IRS Publication 526.',
      { h: 'If you itemise' },
      'Eligible donations can be deducted within limits based on income.',
      { h: 'If you do not itemise (from 2026)' },
      'Beginning with tax year 2026, non-itemisers can deduct up to $1,000 ($2,000 married filing jointly) of cash gifts to eligible charities. Non-cash gifts and gifts to donor-advised funds do not qualify for this deduction (IRS).',
      { h: 'Donor-advised funds' },
      'A donor-advised fund (DAF) is an account at a sponsoring charity. You contribute — and may deduct if you itemise — in the year you give, then recommend grants to charities over time. Some people use DAFs to bunch several years of giving into one itemising year.',
      { h: 'Check the charity' },
      'Use the IRS Tax Exempt Organization Search to confirm a charity is eligible. ' + TAX,
    ],
    extras: {
      objectives: ['Keep proper donation records', 'Use the 2026 non-itemiser deduction', 'Understand donor-advised funds'],
      ideas: [
        { t: 'No record, no deduction', d: 'Keep proof of every gift.' },
        { t: 'Cash for the new deduction', d: 'Non-cash and DAF gifts do not count.' },
        { t: 'DAFs separate deduction from granting', d: 'Useful for bunching.' },
      ],
      plan: [
        { t: 'Verify each charity', d: 'IRS Tax Exempt Organization Search.' },
        { t: 'Save every receipt', d: 'Bank record or acknowledgement.' },
        { t: 'Decide itemise or not', d: 'Each year.' },
        { t: 'Consider bunching', d: 'If near the itemising threshold.' },
      ],
      example: {
        title: 'Giving $1,500 in 2026 as a non-itemiser', intro: 'Single filer, illustrative 22% marginal rate.',
        head: ['Gift', 'Counts for non-itemiser deduction?', 'Amount counted'],
        rows: [['$900 cash to a food bank', 'Yes', '$900'], ['$400 of clothing', 'No (non-cash)', '$0'], ['$200 cash to a donor-advised fund', 'No (DAF)', '$0'], ['Total counted (limit $1,000)', '', '$900']],
        takeaway: 'About $198 of federal tax saved at 22% ($900 × 0.22).',
      },
      mistakes: ['No receipt for cash gifts', 'Assuming every gift counts for the new deduction', 'Giving to an organisation that is not eligible'],
      exercise: 'Look up one charity you support in the IRS Tax Exempt Organization Search.',
      apply: [{ href: 'https://apps.irs.gov/app/eos/', label: 'IRS Tax Exempt Organization Search', d: 'Check a charity.' }, { href: '/academy/standard-vs-itemized', label: 'Lesson: standard vs. itemised', d: 'Which applies to you.' }],
    },
    check: {
      questions: [
        Q('From 2026, the non-itemiser charity deduction applies to…', ['Any gift', 'Cash gifts to eligible charities', 'Clothing donations', 'Gifts to DAFs'], 1, 'Up to $1,000 / $2,000 MFJ.'),
        Q('A donor-advised fund lets you…', ['Avoid all tax', 'Contribute now and recommend grants later', 'Buy stocks', 'Pay bills'], 1, 'Deduction in the contribution year if itemising.'),
        Q('Where can you check a charity’s status?', ['Social media', 'IRS Tax Exempt Organization Search', 'A bank', 'Nowhere'], 1, 'The official lookup.'),
      ],
      puzzle: { q: 'A married couple filing jointly in 2026 gives $2,600 in cash to eligible charities and does not itemise. How much can they deduct under the new rule?', answer: '$2,000', steps: 'The limit for married filing jointly is $2,000.' },
    },
  },
  {
    slug: 'when-to-hire-a-tax-pro', title: 'When to hire a tax professional', category: 'Taxes', readMins: 4, updated: U,
    excerpt: 'Simple returns are often fine with software. Life changes, self-employment and big transactions are when help pays.',
    body: [
      'Many people with a W-2 job and the standard deduction can file with software or free IRS options. Some situations are complex enough that a professional can save money or prevent costly mistakes.',
      { h: 'Signs you may want help' },
      { list: ['Starting self-employment or a side business.', 'Selling a home, a business or significant investments.', 'Receiving an inheritance or large gift.', 'Moving between states mid-year.', 'Getting a letter from the IRS you do not understand.'] },
      { h: 'Types of professionals' },
      'Certified public accountants (CPAs), enrolled agents (EAs) and tax attorneys can represent taxpayers before the IRS. Every paid preparer must have a Preparer Tax Identification Number (PTIN).',
      { h: 'Check before you hire' },
      'Ask about credentials, fees and who signs the return. Avoid preparers who base fees on the size of your refund or will not sign the return. The IRS publishes a directory of credentialed preparers.',
      { h: 'Free options' },
      'IRS Free File and the Volunteer Income Tax Assistance (VITA) program help eligible filers at no cost.',
    ],
    extras: {
      objectives: ['Recognise when a return is complex', 'Know the main credential types', 'Check a preparer before hiring'],
      ideas: [
        { t: 'Complexity, not income, decides', d: 'Life changes add complexity.' },
        { t: 'Credentials matter', d: 'CPA, EA or attorney for representation.' },
        { t: 'Refund-based fees are a red flag', d: 'Ask how fees are set.' },
      ],
      plan: [
        { t: 'List this year’s changes', d: 'Business, sale, move, inheritance.' },
        { t: 'Try free options if simple', d: 'Free File or VITA.' },
        { t: 'Check credentials', d: 'IRS directory.' },
        { t: 'Gather records early', d: 'Receipts and forms.' },
      ],
      example: {
        title: 'Software or professional?', intro: 'General guidance, not a rule.',
        head: ['Situation', 'Often fine with software', 'Consider a professional'],
        rows: [['W-2 job, standard deduction', 'Yes', ''], ['First year freelancing', '', 'Yes'], ['Sold a rental property', '', 'Yes'], ['IRS letter you do not understand', '', 'Yes']],
        takeaway: 'A one-off professional review in a complex year can be worth more than its fee.',
      },
      mistakes: ['Hiring an unsigned preparer', 'Choosing on promised refund size', 'Waiting until the deadline to gather records'],
      exercise: 'Write down any tax-relevant life changes from this year.',
      apply: [{ href: 'https://irs.treasury.gov/rpo/rpo.jsf', label: 'IRS directory of preparers', d: 'Check credentials.' }, { href: '/goals/tax-records.html', label: 'Guide: tax-ready records', d: 'Hand over organised records.' }],
    },
    check: {
      questions: [
        Q('Which situation most suggests hiring a professional?', ['W-2 job only', 'First year of self-employment', 'Standard deduction only', 'No income change'], 1, 'Complexity rises sharply.'),
        Q('Every paid preparer must have…', ['A PTIN', 'A law degree', 'A bank licence', 'Nothing'], 0, 'Preparer Tax Identification Number.'),
        Q('A red flag in a preparer is…', ['Signing the return', 'Fees based on refund size', 'Explaining fees', 'Holding a CPA'], 1, 'Avoid it.'),
      ],
      puzzle: { q: 'A professional charges $400 and finds $650 of deductions you missed at a 22% marginal rate. Does it pay for itself on that alone?', answer: 'No — it saves about $143', steps: '$650 × 0.22 = $143 < $400. Value can still come from avoided mistakes or time saved.' },
    },
  },
]
