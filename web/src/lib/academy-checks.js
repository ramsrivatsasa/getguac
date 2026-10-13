// End-of-lesson quizzes and puzzles for the 35 original Academy lessons.
// New lessons carry their `check` inline in lib/academy-content/*.
// Shape: { questions: [{ q, options, answer (index), why }], puzzle: { q, answer, steps } }.
// Every puzzle answer is arithmetic on the numbers in the question — recheck
// it if you change an input.

const Q = (q, options, answer, why) => ({ q, options, answer, why })

export const CHECKS = {
  'where-you-stand': {
    questions: [
      Q('What is net worth?', ['Income minus spending', 'What you own minus what you owe', 'Your savings balance', 'Your yearly salary'], 1, 'Net worth compares assets with debts. Income minus spending is monthly cash flow.'),
      Q('Which income figure should a snapshot use?', ['Gross salary', 'Take-home pay after tax and deductions', 'Last year’s bonus', 'Your highest month'], 1, 'Plans are paid from what actually reaches your account.'),
      Q('Why write each debt’s APR next to its balance?', ['Lenders require it', 'It shows which debt costs most to keep', 'It raises your credit score', 'It lowers the balance'], 1, 'Balance × APR ÷ 12 approximates monthly interest, so the rate shows the real cost.'),
    ],
    puzzle: { q: 'You own $900 checking, $3,100 savings and a car worth $7,000. You owe $2,500 on a card and $6,000 on the car loan. What is your net worth?', answer: '$2,500', steps: 'Owned: $900 + $3,100 + $7,000 = $11,000. Owed: $2,500 + $6,000 = $8,500. $11,000 − $8,500 = $2,500.' },
  },
  'money-goals': {
    questions: [
      Q('Which is a usable money goal?', ['Save more', 'A better car someday', '$2,400 for a deposit in 12 months', 'Spend less on fun'], 2, 'It has an amount and a date, so it gives a monthly number.'),
      Q('Where does money for a goal 8 months away usually belong?', ['Somewhere safe and reachable', 'Individual stocks', 'A 30-year bond', 'Under the mattress'], 0, 'Short-term money should not swing in value right before you need it.'),
      Q('The monthly amounts add up to more than you can afford. What first?', ['Drop every goal', 'Move a date later', 'Borrow the difference', 'Stop the emergency fund'], 1, 'A later date with steady progress beats abandoning the goal.'),
    ],
    puzzle: { q: 'You want $1,800 for a holiday in 9 months and $600 for gifts in 6 months. How much per month in total?', answer: '$300 a month', steps: '$1,800 ÷ 9 = $200. $600 ÷ 6 = $100. $200 + $100 = $300.' },
  },
  'how-getguac-helps-you-save': {
    questions: [
      Q('When does a GetGuac finding become money saved?', ['When it appears', 'When you act on it and the next statement confirms it', 'After a week', 'Never'], 1, 'A finding is information; the saving happens when you cancel, return or switch.'),
      Q('Which leak is easiest to stop?', ['A pay cut', 'A subscription nobody uses', 'Rent', 'Taxes'], 1, 'Cancelling an unused recurring charge needs deciding only once.'),
      Q('Does GetGuac move money or hold your savings?', ['Yes, automatically', 'No — transfers happen at your bank', 'Only on weekends', 'Only for premium users'], 1, 'GetGuac shows what to act on; your bank holds and moves the money.'),
    ],
    puzzle: { q: 'You cancel a $9.99 and a $12.99 monthly subscription. How much is that per year?', answer: '$275.76', steps: '$9.99 + $12.99 = $22.98 a month. $22.98 × 12 = $275.76.' },
  },
  'small-changes-more-room': {
    questions: [
      Q('Which of these is a valid choice for a purchase you value?', ['Keep it', 'Always cancel it', 'Always swap it', 'Hide it'], 0, 'Keeping something that earns its place is a deliberate choice, not a failure.'),
      Q('Why does frequency matter?', ['It changes the tax rate', 'A small difference repeated often adds up', 'It does not matter', 'Stores charge more on repeats'], 1, 'A $3 saving once is small; twelve times a month it is $36.'),
      Q('When should you not switch to a cheaper option?', ['When extra costs or inconvenience cancel the saving', 'Never', 'On weekdays', 'When it is a store brand'], 0, 'Count delivery, travel and quality; a lower sticker price alone is not a saving.'),
    ],
    puzzle: { q: 'Lunch costs $11 and you buy it 15 times a month. You bring lunch 5 of those days at $4 each. What do you save per month?', answer: '$35', steps: 'Each swapped day saves $11 − $4 = $7. 5 × $7 = $35.' },
  },
  'fifty-thirty-twenty': {
    questions: [
      Q('50/30/20 should be applied to…', ['Gross salary', 'Take-home pay', 'Savings balance', 'Net worth'], 1, 'Use what actually reaches your account.'),
      Q('Where do extra debt payments above the minimum go?', ['Needs', 'Wants', 'Savings and extra debt', 'Nowhere'], 2, 'Minimums are needs; anything extra is in the 20%.'),
      Q('Needs take 60% of your pay. What is a sensible first move?', ['Abandon budgeting', 'Shrink wants before cutting savings to zero', 'Stop paying minimums', 'Use credit for needs'], 1, 'Protect some saving while the medium-term fix (housing, income) is worked on.'),
    ],
    puzzle: { q: 'Your take-home pay is $3,800 a month. What are the 50/30/20 amounts?', answer: 'Needs $1,900 · Wants $1,140 · Savings $760', steps: '$3,800 × 0.5 = $1,900; × 0.3 = $1,140; × 0.2 = $760. Total $3,800.' },
  },
  'track-spending-with-receipts': {
    questions: [
      Q('What should month one of tracking focus on?', ['Cutting everything', 'Seeing the real baseline', 'Opening new accounts', 'Investing'], 1, 'Restricting before you know the baseline usually backfires.'),
      Q('Which purchases are usually the biggest blind spot?', ['Rent', 'Small, frequent ones', 'Annual insurance', 'Car payments'], 1, 'Large purchases are memorable; small repeats are forgotten.'),
      Q('How many categories work best to start?', ['Two', 'Five to seven that fit your life', 'Thirty', 'One per store'], 1, 'Enough to show patterns, few enough to keep up.'),
    ],
    puzzle: { q: 'You buy a $4.50 coffee 4 times a week. Roughly what is that per year (52 weeks)?', answer: '$936', steps: '$4.50 × 4 = $18 a week. $18 × 52 = $936.' },
  },
  'sinking-funds': {
    questions: [
      Q('A sinking fund is for…', ['Unpredictable emergencies', 'Known future costs with lumpy timing', 'Investing in stocks', 'Paying rent'], 1, 'Holidays, premiums and registrations are certain; only their timing is uneven.'),
      Q('How do you work out the monthly amount?', ['Cost × 12', 'Cost ÷ months until due', 'Guess', 'Half your income'], 1, 'Divide the cost by the months you have left.'),
      Q('Why keep sinking funds apart from the emergency fund?', ['Banks require it', 'So planned costs do not drain your emergency cushion', 'For higher interest', 'It does not matter'], 1, 'Blending them leads to raiding the emergency fund for non-emergencies.'),
    ],
    puzzle: { q: 'Your $540 car registration is due in 9 months. How much per month?', answer: '$60 a month', steps: '$540 ÷ 9 = $60.' },
  },
  'emergency-fund-size': {
    questions: [
      Q('An emergency fund should be sized on…', ['Total spending including wants', 'Essential monthly costs', 'Your salary', 'Your net worth'], 1, 'In a crisis, wants pause; essentials still need paying.'),
      Q('Who usually needs closer to six months or more?', ['Dual-income salaried household', 'Self-employed sole earner with dependants', 'Anyone with a car', 'Students'], 1, 'Less stable income and more dependants call for a bigger cushion.'),
      Q('What is a good use of the fund?', ['A sale on a TV', 'An urgent car repair after a breakdown', 'A planned holiday', 'Annual insurance premium'], 1, 'Unexpected and necessary. Planned costs belong in sinking funds.'),
    ],
    puzzle: { q: 'Essentials are $2,200 a month. What is a four-month target?', answer: '$8,800', steps: '$2,200 × 4 = $8,800.' },
  },
  'fund-your-emergency-fund': {
    questions: [
      Q('What is a strong first source for an emergency fund?', ['A loan', 'Money already leaking, like unused subscriptions or open refunds', 'Retirement savings', 'A credit card'], 1, 'Recovering money you already had needs no sacrifice.'),
      Q('How should the monthly transfer be set?', ['As high as possible', 'At an amount you can actually keep', 'Randomly', 'Only in good months'], 1, 'A transfer that continues beats one that stops in month two.'),
      Q('Where should recovered money go?', ['Checking, to spend later', 'Straight into the separate savings account', 'Cash at home', 'Stocks'], 1, 'Moving it immediately stops it being spent.'),
    ],
    puzzle: { q: 'You start with a $120 refund and add $140 a month. After how many monthly transfers do you pass $1,000?', answer: 'After 7 transfers ($1,100)', steps: 'Need $880 more. $880 ÷ $140 = 6.3, so 7 transfers. $120 + 7 × $140 = $1,100.' },
  },
  'high-yield-savings': {
    questions: [
      Q('What protects deposits at an insured bank?', ['The interest rate', 'FDIC insurance up to the limit', 'The app', 'Nothing'], 1, 'FDIC (or NCUA for credit unions) covers insured deposits up to the limit.'),
      Q('A teaser rate is…', ['Permanent', 'A temporary promotional rate', 'A fee', 'A tax'], 1, 'Check the rate after the promotion ends.'),
      Q('What is an HYSA not ideal for?', ['Emergency fund', 'Sinking funds', 'Money meant to grow for decades', 'Short-term goals'], 2, 'Over long periods cash tends to lag rising prices.'),
    ],
    puzzle: { q: '$8,000 earns 3.6% APY for one year. Roughly how much interest is that?', answer: 'About $288', steps: '$8,000 × 0.036 = $288 (before any fees).' },
  },
  'grocery-budget-that-sticks': {
    questions: [
      Q('Where should a grocery target start?', ['A hopeful guess', 'Your real receipts', 'A friend’s budget', 'Last year’s prices'], 1, 'A target just below your real baseline is one you can hit.'),
      Q('How do you turn a monthly number into a weekly one?', ['Divide by 4', 'Divide by about 4.3', 'Multiply by 4', 'Divide by 12'], 1, 'There are about 4.3 weeks in a month.'),
      Q('Which number reveals shrinkflation?', ['Total price', 'Unit price', 'Barcode', 'Brand'], 1, 'The unit price rises when the pack shrinks at the same price.'),
    ],
    puzzle: { q: 'A 16 oz bag costs $3.20 and a 24 oz bag costs $4.32. Which is cheaper per ounce?', answer: 'The 24 oz bag ($0.18 vs $0.20 per oz)', steps: '$3.20 ÷ 16 = $0.20. $4.32 ÷ 24 = $0.18.' },
  },
  'grocery-list-worth-reviewing': {
    questions: [
      Q('What is the cheapest item on your list?', ['The store brand', 'The one already at home that you skip', 'The bulk pack', 'The sale item'], 1, 'A duplicate costs full price for nothing new.'),
      Q('Half a pack is usually thrown away. What does that do to its real cost?', ['Nothing', 'Roughly doubles it', 'Halves it', 'Makes it free'], 1, 'You pay for the whole pack but use half.'),
      Q('An old receipt price is…', ['A guarantee', 'A reference only', 'Always lower', 'Always higher'], 1, 'Shelf prices change; check today’s price.'),
    ],
    puzzle: { q: 'A 12 oz pack costs $6.00 and a 10 oz pack $5.50. Which is cheaper per ounce?', answer: 'The 12 oz pack ($0.50 vs $0.55)', steps: '$6.00 ÷ 12 = $0.50. $5.50 ÷ 10 = $0.55.' },
  },
  'how-to-read-a-grocery-receipt': {
    questions: [
      Q('A “2 for $5” deal shows no discount line. What happened?', ['It applied silently', 'It probably did not apply', 'Tax ate it', 'Nothing'], 1, 'If the discount is not printed, ask at the desk.'),
      Q('How do you sanity-check tax?', ['Ignore it', 'Taxable subtotal × your local rate', 'Total × 2', 'Count items'], 1, 'It should be close to the tax line.'),
      Q('What can receipts show over months?', ['Your credit score', 'Which items crept up in price', 'Your salary', 'Nothing'], 1, 'Line items become a price history.'),
    ],
    puzzle: { q: 'Taxable items total $25.00 and your rate is 8%. The tax line says $2.40. Is it right?', answer: 'No — it should be $2.00', steps: '$25.00 × 0.08 = $2.00. $2.40 suggests an extra item was taxed; worth checking.' },
  },
  'cancel-unused-subscriptions': {
    questions: [
      Q('First step in a subscription audit?', ['Cancel everything', 'Build a complete list', 'Call your bank', 'Buy an app'], 1, 'You cannot decide on what you cannot see.'),
      Q('What does “rotate” mean?', ['Keep all services', 'Subscribe to one at a time in turn', 'Share passwords', 'Pay yearly'], 1, 'Watch one service, cancel, then move to the next.'),
      Q('When should you set a trial reminder?', ['Never', 'The day you sign up', 'After the first charge', 'Monthly'], 1, 'Free is only free if you cancel in time.'),
    ],
    puzzle: { q: 'You pay $6.99, $11.99 and $15.99 a month. What is that per year?', answer: '$419.64', steps: '$6.99 + $11.99 + $15.99 = $34.97. × 12 = $419.64.' },
  },
  'review-bills-with-confidence': {
    questions: [
      Q('A bill rose 30%. A common reason is…', ['A promotion ended', 'Inflation doubled', 'You were fined', 'Nothing'], 0, 'Many increases are a discount expiring.'),
      Q('What should you ask a provider for?', ['A verbal promise', 'Written options with all fees and post-promotion prices', 'A refund only', 'Nothing'], 1, 'Written terms let you compare total cost.'),
      Q('When is a quoted discount real savings?', ['When quoted', 'When the next statement shows it', 'Never', 'After a year'], 1, 'Confirm it on the bill.'),
    ],
    puzzle: { q: 'A $70 plan vs a $58 plan with a $36 switching fee. When does switching pay off?', answer: 'After 3 months', steps: 'Saving $12 a month. $36 ÷ $12 = 3 months to recover the fee.' },
  },
  'get-the-refund-youre-owed': {
    questions: [
      Q('When does a return window start?', ['When you open the box', 'On the purchase date', 'When you decide', 'At month end'], 1, 'The clock starts at purchase.'),
      Q('An item you bought drops in price 10 days later. What might you claim?', ['Nothing', 'A price adjustment', 'Free shipping', 'A coupon'], 1, 'Many retailers refund the difference within a set window.'),
      Q('Best first step for a double charge?', ['Chargeback immediately', 'Contact the merchant with the date and amount', 'Ignore it', 'Close the card'], 1, 'Merchant first is usually fastest; chargeback is the fallback.'),
    ],
    puzzle: { q: 'You paid $89 for shoes; 12 days later they are $64. What price adjustment could you claim?', answer: '$25', steps: '$89 − $64 = $25, if the store offers adjustments within 12 days.' },
  },
  'return-windows-what-to-check': {
    questions: [
      Q('Which category often has shorter windows?', ['Clothing', 'Electronics', 'Books', 'Towels'], 1, 'Phones and computers frequently have shorter windows.'),
      Q('A gift bought early may be…', ['Always returnable', 'Outside the window before it is opened', 'Exempt from policy', 'Free'], 1, 'Check holiday extensions and gift receipts.'),
      Q('Price adjustments run on…', ['The same clock as returns', 'Their own separate window', 'No clock', 'The calendar year'], 1, 'They are a different policy with a different deadline.'),
    ],
    puzzle: { q: 'Bought on 3 March with a 21-day window. What is the last day to return?', answer: '24 March', steps: '3 + 21 = 24, so 24 March (check whether the store counts day one).' },
  },
  'how-long-to-keep-receipts': {
    questions: [
      Q('A coffee receipt can go…', ['After 7 years', 'Once the charge clears', 'Never', 'After the warranty'], 1, 'Tier 1: verify and discard.'),
      Q('Why keep a washer’s receipt beyond the return window?', ['Habit', 'It proves the warranty start date', 'Taxes', 'No reason'], 1, 'Warranties outlast return windows.'),
      Q('Tax-supporting records are generally kept for at least…', ['One month', 'Three years after filing', 'One week', 'Forever'], 1, 'Check current IRS guidance; seven years is a common comfortable choice.'),
    ],
    puzzle: { q: 'A laptop has a 2-year warranty and a 15-day return window. You bought it on 1 May 2026. Until when do you keep the receipt?', answer: 'At least 1 May 2028', steps: 'Keep it for the full warranty, not just the 15 days.' },
  },
  'digital-vs-paper-receipts': {
    questions: [
      Q('Why do register receipts fade?', ['Cheap ink', 'Thermal coating reacts to heat, light and friction', 'Moisture only', 'They do not'], 1, 'Thermal paper has no ink.'),
      Q('What makes a digital copy useful?', ['High resolution only', 'Legible and searchable by store, date and amount', 'Saved on one phone', 'A nice filter'], 1, 'Findable beats merely stored.'),
      Q('One copy on one device is…', ['A backup', 'Not a backup', 'Best practice', 'Required'], 1, 'Keep important records in more than one place.'),
    ],
    puzzle: { q: 'Name this receipt using the date-first pattern: Target, 7 November 2026, $54.10.', answer: '2026-11-07_Target_54.10', steps: 'YYYY-MM-DD first so files sort by date, then store, then amount.' },
  },
  'find-receipts-in-your-email': {
    questions: [
      Q('Which search often finds forgotten subscriptions?', ['“newsletter”', '“will renew”', '“hello”', '“sale”'], 1, 'Renewal notices reveal recurring charges.'),
      Q('Best time to label receipts?', ['After all searches', 'As each result appears', 'Next year', 'Never'], 1, 'Labelling as you go keeps momentum.'),
      Q('What is the master list of what you actually paid?', ['Your inbox', 'Your card statement', 'Your memory', 'A store app'], 1, 'The statement shows what is missing.'),
    ],
    puzzle: { q: 'Write a Gmail search for invoices sent as attachments from example.com after 1 Jan 2026.', answer: 'from:example.com has:attachment invoice after:2026/01/01', steps: 'Combine the sender, attachment and date operators in one search.' },
  },
  'good-debt-vs-bad-debt': {
    questions: [
      Q('Which two questions sort debt?', ['Lender and branch', 'Rate and what the money buys', 'Term and colour', 'Fees and logo'], 1, 'Low rate plus a lasting asset leans good.'),
      Q('A longer loan term usually means…', ['Higher payment, less interest', 'Lower payment, more total interest', 'No change', 'No interest'], 1, 'Stretching the term grows the total cost.'),
      Q('DTI is…', ['Monthly debt payments ÷ gross monthly income', 'Net worth ÷ income', 'Savings ÷ debt', 'APR × balance'], 0, 'Lenders use it to judge how stretched you are.'),
    ],
    puzzle: { q: 'Debt payments are $1,500 a month and gross income is $6,000. What is your DTI?', answer: '25%', steps: '$1,500 ÷ $6,000 = 0.25 = 25%.' },
  },
  'avalanche-vs-snowball': {
    questions: [
      Q('The avalanche targets…', ['Smallest balance', 'Highest interest rate', 'Newest debt', 'Biggest lender'], 1, 'It costs the least interest overall.'),
      Q('The snowball targets…', ['Smallest balance', 'Highest rate', 'Oldest debt', 'Mortgage'], 0, 'Quick wins keep many people going.'),
      Q('What must happen in both methods?', ['Skip some minimums', 'Pay every minimum on time', 'Open a new card', 'Stop saving entirely'], 1, 'Missed minimums add fees and harm credit.'),
    ],
    puzzle: { q: 'Debts: $600 at 25%, $2,000 at 19%, $4,000 at 8%. Which is first under each method?', answer: 'Both start with the $600 card', steps: 'It has the highest rate (avalanche) and the smallest balance (snowball), so both agree here.' },
  },
  'credit-cards-without-interest': {
    questions: [
      Q('What keeps the grace period?', ['Paying the minimum', 'Paying the full statement balance by the due date', 'Paying anything', 'Using the card less'], 1, 'Full statement balance, on time.'),
      Q('Cash advances usually…', ['Have a grace period', 'Charge interest immediately', 'Are free', 'Earn rewards'], 1, 'Avoid them unless there is no alternative.'),
      Q('Rewards are a real gain only when…', ['You spend more', 'No interest is paid', 'You have many cards', 'Always'], 1, 'Interest quickly outweighs typical rewards.'),
    ],
    puzzle: { q: 'A $900 balance at 21% APR. You pay $300. Roughly what is next month’s interest (unpaid × APR ÷ 12)?', answer: 'About $10.50', steps: 'Unpaid $600. $600 × 0.21 ÷ 12 = $10.50.' },
  },
  'credit-score': {
    questions: [
      Q('Which two factors carry most of a FICO score?', ['Mix and new credit', 'Payment history and amounts owed', 'Income and age', 'Bank and job'], 1, 'About 35% and 30% respectively.'),
      Q('When is your card balance usually reported?', ['On the due date', 'Around the statement closing date', 'Never', 'At year end'], 1, 'Paying before the statement closes lowers reported utilization.'),
      Q('Closing your oldest card can…', ['Always help', 'Raise utilization and shorten history', 'Remove late payments', 'Raise your limit'], 1, 'Keep old cards open where sensible.'),
    ],
    puzzle: { q: 'Limits total $8,000 and balances total $2,000. What is utilization? What balance gives 10%?', answer: '25% now; $800 for 10%', steps: '$2,000 ÷ $8,000 = 25%. 10% of $8,000 = $800.' },
  },
  'check-your-credit-report': {
    questions: [
      Q('Where are free weekly reports from all three bureaus?', ['Any credit app', 'AnnualCreditReport.com', 'Your bank only', 'They cost money'], 1, 'It is the only site authorized for the free reports.'),
      Q('Does checking your own report lower your score?', ['Yes, a lot', 'No', 'Only on weekends', 'Only once a year'], 1, 'Your own request is not a credit application.'),
      Q('Who should you contact to dispute an error?', ['Only the lender', 'The bureau and the business that reported it', 'Nobody', 'The police'], 1, 'Send copies of proof, not originals.'),
    ],
    puzzle: { q: 'You check one bureau’s report every 4 months, rotating through all three. How often do you see each bureau?', answer: 'Once a year each', steps: '3 bureaus × 4 months = 12 months for a full cycle. Weekly free access means you can check more often if you wish.' },
  },
  'compound-interest': {
    questions: [
      Q('What makes compounding powerful?', ['A high starting amount', 'Time', 'Luck', 'Checking daily'], 1, 'Each year’s growth earns growth after it.'),
      Q('Roughly how long to double at 9% (rule of 72)?', ['4 years', '8 years', '12 years', '20 years'], 1, '72 ÷ 9 = 8.'),
      Q('What resets compounding?', ['Reinvesting', 'Withdrawing early', 'Automating', 'Waiting'], 1, 'Money taken out stops growing.'),
    ],
    puzzle: { q: '$1,000 grows 10% a year for 2 years with compounding. What is it worth?', answer: '$1,210', steps: 'Year 1: $1,100. Year 2: $1,100 × 1.10 = $1,210 ($10 more than simple interest).' },
  },
  'index-funds': {
    questions: [
      Q('An index fund…', ['Picks a few winners', 'Owns the companies in an index', 'Guarantees returns', 'Only holds cash'], 1, 'It aims to match the market, not beat it.'),
      Q('A 0.40% expense ratio on $20,000 costs about…', ['$8 a year', '$80 a year', '$800 a year', '$40 a year'], 1, '$20,000 × 0.004 = $80.'),
      Q('Does diversification remove all risk?', ['Yes', 'No — the whole market can fall', 'Only in bonds', 'Only in winter'], 1, 'It removes single-company risk, not market risk.'),
    ],
    puzzle: { q: 'Fund A charges 0.05% and Fund B 0.75%. On $40,000, what is the yearly fee difference?', answer: '$280', steps: 'A: $40,000 × 0.0005 = $20. B: $40,000 × 0.0075 = $300. $300 − $20 = $280.' },
  },
  'dollar-cost-averaging': {
    questions: [
      Q('With a fixed amount, when prices fall you buy…', ['Fewer shares', 'More shares', 'The same shares', 'No shares'], 1, 'The same dollars buy more at a lower price.'),
      Q('The biggest DCA mistake is…', ['Automating', 'Pausing when markets fall', 'Investing monthly', 'Using index funds'], 1, 'Buying through dips is the point.'),
      Q('Investing part of each paycheck is…', ['Lump-sum investing', 'Dollar-cost averaging', 'Market timing', 'Day trading'], 1, 'Most people already do DCA this way.'),
    ],
    puzzle: { q: '$200 a month buys at $40, then $25, then $50. How many shares in total, and the average cost?', answer: '17 shares, about $35.29 each', steps: '5 + 8 + 4 = 17 shares for $600. $600 ÷ 17 ≈ $35.29.' },
  },
  '401k-basics': {
    questions: [
      Q('What should you capture first?', ['A big tax refund', 'The full employer match', 'A new car', 'Nothing'], 1, 'Not getting the match leaves pay behind.'),
      Q('Vesting determines…', ['Your tax rate', 'When the employer’s contributions become fully yours', 'Fund fees', 'Your salary'], 1, 'Leaving early can forfeit unvested match.'),
      Q('Cashing out a 401(k) when changing jobs usually…', ['Is free', 'Triggers income tax and possibly a 10% early penalty', 'Raises your match', 'Is required'], 1, 'Rolling over keeps the money working.'),
    ],
    puzzle: { q: 'Salary $70,000. Employer matches 50% up to 6%. You contribute 6%. What is the match per year?', answer: '$2,100', steps: 'You: 6% × $70,000 = $4,200. Match: 50% × $4,200 = $2,100.' },
  },
  'roth-vs-traditional': {
    questions: [
      Q('Roth tends to win when your tax rate is…', ['Higher now than later', 'Lower now than later', 'Zero forever', 'Irrelevant'], 1, 'Pay tax now while it is lower.'),
      Q('If your rate is the same now and later…', ['Roth always wins', 'Traditional always wins', 'The outcomes are about equal', 'Neither works'], 2, 'Same rate, same result in the simplified maths.'),
      Q('What matters most?', ['Choosing perfectly', 'Contributing consistently', 'Waiting to decide', 'Checking daily'], 1, 'Delay costs more than the “wrong” account.'),
    ],
    puzzle: { q: '$1,000 of earnings grows 3×. Tax now 24%, later 12%. Which account ends with more?', answer: 'Traditional: $2,640 vs Roth $2,280', steps: 'Traditional: $3,000 × 0.88 = $2,640. Roth: $760 × 3 = $2,280.' },
  },
  'hsa-triple-tax': {
    questions: [
      Q('What are the three HSA tax benefits?', ['In, growth and qualified withdrawals', 'Only in', 'Only out', 'None'], 0, 'Deductible in, tax-free growth, tax-free qualified medical withdrawals.'),
      Q('Unlike most FSAs, HSA money…', ['Expires yearly', 'Rolls over', 'Is taxed twice', 'Goes to your employer'], 1, 'Unused balances stay yours.'),
      Q('Why keep medical receipts?', ['No reason', 'To support later tax-free reimbursement', 'For coupons', 'Insurance requires it'], 1, 'They prove qualified expenses.'),
    ],
    puzzle: { q: 'You contribute $2,500 in the 24% federal bracket. How much federal income tax do you avoid?', answer: '$600', steps: '$2,500 × 0.24 = $600 (state and payroll taxes not included).' },
  },
  'understanding-sales-tax': {
    questions: [
      Q('Why is the total higher than the tag?', ['Shipping', 'Sales tax is added at the register', 'A mistake', 'Rounding'], 1, 'Most US prices exclude sales tax.'),
      Q('Are online purchases tax-free?', ['Always', 'Usually not anymore', 'Only on Sundays', 'Only from big stores'], 1, 'Most large retailers now collect sales tax.'),
      Q('Tax-free holidays usually have…', ['No rules', 'Category and price caps', 'Bigger taxes', 'Only food'], 1, 'Check the specific rules first.'),
    ],
    puzzle: { q: 'A $250 purchase at 6.5% sales tax. What is the total?', answer: '$266.25', steps: '$250 × 0.065 = $16.25. $250 + $16.25 = $266.25.' },
  },
  'receipts-at-tax-time': {
    questions: [
      Q('Most everyday personal receipts…', ['Are deductible', 'Have no tax value', 'Must be kept 10 years', 'Must be mailed to the IRS'], 1, 'A few categories matter; most do not.'),
      Q('Who should treat almost every business receipt as a tax record?', ['Employees', 'Self-employed people', 'Retirees', 'Students'], 1, 'Business expenses reduce taxable profit.'),
      Q('What should you add to a business receipt?', ['A doodle', 'The purpose — what and who it was for', 'Nothing', 'A coupon'], 1, 'The reason is hard to rebuild later.'),
    ],
    puzzle: { q: 'You note 4 business receipts a week for 50 weeks. How many receipts at tax time?', answer: '200', steps: '4 × 50 = 200 — which is why tagging them as you go matters.' },
  },
  'rent-vs-buy': {
    questions: [
      Q('What does comparing rent with only the mortgage payment miss?', ['Nothing', 'Tax, insurance, maintenance and transaction costs', 'Only HOA fees', 'Interest'], 1, 'The all-in cost of owning is higher.'),
      Q('A common maintenance rule of thumb is…', ['0.1% of value a year', 'About 1% of value a year', '10% a year', 'Nothing'], 1, 'A $300,000 home → about $3,000 a year.'),
      Q('Who usually benefits from renting?', ['People staying 20 years', 'People likely to move within a few years', 'Everyone', 'No one'], 1, 'Transaction costs need time to recover.'),
    ],
    puzzle: { q: 'A $320,000 home: 3% closing costs to buy, 6% to sell at the same price. Total transaction costs?', answer: '$28,800', steps: '3% = $9,600. 6% = $19,200. Total $28,800.' },
  },
  '529-college': {
    questions: [
      Q('Must you use your own state’s 529?', ['Yes', 'No — but your state may offer a tax benefit', 'Only for private schools', 'Only after 18'], 1, 'You can choose any state’s plan.'),
      Q('If your child gets a scholarship you can usually…', ['Lose the money', 'Change the beneficiary', 'Never withdraw', 'Only buy books'], 1, 'You stay in control of the account.'),
      Q('The “thirds” idea suggests funding college from…', ['Savings only', 'Savings, current income and aid or loans', 'Loans only', 'Grandparents only'], 1, 'You do not need to fund 100% alone.'),
    ],
    puzzle: { q: 'You save $150 a month from birth to age 18. How much do you contribute in total?', answer: '$32,400', steps: '$150 × 12 × 18 = $32,400, before any growth.' },
  },
}
