// Academy-native lessons: Debt and credit (6). Student-loan plan changes checked
// 2026-10-01 against ed.gov / StudentAid.gov (RAP and Tiered Standard from 1 July
// 2026). Debt-collection and identity-theft guidance follows CFPB / FTC.

const Q = (q, options, answer, why) => ({ q, options, answer, why })
const U = '2026-10-01'

export const DEBT_LESSONS = [
  {
    slug: 'debt-consolidation-refinancing', title: 'Debt consolidation and refinancing', category: 'Debt', readMins: 6, updated: U,
    excerpt: 'Combining debts can lower the rate or simplify payments — or quietly cost more. Compare total cost, not the monthly payment.',
    body: [
      'Consolidation replaces several debts with one new loan or balance; refinancing replaces one loan with a new one on different terms. Both can help, but only when the total cost goes down and the habits that created the debt change.',
      { h: 'Common options' },
      { list: ['A personal loan used to pay off several card balances at a lower fixed rate.', 'A balance-transfer card with a promotional rate for a set period, usually with a transfer fee.', 'Refinancing a car or student loan at a lower rate.', 'A nonprofit debt management plan arranged through a credit counselling agency.'] },
      { h: 'What to compare' },
      'Compare the total you will pay — rate, fees and term together. A longer term can lower the monthly payment while raising the total interest. For balance transfers, check the fee and the rate after the promotion ends.',
      { h: 'The trap' },
      'Consolidating card debt and then running the cards up again leaves you with the new loan and new card balances. Pair consolidation with a plan for the cards — keep them open at zero, or stop using them.',
      { h: 'Federal student loans' },
      'Refinancing federal student loans with a private lender ends access to federal repayment plans and protections. Check what you would give up before refinancing them.',
    ],
    extras: {
      objectives: ['Compare consolidation options on total cost', 'Spot when a lower payment costs more', 'Avoid re-borrowing on cleared cards'],
      ideas: [
        { t: 'Total cost beats monthly payment', d: 'Rate, fees and term together.' },
        { t: 'Consolidation is not repayment', d: 'It moves debt; habits clear it.' },
        { t: 'Promotions end', d: 'Plan for the rate after the promotional period.' },
      ],
      plan: [
        { t: 'List debts and rates', d: 'Balance, APR, minimum.' },
        { t: 'Get written offers', d: 'Rate, fees, term.' },
        { t: 'Compare total cost', d: 'Payment × months + fees.' },
        { t: 'Decide what happens to the cards', d: 'Before you consolidate.' },
      ],
      example: {
        title: 'A balance transfer, with the fee counted', intro: 'Illustrative $5,000 card balance at 24% APR moved to a 0% promotion for 15 months with a 3% fee, paid off in the promotion.',
        head: ['Item', 'Amount'],
        rows: [['Transfer fee (3% of $5,000)', '$150'], ['Monthly payment to clear in 15 months', '$343.33'], ['Interest during promotion', '$0'], ['Interest if left at 24%, first month alone', 'about $100']],
        takeaway: '$5,150 ÷ 15 = $343.33 a month. Worth it only if the balance is cleared before the promotional rate ends.',
      },
      mistakes: ['Choosing the lowest monthly payment', 'Ignoring transfer fees', 'Running the cards up again'],
      exercise: 'For your largest debt, write its rate and the total you would pay over the remaining term.',
      apply: [{ href: '/calculators#credit-card', label: 'Credit card payoff calculator', d: 'Compare payoff paths.' }, { href: '/academy/avalanche-vs-snowball', label: 'Lesson: avalanche vs. snowball', d: 'Pay it down after consolidating.' }],
    },
    check: {
      questions: [
        Q('What should you compare between offers?', ['Monthly payment only', 'Total cost including fees and term', 'Lender logo', 'Approval speed'], 1, 'A lower payment can cost more overall.'),
        Q('What is the main consolidation trap?', ['Lower rate', 'Running the cleared cards up again', 'Paying on time', 'Fewer bills'], 1, 'You end up with both the loan and new balances.'),
        Q('Refinancing federal student loans privately…', ['Keeps all federal protections', 'Ends access to federal repayment plans', 'Is required', 'Lowers taxes'], 1, 'Check what you would give up.'),
      ],
      puzzle: { q: 'Transfer $3,000 with a 4% fee to a 0% rate for 12 months. What monthly payment clears it in the promotion?', answer: '$260', steps: 'Fee $120. $3,120 ÷ 12 = $260.' },
    },
  },
  {
    slug: 'student-loan-repayment', title: 'Student loan repayment basics', category: 'Debt', readMins: 6, updated: U,
    excerpt: 'Federal and private loans work differently. Federal repayment options changed on 1 July 2026 — know which loans you have first.',
    body: [
      'Student loans are either federal (from the US Department of Education) or private (from a bank or lender). The difference matters, because federal loans come with repayment plans and protections that private loans usually do not.',
      { h: 'Know your loans' },
      'Log in to StudentAid.gov to see your federal loans, servicer and balances. Private loans appear on your credit report and with the lender.',
      { h: 'Federal repayment, from 1 July 2026' },
      'The Department of Education is moving new borrowers to two plans: a Tiered Standard plan and the income-based Repayment Assistance Plan (RAP). Under RAP, payments are based on income, reduced for dependants, and unpaid monthly interest is waived when payments are made on time. Borrowers in older plans have a transition period. Plans and rules change, so confirm your options on StudentAid.gov or with your servicer.',
      { h: 'Private loans' },
      'Private loans follow the lender’s contract. Options may include refinancing or temporary hardship arrangements; ask the lender directly and get terms in writing.',
      { h: 'Habits that help with any loan' },
      { list: ['Set up autopay; some lenders offer a small rate reduction for it.', 'Pay on time — missed payments affect your credit.', 'If you can pay extra, target the highest-rate loan and ask that extra go to principal.', 'Contact your servicer early if you cannot pay; options usually shrink after you fall behind.'] },
    ],
    extras: {
      objectives: ['Tell federal and private loans apart', 'Know where to check federal plans', 'Direct extra payments to the costliest loan'],
      ideas: [
        { t: 'Federal and private differ', d: 'Plans and protections depend on the type.' },
        { t: 'Rules changed in 2026', d: 'Confirm your plan on StudentAid.gov.' },
        { t: 'Call early', d: 'Options are wider before you miss payments.' },
      ],
      plan: [
        { t: 'List every loan', d: 'Federal or private, rate, servicer.' },
        { t: 'Check your federal plan', d: 'On StudentAid.gov.' },
        { t: 'Set up autopay', d: 'Never miss a payment.' },
        { t: 'Target extra money', d: 'Highest rate first, to principal.' },
      ],
      example: {
        title: 'Where an extra $100 a month should go', intro: 'Illustrative loans; monthly interest estimated as balance × rate ÷ 12.',
        head: ['Loan', 'Balance', 'Rate', 'Interest per month'],
        rows: [['Federal loan A', '$12,000', '4.5%', '$45.00'], ['Federal loan B', '$8,000', '6.5%', '$43.33'], ['Private loan', '$6,000', '9.0%', '$45.00']],
        takeaway: 'The private loan has the highest rate, so extra payments there save the most interest — while keeping the federal loans on their plan.',
      },
      mistakes: ['Not knowing which loans are federal', 'Ignoring letters from your servicer', 'Refinancing federal loans without checking what you lose'],
      exercise: 'Log in to StudentAid.gov and write down your servicer and current repayment plan.',
      apply: [{ href: 'https://studentaid.gov', label: 'StudentAid.gov', d: 'Official federal loan information.' }, { href: '/calculators#dti', label: 'Debt-to-income calculator', d: 'See loans in proportion.' }],
    },
    check: {
      questions: [
        Q('Where do you see your federal student loans?', ['Any bank app', 'StudentAid.gov', 'A credit card statement', 'Your employer'], 1, 'The official federal source.'),
        Q('Which loans usually have federal repayment plans?', ['Private loans', 'Federal loans', 'Car loans', 'Mortgages'], 1, 'Private loans follow the lender’s contract.'),
        Q('Extra payments save the most interest on…', ['The smallest loan', 'The highest-rate loan', 'The newest loan', 'Any loan equally'], 1, 'Highest rate costs most to keep.'),
      ],
      puzzle: { q: 'A $9,000 loan at 6% APR. Roughly how much interest accrues in one month?', answer: '$45', steps: '$9,000 × 0.06 ÷ 12 = $45.' },
    },
  },
  {
    slug: 'auto-loan-basics', title: 'Car loans: avoid the common pitfalls', category: 'Debt', readMins: 6, updated: U,
    excerpt: 'Negotiate the price first, bring your own financing quote and keep the term short. The monthly payment is the last number to look at.',
    body: [
      'A car loan combines two decisions: the price of the car and the cost of borrowing. Dealers often focus on the monthly payment because it hides both. Separate them and the deal becomes clearer.',
      { h: 'Get pre-approved first' },
      'A quote from a bank or credit union before you visit gives you a rate to compare with dealer financing. You can still take the dealer’s offer if it is better.',
      { h: 'Negotiate the out-the-door price' },
      'Agree the total price including fees and taxes before discussing financing or a trade-in. Mixing the three lets a good number in one hide a bad number in another.',
      { h: 'Watch the term' },
      'Longer terms lower the payment but increase total interest, and you can owe more than the car is worth for longer because cars lose value over time. A shorter term with a larger down payment keeps the loan closer to the car’s value.',
      { h: 'Read the add-ons' },
      { list: ['Extended warranties, service plans and other products are usually optional.', 'Ask for each add-on’s price separately and whether it is financed.', 'Financing an add-on means paying interest on it for years.'] },
    ],
    extras: {
      objectives: ['Separate price, financing and trade-in', 'Compare a pre-approval with dealer financing', 'Understand how term changes total cost'],
      ideas: [
        { t: 'Payment hides price', d: 'Agree the out-the-door price first.' },
        { t: 'Bring a competing quote', d: 'Pre-approval is your benchmark.' },
        { t: 'Cars lose value', d: 'Long loans can leave you owing more than it is worth.' },
      ],
      plan: [
        { t: 'Set a total budget', d: 'Price plus running costs.' },
        { t: 'Get pre-approved', d: 'Bank or credit union.' },
        { t: 'Negotiate out-the-door price', d: 'In writing.' },
        { t: 'Compare financing on total cost', d: 'Then decide on add-ons separately.' },
      ],
      example: {
        title: 'Same $25,000 loan, two rates, 60 months', intro: 'Standard loan arithmetic, rounded to the dollar.',
        head: ['Rate', 'Monthly payment', 'Total interest'],
        rows: [['5.0%', '$472', '$3,307'], ['8.0%', '$507', '$5,415']],
        takeaway: 'Three points of rate cost about $2,100 over the loan — which is why a pre-approval is worth getting.',
      },
      mistakes: ['Negotiating only the monthly payment', 'Financing add-ons you did not want', 'Choosing the longest term to fit a pricier car'],
      exercise: 'Before your next car purchase, get one pre-approval quote and write down its rate.',
      apply: [{ href: '/calculators#auto-loan', label: 'Auto loan calculator', d: 'Compare rates and terms.' }, { href: '/academy/good-debt-vs-bad-debt', label: 'Lesson: good vs. bad debt', d: 'Term length and total cost.' }],
    },
    check: {
      questions: [
        Q('What should you negotiate first?', ['Monthly payment', 'Out-the-door price', 'Floor mats', 'Trade-in'], 1, 'Then financing, then trade-in.'),
        Q('Why get pre-approved?', ['It is required', 'It gives a rate to compare with the dealer', 'It lowers the price', 'It adds a warranty'], 1, 'A benchmark strengthens your position.'),
        Q('A longer term usually…', ['Lowers total interest', 'Lowers the payment but raises total interest', 'Removes interest', 'Raises the car’s value'], 1, 'And you stay underwater longer.'),
      ],
      puzzle: { q: 'A $1,500 service plan is added to a 60-month loan. Ignoring interest, how much does it add to each payment?', answer: '$25 a month', steps: '$1,500 ÷ 60 = $25 — plus interest on top, since it is financed.' },
    },
  },
  {
    slug: 'mortgage-piti', title: 'Mortgage basics: what PITI means', category: 'Debt', readMins: 6, updated: U,
    excerpt: 'Principal, interest, taxes and insurance — the four parts of a typical monthly housing payment, and how they change over time.',
    body: [
      'Lenders often describe a housing payment as PITI: principal, interest, property taxes and homeowners insurance. Many payments also include PMI and, for some homes, HOA dues are paid separately.',
      { h: 'The four parts' },
      { list: ['Principal: the part that repays the loan balance.', 'Interest: the cost of borrowing.', 'Taxes: property taxes, often collected monthly into an escrow account.', 'Insurance: homeowners insurance, also often paid through escrow.'] },
      { h: 'How the mix changes' },
      'On a fixed-rate loan, principal and interest together stay the same, but early payments are mostly interest. Over time more of each payment goes to principal. This schedule is called amortisation.',
      { h: 'Why your payment can still change' },
      'Taxes and insurance can rise, and escrow is recalculated, usually yearly. A fixed-rate mortgage fixes principal and interest — not the whole payment.',
      { h: 'Fixed versus adjustable' },
      'A fixed rate stays the same for the life of the loan. An adjustable rate can change after an initial period, within caps set in the contract. Read the caps and model the highest payment before choosing one.',
    ],
    extras: {
      objectives: ['Name the four parts of PITI', 'Explain how amortisation shifts interest to principal', 'Know why a fixed-rate payment can still change'],
      ideas: [
        { t: 'Fixed rate is not fixed payment', d: 'Taxes and insurance move.' },
        { t: 'Early payments are mostly interest', d: 'Principal grows over time.' },
        { t: 'Budget the whole payment', d: 'Plus maintenance outside PITI.' },
      ],
      plan: [
        { t: 'Find the PITI breakdown', d: 'On your loan estimate or statement.' },
        { t: 'Check the escrow analysis', d: 'Yearly.' },
        { t: 'Add maintenance', d: 'Around 1% of home value a year.' },
        { t: 'Model rate caps', d: 'If adjustable.' },
      ],
      example: {
        title: 'One month’s payment, broken down', intro: 'Illustrative $300,000 loan at 6.5% for 30 years; taxes $3,600 a year; insurance $1,500 a year.',
        head: ['Part', 'Monthly'],
        rows: [['Principal and interest', '$1,896'], ['  of which interest (first month)', '$1,625'], ['  of which principal (first month)', '$271'], ['Property taxes', '$300'], ['Homeowners insurance', '$125'], ['Total PITI', '$2,321']],
        takeaway: 'In month one, only $271 of $2,321 reduces the loan. That share grows every month.',
      },
      mistakes: ['Budgeting only principal and interest', 'Ignoring escrow increases', 'Choosing an adjustable rate without modelling the cap'],
      exercise: 'Find your (or an example) loan estimate and write the four PITI amounts.',
      apply: [{ href: '/calculators#mortgage', label: 'Mortgage calculator', d: 'See your PITI.' }, { href: '/calculators#afford-home', label: 'Home affordability', d: 'A payment that fits.' }],
    },
    check: {
      questions: [
        Q('What does PITI stand for?', ['Price, interest, tax, income', 'Principal, interest, taxes, insurance', 'Payment, insurance, title, inspection', 'None'], 1, 'The four parts of a typical payment.'),
        Q('Early mortgage payments are mostly…', ['Principal', 'Interest', 'Insurance', 'Tax'], 1, 'Amortisation shifts this over time.'),
        Q('Why can a fixed-rate payment rise?', ['It cannot', 'Taxes and insurance in escrow can rise', 'The rate changes', 'Banks decide monthly'], 1, 'Only principal and interest are fixed.'),
      ],
      puzzle: { q: 'A $200,000 balance at 6% APR. What is the first month’s interest?', answer: '$1,000', steps: '$200,000 × 0.06 ÷ 12 = $1,000.' },
    },
  },
  {
    slug: 'identity-theft-defense', title: 'Identity theft: prevent, spot and recover', category: 'Debt', readMins: 5, updated: U,
    excerpt: 'Freezes, alerts and a recovery plan from IdentityTheft.gov. Most of the protection is free.',
    body: [
      'Identity theft happens when someone uses your personal information to open accounts, file taxes or make purchases in your name. Prevention is mostly free, and there is an official recovery process if it happens.',
      { h: 'Prevent' },
      { list: ['Freeze your credit with all three bureaus — it is free and does not affect your score (FTC).', 'Use unique passwords and turn on two-factor sign-in for financial accounts.', 'Be wary of unexpected calls, texts or emails asking for personal details.', 'Shred documents with account numbers.'] },
      { h: 'Spot' },
      'Check card and bank statements monthly, review your credit reports regularly, and act on warning signs: bills for things you did not buy, debt collectors calling about unknown debts, or mail that stops arriving.',
      { h: 'Recover' },
      'If it happens, report it at IdentityTheft.gov, the FTC’s official site, which creates a personal recovery plan. Contact the companies where fraud occurred, place a fraud alert or freeze with the bureaus, and keep records of every contact.',
      { h: 'A fraud alert versus a freeze' },
      'A fraud alert asks lenders to verify your identity; an initial alert lasts one year. A freeze blocks new credit until you lift it. Both are free.',
    ],
    extras: {
      objectives: ['Set up free prevention', 'Recognise warning signs', 'Follow the official recovery steps'],
      ideas: [
        { t: 'Most protection is free', d: 'Freezes, alerts and reports.' },
        { t: 'Statements are early warning', d: 'Monthly checks catch fraud fast.' },
        { t: 'There is an official playbook', d: 'IdentityTheft.gov.' },
      ],
      plan: [
        { t: 'Freeze at all three bureaus', d: 'Equifax, Experian, TransUnion.' },
        { t: 'Turn on two-factor sign-in', d: 'Banks, email, cards.' },
        { t: 'Check statements monthly', d: 'Every account.' },
        { t: 'Know the recovery site', d: 'IdentityTheft.gov.' },
      ],
      example: {
        title: 'Warning sign → first action', intro: 'Common signs and the first step for each.',
        head: ['Warning sign', 'First action'],
        rows: [['Charge you did not make', 'Contact the card issuer'], ['Collector calls about an unknown debt', 'Ask for written validation; do not confirm details by phone'], ['Unknown account on your credit report', 'Dispute with the bureau; report at IdentityTheft.gov'], ['Tax return rejected as already filed', 'Follow IRS identity-theft guidance']],
        takeaway: 'Keep a log of every call and letter — dates, names and reference numbers.',
      },
      mistakes: ['Paying for protection that is free', 'Reusing passwords', 'Waiting before reporting'],
      exercise: 'Place a credit freeze at one bureau today, then the other two this week.',
      apply: [{ href: 'https://www.identitytheft.gov', label: 'IdentityTheft.gov', d: 'Official FTC recovery plans.' }, { href: '/academy/check-your-credit-report', label: 'Lesson: check your credit report', d: 'Spot unknown accounts.' }],
    },
    check: {
      questions: [
        Q('Does a credit freeze cost money or lower your score?', ['Yes and yes', 'No and no', 'Costs money only', 'Lowers score only'], 1, 'It is free and does not affect your score.'),
        Q('Where do you report identity theft for a recovery plan?', ['Social media', 'IdentityTheft.gov', 'Your employer', 'A random app'], 1, 'The FTC’s official site.'),
        Q('A freeze…', ['Blocks new credit until lifted', 'Closes all accounts', 'Raises your limits', 'Deletes your report'], 0, 'Lift it temporarily when you apply.'),
      ],
      puzzle: { q: 'An initial fraud alert lasts one year. If you place one on 15 March 2026, when should you renew it if needed?', answer: 'Before 15 March 2027', steps: 'One year from placement; set a reminder a few weeks before.' },
    },
  },
  {
    slug: 'dealing-with-collections', title: 'Dealing with debt collectors', category: 'Debt', readMins: 6, updated: U,
    excerpt: 'You have rights: written validation, the right to dispute and the right to limit contact. Verify before you pay.',
    body: [
      'Being contacted by a debt collector is stressful, but federal law gives you rights. The first step is always to confirm the debt is real, yours and the right amount.',
      { h: 'Ask for validation' },
      'Collectors must give you information about the debt, including the amount and the creditor. If you dispute it in writing within the period stated in that notice, the collector generally must pause collection until it verifies the debt.',
      { h: 'Your rights' },
      { list: ['You can ask the collector, in writing, to stop contacting you or to limit how they contact you.', 'Collectors may not harass you, use threats or misrepresent the debt.', 'You can complain to the CFPB if a collector breaks the rules.'] },
      { h: 'Before you pay' },
      'Check the debt against your own records and credit report. Be careful about agreeing to pay or acknowledging an old debt before you understand it — in some states, a payment can affect the time limit for a lawsuit. If you settle, get the agreement in writing first and keep proof of payment.',
      { h: 'Never ignore a lawsuit' },
      'If you are sued, respond by the deadline. Ignoring it can lead to a default judgement. Legal aid organisations can help.',
    ],
    extras: {
      objectives: ['Request validation of a debt', 'Use your rights to dispute and limit contact', 'Settle only with written terms'],
      ideas: [
        { t: 'Verify before you pay', d: 'Real, yours, correct amount.' },
        { t: 'Writing protects you', d: 'Disputes, limits and settlements.' },
        { t: 'Never ignore a court notice', d: 'Deadlines matter.' },
      ],
      plan: [
        { t: 'Keep the first notice', d: 'Note the dispute deadline.' },
        { t: 'Dispute in writing if unsure', d: 'Before the deadline.' },
        { t: 'Check your records', d: 'Statements and credit report.' },
        { t: 'Get any settlement in writing', d: 'Before paying.' },
      ],
      example: {
        title: 'A settlement, checked in writing', intro: 'Illustrative verified debt of $2,400; the collector offers to settle.',
        head: ['Item', 'Detail'],
        rows: [['Verified balance', '$2,400'], ['Settlement offer', '$1,440 (60%)'], ['Before paying', 'Written agreement stating the debt is settled in full'], ['After paying', 'Keep proof; check your credit report updates']],
        takeaway: 'A settlement saves $960 here — but only a written agreement makes it final.',
      },
      mistakes: ['Paying before validating', 'Agreeing to terms only by phone', 'Ignoring a court summons'],
      exercise: 'If you have a collection notice, find the dispute deadline and write it in your calendar.',
      apply: [{ href: 'https://www.consumerfinance.gov/consumer-tools/debt-collection/', label: 'CFPB: debt collection', d: 'Your rights and sample letters.' }],
    },
    check: {
      questions: [
        Q('First step when a collector contacts you?', ['Pay immediately', 'Confirm the debt is real, yours and correct', 'Ignore it forever', 'Give your bank login'], 1, 'Verify before you pay.'),
        Q('How should you dispute a debt?', ['By phone only', 'In writing, within the stated period', 'On social media', 'You cannot'], 1, 'Writing creates a record.'),
        Q('You are sued over a debt. You should…', ['Ignore it', 'Respond by the deadline', 'Move house', 'Wait for a call'], 1, 'Ignoring it can mean a default judgement.'),
      ],
      puzzle: { q: 'A collector offers to settle a $3,200 debt for 45%. How much would you pay, and how much is forgiven?', answer: 'Pay $1,440; $1,760 forgiven', steps: '$3,200 × 0.45 = $1,440. $3,200 − $1,440 = $1,760. (Forgiven debt can have tax consequences; check.)' },
    },
  },
]
