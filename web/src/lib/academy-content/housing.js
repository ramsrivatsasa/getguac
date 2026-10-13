// Academy-native lessons: Housing and real estate (6). PMI removal thresholds
// (80% request / 78% automatic, of original value) per CFPB, checked 2026-10-01.
// REIT 90% distribution requirement is a long-standing tax-code rule.

const Q = (q, options, answer, why) => ({ q, options, answer, why })
const U = '2026-10-01'

export const HOUSING_LESSONS = [
  {
    slug: 'twenty-eight-thirty-six-rule', title: 'The 28/36 affordability rule', category: 'Home', readMins: 5, updated: U,
    excerpt: 'A lender rule of thumb: housing up to 28% of gross income, all debt up to 36%. Your comfortable number may be lower.',
    body: [
      'The 28/36 rule is a common guideline for how much house you can afford. It says total housing costs should be no more than 28% of gross monthly income, and all monthly debt payments — housing plus car, student and card payments — no more than 36%.',
      { h: 'What counts as housing' },
      'Housing usually means PITI: principal, interest, property taxes and insurance, plus HOA dues and PMI if they apply.',
      { h: 'A lender’s ceiling, not your target' },
      'Lenders may approve more than 28/36 depending on the loan and your credit. That does not mean it is comfortable. Gross income ignores taxes, retirement contributions and childcare. Many households prefer a lower share so they can keep saving.',
      { h: 'Remember what the rule leaves out' },
      { list: ['Maintenance and repairs — often around 1% of the home’s value a year.', 'Utilities, which are often higher in a house than an apartment.', 'Furnishing and moving costs.'] },
    ],
    extras: {
      objectives: ['Apply the 28% and 36% limits', 'Know what counts as housing cost', 'Set a comfortable payment below the ceiling'],
      ideas: [
        { t: 'Two limits, two questions', d: 'Housing alone, and all debt together.' },
        { t: 'Approval is not affordability', d: 'Lenders set ceilings.' },
        { t: 'Gross income flatters', d: 'Your take-home is smaller.' },
      ],
      plan: [
        { t: 'Find gross monthly income', d: 'Before tax.' },
        { t: 'Calculate both limits', d: '× 0.28 and × 0.36.' },
        { t: 'Subtract other debts from 36%', d: 'For the real housing room.' },
        { t: 'Check against take-home budget', d: 'Including maintenance.' },
      ],
      example: {
        title: '28/36 on $7,000 gross monthly income', intro: 'Illustrative household with $450 of other monthly debt payments.',
        head: ['Limit', 'Calculation', 'Amount'],
        rows: [['Housing (28%)', '$7,000 × 0.28', '$1,960'], ['All debt (36%)', '$7,000 × 0.36', '$2,520'], ['Room for housing under 36%', '$2,520 − $450', '$2,070'], ['Lower of the two', '', '$1,960']],
        takeaway: 'The 28% limit binds here: up to about $1,960 a month for PITI, before maintenance.',
      },
      mistakes: ['Treating lender approval as your budget', 'Forgetting maintenance and utilities', 'Leaving out car and student payments'],
      exercise: 'Multiply your gross monthly income by 0.28 and by 0.36, then subtract your other debt payments from the second number.',
      apply: [{ href: '/calculators#afford-home', label: 'Home affordability calculator', d: 'Your numbers.' }, { href: '/calculators#dti', label: 'Debt-to-income calculator', d: 'The 36% side.' }],
    },
    check: {
      questions: [
        Q('Under 28/36, housing should be at most…', ['28% of gross income', '36% of take-home', '50% of income', '10%'], 0, 'And all debt at most 36%.'),
        Q('Which is included in housing cost?', ['Groceries', 'Property taxes and insurance', 'Car payment', 'Phone bill'], 1, 'PITI plus HOA and PMI.'),
        Q('If a lender approves more than 28/36…', ['You must borrow it', 'It may still not be comfortable', 'It is free', 'Rates fall'], 1, 'Approval is a ceiling.'),
      ],
      puzzle: { q: 'Gross income $5,500 a month. Other debts $600 a month. What is the maximum housing payment under both limits?', answer: '$1,380', steps: '28%: $1,540. 36%: $1,980 − $600 = $1,380. The lower is $1,380.' },
    },
  },
  {
    slug: 'down-payment-and-pmi', title: 'Down payments and PMI', category: 'Home', readMins: 5, updated: U,
    excerpt: 'Less than 20% down usually means private mortgage insurance on a conventional loan — and it can be removed later.',
    body: [
      'Private mortgage insurance (PMI) protects the lender, not you. Lenders generally require it on conventional loans when the down payment is less than 20% of the home’s price or appraised value (CFPB).',
      { h: 'Removing PMI' },
      { list: ['You can ask to cancel PMI when your balance is scheduled to reach 80% of the home’s original value.', 'Your servicer generally must end it automatically when the balance is scheduled to reach 78%, if you are current on payments (CFPB).'] },
      { h: 'Is 20% down always best?' },
      'A larger down payment lowers the loan, the payment and the interest. But emptying savings to reach 20% can leave no emergency fund or money for repairs. Some buyers put less down, pay PMI for a while and keep a cushion.',
      { h: 'Other loan types' },
      'Government-backed loans have their own mortgage-insurance rules, which can last longer. Compare the full cost across loan types.',
    ],
    extras: {
      objectives: ['Know when PMI applies', 'Know the 80% and 78% removal points', 'Balance down payment against cash reserves'],
      ideas: [
        { t: 'PMI protects the lender', d: 'You pay for it.' },
        { t: 'It can end', d: '80% by request, 78% automatically.' },
        { t: 'Do not empty savings', d: 'A home needs a cushion.' },
      ],
      plan: [
        { t: 'Price your target home', d: 'And 20% of it.' },
        { t: 'Keep an emergency fund separate', d: 'Plus a repair buffer.' },
        { t: 'Compare loan types', d: 'Including mortgage insurance.' },
        { t: 'Calendar the 80% date', d: 'And ask to cancel PMI.' },
      ],
      example: {
        title: 'When PMI can come off', intro: 'Illustrative home with an original value of $350,000.',
        head: ['Milestone', 'Balance'],
        rows: [['Down payment 10%: starting loan', '$315,000'], ['80% of original value — you can request cancellation', '$280,000'], ['78% of original value — automatic termination', '$273,000']],
        takeaway: 'Paying principal down faster reaches the 80% point sooner.',
      },
      mistakes: ['Forgetting to request PMI cancellation', 'Using the emergency fund for the down payment', 'Ignoring mortgage insurance on other loan types'],
      exercise: 'If you have PMI, find the balance that equals 80% of your home’s original value.',
      apply: [{ href: 'https://www.consumerfinance.gov/ask-cfpb/when-can-i-remove-private-mortgage-insurance-pmi-from-my-loan-en-202/', label: 'CFPB: removing PMI', d: 'Official guidance.' }, { href: '/calculators#mortgage', label: 'Mortgage calculator', d: 'Payment with and without PMI.' }],
    },
    check: {
      questions: [
        Q('PMI is usually required when the down payment is below…', ['5%', '10%', '20%', '50%'], 2, 'On conventional loans.'),
        Q('You can ask to cancel PMI when the balance is scheduled to reach…', ['90% of original value', '80% of original value', '50%', 'Zero'], 1, 'Automatic at 78% if current.'),
        Q('PMI protects…', ['You', 'The lender', 'The seller', 'The agent'], 1, 'You pay; the lender is protected.'),
      ],
      puzzle: { q: 'Original home value $280,000. At what balance can you request PMI cancellation, and when does it end automatically?', answer: '$224,000 request; $218,400 automatic', steps: '$280,000 × 0.80 = $224,000. × 0.78 = $218,400.' },
    },
  },
  {
    slug: 'closing-costs', title: 'Closing costs and hidden purchase fees', category: 'Home', readMins: 5, updated: U,
    excerpt: 'Budget roughly 2–5% of the price on top of the down payment, and compare the Loan Estimate line by line.',
    body: [
      'Closing costs are the fees and prepaid items paid when a home purchase is finalised. They commonly run around 2% to 5% of the purchase price, on top of the down payment.',
      { h: 'What they include' },
      { list: ['Lender fees: origination, underwriting, points.', 'Third-party fees: appraisal, title insurance, inspections, recording.', 'Prepaids: initial escrow for taxes and insurance, prepaid interest.'] },
      { h: 'Two key documents' },
      'Lenders must give you a Loan Estimate after you apply, and a Closing Disclosure at least three business days before closing (CFPB). Compare them line by line and ask about any change.',
      { h: 'Shop where you can' },
      'Some services, such as title insurance or settlement, may be shopped. Compare Loan Estimates from more than one lender — the rate and the fees together.',
      { h: 'Cash to close' },
      'Your cash to close is the down payment plus closing costs, minus credits. Confirm wiring instructions by phone with a number you trust — closing is a common target for wire fraud.',
    ],
    extras: {
      objectives: ['Estimate closing costs', 'Use the Loan Estimate and Closing Disclosure', 'Avoid closing wire fraud'],
      ideas: [
        { t: 'The down payment is not the whole cheque', d: 'Add closing costs.' },
        { t: 'Compare the paperwork', d: 'Estimate versus disclosure.' },
        { t: 'Verify wire instructions', d: 'By phone, every time.' },
      ],
      plan: [
        { t: 'Estimate 2–5% of the price', d: 'For budgeting.' },
        { t: 'Get two or three Loan Estimates', d: 'Compare fees and rate.' },
        { t: 'Review the Closing Disclosure', d: 'Three business days before.' },
        { t: 'Confirm wiring by phone', d: 'With a trusted number.' },
      ],
      example: {
        title: 'Cash needed to close', intro: 'Illustrative $300,000 purchase, 10% down, 3% closing costs, $2,000 seller credit.',
        head: ['Item', 'Amount'],
        rows: [['Down payment (10%)', '$30,000'], ['Closing costs (3%)', '$9,000'], ['Seller credit', '−$2,000'], ['Cash to close', '$37,000']],
        takeaway: 'Budgeting only for the $30,000 down payment would have left a $7,000 gap.',
      },
      mistakes: ['Budgeting only the down payment', 'Not comparing lenders’ fees', 'Wiring money from emailed instructions without checking'],
      exercise: 'Multiply a home price you are considering by 3% to estimate closing costs.',
      apply: [{ href: 'https://www.consumerfinance.gov/owning-a-home/', label: 'CFPB: buying a house', d: 'Loan Estimate and Closing Disclosure explained.' }],
    },
    check: {
      questions: [
        Q('Closing costs commonly run about…', ['0.1% of the price', '2–5% of the price', '20%', 'Nothing'], 1, 'On top of the down payment.'),
        Q('When must you receive the Closing Disclosure?', ['At closing', 'At least three business days before closing', 'A year before', 'Never'], 1, 'CFPB rule.'),
        Q('Before wiring money to close you should…', ['Trust the email', 'Confirm instructions by phone with a trusted number', 'Wire twice', 'Use a gift card'], 1, 'Wire fraud targets closings.'),
      ],
      puzzle: { q: 'A $250,000 home with 5% down and 4% closing costs. What is the cash to close with no credits?', answer: '$22,500', steps: 'Down: $12,500. Closing: $10,000. Total $22,500.' },
    },
  },
  {
    slug: 'home-maintenance-reserve', title: 'A home maintenance reserve', category: 'Home', readMins: 4, updated: U,
    excerpt: 'Roofs, water heaters and appliances wear out on a schedule. A monthly reserve turns big repairs into planned costs.',
    body: [
      'Owning a home means paying for repairs a landlord used to cover. A common rule of thumb is to budget around 1% of the home’s value each year for maintenance — more for older homes.',
      { h: 'Plan for known lifespans' },
      'Major parts of a home — roof, water heater, heating and cooling, appliances — wear out over years. Knowing their age lets you set aside money before they fail.',
      { h: 'How to set it up' },
      { list: ['Estimate a yearly maintenance amount.', 'Divide by 12 and transfer monthly into a separate savings bucket.', 'List major components with their age and expected replacement.', 'Use the reserve for upkeep; keep the emergency fund for true emergencies.'] },
      { h: 'Small upkeep prevents big repairs' },
      'Cleaning gutters, servicing heating and cooling, and fixing small leaks early often prevent larger costs later.',
    ],
    extras: {
      objectives: ['Size a yearly maintenance budget', 'Track the age of major components', 'Keep the reserve separate from the emergency fund'],
      ideas: [
        { t: 'Repairs are predictable in total', d: 'Even if not in timing.' },
        { t: 'Know the ages', d: 'Of roof, water heater and systems.' },
        { t: 'Small fixes save big ones', d: 'Prevention is cheaper.' },
      ],
      plan: [
        { t: 'Estimate 1% of value', d: 'Adjust for age.' },
        { t: 'Set a monthly transfer', d: 'To a labelled bucket.' },
        { t: 'List components and ages', d: 'From inspection reports.' },
        { t: 'Schedule seasonal upkeep', d: 'In your calendar.' },
      ],
      example: {
        title: 'A reserve for a $320,000 home', intro: 'Illustrative 1% rule of thumb.',
        head: ['Item', 'Amount'],
        rows: [['Yearly maintenance (1%)', '$3,200'], ['Monthly transfer', 'about $267'], ['Reserve after 3 years with no major repair', '$9,600']],
        takeaway: '$3,200 ÷ 12 ≈ $267. When the water heater fails, the money is already there.',
      },
      mistakes: ['No reserve at all', 'Using the emergency fund for routine upkeep', 'Ignoring small leaks'],
      exercise: 'List three major components of your home and estimate their age.',
      apply: [{ href: '/academy/sinking-funds', label: 'Lesson: sinking funds', d: 'The same method for any planned cost.' }],
    },
    check: {
      questions: [
        Q('A common maintenance rule of thumb is about…', ['0.1% of value a year', '1% of value a year', '10% a year', 'Nothing'], 1, 'More for older homes.'),
        Q('Routine repairs should come from…', ['The emergency fund', 'A maintenance reserve', 'A credit card', 'Retirement'], 1, 'Keep emergency money for emergencies.'),
        Q('Why track the age of components?', ['Curiosity', 'To save before they need replacing', 'Taxes', 'Insurance requires it'], 1, 'Plan replacements.'),
      ],
      puzzle: { q: 'A $420,000 home, 1% rule. What is the monthly reserve transfer?', answer: '$350', steps: '$420,000 × 1% = $4,200. ÷ 12 = $350.' },
    },
  },
  {
    slug: 'reits-explained', title: 'REITs: real estate without being a landlord', category: 'Home', readMins: 5, updated: U,
    excerpt: 'Real estate investment trusts own income-producing property and pay out most of their taxable income.',
    body: [
      'A real estate investment trust (REIT) is a company that owns or finances income-producing real estate — such as offices, apartments, warehouses or data centres. Many trade on exchanges like stocks.',
      { h: 'Why they pay dividends' },
      'To qualify as a REIT under US tax law, a company must generally distribute at least 90% of its taxable income to shareholders, which is why REITs are known for dividends.',
      { h: 'Ways to own them' },
      { list: ['Individual listed REITs.', 'REIT index funds or ETFs.', 'Broad stock index funds, which already include listed REITs.', 'Non-traded REITs, which can be hard to sell and often carry higher fees.'] },
      { h: 'Risks' },
      'REIT prices can be sensitive to interest rates and property markets. In taxable accounts, much of a REIT’s dividend is typically taxed as ordinary income rather than at lower qualified-dividend rates.',
      'Education only — GetGuac does not recommend specific investments.',
    ],
    extras: {
      objectives: ['Explain what a REIT owns', 'Know the 90% distribution rule', 'Compare listed and non-traded REITs'],
      ideas: [
        { t: 'Property exposure through shares', d: 'No tenants to manage.' },
        { t: 'Dividends by design', d: 'At least 90% of taxable income.' },
        { t: 'Liquidity differs', d: 'Non-traded REITs can be hard to sell.' },
      ],
      plan: [
        { t: 'Check what you already own', d: 'Broad funds include REITs.' },
        { t: 'Prefer liquid, low-cost options', d: 'If adding any.' },
        { t: 'Consider account location', d: 'Taxable vs retirement.' },
        { t: 'Read fees carefully', d: 'Especially non-traded.' },
      ],
      example: {
        title: 'Yield and tax', intro: 'Made-up REIT fund: $10,000 invested, 4% distribution yield, 22% ordinary rate in a taxable account.',
        head: ['Item', 'Amount'],
        rows: [['Yearly distributions', '$400'], ['Tax if taxed as ordinary income at 22%', '$88'], ['After tax', '$312']],
        takeaway: 'Holding the same fund in a retirement account would defer that tax.',
      },
      mistakes: ['Buying non-traded REITs without checking liquidity and fees', 'Ignoring interest-rate sensitivity', 'Duplicating REITs already in broad funds'],
      exercise: 'Check what percentage of a broad index fund you hold is real estate.',
      apply: [{ href: '/academy/rent-vs-buy', label: 'Lesson: rent vs. buy', d: 'Owning your own home.' }],
    },
    check: {
      questions: [
        Q('REITs must generally distribute at least…', ['10% of taxable income', '50%', '90% of taxable income', 'Nothing'], 2, 'Hence their dividends.'),
        Q('Non-traded REITs can be…', ['Easy to sell instantly', 'Hard to sell and higher-fee', 'Risk-free', 'Tax-free'], 1, 'Check liquidity.'),
        Q('Broad stock index funds…', ['Never include REITs', 'Often already include listed REITs', 'Are REITs', 'Ban them'], 1, 'Check before adding more.'),
      ],
      puzzle: { q: '$8,000 in a REIT fund yielding 5%. How much is distributed in a year?', answer: '$400', steps: '$8,000 × 0.05 = $400.' },
    },
  },
  {
    slug: 'house-hacking', title: 'House hacking: sharing the cost of a home', category: 'Home', readMins: 5, updated: U,
    excerpt: 'Renting part of the home you live in can offset housing costs — and makes you a landlord, with rules to follow.',
    body: [
      'House hacking means living in a property and renting part of it — a spare room, a basement unit or the other side of a duplex — to offset your housing costs.',
      { h: 'Potential benefits' },
      { list: ['Rental income reduces your net housing cost.', 'Owner-occupied financing can have different terms from investment property loans.', 'You learn landlord responsibilities at a smaller scale.'] },
      { h: 'What it really involves' },
      'You become a landlord: screening tenants, following fair-housing and local rental rules, handling repairs and sharing space. Rental income is generally taxable, with related expenses deductible.',
      { h: 'Check before you buy' },
      'Confirm local zoning and rental permits, HOA rules, insurance requirements and what your mortgage allows. Budget for vacancies — months when the room is empty.',
      { h: 'Run the numbers conservatively' },
      'Plan as if the unit will be empty part of the year and repairs will cost more than expected. If the home only works with full rent every month, it is a stretch.',
    ],
    extras: {
      objectives: ['Explain house hacking', 'List the rules and responsibilities', 'Run numbers with vacancy included'],
      ideas: [
        { t: 'Rent offsets housing', d: 'But adds work.' },
        { t: 'You become a landlord', d: 'With legal duties.' },
        { t: 'Plan for empty months', d: 'Vacancy is normal.' },
      ],
      plan: [
        { t: 'Check local rules', d: 'Zoning, permits, HOA.' },
        { t: 'Confirm loan and insurance terms', d: 'In writing.' },
        { t: 'Estimate rent conservatively', d: 'Include vacancy.' },
        { t: 'Track rental income and costs', d: 'For tax.' },
      ],
      example: {
        title: 'Net housing cost with a rented room', intro: 'Illustrative: $2,400 monthly housing cost, $900 rent, room empty 2 months a year, $100 a month extra costs.',
        head: ['Item', 'Per year'],
        rows: [['Housing cost', '$28,800'], ['Rent received (10 months × $900)', '−$9,000'], ['Extra costs (12 × $100)', '$1,200'], ['Net housing cost', '$21,000']],
        takeaway: 'About $1,750 a month instead of $2,400 — before any tax on rental income.',
      },
      mistakes: ['Assuming the unit is never empty', 'Skipping permits or insurance changes', 'Forgetting rental income is taxable'],
      exercise: 'If you have a spare room, estimate local rent and reduce it by two months for vacancy.',
      apply: [{ href: '/academy/twenty-eight-thirty-six-rule', label: 'Lesson: the 28/36 rule', d: 'Affordability before rent.' }],
    },
    check: {
      questions: [
        Q('House hacking means…', ['Breaking into a house', 'Living in a property and renting part of it', 'Flipping houses', 'Avoiding a mortgage'], 1, 'Rent offsets your cost.'),
        Q('Rental income is generally…', ['Tax-free', 'Taxable, with related expenses deductible', 'Illegal', 'Ignored'], 1, 'Keep records.'),
        Q('Conservative numbers include…', ['Full rent every month', 'Vacancy months and higher repairs', 'No costs', 'Rent increases only'], 1, 'Plan for empty months.'),
      ],
      puzzle: { q: 'Rent $750 a month, expected empty 1 month a year. What yearly rent should you plan on?', answer: '$8,250', steps: '11 × $750 = $8,250.' },
    },
  },
]
