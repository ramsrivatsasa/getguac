// Original GetGuac money articles for the Articles / Resources hub. In-depth,
// evergreen, US-focused, cross-linked to the matching calculator. Each body item
// is a paragraph string, a { h } subheading, a { list } bullet array, or a
// { figure } diagram (see components/ArticleFigure.jsx for the four shapes:
// bars, split, steps, line).
// (Rewritten 2026-06-30 from the earlier thin stubs — AdSense low-value-content fix.)
//
// 2026-07-30: every article gained a figure. Until then the renderer had no
// image or diagram node at all, so all 20 shipped as unbroken walls of text.
// A figure is placed directly after the prose that states its numbers — keep it
// that way, and never put a number in a figure that the article doesn't say.
//
// 🔒 There is deliberately NO link node. /editorial-policy tells readers that an
// article cannot contain an affiliate or paid link, and that promise is only
// true because the renderer makes it structurally impossible. Adding a link node
// would silently make that page a lie.

export const ARTICLES = [
  {
    "slug": "compound-interest",
    "title": "The magic of compound interest",
    "category": "Investing",
    "excerpt": "Your returns start earning their own returns — and that changes everything.",
    "calc": "invest-growth",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "What compound interest actually means"
      },
      "Most people learn about interest as something a bank pays you — or charges you. But compound interest is something different and far more powerful. It means the returns you earn start generating their own returns. Over time, that loop creates wealth that simple math can't capture.",
      "Here's the simplest version: you invest $1,000 and it grows 7% in year one, giving you $1,070. In year two, that 7% applies to the full $1,070 — not the original $1,000. You earn $74.90 instead of $70. The gap is tiny at first. Over decades, it becomes enormous.",
      {
        "h": "Time is the real ingredient"
      },
      "People assume the key to building wealth is the amount you invest. It isn't — it's how long you let it sit. An investor who starts at 25 and contributes for 10 years can end up with more money at 65 than someone who starts at 35 and contributes for 30 years, even if the late starter puts in three times as much total money.",
      "That sounds impossible until you see the math. Time is the multiplier. Every year you delay doesn't just cost you one year of growth — it costs you all the future compounding that would have stacked on top of that year.",
      {
        "h": "A worked example: $300 a month"
      },
      "Say you invest $300 per month starting at age 25, at an average annual return of around 7% (a rough historical average for a diversified stock index fund, before inflation). By age 65, you'd have contributed $144,000 of your own money. But the account balance would be somewhere in the neighborhood of $790,000 — because the growth compounded on itself for 40 years.",
      "Now imagine you wait until 35 to start. Same $300/month, same ~7% return, but only 30 years. You'd contribute $108,000 and end up with roughly $340,000. Starting just 10 years earlier — with $36,000 more contributed — could more than double the outcome. That's compounding at work.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "$300 a month, invested at about 7%",
          "data": [
            {
              "label": "Start at 25 — 40 years of growth",
              "value": 790000,
              "note": "You contribute $144,000 of your own money"
            },
            {
              "label": "Start at 35 — 30 years of growth",
              "value": 340000,
              "note": "You contribute $108,000 of your own money"
            }
          ],
          "caption": "Ten extra years of compounding more than doubles the outcome, on $36,000 more contributed. An illustration at a rough historical average — real returns vary year to year."
        }
      },
      {
        "h": "Starting early beats saving more later"
      },
      "This is why financial educators hammer on the \"start now\" message so hard. If you're in your 20s and feel like you don't earn enough to invest seriously, a small amount started today is almost always better than a larger amount started five years from now.",
      "If you're already past the early years, don't let that paralyze you. The second best time to start is today. The compounding still works — it's just working with the years you have left, which is still meaningful.",
      {
        "h": "Where compound interest actually lives"
      },
      "Compound interest in the pure sense applies to savings accounts and bonds. But the same compounding mechanic applies to investment returns in index funds, ETFs, and retirement accounts. When your fund grows, and you leave it invested, next year's gains are calculated on the larger balance. The mechanism is identical even if the vehicle is different.",
      "The enemy of compounding is cashing out or withdrawing early. Every time you pull money out of an investment account — especially early in your investing life — you reset the base that future growth computes on.",
      {
        "h": "Automate it and leave it alone"
      },
      "The most practical thing you can do is automate your contributions. Set up a recurring transfer from your checking account to your investment or retirement account on the day after each paycheck hits. You never see the money, never have to decide whether to invest this month, and the compounding starts immediately.",
      "Then — and this part is hard — leave it alone. Don't check it every day. Don't panic-sell when markets drop. The math only works if the money stays invested through the inevitable down years.",
      {
        "h": "The one mistake that kills compounding"
      },
      "The most common mistake is treating an investment account like a savings account — dipping into it for vacations, car repairs, or anything that isn't a true emergency. Every withdrawal doesn't just cost you that dollar today. It costs you every dollar that dollar would have compounded into over the next 20 or 30 years.",
      {
        "list": [
          "Start as early as you can, even with a small amount",
          "Automate contributions so the decision is already made",
          "Reinvest dividends rather than taking them as cash",
          "Don't withdraw from investment accounts for non-emergencies",
          "Use tax-advantaged accounts (401k, IRA) to let compounding run without annual tax drag"
        ]
      },
      "The math of compounding rewards patience and consistency above everything else. You don't need a high income or perfect timing. You need time and the discipline to leave your money working."
    ]
  },
  {
    "slug": "emergency-fund-size",
    "title": "How big should your emergency fund be?",
    "category": "Saving",
    "excerpt": "Three to six months of expenses — but the right number depends on your specific situation.",
    "calc": "emergency",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "What an emergency fund is actually for"
      },
      "An emergency fund is not a savings goal. It's a financial shock absorber. Its job is to protect you from having to go into debt — or raid your retirement account — when something unexpected hits: a job loss, a medical bill, a car breakdown, a busted water heater.",
      "Without one, any single bad event forces you to put the expense on a credit card or pull from investments. Either option costs you money. A credit card bill at a high interest rate can take months or years to pay off. Pulling from a retirement account early can trigger taxes and penalties and — more importantly — permanently removes money that would have compounded for decades.",
      {
        "h": "The standard range: 3 to 6 months"
      },
      "The rule of thumb you'll hear most often is to save three to six months of living expenses. But which end of that range is right for you? It comes down to income stability and how many people depend on your paycheck.",
      "Three months is a reasonable floor if you have stable, salaried employment, a dual-income household where one income could cover basic bills, and marketable skills that would make you easy to re-hire quickly. Six months or more makes more sense if you're self-employed or a freelancer with variable income, you're the sole earner for your family, you work in a niche field where job searches take longer, or you have ongoing health expenses or a dependent with special needs.",
      {
        "list": [
          "Stable salaried job + dual income household → 3 months",
          "Single income household → 4–5 months",
          "Self-employed, freelance, or commission-based → 6+ months",
          "Sole earner with dependents → 6+ months",
          "Niche career or long average job search → 6+ months"
        ]
      },
      {
        "figure": {
          "type": "bars",
          "title": "How many months you should cover",
          "data": [
            {
              "label": "Stable salaried job, dual income",
              "value": 3,
              "display": "3 months"
            },
            {
              "label": "Single income household",
              "value": 5,
              "display": "4–5 months"
            },
            {
              "label": "Self-employed, or sole earner with dependents",
              "value": 6,
              "display": "6+ months"
            }
          ],
          "caption": "Months of essential expenses — rent, utilities, groceries, transport, insurance, minimum debt payments. Not your total spending."
        }
      },
      {
        "h": "What counts as 'monthly expenses'"
      },
      "Your emergency fund should cover your actual monthly cost of staying alive and housed — not your spending in general. That means rent or mortgage, utilities, groceries, transportation, insurance premiums, minimum debt payments, and any subscriptions that are genuinely essential. It does not mean dining out, travel, or discretionary shopping.",
      "A good way to figure out your real number is to look at your last two or three months of spending and separate needs from wants. The needs total is your monthly baseline. Multiply that by three to six. That's your target.",
      {
        "h": "Where to keep it"
      },
      "The right home for your emergency fund is a high-yield savings account (HYSA) at an online bank — not your everyday checking account, and definitely not an investment account. Here's why each option matters.",
      "Keeping it in checking means it's too easy to spend accidentally. Keeping it in investments means it can drop in value exactly when you need it most — market crashes often coincide with economic stress and job losses. A high-yield savings account keeps the money liquid (accessible within a day or two), earns meaningfully more than a standard savings account, and creates just enough friction that you won't spend it casually.",
      {
        "h": "How to build it when you're starting from zero"
      },
      "If you have nothing saved yet, the goal can feel overwhelming. The most effective approach is to treat it like a bill — a fixed monthly transfer that comes out automatically on payday before you have a chance to spend it.",
      "Start with whatever you can. Even $50 or $100 a month builds faster than you expect. If you get a tax refund, a bonus, or sell something, put that windfall directly into the emergency fund until it's fully funded. GetGuac can help here — as it tracks your receipts and spending, you can identify categories to cut and redirect toward your fund.",
      "Most people find it useful to set a specific first milestone — one month of expenses — before aiming for three. Hitting that first milestone early creates momentum.",
      {
        "h": "When it's actually okay to use it"
      },
      "Your emergency fund is not for planned purchases, not for vacations, and not for anything that could have been saved for separately. It is for genuine, unexpected, necessary expenses that you couldn't have anticipated.",
      "Good reasons to use it: job loss, unexpected medical bills, urgent car or home repairs. Not good reasons: a sale on something you wanted, a trip, a new gadget, or a predictable expense you just didn't budget for.",
      {
        "h": "After you use it, replenish it"
      },
      "Using your emergency fund for a real emergency is exactly what it's there for — don't feel bad about it. But as soon as the crisis passes, treat replenishing it as your top financial priority. Resume the automatic transfers and pause discretionary spending until the fund is back to its target level.",
      "A fully-funded emergency fund doesn't earn spectacular returns. It earns you something more valuable: the ability to handle whatever life throws at you without spiraling into debt."
    ]
  },
  {
    "slug": "401k-basics",
    "title": "401(k) basics: don’t leave free money behind",
    "category": "Retirement",
    "excerpt": "Your employer's 401(k) match is an instant 50–100% return — here's how to claim every dollar.",
    "calc": "retirement",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "What a 401(k) actually is"
      },
      "A 401(k) is a retirement savings account offered through your employer. You contribute a percentage of each paycheck — before or after taxes, depending on the type — and that money gets invested in funds you choose from a menu your employer provides. It grows tax-advantaged until you retire.",
      "The name comes from a section of the tax code, which tells you everything you need to know about how Washington works and nothing about how useful the account actually is. The useful parts: the tax advantages and — for most workers — the employer match.",
      {
        "h": "The employer match: an instant return"
      },
      "Many employers match a portion of your contributions. A common structure is something like: the employer matches 50% of your contributions up to 6% of your salary. That means if you earn $60,000 and contribute 6% ($3,600/year), your employer adds another $1,800 — for free.",
      "That's a 50% instant return on $3,600 before the market does anything at all. No investment in the world reliably delivers that. Not contributing enough to capture the full match is, in plain terms, turning down part of your compensation. Check your plan documents or ask HR what your specific match formula is — and contribute at least enough to get every dollar of it.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "A 50%-up-to-6% match on a $60,000 salary",
          "data": [
            {
              "label": "You contribute 6%",
              "value": 3600
            },
            {
              "label": "Employer matches 50% of that",
              "value": 1800
            },
            {
              "label": "Total into your 401(k) that year",
              "value": 5400
            }
          ],
          "caption": "The $1,800 is compensation you only receive if you contribute. Not contributing enough to capture the full match is turning down part of your pay."
        }
      },
      {
        "h": "Pre-tax traditional vs. Roth 401(k)"
      },
      "Most employers now offer two flavors: the traditional 401(k) and the Roth 401(k). The difference is when you pay taxes.",
      "With a traditional 401(k), contributions come out of your paycheck before income taxes. That lowers your taxable income today, which means a smaller tax bill this year. But you'll owe ordinary income tax when you withdraw the money in retirement.",
      "With a Roth 401(k), you contribute after-tax dollars — no tax break now. But the money grows tax-free, and qualified withdrawals in retirement are completely tax-free. If you think your tax rate will be higher in retirement than it is now, Roth is usually the smarter choice.",
      {
        "h": "Vesting: the fine print on free money"
      },
      "Employer match contributions often come with a vesting schedule — meaning you don't fully own that money until you've worked there for a certain number of years. If you leave before you're fully vested, you forfeit some or all of the match.",
      "Common vesting schedules include cliff vesting (you own 0% until year three, then 100% all at once) and graded vesting (you earn ownership in percentages over four to six years). Before you job-hop, check where you stand on the vesting schedule — leaving six months early can cost you thousands.",
      {
        "h": "The right order of operations"
      },
      "When you have limited money to allocate across retirement vehicles, order matters. Here's the sequence most financial educators recommend:",
      {
        "list": [
          "Contribute enough to your 401(k) to capture the full employer match — this is the highest-return move available to most workers",
          "If you're eligible, max out a Roth IRA next — it gives you more investment options and more flexibility than a 401(k)",
          "Come back and contribute more to your 401(k) up to the annual limit if you have money left over",
          "After that, taxable brokerage accounts or HSA (if you have a high-deductible health plan) are good next steps"
        ]
      },
      "The reason to detour to a Roth IRA between steps one and two is flexibility. Roth IRA contributions (not earnings) can be withdrawn anytime without penalty, and you have access to a broader fund menu than most 401(k) plans offer.",
      {
        "h": "Raise your contribution 1% per year"
      },
      "Most people set their 401(k) contribution percentage once — during onboarding — and never change it. That's a mistake. The most painless way to build retirement wealth is to increase your contribution by one percentage point every year, ideally timed with a raise.",
      "If you get a 3% raise and simultaneously bump your 401(k) from 6% to 7%, your take-home pay still goes up — just not by the full raise amount. You barely feel the contribution increase because it's absorbed by the raise. Over a decade of 1% annual bumps, you go from contributing 6% to contributing 16%, which can translate into dramatically more retirement wealth.",
      {
        "h": "Common 401(k) mistakes to avoid"
      },
      {
        "list": [
          "Not contributing enough to get the full employer match — this is leaving compensation on the table",
          "Cashing out a 401(k) when you change jobs — this triggers income taxes plus a 10% early withdrawal penalty before retirement age",
          "Leaving your money in the default investment option without reviewing whether it matches your timeline",
          "Forgetting about old 401(k) accounts from previous employers — consider rolling them into your current plan or an IRA",
          "Waiting until you 'can afford it' — even 3% today is better than 10% starting in five years"
        ]
      },
      "A 401(k) is not complicated once you understand the mechanics. Contribute enough to get the match, choose a diversified fund (a target-date fund that matches your expected retirement year is a solid default), increase contributions annually, and don't touch the money until retirement. That's most of what you need to do."
    ]
  },
  {
    "slug": "roth-vs-traditional",
    "title": "Roth vs. Traditional IRA: which is right for you?",
    "category": "Retirement",
    "excerpt": "The difference comes down to one question: will your tax rate be higher now or in retirement?",
    "calc": "retirement",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "The core question: tax now or tax later"
      },
      "Both a Roth IRA and a Traditional IRA give you a tax-advantaged way to save for retirement. The difference is timing. A Traditional IRA generally lets you deduct contributions from your taxable income now, and you pay income tax when you withdraw money in retirement. A Roth IRA gives you no deduction now, but your money grows tax-free and qualified withdrawals in retirement are completely untaxed.",
      "The question you're really answering is: when will your tax rate be lower? If it's lower now (you're early in your career, your income is relatively modest, or you're in a low-income year), paying taxes now and getting tax-free withdrawals later is usually the better deal. If you expect to be in a lower tax bracket in retirement than you are today, deferring taxes with a Traditional IRA often makes more sense.",
      {
        "figure": {
          "type": "steps",
          "title": "The one question that decides it",
          "data": [
            {
              "label": "Is your tax rate lower now than it will be in retirement?",
              "note": "Roth. Pay tax at today’s lower rate and withdraw tax-free later."
            },
            {
              "label": "Is it higher now than it will be in retirement?",
              "note": "Traditional. Take the deduction now, while it is worth more."
            },
            {
              "label": "Genuinely unsure?",
              "note": "Hold both. In retirement you choose which account to draw from each year, which lets you manage your own tax bracket."
            }
          ],
          "caption": "Agonising over the choice — and delaying because of it — costs more than picking the \"wrong\" one and starting now."
        }
      },
      {
        "h": "Who the Roth IRA typically suits"
      },
      "The Roth tends to be the better fit when you're young and in a lower tax bracket than you expect to be later in life. Your income is modest now, but you have decades for the money to grow — and all that growth comes out tax-free. Even modest contributions in your 20s can become substantial balances by the time you're 65, and you owe nothing on any of it at withdrawal.",
      "Roth accounts also make sense if you're uncertain about future tax rates. Tax policy changes. If you think rates will be higher across the board by the time you retire — regardless of your personal income — Roth locks in today's rates on a growing balance.",
      "There's another underrated reason to choose Roth: flexibility. Roth IRA contributions (the amounts you put in, not the earnings) can be withdrawn at any time without taxes or penalties. That gives you a layer of emergency access without the punishing costs that come with early withdrawal from a Traditional IRA.",
      {
        "h": "Who the Traditional IRA typically suits"
      },
      "The Traditional IRA tends to win when you're in a high-income year and expect to be in a lower bracket in retirement. The deduction reduces your taxable income today — and if you're in a high bracket, that deduction is worth real money right now.",
      "It can also make sense if you're already getting significant Roth treatment through a Roth 401(k) at work. Some people prefer to diversify their tax exposure across both types of accounts — paying some taxes now and deferring some for later — rather than betting entirely on one future tax scenario.",
      "One practical note: whether your Traditional IRA contribution is actually deductible depends on your income and whether you or your spouse have access to a workplace retirement plan. At higher income levels, the deductibility phases out — check current IRS guidelines for the income thresholds, as they adjust over time.",
      {
        "h": "Income limits and the backdoor option"
      },
      "Roth IRAs have income limits — above a certain threshold, your ability to contribute directly phases out. The limits adjust each year, so check the current figures rather than relying on a number you read somewhere. If your income is above the Roth limit, you may still be able to use a strategy called the backdoor Roth IRA, which involves making a nondeductible Traditional IRA contribution and then converting it to Roth. It's legal and widely used, but the mechanics are worth discussing with a tax professional.",
      "Traditional IRAs don't have income limits for contributions — anyone with earned income can contribute up to the annual limit — but the deductibility does phase out at higher incomes if you have a workplace plan.",
      {
        "h": "The tax flexibility argument for doing both"
      },
      "One of the most thoughtful retirement planning moves is to hold both Roth and Traditional accounts over your career. When you retire, you have options. In a year when your income is high (maybe you sell a rental property, or take a large distribution), you can lean on Roth withdrawals, which don't add to taxable income. In a lower-income year, you can pull from the Traditional account. That flexibility to manage your tax bracket in retirement is genuinely valuable and hard to replicate any other way.",
      "Even if you're primarily contributing to a 401(k), adding a Roth IRA on top — even at a modest annual amount — builds that flexibility over time.",
      {
        "h": "A worked comparison"
      },
      "Imagine two people, both 30, both investing the same annual amount. One uses a Roth IRA, the other a Traditional IRA, and both get a ~7% average annual return. At 65, their balances are roughly the same. The difference emerges at withdrawal.",
      "If both are in the same tax bracket in retirement as they were during their working years, the math evens out almost exactly. If the Roth investor's bracket is lower now than in retirement, the Roth wins. If the Traditional investor's bracket is lower in retirement, the Traditional wins. The uncertainty about future tax rates is exactly why spreading across both — over a long career — makes a lot of sense.",
      {
        "h": "The most important rule: just contribute"
      },
      {
        "list": [
          "Roth wins when your current tax rate is lower than your expected retirement rate",
          "Traditional wins when your current tax rate is higher than your expected retirement rate",
          "Holding both creates valuable tax flexibility at withdrawal",
          "Income limits on Roth phase out at higher incomes — check current thresholds each year",
          "Traditional deductibility phases out if you have a workplace plan and earn above a threshold",
          "Contributing consistently matters far more than picking the 'perfect' account type"
        ]
      },
      "The honest truth is that agonizing over Roth versus Traditional — and using that uncertainty as a reason to delay — costs you more than making the 'wrong' choice and starting immediately. Both accounts compound tax-advantaged for decades. Both build wealth. The real win is choosing one (or both), starting now, and contributing every year."
    ]
  },
  {
    "slug": "avalanche-vs-snowball",
    "title": "Avalanche vs. snowball: the fastest way out of debt",
    "category": "Debt",
    "excerpt": "Two proven payoff strategies — one saves the most money, one keeps you going. Here's how to pick.",
    "calc": "credit-card",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      "If you're carrying balances on multiple cards or loans, the worst thing you can do is spread extra payments randomly across all of them. The second-worst thing is paying only minimums everywhere and hoping the problem sorts itself out. The good news: there are two battle-tested strategies that turn a chaotic debt pile into a clear finish line.",
      {
        "h": "The rule everyone agrees on: pay minimums everywhere"
      },
      "Before you choose a strategy, lock in one universal rule — always pay at least the minimum on every single account, every month. Missed payments trigger late fees, penalty interest rates, and credit-score damage that will cost you more than any payoff strategy can save. Think of minimums as the floor. The strategy is what you do with every extra dollar above that floor.",
      {
        "h": "The avalanche: attack the highest interest rate first"
      },
      "With the avalanche method, you list all your debts by annual percentage rate (APR — the yearly cost of borrowing expressed as a percentage). You throw every spare dollar at the debt with the highest APR while paying minimums on the rest. When that one is gone, you roll its payment into the next-highest-rate debt, and so on.",
      "Why does this win mathematically? High-interest debt is the fastest-growing debt. Every month you leave a 24% APR card balance sitting there, roughly 2% of that balance compounds against you. Eliminating it first stops the bleeding at the source.",
      {
        "h": "The snowball: attack the smallest balance first"
      },
      "With the snowball method, you sort debts by outstanding balance — smallest to largest — and attack them in that order, again paying minimums elsewhere. The interest rate is irrelevant to the order.",
      "The logic is psychological, not mathematical. Clearing a small balance in full — sometimes in just a few months — gives you a real win. That win creates momentum. Behavioral researchers have found that many people stick with the snowball longer precisely because they feel progress faster.",
      {
        "h": "A worked comparison"
      },
      "Say you have three debts and $300 per month to put toward them after minimums:",
      {
        "list": [
          "Card A: $800 balance, 22% APR, $25 minimum",
          "Card B: $3,000 balance, 17% APR, $60 minimum",
          "Card C: $5,500 balance, 12% APR, $110 minimum"
        ]
      },
      "Your total minimum outlay is $195. That leaves $105 per month as your attack payment.",
      "Avalanche order: Card A (22%) → Card B (17%) → Card C (12%). You'd pay off all three debts in roughly 32 months and pay approximately $1,850 in total interest.",
      "Snowball order: Card A ($800) → Card B ($3,000) → Card C ($5,500). Same debts, same $300/month. You'd still clear them in roughly 33 months, but you'd pay approximately $2,050 in total interest — about $200 more.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "Total interest on $9,300 of card debt at $300 a month",
          "data": [
            {
              "label": "Avalanche — highest APR first",
              "value": 1850,
              "note": "Roughly 32 months to debt-free"
            },
            {
              "label": "Snowball — smallest balance first",
              "value": 2050,
              "note": "Roughly 33 months to debt-free"
            }
          ],
          "caption": "The avalanche wins by about $200 on these numbers. But an avalanche you abandon costs far more than a snowball you finish."
        }
      },
      "That $200 gap is real, and the avalanche wins it. But if the snowball's early win on Card A keeps you in the game when motivation dips, the snowball saves you more money in practice than an abandoned avalanche.",
      {
        "h": "The 0% balance-transfer card: a bonus move"
      },
      "Some issuers offer promotional 0% APR on balance transfers for a set introductory period (often 12 to 21 months — check current offers). If you qualify, transferring a high-rate balance to a 0% card can temporarily remove interest entirely from that debt, supercharging either strategy. Watch for the transfer fee (typically ~3–5% of the transferred amount) and make sure you clear the balance before the promotional period ends — the rate that kicks in afterward is often steep.",
      {
        "h": "Common mistakes to avoid"
      },
      {
        "list": [
          "Opening new credit to fund a balance transfer and then spending on the original card again — you've doubled your debt load.",
          "Treating a debt-free card as spending money the moment it's paid off — keep it at zero and redirect the freed payment to the next debt.",
          "Skipping minimums on any account while focusing on your target debt — the penalties and rate increases will erase your progress.",
          "Quitting the strategy when something unexpected comes up — a small pause is fine; just restart as soon as you can."
        ]
      },
      {
        "h": "Which strategy should you pick?"
      },
      "Honest answer: the one you'll actually follow for the next one to four years. If you're highly analytical and the interest savings motivate you, use the avalanche. If you've tried to pay off debt before and stalled out, use the snowball to build momentum. Some people hybrid — start snowball to get an early win, then switch to avalanche. Any consistent strategy beats none.",
      "Use a debt payoff calculator to model your specific numbers before you commit. Seeing your exact payoff date printed out is remarkably motivating — it turns an abstract problem into a countdown."
    ]
  },
  {
    "slug": "fifty-thirty-twenty",
    "title": "The 50/30/20 budget, explained",
    "category": "Saving",
    "excerpt": "One simple split of your paycheck can replace a spreadsheet full of categories you'll never track.",
    "calc": "savings-goal",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      "Most budgets fail not because people are bad at math, but because they're too complicated to maintain. Tracking 25 separate spending categories is exhausting. The 50/30/20 framework collapses everything into three buckets — and that simplicity is exactly why it works for so many people.",
      {
        "h": "The three buckets"
      },
      "The rule is straightforward: take your after-tax income (your actual take-home pay, not your gross salary) and split it like this:",
      {
        "list": [
          "50% toward needs — housing, utilities, groceries, insurance, minimum debt payments, transportation to work",
          "30% toward wants — restaurants, entertainment, subscriptions, travel, clothing beyond basics",
          "20% toward savings and extra debt payoff — emergency fund, retirement contributions, investing, paying down debt above minimums"
        ]
      },
      "That's it. Three numbers. You don't need a category for every type of coffee or a separate line for each streaming service.",
      {
        "h": "Needs vs. wants: where it gets interesting"
      },
      "The trickiest part of the framework is honestly sorting needs from wants. Some guidelines help. A need is something you'd face serious harm or financial penalty for skipping — rent, health insurance, the electric bill. A want is something that improves your life but isn't essential — the gym membership, the premium tier, dining out. The car itself might be a need; the newer model is probably a want.",
      "Minimum debt payments belong in needs because skipping them has consequences. Extra debt payments — anything above the minimum — go in the 20% savings bucket, because you're choosing to accelerate payoff.",
      "Some things are genuinely in between. A smartphone is arguably a need in 2026; the newest flagship is a want. A reliable used car is a need; a luxury lease is not. Be honest with yourself — most people's needs category quietly contains several wants if you look closely.",
      {
        "h": "What if needs exceed 50%?"
      },
      "In high cost-of-living cities, or during a rough patch, your needs can easily eat 60% or more of your take-home pay. This is common, and it doesn't mean the framework is broken — it means you have a structural problem to solve.",
      "Short term, you can temporarily compress the 30% wants bucket rather than gutting the 20% savings bucket. Protecting savings — even partially — during a tight stretch matters enormously for your long-term trajectory.",
      "Medium term, the fix is usually on the income or housing side: a raise, a roommate, a less expensive apartment, or reducing a recurring fixed cost. Trimming lattes won't close a 15-point gap. Restructuring a major fixed expense often will.",
      {
        "h": "A worked example"
      },
      "Suppose your take-home pay is $4,200 per month.",
      {
        "list": [
          "Needs (50%): $2,100 — rent $1,250, car insurance $120, groceries $300, utilities $130, phone $50, minimum loan payment $250",
          "Wants (30%): $1,260 — dining out $300, streaming services $60, gym $50, clothing $200, weekend activities $350, miscellaneous $300",
          "Savings/debt (20%): $840 — 401(k) contribution $400, emergency fund $200, extra debt payment $240"
        ]
      },
      {
        "figure": {
          "type": "split",
          "format": "usd",
          "title": "$4,200 of take-home pay, split three ways",
          "data": [
            {
              "label": "Needs — 50%",
              "value": 2100
            },
            {
              "label": "Wants — 30%",
              "value": 1260
            },
            {
              "label": "Savings & extra debt — 20%",
              "value": 840
            }
          ],
          "caption": "The percentages come off take-home pay, not gross. Using gross makes the needs bucket look bigger than the money you actually have."
        }
      },
      "If your rent alone is $1,800, your needs bucket is $300 over before you've added anything else. That's the signal to look at housing costs — not to abandon saving.",
      {
        "h": "Pay yourself first: automating the 20%"
      },
      "The most reliable way to protect the 20% bucket is to move that money before you have a chance to spend it. Set up an automatic transfer on payday to a separate savings account or retirement account. What you never see in your checking account, you're far less likely to spend.",
      "This \"pay yourself first\" approach sidesteps willpower entirely. You're not deciding each month whether to save — the system decides for you. Research consistently shows that automatic savers accumulate significantly more than people who try to save whatever's left at the end of the month (which is often nothing).",
      {
        "h": "Common mistakes"
      },
      {
        "list": [
          "Calculating percentages off gross income (before taxes) instead of take-home pay — this makes the 50% needs number look larger than the money you actually have available.",
          "Counting retirement contributions only if they feel comfortable — contributions you skip early are the most expensive money you'll ever not save, because of compound growth.",
          "Treating the 30% wants bucket as a spending goal rather than a ceiling — if you come in under 30%, that surplus can strengthen the 20%.",
          "Abandoning the framework after one over-budget month — a budget isn't a test you pass or fail; it's a navigation tool. Recalibrate and continue."
        ]
      },
      {
        "h": "Simple enough to actually use"
      },
      "The 50/30/20 framework's biggest strength is that you can check in on it in minutes rather than hours. At the end of each month, glance at three numbers. GetGuac can help surface your spending totals automatically from scanned receipts, making that monthly check-in nearly effortless. If two of the three numbers look right, you're doing well. If one is off, you know exactly where to focus next month."
    ]
  },
  {
    "slug": "hsa-triple-tax",
    "title": "The HSA: the most tax-friendly account you're not using",
    "category": "Taxes",
    "excerpt": "A health savings account gives you three separate tax breaks — and most people leave every one on the table.",
    "calc": "healthcare",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      "There's a type of account in the US tax code that lets you put money in tax-free, grow it tax-free, and take it out tax-free — all three at once. No other account does all three. It's the Health Savings Account (HSA), and if you qualify for one, ignoring it is one of the most expensive financial mistakes you can make.",
      {
        "h": "What is an HSA?"
      },
      "An HSA is a personal savings account specifically for healthcare expenses. It's paired with a High-Deductible Health Plan (HDHP) — a type of health insurance with lower monthly premiums but a higher deductible (the amount you pay before insurance kicks in). The IRS sets minimum deductible thresholds that define whether a plan qualifies as an HDHP; check the current thresholds each year.",
      "If your employer offers an HDHP option, you can likely open an HSA. Some banks and brokerages also let you open one independently if your health plan qualifies.",
      {
        "h": "The triple tax advantage, spelled out"
      },
      "This is the core of why HSAs are exceptional:",
      {
        "list": [
          "Contributions are tax-deductible (or pre-tax if made through payroll) — you put money in before the IRS takes its share.",
          "Growth is tax-free — any interest, dividends, or investment gains inside the HSA are never taxed.",
          "Qualified withdrawals are tax-free — when you use HSA funds to pay for eligible medical expenses, you pay zero tax on the withdrawal."
        ]
      },
      "By contrast, a traditional 401(k) gives you the first two benefits but taxes you on the way out. A Roth IRA gives you the last two but taxes you on the way in. The HSA is the only account that skips taxes at all three stages — but only when funds are used for qualified medical expenses.",
      {
        "figure": {
          "type": "steps",
          "title": "Where each account taxes you",
          "data": [
            {
              "label": "Money goes in — untaxed",
              "note": "Contributions are deductible, or pre-tax straight from payroll. A Roth IRA taxes you here."
            },
            {
              "label": "Money grows — untaxed",
              "note": "Interest, dividends and investment gains inside the HSA are never taxed."
            },
            {
              "label": "Money comes out — untaxed",
              "note": "Withdrawals for qualified medical expenses are tax-free. A traditional 401(k) taxes you here. Only the HSA skips all three."
            }
          ],
          "caption": "The triple advantage holds only for qualified medical expenses. Before 65, a non-qualified withdrawal owes income tax plus a 20% penalty."
        }
      },
      {
        "h": "The rollover advantage: HSAs vs. FSAs"
      },
      "Many people confuse HSAs with Flexible Spending Accounts (FSAs). They sound similar but work very differently. FSAs are \"use it or lose it\" — funds generally must be spent within the plan year or a short grace period, otherwise you forfeit the balance.",
      "HSAs roll over forever. Every dollar you don't spend this year stays in your account, accumulates interest, and is still yours in ten or twenty years. This changes the strategy entirely — instead of scrambling to spend down your balance before December 31, you can let the account grow for decades.",
      {
        "h": "The pro move: pay small bills out of pocket, invest the HSA"
      },
      "Here's where HSAs get genuinely powerful. Most HSA administrators allow you to invest your balance in mutual funds or ETFs once it crosses a certain threshold — similar to a brokerage account.",
      "If you can afford to pay routine medical expenses (a doctor visit copay, a prescription) out of your regular checking account, you can let your HSA balance sit invested and compound. Over 20 or 30 years, that invested balance can grow substantially. And crucially: there's no time limit on reimbursing yourself. If you pay a $200 medical bill out of pocket today and save the receipt, you can reimburse yourself from your HSA years — or even decades — later, tax-free. Keep records of every out-of-pocket medical expense.",
      {
        "h": "After 65: the HSA acts like a traditional IRA"
      },
      "Once you turn 65, the HSA's rules change in an important way. You can still withdraw funds for medical expenses completely tax-free, as always. But you can also withdraw funds for any purpose at all — just like a traditional IRA. You'll owe ordinary income tax on non-medical withdrawals, but no penalty. This makes a fully-funded HSA a genuine retirement asset: a healthcare reserve that doubles as a backup retirement account.",
      "Since healthcare is typically one of the largest expenses in retirement, having a tax-advantaged pool specifically earmarked for those costs is enormously valuable.",
      {
        "h": "Common mistakes"
      },
      {
        "list": [
          "Not contributing at all because your deductible feels scary — the lower premium on an HDHP often offsets the deductible risk for healthy individuals, and the tax savings add up quickly.",
          "Spending the HSA balance down every year instead of investing it — you're converting a triple-tax-advantaged investment account into a complicated spending account.",
          "Losing receipts for out-of-pocket medical expenses — those are your IOU to future-you for a tax-free reimbursement; store them digitally.",
          "Forgetting that non-qualified withdrawals before age 65 incur both income tax and a 20% penalty — don't use HSA funds for non-medical expenses until retirement.",
          "Missing employer contributions — many employers contribute to employee HSAs as a benefit; check your plan, because it's free money you may be leaving behind."
        ]
      },
      {
        "h": "Is an HDHP right for you?"
      },
      "HDHPs generally favor people who are relatively healthy and don't expect high medical costs in a given year. If you have a chronic condition requiring frequent specialist visits, an HDHP might cost you more despite the HSA benefit — run the numbers for your specific situation. But if you're in decent health and not using much of your current coverage, the combination of lower premiums and HSA tax advantages is often a clear win.",
      "Use a healthcare cost calculator to model your expected out-of-pocket costs under each plan option your employer offers. The premium savings plus HSA tax benefit frequently outweigh a higher deductible for moderate healthcare users."
    ]
  },
  {
    "slug": "529-college",
    "title": "529 plans: saving for college the smart way",
    "category": "Family",
    "excerpt": "Tax-free college savings that compound for years — and you control what happens if plans change.",
    "calc": "college",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      "College costs have risen dramatically over the past few decades, and there's no reliable sign they're slowing down. Saving early — even modest amounts — makes an enormous difference because of compound growth. The tax code's designated tool for this is the 529 plan, and it's more flexible and powerful than most families realize.",
      {
        "h": "What is a 529 plan?"
      },
      "A 529 is a state-sponsored investment account designed for education expenses. You contribute after-tax dollars, the money grows invested (in mutual funds or age-based portfolios), and withdrawals for qualified education expenses — tuition, fees, room and board, required books, even K-12 tuition up to certain amounts — are completely tax-free at the federal level.",
      "Every state offers at least one 529 plan, but you are not required to use your own state's plan. You can open a 529 in any state and use it at any eligible school anywhere in the US (and many abroad). This matters because some states' plans have better investment options or lower fees than others.",
      {
        "h": "The state tax break — a bonus for many families"
      },
      "While 529 contributions are not federally deductible, many states offer a deduction or credit on your state income tax return for contributions to your own state's plan. In some states, this deduction is substantial — enough to meaningfully reduce your state tax bill each year you contribute.",
      "If your state offers this benefit, there's often a strong case for using your home state's plan at least partly, even if another state's investment options are slightly better. Run the numbers: a consistent annual state tax deduction can add up over the decade or more you're contributing.",
      {
        "h": "High limits and flexible beneficiaries"
      },
      "529 plans have very high aggregate contribution limits — typically several hundred thousand dollars per beneficiary depending on the state, far more than most families will ever reach. There are no annual contribution limits per se, though contributions are treated as gifts for tax purposes, so very large single-year contributions can trigger gift tax considerations. Check current IRS gift tax thresholds if you're considering a large lump-sum contribution.",
      "Importantly, you control the account. If your original beneficiary — say, your daughter — earns a full scholarship or decides not to attend college, you can change the beneficiary to another qualifying family member with no tax consequence. Siblings, cousins, even yourself can be substituted. You don't lose the account.",
      {
        "h": "Aim at a future number, not today's price"
      },
      "One of the most common planning mistakes is targeting current college costs. If a public university costs $25,000 per year today and college education inflation runs at roughly 3–5% annually, a child born today will face a very different sticker price 18 years from now. Your college savings calculator should factor in inflation — aim at a projected future cost, not a today's-dollars number.",
      "A useful rule of thumb: model costs at ~5% annual growth from current published rates, then use a realistic investment return assumption for your portfolio (historically, diversified stock indexes have returned in the 7–10% range before inflation over long periods, but actual returns vary — use a conservative estimate for planning). The gap between those two numbers determines how hard your money has to work.",
      {
        "h": "The thirds framework"
      },
      "Financial planners often describe college funding in thirds: roughly one-third from savings accumulated before enrollment, one-third from current income and student wages during the college years, and one-third from student loans or aid. This framework is a sanity check, not a rigid rule — but it's useful because it prevents two common errors.",
      {
        "figure": {
          "type": "split",
          "title": "The thirds framework",
          "data": [
            {
              "label": "Saved before enrollment",
              "value": 1,
              "display": "About a third"
            },
            {
              "label": "Current income & student wages",
              "value": 1,
              "display": "About a third"
            },
            {
              "label": "Loans, grants & scholarships",
              "value": 1,
              "display": "About a third"
            }
          ],
          "caption": "A sanity check, not a rule. It stops you over-funding a 529 — excess money withdrawn for non-education purposes owes income tax plus a 10% penalty on earnings — and it assumes some aid will exist."
        }
      },
      "First, it keeps you from over-saving: you don't need to fund 100% of a projected future cost through a 529. Over-funding creates headaches, because excess 529 money withdrawn for non-education purposes is subject to income tax plus a 10% penalty on earnings.",
      "Second, it acknowledges that income and aid will exist. Many families qualify for at least some need-based aid; merit scholarships are also common. Build a plan that doesn't assume zero aid, or you may put yourself under unnecessary financial pressure.",
      {
        "h": "Age-based investing and the glide path"
      },
      "Most 529 plans offer age-based portfolios that automatically shift from aggressive (mostly stocks) to conservative (more bonds and cash) as the child approaches college age. This is similar to a target-date fund for retirement. When your child is 5, the portfolio can weather market downturns — there are 13 years to recover. When they're 17, a sudden stock market drop would be devastating if the money is fully in equities.",
      "If you're choosing your own investments rather than an age-based option, manually de-risk the portfolio as enrollment approaches. A common approach: mostly equities in the early years, transitioning to a more conservative mix in the final three to five years before the first tuition payment.",
      {
        "h": "Common mistakes to avoid"
      },
      {
        "list": [
          "Waiting until the teen years to start — even small contributions compounded over 15+ years significantly outperform larger contributions made over 5 years.",
          "Over-funding to the point where excess balances become a tax problem — calibrate toward the thirds framework.",
          "Ignoring your state's tax deduction — if your state offers one for contributions to your home-state plan, that's an immediate guaranteed return.",
          "Choosing high-fee investment options inside the 529 — expense ratios matter over a decade-plus time horizon; compare costs across plan options.",
          "Forgetting that 529 money can also cover room and board, not just tuition — many families leave qualified expenses on the table and accidentally over-save."
        ]
      },
      {
        "h": "Start small, start now"
      },
      "The math of compound growth rewards early action more than large amounts. Even $50 or $100 per month started at birth can grow substantially by age 18 at reasonable return assumptions. You can always increase contributions as your income grows. The key is to open the account, make your first contribution, and let time do most of the work."
    ]
  },
  {
    "slug": "rent-vs-buy",
    "title": "Rent vs. buy: which actually wins?",
    "category": "Home",
    "excerpt": "The sticker price of a mortgage rarely tells the whole story — here's how to run the real math.",
    "calc": "rent-buy",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "The comparison most people get wrong"
      },
      "When you compare renting to buying, the instinct is to line up your monthly rent against a potential mortgage payment and see which is smaller. That comparison is almost always misleading. Owning a home comes with a stack of costs that never appear on your mortgage statement, and renting comes with a financial flexibility that rarely gets priced into the conversation.",
      "Neither option is universally better. The right answer depends on how long you plan to stay, your local market, your savings, and what you'd do with the money otherwise. What follows is a framework to think through it honestly.",
      {
        "h": "The true cost of owning"
      },
      "Your mortgage principal and interest are just the starting line. Add property taxes (commonly 1–2% of home value per year, depending on your state and county), homeowner's insurance (typically a few hundred to over a thousand dollars a year), and private mortgage insurance if your down payment is under 20%. Then budget for maintenance.",
      "A widely used rule of thumb is to set aside roughly 1% of the home's value each year for repairs and upkeep — a $350,000 house means $3,500 a year, or about $290 a month, just for the leaky faucets, aging appliances, roof patches, and HVAC tune-ups that landlords normally absorb. In older homes or high-cost-of-living areas, 1.5–2% is more realistic.",
      "Add it up: on a $400,000 home with a typical mortgage, your all-in monthly cost can easily run $800–$1,200 more than the mortgage payment alone. That gap catches a lot of first-time buyers off guard.",
      {
        "h": "What renting actually costs you — and doesn't"
      },
      "Rent has a reputation as money thrown away, but that framing ignores what you get in return: predictable monthly costs, no repair bills, and the freedom to move when your life changes. What you don't build is home equity — but equity isn't free. It's locked-up capital that could be working for you elsewhere.",
      "If you put $80,000 into a down payment, that money is no longer in the market. Invested in a broad index fund historically returning somewhere in the 7–10% range annually, $80,000 compounds significantly over a decade. That foregone return is the opportunity cost of the down payment, and most rent-vs-buy calculators ignore it entirely.",
      {
        "h": "Transaction costs: the silent deal-breaker"
      },
      "Buying and selling a home is expensive. Closing costs when you buy typically run 2–5% of the purchase price. When you sell, real estate commissions and other closing fees often total 6–10% of the sale price. On a $400,000 home, you might spend $8,000–$20,000 getting in and $24,000–$40,000 getting out.",
      "Those costs have to be recovered through appreciation and equity before you come out ahead. That is why the break-even point — the point at which buying beats renting financially — is typically around five years for most markets. Stay fewer than five years and the transaction drag usually wipes out any advantage. The longer you stay, the more the math tips toward buying.",
      {
        "h": "A simple worked example"
      },
      "Suppose you're deciding between renting an apartment for $1,800 a month and buying a comparable home for $380,000 with 10% down. Your mortgage payment might be around $2,000/month (principal + interest at a moderate rate). Add $500 for taxes, $120 for insurance, and $315 for maintenance (1% of value ÷ 12). All-in: roughly $2,935/month to own.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "$1,800 rent vs a $380,000 home with 10% down, per month",
          "data": [
            {
              "label": "Rent",
              "value": 1800
            },
            {
              "label": "Own — mortgage payment only",
              "value": 2000,
              "note": "The comparison most people stop at"
            },
            {
              "label": "Own — all-in",
              "value": 2935,
              "note": "Plus $500 taxes, $120 insurance, $315 maintenance"
            }
          ],
          "caption": "The real gap is $1,135 a month — $68,100 over five years — and that is before the 2–5% of the price you pay to buy and the 6–10% you pay to sell."
        }
      },
      "The monthly gap is $1,135. Over five years that's $68,100 more spent owning. You'd need your home to appreciate enough — and your equity to accumulate enough — to exceed that gap plus your transaction costs before the buying side wins. In a fast-appreciating market with a long time horizon, buying can win decisively. In a flat market where you move in three years, renting almost always wins.",
      {
        "h": "Equity and flexibility: the intangibles"
      },
      "Equity is real wealth. As you pay down principal and your home appreciates, you build an asset you can eventually sell, borrow against, or pass on. Homeownership also gives you stability — your landlord can't raise your rent or sell the building. These things have genuine value that numbers don't fully capture.",
      "But flexibility has value too. If a job offer, a relationship change, or a health situation requires you to move, renting makes that transition far cheaper and faster. The 'golden handcuffs' of owning can become a real financial and personal burden if your life circumstances shift.",
      {
        "h": "Common mistakes"
      },
      {
        "list": [
          "Comparing only the mortgage payment to rent and ignoring taxes, insurance, and maintenance.",
          "Forgetting that a down payment has an opportunity cost — it's capital that could be compounding elsewhere.",
          "Assuming home values always rise significantly — appreciation is local, cyclical, and not guaranteed.",
          "Underestimating how expensive it is to sell, especially if you need to move within a few years.",
          "Buying at the edge of what you can afford, leaving no buffer for maintenance surprises."
        ]
      },
      {
        "h": "What to do"
      },
      "Run the actual numbers for your specific situation: your local rent, realistic purchase price, estimated all-in ownership costs, and how long you plan to stay. If you're within five years of a likely move, the flexibility of renting often wins. If you're planting roots for a decade or more, buying starts to look attractive — especially if you have a solid emergency fund on top of your down payment so repairs don't derail your finances."
    ]
  },
  {
    "slug": "credit-score",
    "title": "What actually moves your credit score",
    "category": "Debt",
    "excerpt": "Two factors drive most of your score — and you can improve both without closing a single card.",
    "calc": "dti",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "Five factors, two that matter most"
      },
      "Your FICO score — the version most lenders use — is built from five factors. Knowing what each one is worth helps you focus your energy where it actually counts rather than chasing credit myths.",
      {
        "list": [
          "Payment history (~35%): Whether you pay on time, every time.",
          "Amounts owed / utilization (~30%): How much of your available credit you're using.",
          "Length of credit history (~15%): How long your accounts have been open.",
          "Credit mix (~10%): Whether you have different types of credit (cards, loans, etc.).",
          "New credit (~10%): Recent applications and hard inquiries."
        ]
      },
      {
        "figure": {
          "type": "split",
          "format": "pct",
          "title": "What a FICO score is actually made of",
          "data": [
            {
              "label": "Payment history",
              "value": 35
            },
            {
              "label": "Amounts owed / utilization",
              "value": 30
            },
            {
              "label": "Length of credit history",
              "value": 15
            },
            {
              "label": "Credit mix",
              "value": 10
            },
            {
              "label": "New credit",
              "value": 10
            }
          ],
          "caption": "The first two are about 65% of the score between them — and utilization is the one you can move inside a single billing cycle."
        }
      },
      "Payment history and utilization together account for roughly 65% of your score. Master those two and you've done most of the work.",
      {
        "h": "Payment history: the single biggest lever"
      },
      "Missing a payment — even by a few weeks — can knock your score down significantly, sometimes by 50–100 points depending on your starting point and how long the delinquency sits on your report. The fix is simple but unforgiving: pay at least the minimum on every account before the due date, every month, without exception.",
      "Set up autopay for the minimum on each card if you're worried about forgetting. Then pay the actual balance manually before it accrues interest. Late payments stay on your report for seven years, so prevention is dramatically easier than recovery.",
      {
        "h": "Utilization: the number you can move fast"
      },
      "Utilization is the percentage of your total available revolving credit that you're currently using. If you have $10,000 in combined credit limits and carry a $3,000 balance, your utilization is 30%. Lenders prefer to see it below 30%, and the highest scorers typically keep it under 10%.",
      "Here's the part most people miss: your utilization is measured at the moment your card issuer reports to the credit bureaus — which is usually your statement closing date, not your due date. So even if you pay in full every month, if your balance is high when the statement closes, your score reflects that high utilization.",
      "A simple workaround: pay down your card balance a few days before your statement closes each month, not just before the due date. Your reported balance drops, your utilization drops, and your score can improve meaningfully — sometimes within one billing cycle.",
      {
        "h": "A quick worked example"
      },
      "Say you have two credit cards. Card A has a $5,000 limit with a $4,500 balance (90% utilization). Card B has a $5,000 limit and a $0 balance. Your overall utilization is $4,500 / $10,000 = 45% — already hurting your score. But Card A's individual utilization is also 90%, which is a separate red flag.",
      "If you pay Card A down to $800 before the statement closes, your overall utilization drops to 8% and Card A's individual utilization drops to 16%. That single payment change can lift your score noticeably. No new accounts, no waiting years for history to build — just timing.",
      {
        "h": "Don't close old accounts"
      },
      "Closing a credit card you've had for ten years does two damaging things: it reduces your total available credit (raising utilization if you carry any balances) and it can shorten your average account age over time. Both hurt your score.",
      "If you're not using an old card, just leave it open. Make a small recurring charge on it once a quarter — a streaming subscription, a utility — so the issuer doesn't close it for inactivity. The age of that account is free credit history you've already earned.",
      {
        "h": "Hard inquiries and new accounts"
      },
      "Every time you apply for new credit, the lender pulls a hard inquiry. One inquiry typically dips your score by a handful of points for a short period, and the effect fades within a year. Multiple applications in a short window look riskier. Rate-shopping for a mortgage or auto loan is an exception — scoring models recognize that several inquiries for the same loan type within a short window (typically 14–45 days) count as a single inquiry.",
      {
        "h": "Check your reports for errors"
      },
      "Errors on credit reports are more common than most people realize — accounts that aren't yours, payments incorrectly marked late, balances that haven't been updated. You're entitled to a free report from each bureau annually (check the official government-sanctioned source). If you find an error, dispute it directly with the bureau in writing. Correcting even one error can produce a meaningful score improvement at no cost.",
      {
        "h": "Common mistakes"
      },
      {
        "list": [
          "Paying the minimum on the due date but missing that the statement already closed with a high balance — utilization was already reported.",
          "Closing old cards to 'simplify' finances, which reduces available credit and potentially shortens credit history.",
          "Applying for several new cards in a short period while preparing a major loan application.",
          "Ignoring your credit reports for years and missing errors that have been dragging your score down."
        ]
      },
      {
        "h": "The practical playbook"
      },
      "Set up autopay for minimums on all accounts. Pay balances down before statement closing dates. Keep each card below 30% utilization, ideally below 10%. Don't close old accounts. Check your reports at least once a year and dispute anything that looks wrong. These habits compound quietly over months and years into a meaningfully stronger score — and a stronger score translates directly into lower interest rates on mortgages, auto loans, and everything else you borrow for."
    ]
  },
  {
    "slug": "index-funds",
    "title": "Index funds 101: boring beats clever",
    "category": "Investing",
    "excerpt": "Decades of data keep reaching the same conclusion: the boring fund usually beats the brilliant one.",
    "calc": "invest-growth",
    "readMins": 7,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "What an index fund actually is"
      },
      "An index fund is a fund that owns a slice of every company in a particular index — the S&P 500, the total US stock market, the global market, a bond index — rather than trying to pick winners. When you buy one share of a total US market index fund, you own a tiny piece of thousands of American companies simultaneously.",
      "The fund isn't trying to beat the market. It is the market, or close enough. That's the point. Because no one is doing active research to decide which stocks to hold, operating costs are extremely low. Those savings get passed back to you.",
      {
        "h": "Diversification for free"
      },
      "Owning one index fund can give you exposure to thousands of companies across dozens of industries. A single bad earnings report at one company barely moves the needle on your total portfolio. Compare that to owning five individual stocks, where one blowup can cost you 20% of your investment overnight.",
      "Diversification doesn't eliminate risk — when the entire market drops, your index fund drops with it. But it eliminates the specific, unnecessary risk of betting on individual companies. That's a risk you don't get paid extra to take.",
      {
        "h": "Why most active funds lose"
      },
      "Every year, research organizations track how many actively managed funds — the kind run by professional stock-pickers getting paid to find hidden gems — beat their benchmark index. The results are consistent and humbling: the majority of active funds underperform their index over a ten-year period. Over fifteen or twenty years, the number that underperform grows even larger.",
      "This isn't because fund managers are incompetent. It's because markets are highly competitive. For every trade where a manager is right, someone equally smart is on the other side. After you subtract fees, the average active fund is almost guaranteed to trail the index over the long run.",
      {
        "h": "The expense ratio: the invisible fee that compounds against you"
      },
      "An expense ratio is the annual fee a fund charges, expressed as a percentage of your investment. A 1% expense ratio on $100,000 costs you $1,000 a year. That sounds modest, but it compounds against you for decades.",
      "Here's the math: assume two funds both earn 8% gross returns over 30 years. Fund A charges 0.05% (typical for a broad index fund). Fund B charges 1.0% (typical for an active fund). Starting with $50,000, Fund A grows to roughly $488,000. Fund B grows to roughly $378,000. That 0.95% annual difference costs you over $110,000 in final wealth — on the same gross return. Low fees matter enormously over long time horizons.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "$50,000 held for 30 years at the same 8% gross return",
          "data": [
            {
              "label": "Index fund — 0.05% expense ratio",
              "value": 488000
            },
            {
              "label": "Active fund — 1.00% expense ratio",
              "value": 378000
            }
          ],
          "caption": "Identical gross returns, identical 30 years. The 0.95-point difference in fees costs over $110,000 of final wealth."
        }
      },
      {
        "h": "A simple 2–3 fund portfolio"
      },
      "You don't need twenty funds to build a solid investment portfolio. Many experienced investors use just two or three:",
      {
        "list": [
          "A total US stock market index fund — covers thousands of domestic companies across all sizes.",
          "A total international stock market index fund — adds exposure to developed and emerging markets outside the US.",
          "A total bond market index fund — adds stability and a counterweight to stock volatility, weighted to your age and risk tolerance."
        ]
      },
      "The split between these depends on your timeline and how much volatility you can stomach. A rough starting point for younger investors is heavier in stocks; as you approach retirement, you gradually shift more toward bonds. Many target-date retirement funds do this rebalancing automatically — they're essentially a pre-packaged version of this exact approach.",
      {
        "h": "Tax-advantaged accounts first"
      },
      "Before you invest in a taxable brokerage account, fill your tax-advantaged buckets first. Contributions to a 401(k) or 403(b) reduce your taxable income today (traditional) or grow tax-free (Roth). A Roth IRA lets your investments compound and be withdrawn in retirement without owing any tax on the gains — check current contribution limits, since they adjust periodically.",
      "The order of operations that most financial educators recommend: contribute enough to your employer's retirement plan to capture any employer match (that's an instant 50–100% return), then max out a Roth IRA if you're eligible, then return to your workplace plan, then taxable accounts if you have more to invest.",
      {
        "h": "Automate and ignore the headlines"
      },
      "The behavioral side of investing is where most people lose. They buy after markets have run up, panic-sell when markets drop, and miss the recovery. Index funds are designed for exactly the opposite approach: set up automatic contributions on a schedule (monthly, each paycheck), buy regardless of what the market is doing, and don't touch it.",
      "This strategy — called dollar-cost averaging — means you automatically buy more shares when prices are low and fewer when prices are high. You don't need to predict anything. You just need to not interfere.",
      "GetGuac's spending tracker can help you find room in your monthly budget to automate those contributions — small, consistent amounts invested early beat larger amounts invested late.",
      {
        "h": "Common mistakes"
      },
      {
        "list": [
          "Checking your portfolio balance daily and making emotional decisions based on short-term swings.",
          "Buying an active fund with a great recent track record, unaware that past outperformance is a weak predictor of future results.",
          "Investing in a taxable account before using available tax-advantaged accounts.",
          "Holding too many overlapping funds thinking it adds diversification, when a single total market fund already holds thousands of companies.",
          "Waiting for the 'right time' to invest — time in the market consistently beats timing the market."
        ]
      },
      {
        "h": "The bottom line"
      },
      "Investing doesn't have to be complicated to be effective. Pick a low-cost total market index fund (or a simple two-fund combination), put it inside a tax-advantaged account, automate your contributions, and leave it alone. The boring approach has decades of data on its side."
    ]
  },
  {
    "slug": "sinking-funds",
    "title": "Sinking funds: budget for the surprises that aren't",
    "category": "Saving",
    "excerpt": "Car registration, holiday gifts, and annual premiums aren't surprises — you just haven't saved for them yet.",
    "calc": "savings-goal",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "The problem with \"unexpected\" expenses"
      },
      "Most of the expenses that wreck a monthly budget aren't actually unexpected. Your car needs an oil change every few months. The holidays come every December. Your annual renter's insurance premium lands in October. Your kid needs new cleats in spring. None of these are surprises — they're predictable, irregular expenses that you simply haven't been saving toward month by month.",
      "When they hit, they feel like emergencies because the money isn't sitting anywhere specific. You pull from savings, reach for a credit card, or scramble to cut spending elsewhere. A sinking fund fixes this by treating irregular future expenses as regular monthly obligations.",
      {
        "h": "What a sinking fund is"
      },
      "A sinking fund is a dedicated pool of money you build up steadily to cover a known future expense. The name comes from old accounting terminology — you're 'sinking' money into a pot over time so you have it ready when the bill arrives.",
      "The math is simple: estimate what the expense will cost, divide by the number of months until you need the money, and set aside that amount each month. When the expense hits, the money is already there. No panic, no debt, no budget blowup.",
      {
        "h": "How to calculate your monthly set-aside"
      },
      "Say you spend roughly $1,200 on holiday gifts, travel, and celebrations each year. Divide by 12 months: that's $100 per month. Instead of scrambling every December, you quietly move $100 into a labeled bucket each month and arrive at the holidays fully funded.",
      "Another example: your car insurance is paid every six months at $720 per payment. Divide $720 by 6 months: $120 per month. Set that aside every month and your next premium is covered before you even get the bill.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "Turning irregular bills into a monthly line item",
          "data": [
            {
              "label": "Holidays — about $1,200 a year",
              "value": 100,
              "display": "$100 a month"
            },
            {
              "label": "Car insurance — $720 every six months",
              "value": 120,
              "display": "$120 a month"
            }
          ],
          "caption": "Estimate the cost, divide by the months until it lands, set that aside every month. When the bill arrives the money is already there."
        }
      },
      "Do this for every irregular expense you can anticipate, add up the monthly amounts, and fold that total into your budget as a fixed line item — the same way you'd treat rent or utilities.",
      {
        "h": "Common sinking fund categories"
      },
      {
        "list": [
          "Holiday gifts and celebrations (birthdays, graduations, weddings)",
          "Vacation and travel",
          "Car maintenance and registration (oil changes, tires, tabs)",
          "Home maintenance and repairs (seasonal upkeep, appliances)",
          "Annual or semi-annual insurance premiums (auto, renters, homeowners)",
          "Medical and dental expenses (annual deductibles, elective procedures)",
          "Clothing and back-to-school seasons",
          "Pet care (annual vet visits, grooming, unexpected illness)",
          "Electronics and tech replacement",
          "Professional dues, subscriptions, or license renewals"
        ]
      },
      "You don't need a sinking fund for every one of these — pick the categories where an irregular bill has stung you in the past, or where you know a significant expense is coming.",
      {
        "h": "Keep sinking funds separate from your emergency fund"
      },
      "This distinction matters. Your emergency fund is for genuinely unpredictable events — a job loss, a medical crisis, a major unexpected repair. It's insurance against the unknown. Sinking funds are for known, planned expenses that simply arrive unevenly.",
      "If you blend them together, you'll find yourself constantly raiding your emergency fund for things that were never emergencies to begin with, and you'll never build the true financial cushion that an emergency fund is meant to provide. Keep them in separate labeled accounts — many online banks let you open multiple savings buckets at no cost.",
      {
        "h": "The labeled bucket approach"
      },
      "The most practical system is to open a high-yield savings account that supports sub-accounts or buckets, and label each one by purpose: 'Car Insurance,' 'Holiday,' 'Vacation 2025,' 'Vet Fund.' Seeing named buckets with real balances makes it easy to know exactly where you stand on each goal.",
      "Automate transfers on payday. When $85 moves automatically to 'Car Maintenance' every two weeks, you stop thinking about it. The money accumulates quietly, and when your tires finally need replacing, the fund is waiting for you.",
      "GetGuac's bill tracking can help you spot which recurring annual charges are coming up so you can calibrate your sinking fund amounts before the bills hit.",
      {
        "h": "What to do when the expense is larger than the fund"
      },
      "Sometimes you'll start a sinking fund after the need has already crept closer. If your car registration is four months away and you need $400 but are only starting now, set aside $100 a month and accept that you may need to supplement from general savings this first cycle. The important thing is to start. By next year's registration, you'll be fully funded.",
      {
        "h": "Common mistakes"
      },
      {
        "list": [
          "Treating irregular expenses as true emergencies and dipping into the emergency fund to cover predictable costs.",
          "Estimating too low — holiday spending, medical costs, and home repairs almost always run higher than expected; build in a 10–15% buffer.",
          "Keeping sinking funds in your checking account where they blend with everyday spending and quietly disappear.",
          "Setting up funds for everything at once and spreading monthly savings so thin that you make no meaningful progress on anything — start with your two or three highest-impact categories."
        ]
      },
      {
        "h": "The payoff"
      },
      "Sinking funds are one of the highest-leverage changes you can make to a budget without earning a single extra dollar. They convert lumpy, stressful financial moments into calm, planned transactions. When December arrives and you have $1,200 sitting in a 'Holiday' bucket you've been filling all year, the season feels completely different — and your credit card stays in your wallet."
    ]
  },
  {
    "slug": "track-spending-with-receipts",
    "title": "Why tracking your receipts beats guessing",
    "category": "Shopping",
    "excerpt": "Your memory underestimates your spending — receipts reveal the truth.",
    "calc": "savings-goal",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "The gap between what you think you spend and what you actually spend"
      },
      "Most people, when asked to estimate their monthly spending on food, clothing, or entertainment, will give a number that is noticeably lower than the real figure. This is not dishonesty — it is just how memory works. You remember the big, deliberate purchases. You forget the Tuesday afternoon coffee run, the impulse buy at the checkout line, and the $14 app subscription that renewed quietly while you slept. Add those forgotten amounts together over a month and the gap between estimated and actual spending can easily reach hundreds of dollars.",
      "A receipt is a timestamped, itemized record of exactly what happened. It does not soften the blow or round down. That is precisely why it is more useful than your best guess.",
      {
        "h": "Why small purchases are the biggest blind spot"
      },
      "Large purchases — a laptop, a car repair, a vacation — tend to be memorable. You planned for them, or at least you noticed the sting. The real budget leaks are the transactions that feel too small to matter in the moment: a $6 smoothie, a $12 parking fee, a $9.99 monthly charge for a service you used twice.",
      "Here is a quick illustration of the math. Suppose you spend $8 on lunch out three times a week. That feels modest — it is less than the price of a movie ticket. But multiply it out: $8 × 3 × 52 = $1,248 per year. Now add a daily $4 coffee habit: $4 × 5 × 52 = $1,040. Two habits that individually feel minor have now accounted for nearly $2,300 annually. Receipts surface exactly this kind of math before it surprises you at year-end.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "Two small habits, priced by the year",
          "data": [
            {
              "label": "Lunch out — $8, three times a week",
              "value": 1248
            },
            {
              "label": "Coffee — $4, five days a week",
              "value": 1040
            },
            {
              "label": "Both, over one year",
              "value": 2288
            }
          ],
          "caption": "Two purchases that each feel too small to matter in the moment. Receipts surface this arithmetic before it surprises you at year-end."
        }
      },
      {
        "h": "How categorizing receipts changes the picture"
      },
      "Collecting receipts is step one. Categorizing them is where the insight lives. When you sort your receipts into buckets — groceries, dining out, household supplies, subscriptions, clothing, personal care — patterns emerge that feel invisible in a raw list of transactions.",
      "You might discover that your \"grocery\" spending includes a lot of prepared foods that could reasonably count as dining out. You might find that household supplies is three times larger than you imagined because of small hardware and cleaning product runs. Seeing those categories in black and white makes trade-offs feel real: if the dining-out bucket is already full, choosing to cook tonight is a concrete decision rather than an abstract intention.",
      "The awareness itself drives behavior change. Research on personal finance consistently shows that the act of tracking — even before making a single cut — reduces spending. When you know you are recording a purchase, you think twice about it. That pause is often enough.",
      {
        "h": "Common mistake: only tracking 'real' purchases"
      },
      "One of the most common errors people make when starting a receipt-tracking habit is mentally sorting transactions into 'real' and 'not worth tracking.' The logic usually goes: 'I do not need to log a $3 item, it is too small to matter.' But those are exactly the items that add up invisibly. A good system captures everything — the grocery run, the parking meter, the single item at the convenience store. If it cost money, it belongs in your record.",
      "Another frequent mistake is starting a system and abandoning it after two weeks because it feels tedious. The fix is to make the friction as low as possible. That means choosing a method you will actually sustain, even if it is imperfect.",
      {
        "h": "Building a simple, sustainable receipt system"
      },
      "You do not need an elaborate setup. What you need is consistency. Here is a starting framework:",
      {
        "list": [
          "Collect every receipt the moment you receive it — physical or digital. Do not let them pile up.",
          "At the end of each week, spend 10 minutes reviewing and categorizing what you collected.",
          "Pick five to seven spending categories that reflect your actual life, not a generic template.",
          "Once a month, total each category and compare to the previous month. Look for the biggest surprises first.",
          "After two or three months of data, set realistic targets for each category based on what you actually spent — not what you wish you had spent."
        ]
      },
      "The goal in the first month is not to cut anything. It is simply to see clearly. Trying to restrict before you understand the baseline almost always leads to frustration and giving up. Let the data teach you first.",
      {
        "h": "What to do when you spot a problem category"
      },
      "Suppose your receipt review reveals that dining out is running about 40 percent higher than you thought. Rather than vowing to never eat out again (an unsustainable promise), look for the specific driver. Is it weekend brunches? Weekday lunch pickups? Late-night delivery with fees and tips on top? Receipts will tell you. Once you know the specific pattern, you can make a targeted change — cook lunch on workdays, keep weekend dining as-is — instead of a blanket restriction that is hard to maintain.",
      "The same logic applies to any category. The receipt is not an accusation; it is information. Treat it as a diagnostic tool rather than a report card.",
      {
        "h": "Let the numbers do the work"
      },
      "Apps like GetGuac can scan your receipts automatically and score each purchase with a GuacScore, giving you an instant read on whether a buy was a good deal — so your tracking habit takes almost no manual effort.",
      "Whether you go digital or keep a simple spreadsheet, the principle is the same: real numbers beat memory every time. Your past spending is the most accurate forecast of your future spending — unless you look at it honestly and decide to change it. Receipts give you that honest look."
    ]
  },
  {
    "slug": "cancel-unused-subscriptions",
    "title": "The subscription audit that pays for itself",
    "category": "Shopping",
    "excerpt": "Free trials, forgotten apps, and duplicate streaming are draining your account every month.",
    "calc": "savings-goal",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "How subscription creep happens to everyone"
      },
      "Subscription creep is the slow accumulation of recurring charges that each seemed reasonable when you signed up but collectively eat a significant chunk of your budget. It starts innocuously: a free trial for a streaming service you wanted for one show, a fitness app you used in January, a cloud storage plan you upgraded during a file emergency, a news site whose discount period quietly expired. None of these felt like major commitments. But they renew automatically, and unless you are actively watching, they keep renewing long after you have stopped using them.",
      "The average household underestimates its monthly subscription spending by a wide margin — often by more than half — because each individual charge is small enough to scroll past on a bank statement without triggering concern. The problem is not any single charge. The problem is all of them together.",
      {
        "h": "Finding every recurring charge you have"
      },
      "The first step in any subscription audit is a complete inventory. You cannot cancel what you cannot see. Here is how to surface everything:",
      {
        "list": [
          "Pull up two to three months of bank and credit card statements and highlight every recurring charge — anything that appears more than once at a regular interval.",
          "Check your email for receipts and renewal confirmations. Search your inbox for terms like 'receipt,' 'renewal,' 'subscription,' and 'billing.'",
          "Review the subscriptions section in your Apple ID, Google Play, or PayPal account — many app subscriptions route through these platforms and do not appear on your statement with obvious names.",
          "List every service by name, monthly cost, and the last time you actually used it."
        ]
      },
      "Do not try to make keep-or-cancel decisions during this phase. Just build the list. It is common to be surprised — people routinely discover three to five services they had genuinely forgotten.",
      {
        "h": "The keep, cancel, or rotate framework"
      },
      "Once your list is complete, put each subscription into one of three buckets.",
      "Keep: you use it regularly and would miss it. The value is clear. No action needed.",
      "Cancel: you have not used it in the past month, or you use it so rarely that the cost-per-use is hard to justify. Cancel immediately — most services let you do this in two or three clicks, and you typically retain access through the end of the billing period you already paid for.",
      "Rotate: the service is worth having some of the time but not continuously. Streaming services are the classic example. You can subscribe for two months to catch a specific series, cancel, and come back later. This is entirely legitimate — companies count on inertia to keep you subscribed, so there is nothing wrong with using the service on your terms instead of theirs.",
      {
        "h": "The math that makes small fees add up fast"
      },
      "Here is a worked example that illustrates how annualizing monthly charges changes the perception of their cost.",
      "Suppose your audit turns up the following: a $7.99/month streaming service you rarely watch, a $4.99/month music tier you mostly use on a free plan anyway, a $12.99/month software subscription for a tool you stopped needing six months ago, and a $2.99/month cloud storage plan that duplicates one you already have through your phone's operating system.",
      "Monthly total: $28.96. That feels modest — less than one dinner out. But annualized: $28.96 × 12 = $347.52 per year. That is the equivalent of a round-trip domestic flight, several months of groceries for a single person, or a solid emergency fund contribution. The monthly view obscures the annual reality. Always convert monthly subscription costs to annual figures when evaluating them.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "$28.96 a month — $347.52 a year",
          "data": [
            {
              "label": "Streaming service you rarely watch",
              "value": 7.99,
              "display": "$7.99/mo",
              "note": "$95.88 a year"
            },
            {
              "label": "Music tier you mostly use free anyway",
              "value": 4.99,
              "display": "$4.99/mo",
              "note": "$59.88 a year"
            },
            {
              "label": "Software you stopped needing months ago",
              "value": 12.99,
              "display": "$12.99/mo",
              "note": "$155.88 a year"
            },
            {
              "label": "Cloud storage that duplicates your phone’s",
              "value": 2.99,
              "display": "$2.99/mo",
              "note": "$35.88 a year"
            }
          ],
          "caption": "Four charges that each feel too small to bother cancelling. Annualised, they are a round-trip domestic flight."
        }
      },
      {
        "h": "Common mistake: the 'I might use it someday' trap"
      },
      "The most common reason people keep subscriptions they should cancel is vague future intent. 'I am going to get back into that workout app.' 'I will probably want to watch that show eventually.' This reasoning is almost always more expensive than just canceling and re-subscribing when the moment actually arrives. Re-subscribing to a $10/month service costs $10. Keeping it for six months on the promise of future use costs $60. Cancel now and re-subscribe with intention later.",
      "The second common mistake is failing to set a reminder before free trials end. A 30-day free trial is free only if you cancel before day 31. Put a calendar reminder for two or three days before the trial ends, not on the day itself, so you have time to actually cancel before the charge hits.",
      {
        "h": "Calendar reminders as a renewal defense"
      },
      "Most subscriptions renew annually on a date you have probably forgotten. The best defense is a simple calendar system: the moment you sign up for any paid service, create a recurring annual reminder two weeks before the renewal date. Use that reminder as a forced check-in — do you still want this service at this price? Have you used it enough to justify another year?",
      "This small habit turns passive renewal into an active choice. Over time it fundamentally changes your relationship with subscriptions from 'things that just keep charging me' to 'services I have consciously chosen to keep.'",
      {
        "h": "Make it a quarterly habit, not a one-time event"
      },
      "A subscription audit is most powerful when it becomes a recurring practice rather than a one-time spring cleaning. Quarterly is a good cadence — enough time for new subscriptions to accumulate and for usage patterns to become clear, but not so long that charges run for a full year before you catch them.",
      "GetGuac tracks your bills and recurring charges in one place, so spotting a new subscription that slipped in is straightforward rather than a manual bank-statement hunt.",
      "Run your next audit this week. The time investment is usually under an hour, and the savings are immediate, recurring, and automatic — the subscription model working in your favor for once."
    ]
  },
  {
    "slug": "get-the-refund-youre-owed",
    "title": "How to actually get the refund you're owed",
    "category": "Shopping",
    "excerpt": "Return windows, price drops, and double charges — money is sitting there waiting to be claimed.",
    "calc": null,
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "The money most people leave behind"
      },
      "Retailers count on a certain percentage of customers never following through on refunds they are legitimately entitled to. The return sits on your counter past the deadline. You notice the price dropped a week after you bought it but assume the store will not do anything about it. You spot a double charge on your statement and tell yourself you will deal with it later — and then you do not. These small abandonments add up, and they are almost entirely avoidable with a little system and follow-through.",
      "Claiming refunds you are owed is not aggressive or unusual. It is basic financial self-advocacy, and stores have explicit policies that exist precisely to be used.",
      {
        "h": "Know your return windows before you need them"
      },
      "Every retailer has a return window — the period during which you can bring back a purchase for a full or partial refund. These windows vary dramatically: some large electronics retailers offer 15 days for certain products, while others give 30 or 90 days, and membership-based warehouse stores often have nearly unlimited return windows on electronics and no expiration on most other categories.",
      "The critical point is that the clock starts on the date of purchase, not the date you get around to opening the box. If you buy a gift in early November for a December holiday, a 30-day window has already expired before the recipient even unwraps it. Know the window before you buy, especially for gifts and high-value items, and set a reminder.",
      "Keep the original receipt. Most stores can look up purchases by credit card or account number, but having the receipt removes any friction from the process. It proves the date, the price, and the store location.",
      {
        "h": "Price adjustments: the refund nobody asks for"
      },
      "Many retailers offer post-purchase price adjustments — if the item you bought goes on sale within a certain window (often 14 to 30 days), you can receive the difference back without returning and re-purchasing the item. This policy exists at a wide range of retailers, though not all, and the window is usually shorter than the standard return window.",
      "Here is how the math works: you buy a jacket for $120. Ten days later, the same jacket is on sale for $84. A price adjustment would return $36 to you. All you need is your receipt and about five minutes at customer service or a quick chat with support online.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "A price adjustment, in one example",
          "data": [
            {
              "label": "What you paid for the jacket",
              "value": 120
            },
            {
              "label": "Its sale price ten days later",
              "value": 84
            },
            {
              "label": "Adjusted back to you",
              "value": 36,
              "note": "Receipt plus about five minutes at customer service"
            }
          ],
          "caption": "No retailer is going to email you when your recent purchase gets cheaper. You have to notice — which is the whole reason to keep the receipt."
        }
      },
      "The catch is that you have to notice the price drop and act on it. Most retailers are not going to email you to let you know your recent purchase just got cheaper. Build a habit of glancing back at significant recent purchases when you see a sale event — it takes a minute and occasionally turns into real money back.",
      {
        "h": "Warranties, recalls, and manufacturer programs"
      },
      "A category of refunds that almost nobody systematically tracks is warranty and recall reimbursements. If a product you own is recalled, the manufacturer is typically required to offer a remedy — a refund, replacement, or repair. The problem is that product recalls are announced on government websites and through retailer notifications that most consumers never see.",
      "Similarly, many products come with manufacturer warranties that cover defects for one to three years. If something stops working prematurely, contact the manufacturer directly — not just the retailer. The retailer's return window may have closed, but the manufacturer's warranty may still be active.",
      "Keep a running record, even just a note in your phone, of significant purchases along with their warranty periods and purchase dates. When something breaks, check that list before assuming you are stuck.",
      {
        "h": "Catching double charges and billing errors"
      },
      "Double charges — where the same transaction posts to your account twice — happen more often than most people realize. So do billing errors: a promotional price that did not apply correctly, a subscription that charged before the renewal date, a delivery fee that posted even though the order qualified for free shipping.",
      "Catching these requires actually reviewing your statements, at least monthly. When you spot a suspicious charge, act quickly. For credit cards, you generally have a defined window to dispute a charge — often 60 days from when it appears on a statement. Waiting too long can forfeit your right to dispute.",
      "Contacting the merchant directly is almost always faster than a credit card dispute. Explain clearly what happened, reference the date and amount, and ask for a correction. Most billing errors are resolved at this stage. The chargeback is a backstop, not a first resort.",
      {
        "h": "The credit card chargeback: last resort, but a powerful one"
      },
      "If a merchant refuses to issue a refund you are legitimately owed — for a product that never arrived, a service that was not delivered, or a charge that was unauthorized — your credit card issuer can initiate a chargeback on your behalf. This reverses the charge and puts the burden on the merchant to prove the transaction was valid.",
      "Chargebacks exist because credit cards carry liability protections that debit cards and cash do not. Using a credit card for significant purchases — and paying the balance in full each month — gives you this protection as a tool. A chargeback is appropriate for genuine disputes, not for buyer's remorse after a store's return window has closed.",
      {
        "h": "Common mistakes that cost you the refund"
      },
      {
        "list": [
          "Waiting too long: every policy has a deadline. Missing it by one day is the same as missing it by a year.",
          "Tossing the receipt: even for small purchases, receipts are your proof. No receipt often means no refund.",
          "Assuming the answer is no without asking: price adjustments, exceptions for defective items, and goodwill refunds happen regularly — but only if you ask.",
          "Using a debit card instead of a credit card for major purchases: you lose chargeback protection and sometimes purchase protection benefits."
        ]
      },
      {
        "h": "Build a simple refund-readiness habit"
      },
      "You do not need to become a coupon-clipping extreme return-policy expert. You just need a few habits: keep receipts, note return window deadlines for significant purchases, glance back at recent buys during sale events, and review your statements monthly for errors.",
      "GetGuac stores your receipts and flags open return windows so you never miss a deadline and always have proof of purchase when you need it.",
      "The refunds you are owed are sitting there. The only thing standing between you and them is a few minutes and the habit of following through."
    ]
  },
  {
    "slug": "understanding-sales-tax",
    "title": "Sales tax, explained (and why your receipt total surprises you)",
    "category": "Taxes",
    "excerpt": "The shelf price is never the final price — here is exactly why your total is always higher.",
    "calc": null,
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      {
        "h": "Why the price tag is just the starting point"
      },
      "You pick up an item marked $29.99 and hand the cashier $30, expecting change. Instead the total comes to $32.68 and you do a quick double-take. That gap is sales tax — and understanding how it works helps you budget more accurately, spot errors on receipts, and avoid surprises at checkout.",
      "Sales tax is a consumption tax collected by the seller at the point of purchase and remitted to state and local governments. It is added on top of the listed price, which is why shelf prices in the United States are almost never the final price you pay. Unlike countries that include tax in displayed prices, US retailers show the pre-tax price and add tax at the register.",
      {
        "h": "Sales tax rates vary — sometimes dramatically — by location"
      },
      "There is no single national sales tax rate in the United States. Each state sets its own base rate, and most states allow counties and cities to layer additional local taxes on top of that. This means the effective sales tax rate on a given purchase depends on exactly where the transaction takes place.",
      "Some states have no sales tax at all — you pay what the tag says, nothing more. Other states have base rates in the low single digits. Still others, when state and local rates are combined, can push effective rates close to or above 10 percent. If you regularly shop near a state or county border, it can actually be worth knowing which side charges less, especially for larger purchases.",
      "A practical example: a $500 appliance purchased where the combined rate is 5 percent costs you $525. The same appliance in a jurisdiction with a 10 percent rate costs $550. That $25 difference is real money, and it comes entirely from your zip code.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "The same $500 appliance, two zip codes",
          "data": [
            {
              "label": "Where the combined rate is 5%",
              "value": 525
            },
            {
              "label": "Where the combined rate is 10%",
              "value": 550
            }
          ],
          "caption": "A $25 difference that comes entirely from where the transaction happens. There is no single national sales tax rate in the US."
        }
      },
      {
        "h": "What is and is not taxed — exemptions that matter"
      },
      "Sales tax does not apply uniformly to everything you buy. Most states exempt or reduce the rate on certain categories, and the specifics vary by state.",
      {
        "list": [
          "Groceries: many states exempt unprepared food — raw ingredients, packaged goods — from sales tax entirely, or tax them at a reduced rate. But 'prepared food,' like a hot deli item or a restaurant meal, is usually taxable even in states that exempt groceries.",
          "Prescription medications: most states exempt prescription drugs from sales tax. Over-the-counter medications may or may not be exempt depending on the state.",
          "Clothing: a handful of states exempt clothing below a certain price threshold from sales tax.",
          "Agricultural supplies, medical equipment, and other categories: exemptions vary widely — what qualifies differs from state to state and sometimes changes based on the buyer's purpose."
        ]
      },
      "If you live in a state with grocery exemptions and you notice sales tax on a grocery receipt, it is worth a closer look. Stores occasionally miscategorize items, and a taxable prepared-food item can appear next to exempt staples on the same receipt.",
      {
        "h": "Tax-free holidays: real savings with real rules"
      },
      "Several states hold annual tax-free holidays — short windows, typically a weekend or a week, during which specific categories of goods are exempt from state sales tax. Back-to-school seasons frequently trigger these events, with exemptions covering clothing, school supplies, and sometimes computers up to a certain price threshold.",
      "Tax-free holidays can represent genuine savings if you time purchases intentionally, but they come with fine print. There are often price caps per item, specific category definitions that exclude some things you might expect to qualify, and local jurisdictions that opt out and still charge their local rate even during a state holiday. Before shifting a significant purchase to coincide with a tax-free weekend, verify the rules for your specific location and the specific items you plan to buy.",
      {
        "h": "Use tax: the obligation most people ignore"
      },
      "When you purchase something from an out-of-state retailer — online or through a catalog — and no sales tax is collected at the time of purchase, you may owe what is called use tax to your home state. Use tax is designed to level the playing field between in-state and out-of-state purchases. The rate is usually the same as your state's sales tax rate.",
      "Most individual consumers have never filed or paid use tax, and enforcement has historically been minimal. However, most states technically require you to report and pay use tax on qualifying out-of-state purchases when filing your state income tax return. Major online retailers now collect and remit sales tax in most states due to court rulings and expanded state laws, so the universe of untaxed online purchases has shrunk significantly — but it has not disappeared, particularly for smaller sellers.",
      {
        "h": "How to sanity-check the tax line on your receipt"
      },
      "You do not need to become a tax expert to verify that a receipt's tax line looks right. A quick mental check works for most purchases.",
      "Step one: note the taxable subtotal — the portion of your purchase that should be taxed. Items that are exempt (groceries, prescriptions) should not be in this number if your state exempts them.",
      "Step two: multiply the taxable subtotal by the approximate tax rate for your location. If you live in an area with roughly an 8 percent combined rate, a $40 taxable purchase should produce about $3.20 in tax. If your receipt shows $6.40 in tax on $40 of taxable goods, something is off — either the rate is wrong or items that should be exempt are being taxed.",
      "You do not need to do this for every $5 purchase. But for larger receipts or any time the total feels unexpectedly high, a 30-second spot check can catch errors that cost you real money.",
      {
        "h": "Common mistake: assuming online equals tax-free"
      },
      "This was true for a long time, but the landscape has changed substantially. Most large online retailers now collect sales tax in every state that has one, regardless of where the retailer is physically located. If you are budgeting for an online purchase and assuming no tax, verify before you commit — especially for expensive items where the tax amount is material.",
      "The second common mistake is being surprised by tax on a restaurant delivery order. Sales tax on prepared food often applies, and when added on top of delivery fees and a tip, the gap between the menu price and what you actually pay can feel significant if you have not planned for it.",
      {
        "h": "Receipts as your tax record"
      },
      "Your receipts are your proof of what you paid, including what tax was collected. This matters if you ever dispute a charge, file a return in a state that allows sales tax deductions, or simply want to understand where your money went.",
      "GetGuac itemizes the tax line on each receipt, so you can see exactly what you paid in sales tax across all your purchases — no manual adding required.",
      "Understanding sales tax will not let you avoid it, but it will help you budget more accurately, catch errors when they happen, and make intentional choices about where and when you shop."
    ]
  },
  {
    "slug": "dollar-cost-averaging",
    "title": "Dollar-cost averaging: investing without timing the market",
    "category": "Investing",
    "excerpt": "Invest the same amount on a schedule and let math, not your nerves, decide when you buy.",
    "calc": "invest-growth",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      "You have money set aside to invest, and a quiet voice in your head keeps asking the same question: is now a good time to buy? Maybe prices feel high. Maybe the news feels scary. So you wait. Then prices move, and you feel like you missed your window, or dodged a bullet, and the waiting starts all over again.",
      "Dollar-cost averaging, usually shortened to DCA, is the simple discipline that gets you out of that loop. Instead of trying to pick the perfect moment, you invest a fixed dollar amount on a regular schedule — say the same amount every payday — no matter what the market is doing that day.",
      {
        "h": "How dollar-cost averaging works"
      },
      "The clever part is built right into the dollars. When you spend a fixed amount each time, the price per share decides how many shares you get. When prices are low, your money buys more shares. When prices are high, it buys fewer. You are quietly buying more when things are cheap and less when things are expensive — the opposite of what scared investors tend to do.",
      "You never have to predict anything. You just keep the dollar amount steady and let the share count float. Over time, that pulls your average cost per share down compared with buying the same number of shares each period.",
      {
        "h": "A worked example over four bumpy months"
      },
      "Say you invest $300 on the first of each month into a fund. The price bounces around, the way real markets do:",
      {
        "list": [
          "Month 1: price $30/share. $300 buys 10 shares.",
          "Month 2: price $20/share. $300 buys 15 shares.",
          "Month 3: price $25/share. $300 buys 12 shares.",
          "Month 4: price $50/share. $300 buys 6 shares."
        ]
      },
      {
        "figure": {
          "type": "bars",
          "title": "The same $300 buys more shares when prices are low",
          "data": [
            {
              "label": "Month 1 — $30 a share",
              "value": 10,
              "display": "10 shares"
            },
            {
              "label": "Month 2 — $20 a share",
              "value": 15,
              "display": "15 shares"
            },
            {
              "label": "Month 3 — $25 a share",
              "value": 12,
              "display": "12 shares"
            },
            {
              "label": "Month 4 — $50 a share",
              "value": 6,
              "display": "6 shares"
            }
          ],
          "caption": "$1,200 invested, 43 shares, an average cost of $27.91 a share — below the $31.25 simple average of the four prices you actually saw."
        }
      },
      "Over four months you invested $1,200 total and ended up with 43 shares. Your average cost per share is $1,200 divided by 43, which is about $27.91.",
      "Now compare that with the simple average of the four prices: $30, $20, $25 and $50 average out to $31.25. Your actual cost — $27.91 — came in lower. That gap is the quiet benefit of DCA. Because your fixed dollars scooped up extra shares in the cheap months and fewer in the pricey month, your blended price landed below the plain average of the prices you saw.",
      "It is not magic, and it does not guarantee a profit. But it does mean your worst enemy — the urge to buy big right before a drop — has a lot less room to hurt you.",
      {
        "h": "Time in the market beats timing the market"
      },
      "There is an old line among long-term investors: time in the market beats timing the market. The point is that staying invested across many years tends to matter far more than nailing the entry day. Markets have historically trended upward over long stretches, with plenty of ugly dips along the way. Money that sits on the sidelines waiting for the all-clear misses the recoveries, which often come fast and without warning.",
      "DCA keeps you in. By committing to invest on a schedule, you stay invested through the scary stretches — which, in hindsight, are usually the most valuable times to be buying. You trade the fantasy of a perfect entry for the reliability of always showing up.",
      {
        "h": "Lump sum vs. DCA: the honest nuance"
      },
      "Here is a fair point you will hear: if you already have a big pile of cash sitting around, investing it all at once — a lump sum — has often, on average, beaten spreading it out. That is because markets rise more often than they fall, so money invested earlier simply has more time to grow.",
      "So why does anyone DCA a windfall? Because averages are cold comfort the day after you put everything in and the market drops. DCA over a few months can lower the odds of that gut-punch scenario, and that emotional protection is worth real money if it stops you from panic-selling at the bottom.",
      "A useful way to think about it: most people are not choosing between lump sum and DCA at all. They are investing money as they earn it — a slice of every paycheck. That is dollar-cost averaging by default, and it is a perfectly good way to build wealth. The lump-sum debate only applies when you happen to be holding a large sum all at once, like a bonus or an inheritance.",
      {
        "h": "Common mistakes to avoid"
      },
      "Two traps catch people who think they are dollar-cost averaging:",
      {
        "list": [
          "Pausing when it gets scary. The whole point is to keep buying through the dips, because those are the cheap-share months. Skipping your contribution during a downturn quietly cancels the main benefit.",
          "Letting fees and taxes eat the edge. Tiny per-trade commissions barely matter today, but funds with high expense ratios drag on you every single year. Inside a regular brokerage account, frequent buying can also create more taxable record-keeping. Favor low-cost, broadly diversified funds and let them compound."
        ]
      },
      {
        "h": "What to do this week"
      },
      "Pick one number you can invest comfortably every payday, and automate it. Most brokerages and retirement plans let you set a recurring transfer and a recurring buy, so the money moves before you can talk yourself out of it. Automating it removes the timing decision entirely — there is no day to second-guess, because the schedule already decided.",
      "Then leave it alone. Check in a couple of times a year, not a couple of times a day. If you want to see how a steady monthly amount might grow over the years, run your number through an investment growth calculator before you start, so the long game feels real instead of abstract.",
      "Dollar-cost averaging will not make you the person who bought at the exact bottom. It will make you the person who kept buying, stayed invested, and let time do the heavy lifting — which, for most of us, is the version that actually ends up ahead. This is general education, not personalized financial advice."
    ]
  },
  {
    "slug": "good-debt-vs-bad-debt",
    "title": "Good debt vs. bad debt: how to tell the difference",
    "category": "Debt",
    "excerpt": "Not all debt is created equal — the interest rate and what the money buys tell you which kind you have.",
    "calc": "dti",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      "Debt has a bad reputation, and a lot of it is earned. But lumping all borrowing together is like calling every knife dangerous — true in a sense, useless in practice. Some debt quietly builds your future. Some debt slowly drains it. Learning to tell them apart is one of the most valuable money skills you can pick up.",
      "The good news is that you do not need a finance degree to sort one from the other. Two questions do most of the work: what is the interest rate, and what is the money actually buying?",
      {
        "h": "What makes debt good"
      },
      "Good debt generally helps you own something that grows in value or earns you income over time, and it usually comes at a reasonable interest rate. The borrowed money is buying you a future that is worth more than the cost of the loan.",
      "A mortgage is the classic example. You borrow to buy a home, the home can build equity, and the rate is typically far lower than other kinds of borrowing because the house backs the loan. Reasonable student loans can qualify too, when the education plausibly raises your lifetime earnings by more than you borrowed. A sensible business loan that funds equipment or inventory which then generates revenue can be good debt as well.",
      "Notice the word reasonable keeps showing up. Good debt stops being good when the amount gets out of proportion to what you will get back. A student loan that funds a credential which doubles your salary is very different from one several times larger than the job it leads to ever pays.",
      {
        "h": "What makes debt bad"
      },
      "Bad debt usually charges a high interest rate and buys something that loses value or gets used up. You are paying a premium to own something that is worth less tomorrow than today, or that is gone entirely by the time the bill arrives.",
      "The usual suspects:",
      {
        "list": [
          "Credit-card balances carried month to month, where the rate is often steep and the purchases are frequently everyday spending you have already consumed.",
          "Payday loans and similar short-term cash advances, where the effective cost can be extraordinarily high once you annualize the fees.",
          "Financing a rapidly depreciating purchase you cannot really afford, where you still owe money long after the thing has lost most of its value.",
          "High-rate buy-now-pay-later balances that quietly stack up across several purchases at once."
        ]
      },
      "The pattern is consistent: high cost to borrow, plus an asset that fades. That combination is how people end up paying for things many times over.",
      {
        "h": "The two-question test"
      },
      "Put any debt through this and you will usually get a clear answer.",
      "First, what is the rate? Roughly speaking, low single-digit and modest single-digit rates are the territory of good debt; rates that climb well into the double digits are a flashing warning sign. The higher the rate, the faster the debt works against you and the harder the asset has to work to be worth it.",
      "Second, what does the money buy? If it buys an asset that tends to hold or grow in value, or that raises your income, you are likely on the good side. If it buys something that depreciates fast or gets consumed, you are likely on the bad side — and a high rate on top makes it worse.",
      "Plenty of real debts land in a gray zone, and that is fine. A car loan, for instance, finances a depreciating asset but at a moderate rate, and a reliable car may be what lets you earn a living. The test does not give you a verdict so much as a clear-eyed read on what you are signing up for.",
      {
        "h": "Debt-to-income: your guardrail"
      },
      "Even good debt becomes a problem if there is too much of it. The simplest guardrail is your debt-to-income ratio, or DTI: the share of your monthly gross income that goes to debt payments.",
      "Work it out by adding up your required monthly debt payments and dividing by your gross monthly income. Suppose your payments look like this: $1,200 mortgage, $250 student loan, $300 car loan, and $150 in minimum credit-card payments. That is $1,900 in monthly debt payments. If your gross monthly income is $6,000, your DTI is $1,900 divided by $6,000, which is about 0.317 — roughly 32%.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "A debt-to-income ratio, worked out",
          "data": [
            {
              "label": "Mortgage",
              "value": 1200
            },
            {
              "label": "Car loan",
              "value": 300
            },
            {
              "label": "Student loan",
              "value": 250
            },
            {
              "label": "Credit-card minimums",
              "value": 150
            }
          ],
          "caption": "$1,900 of required monthly payments against $6,000 of gross monthly income is a DTI of about 32% — committed before a single grocery run. Lower is safer."
        }
      },
      "Lenders watch this number because it signals how stretched you are, and you should watch it for the same reason. As a rough rule of thumb, lower is safer, and once a large chunk of your income is committed to debt before you have bought a single grocery run, you have little room for a surprise. Running your own DTI through a calculator a couple of times a year keeps the number honest.",
      {
        "h": "Questions to ask before you borrow"
      },
      "Before taking on any new debt, slow down and run through a short checklist:",
      {
        "list": [
          "What is the interest rate, and what will this actually cost me over the full life of the loan, not just per month?",
          "Is the money buying something that builds value or income — or something that fades?",
          "Could I cover the payment if my income dropped for a few months?",
          "What does this do to my debt-to-income ratio?",
          "Is there a cheaper way to get the same result — saving up, buying used, or waiting?",
          "Am I solving a real need, or financing a want I would skip if I had to pay cash?"
        ]
      },
      {
        "h": "The mistakes that trip people up"
      },
      "One common mistake is treating a low monthly payment as proof a debt is affordable. Stretching a loan over a long term shrinks the payment but quietly balloons the total interest you pay. Always look at the full cost, not just the monthly line.",
      "The other big mistake is letting good-debt logic justify bad-debt behavior — telling yourself a high-rate balance is fine because the purchase felt like an investment. If the rate is high and the thing fades, it is bad debt no matter how you frame it.",
      "Your takeaway is simple. Borrow when the rate is reasonable and the money buys a future worth more than the loan, keep an eye on your DTI so even good debt stays in proportion, and treat high-rate borrowing for fading things as the trap it usually is. Tracking your spending and bills in one place — something a tool like GetGuac can help with — makes it far easier to see your real obligations before you add another. None of this is personalized advice; it is a framework to help you think clearly before you sign."
    ]
  },
  {
    "slug": "high-yield-savings",
    "title": "High-yield savings: stop leaving money on the table",
    "category": "Saving",
    "excerpt": "The cash in your big-bank savings account may be earning almost nothing — and the fix takes one afternoon.",
    "calc": "emergency",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      "There is a decent chance you are losing money right now without doing anything wrong. Not in a risky bet — in your savings account. Many large banks pay a savings rate so close to zero that your balance barely grows, while accounts that pay far more sit one transfer away. The cash is the same. The only difference is where it lives.",
      "A high-yield savings account, or HYSA, is a regular savings account that simply pays a much higher annual percentage yield, or APY — the yearly rate your money earns, including the effect of compounding. They are usually offered by online banks and credit unions that skip expensive branch networks and pass the savings on as interest.",
      {
        "h": "The gap is bigger than it sounds"
      },
      "The difference between a typical big-bank savings rate and a competitive high-yield rate is not a rounding error. It can be the difference between earning a few dollars a year and earning real money on the same balance. Rates everywhere move up and down over time, so chasing an exact number is pointless — but the gap between sleepy accounts and competitive ones tends to persist, because the sleepy accounts are counting on you not to notice.",
      "Here is the part worth sitting with: the safety is the same. Which brings us to the most important word in this whole topic.",
      {
        "h": "FDIC insurance: why your money is safe"
      },
      "FDIC insurance is the federal protection that backs deposits at insured banks, up to a generous per-depositor limit, if the bank fails. Credit unions have an equivalent through the NCUA. The key point is that a smaller online bank offering a high yield is not riskier than a household-name bank, as long as it is FDIC- or NCUA-insured. Your money carries the same government backing either way.",
      "So before you open anything, confirm the bank is FDIC-insured (or the credit union is NCUA-insured). If it is, your deposits up to the limit are protected no matter how unfamiliar the name on the app is. That single check is what lets you reach for a better rate without taking on more risk.",
      {
        "h": "What an HYSA is good for"
      },
      "A high-yield savings account shines for money you want to keep safe and reachable, but still want working a little:",
      {
        "list": [
          "Your emergency fund — the cash that covers several months of essential expenses if your income stops.",
          "Sinking funds — money you set aside on purpose for known future costs like a car repair, holidays, or annual insurance.",
          "Short-term goals — a down payment, a wedding, a big trip you are saving toward over months, not decades."
        ]
      },
      "In all of these, the job of the money is to be there when you need it, not to maximize growth. An HYSA gives you safety, easy access, and a respectable yield at the same time.",
      {
        "h": "What an HYSA is not for"
      },
      "An HYSA is the wrong home for long-term growth money. Over many years, the interest a savings account pays tends to roughly keep pace with or slightly lag rising prices, which means it preserves your money more than it grows it. Money you will not touch for a decade or more — retirement, a young child's eventual college — generally belongs in diversified, longer-term investments that have historically grown faster, even though they bounce around in the short run.",
      "Think of it as the right tool for the right job. Cash you might need soon goes in an HYSA. Money meant to grow for the distant future goes somewhere with more growth potential and more short-term ups and downs.",
      {
        "h": "A worked example"
      },
      "Say you keep $5,000 in savings. In a big-bank account paying a near-zero rate — call it about 0.01% APY — you would earn roughly fifty cents over a year. Not five dollars. Fifty cents.",
      "Move that same $5,000 to an HYSA paying, say, around 4% APY, and you would earn roughly $200 over a year — about $5,000 times 0.04. Same money, same safety (assuming both are insured), same easy access. The only thing you changed was the account.",
      {
        "figure": {
          "type": "bars",
          "format": "usd",
          "title": "One year of interest on the same $5,000",
          "data": [
            {
              "label": "Big-bank savings, about 0.01% APY",
              "value": 0.5,
              "display": "about $0.50"
            },
            {
              "label": "High-yield savings, about 4% APY",
              "value": 200,
              "display": "about $200"
            }
          ],
          "caption": "Same money, same FDIC protection, same easy access — the only thing that changed is the account. At a $15,000 balance the gap is roughly $600 a year against about a dollar fifty. Rates move, but the gap between sleepy and competitive accounts tends to persist."
        }
      },
      "Now stretch it. If your emergency fund grows toward $15,000, that gap widens to roughly $600 a year versus about a dollar and a half. The bigger your safe-money balance, the more the choice of account matters — and the more the do-nothing option quietly costs you.",
      {
        "h": "Watch for teaser rates and fees"
      },
      "Two things can dull the shine, so read before you commit.",
      "Teaser rates are temporary promotional yields that look great for a few months, then quietly drop to something ordinary. A real high-yield account pays a competitive rate as its standard rate, not as a limited-time hook. Check whether the advertised APY is the ongoing rate or a short introductory one, and whether it requires hoops like a minimum balance or a set number of monthly transactions.",
      "Fees can also eat your interest alive. A monthly maintenance fee, a minimum-balance penalty, or excess-withdrawal charges can erase the very yield you switched for. The best HYSAs typically have no monthly fee and a low or no minimum. If an account's fine print is full of conditions, the higher rate may not be the deal it appears to be.",
      {
        "h": "What to do this week"
      },
      "Add up the cash sitting in low-rate checking and savings that you do not need for daily spending. Then open an FDIC-insured high-yield savings account, confirm there is no monthly fee and that the rate is a standard rate rather than a teaser, and move the money over. Keep a small buffer in your everyday checking for bills, and let the rest earn its keep.",
      "A common mistake is treating this as a one-time chore and never looking again. Rates drift, and an account that was competitive a couple of years ago can quietly fall behind. A quick check once or twice a year is enough to make sure your safe money is still being paid fairly. Another mistake is keeping far too much in savings — money you genuinely will not need for many years is usually better off invested for growth.",
      "Sizing your emergency fund first makes all of this concrete: figure out how many months of essential expenses you want to cover, run the number through an emergency-fund calculator, and park exactly that in your new HYSA. The rest of the work is just letting a safer, higher rate do something your old account never did. This is general education, not personalized financial advice."
    ]
  },
  {
    "slug": "grocery-budget-that-sticks",
    "title": "A grocery budget that actually sticks",
    "category": "Shopping",
    "excerpt": "Set your grocery number from your real receipts, not a hopeful guess, and it finally holds.",
    "calc": "savings-goal",
    "readMins": 6,
    "updated": "2026-06-30",
    "body": [
      "Groceries are sneaky. Rent is fixed, your car payment is fixed, but food is the big flexible expense that quietly expands to fill whatever room you give it. For most households it is the largest line you actually control day to day — which makes it the best place to find real money without feeling deprived.",
      "The reason most grocery budgets fail is not weak willpower. It is that they start from a number someone wished were true instead of a number that reflects how they actually eat. Fix the starting point, and the budget suddenly has a chance.",
      {
        "h": "Start from your receipts, not a guess"
      },
      "Before you set a target, find out what you really spend. Pull the last several weeks of grocery receipts and add them up. Not what you think you spend — what the register actually rang up, including the impulse items and the mid-week top-up runs that never make it into people's mental math.",
      "That real number is almost always higher than the guess, and that is the point. A budget built on your honest baseline is one you can actually hit. A budget built on a fantasy collapses the first normal week and takes your motivation with it. Once you know the true figure, you can decide on a realistic target — often a modest trim from the baseline, not a dramatic cut you will resent by Thursday.",
      {
        "h": "Break the number down so it's usable"
      },
      "A monthly grocery number is hard to feel. A weekly number is easy. Divide your monthly target by about 4.3 — the rough number of weeks in a month — to get a weekly figure you can check against as you shop.",
      "Say your honest baseline came to about $900 a month for a household of three, and you set a target of $800. Divide $800 by 4.3 and you get roughly $186 a week. Now go one level deeper. If your household eats around 21 dinners a week between everyone, that is about $186 divided by 21, or roughly $8.85 per person-dinner — and that is before breakfasts, lunches, and snacks. Suddenly the abstract budget becomes a concrete question at the shelf: does this cart fit a week that costs about $186?",
      {
        "figure": {
          "type": "steps",
          "title": "From receipts to a number you can shop against",
          "data": [
            {
              "label": "Add up your real receipts",
              "note": "A household of three finds a baseline of about $900 a month — almost always higher than the guess."
            },
            {
              "label": "Set a target just below it",
              "note": "$800, not $600. A fantasy number collapses in the first normal week and takes your motivation with it."
            },
            {
              "label": "Divide by 4.3 weeks",
              "note": "$800 ÷ 4.3 ≈ $186 a week — a number you can hold a cart up against."
            },
            {
              "label": "Go one level deeper",
              "note": "$186 ÷ 21 dinners ≈ $8.85 per person-dinner, and that is before breakfasts, lunches and snacks."
            }
          ],
          "caption": "The maths only has to be done once. It recalibrates what a reasonable cart looks like, and that instinct does the work from then on."
        }
      },
      "You do not have to track every meal forever. Doing this math once recalibrates your sense of what a reasonable cart looks like, and that instinct does the work going forward.",
      {
        "h": "Learn to read the unit price"
      },
      "The shelf tag usually shows two numbers: the total price, and the unit price — the cost per ounce, per pound, or per item. The unit price is the one that tells the truth, because it lets you compare a big package against a small one fairly.",
      "The bigger size is not automatically cheaper, and the brand you assume is the bargain is not always winning. A quick example: a 32-ounce jar at $4.00 is 12.5 cents per ounce, while a 48-ounce jar at $5.40 is 11.25 cents per ounce — so the big jar wins, but only by a little, and only if you will actually use it before it goes bad. Sometimes the smaller package, or a different brand, has the lower unit price. Train your eye on that small number and you will catch deals that the big bold price tag is trying to hide.",
      {
        "h": "Don't fall for shrinkflation"
      },
      "Shrinkflation is when the price stays the same but the package quietly gets smaller — fewer ounces, fewer sheets, fewer chips in the bag. Because the sticker price did not move, it does not feel like a price increase, but your cost per ounce just went up.",
      "This is exactly why the unit price matters so much. A product that used to be a good deal can slip below the bar without changing its price tag at all. Glancing at cost per ounce instead of the headline price is the single best defense — it catches a shrinking package the moment the math changes, no matter what the front of the box says.",
      {
        "h": "High-impact habits that do the heavy lifting"
      },
      "You do not need a dozen rules. A short list of habits captures most of the savings:",
      {
        "list": [
          "Shop from a list built around a rough plan for the week, and stick to it. The list is what stands between you and the impulse aisles.",
          "Shop your pantry and freezer first. Build a few meals around what you already own before you buy more, so food gets eaten instead of expired.",
          "Default to store brands. For staples like canned goods, dairy, and basic dry goods, the store brand is frequently the same quality at a noticeably lower unit price.",
          "Eat before you shop. A full stomach is a surprisingly effective budgeting tool against impulse buys.",
          "Check the unit price on anything you buy regularly, so shrinkflation and fake bargains do not slip past you."
        ]
      },
      "Notice what is not on the list: extreme couponing, ten separate store trips, or cutting out everything you enjoy. Sustainable beats heroic. A few steady habits you keep will outperform a strict system you abandon.",
      {
        "h": "What to do this week"
      },
      "Total up your recent grocery receipts to find your real baseline, set a target a little below it, and convert that target into a weekly number you can actually shop against. Keeping the receipts in one place makes this painless — GetGuac scans your grocery receipts to track exactly what you spend and can flag where a better price exists, so your baseline and your target stay honest without manual tallying.",
      "Then watch for the two classic mistakes. The first is setting the number too low out of optimism, blowing it in week one, and giving up — start realistic and tighten gradually. The second is judging your week by the total at the register while ignoring unit prices, which lets shrinkflation and oversized packages erode your budget even when the total looks fine.",
      "If you are trimming groceries to free up money for something specific — a debt payoff, a trip, a cushion — name that goal and run it through a savings-goal calculator so the sacrifice has a face. It is a lot easier to skip the impulse cart when you can see the thing your restraint is buying. This is general guidance, not personalized financial advice."
    ]
  },
  {
    "slug": "how-long-to-keep-receipts",
    "title": "How long should you actually keep a receipt?",
    "category": "Receipts",
    "excerpt": "Most receipts can go in a month. A few you should keep for seven years — and a handful until you sell the house.",
    "calc": null,
    "updated": "2026-07-30",
    "body": [
      "Almost everyone handles receipts one of two ways: throw them all out immediately and occasionally regret it, or keep every single one in a drawer that becomes archaeologically interesting and practically useless. Neither is a system. The useful version is knowing that receipts fall into a handful of tiers, and each tier has a different answer.",
      "Here is the framework, from shortest to longest.",
      {
        "h": "Tier 1: until the transaction clears — a few days"
      },
      "The shortest-lived receipt is one for a routine purchase you have no intention of returning. Its only job is to let you check the charge against your bank or card statement. Once the transaction has posted and the amount matches, that receipt has done everything it will ever do.",
      "This is most of what comes out of a register: coffee, petrol, a sandwich, a bag of groceries you have already eaten. Verify and discard. The trap is not throwing these away — it is keeping them, because a drawer full of them is what makes people stop sorting receipts entirely.",
      {
        "h": "Tier 2: until the return window closes"
      },
      "Anything you might return, exchange, or be unhappy with needs its receipt until the retailer’s return window has expired. That is usually somewhere between two weeks and three months depending on the store and the product category, and the clock almost always starts on the purchase date rather than the day you opened the box.",
      "Two specific cases catch people out. Gifts bought early — a November purchase for a December holiday can be outside a 30-day window before it is ever unwrapped. And anything you bought but have not yet used: the unopened printer, the shoes still in the box, the appliance waiting for a free weekend. Those are precisely the items whose window quietly expires while you are not paying attention.",
      {
        "h": "Tier 3: for the life of the warranty"
      },
      "If a product carries a manufacturer warranty, the receipt is what proves the purchase date the warranty runs from. Keep it as long as the coverage lasts — commonly one to three years for electronics and appliances, sometimes much longer for tools, mattresses and building materials.",
      "This is the tier people lose the most money on. When a two-year-old appliance dies, the retailer’s return window closed long ago, but the manufacturer’s warranty may well be live. Without a dated proof of purchase, that claim gets much harder. A receipt you kept costs nothing; a warranty claim you cannot make costs the price of a replacement.",
      {
        "h": "Tier 4: three to seven years — anything with tax consequences"
      },
      "Records that support something on a tax return live on a much longer clock. The general rule in the US is that the IRS can examine a return for three years after you file it. That window extends to six years if you substantially under-report income, and there is no time limit at all on an unfiled or fraudulent return. Some categories, such as claims relating to bad debts or worthless securities, carry a seven-year rule.",
      "Because the exact rules depend on your situation and do change, treat these as orientation rather than gospel and check current IRS guidance — or ask a tax professional — for anything material. The practical upshot for most people is simple: if a receipt supports a number you put on a tax return, keep it for at least three years after filing, and seven if you want to be comfortable rather than merely compliant.",
      {
        "h": "Tier 5: until you sell the asset, plus a few years"
      },
      "A small category of receipts should outlive almost everything else in your filing system: records of money spent improving a property or acquiring a significant asset.",
      "If you own a home, the cost of capital improvements — a new roof, an addition, a renovated kitchen — can matter when you eventually sell, because those costs may adjust the basis used to work out any gain. That means a receipt from a kitchen renovation could still be relevant fifteen or twenty years later. Routine repairs generally do not count the same way, but the distinction is exactly why keeping the paperwork is worth it: you want the option to make the case.",
      "The same logic applies to major purchases you might one day sell, insure, or claim: keep the proof of what you paid and when.",
      {
        "h": "The one-glance version"
      },
      {
        "list": [
          "Routine everyday purchase → discard once the charge clears your statement.",
          "Anything returnable → keep until the return window closes; note the deadline for gifts and unopened items.",
          "Anything under warranty → keep for the full warranty period, not the return period.",
          "Anything that supports a tax return → at least three years after filing; seven is the comfortable answer.",
          "Home improvements and major assets → until you sell, plus a few years after.",
          "Business expenses if you are self-employed → treat every one as tier 4 by default."
        ]
      },
      {
        "figure": {
          "type": "bars",
          "title": "The five tiers, by how long they last",
          "data": [
            {
              "label": "Routine purchase — verify against your statement",
              "value": 0.2,
              "display": "days"
            },
            {
              "label": "Anything returnable",
              "value": 3,
              "display": "2 weeks to 3 months"
            },
            {
              "label": "Anything under warranty",
              "value": 36,
              "display": "1 to 3 years"
            },
            {
              "label": "Anything supporting a tax return",
              "value": 84,
              "display": "3 to 7 years"
            },
            {
              "label": "Home improvements & major assets",
              "value": 240,
              "display": "until you sell"
            }
          ],
          "caption": "Roughly to scale in months. Almost everything that comes out of a till is the top bar — which is why a keep-everything drawer buries the few that are not."
        }
      },
      {
        "h": "Why \"keep everything\" fails in practice"
      },
      "The instinct after reading a list like that is to keep everything forever and stop thinking about it. It sounds safe, and it is why so many households have a shoebox. The problem is that an undifferentiated pile is functionally the same as having nothing: when the appliance breaks, you will not find the receipt in it, and you know that, so you will not even look.",
      "A pile also has a physical failure mode. Most register receipts are printed on thermal paper, which fades. Heat, sunlight and time turn them blank — sometimes within months. A faded receipt in a shoebox is not a record, and it is worth knowing that the tier-3 and tier-4 receipts, the ones that matter most, are usually exactly the ones you need to still be legible years from now.",
      {
        "h": "The habit that makes it work"
      },
      "You do not need an elaborate filing system. You need a decision made once, at the moment the receipt enters your life, rather than deferred to a future sorting session that will not happen.",
      "When a receipt arrives, ask one question: is this ever going to matter again? For most, the answer is no and it can go as soon as the charge clears. For the minority where the answer is yes, capture it in a durable form immediately — a photo or scan, filed somewhere searchable, on the day you get it, while you still know what it was for.",
      "That is the entire system. One question at the point of entry, and a durable copy of anything that survives it.",
      {
        "h": "If you are self-employed, shift everything up a tier"
      },
      "The tiers above describe a personal filing system. Self-employment changes the calculation, because business expenses are deducted in working out profit rather than itemised on the personal side — which means they matter regardless of how you file personally.",
      "In practice that means the default answer for a business purchase is tier 4, not tier 1. The coffee you bought for yourself is a receipt you can discard once the charge clears; the same coffee bought while meeting a client is a record with a multi-year life. The receipt looks identical. What changed is the purpose, and the purpose is the thing you will not remember in eighteen months.",
      "This is the argument for noting the reason on a business receipt at the moment you get it. A few words — what it was for, who was there — takes seconds and converts an ambiguous piece of paper into a record that stands on its own. Doing it later never happens, and reconstructing it at year end is exactly the position you are trying to avoid.",
      "GetGuac scans your receipts and keeps them searchable by store, date and amount, so the tier-3 and tier-4 receipts are still findable years later even after the paper has faded to nothing."
    ]
  },
  {
    "slug": "find-receipts-in-your-email",
    "title": "Every receipt you own is probably already in your email",
    "category": "Receipts",
    "excerpt": "Order confirmations, renewals and e-receipts pile up in your inbox. Here is how to find them all in one sitting.",
    "calc": null,
    "updated": "2026-07-30",
    "body": [
      "People spend a surprising amount of effort building a receipt-tracking habit from scratch while sitting on top of a nearly complete archive they have been accumulating for years. Almost every online order, every subscription renewal, every airline booking, and an increasing share of in-store purchases arrive as email. The record already exists. It is just unsorted.",
      "The work is not collection. It is retrieval.",
      {
        "h": "Why the inbox beats the shoebox"
      },
      "An email receipt has three advantages over paper that are easy to overlook. It is dated and timestamped by the mail server rather than by a fading thermal print. It is searchable by merchant, amount and text. And it is already backed up by your mail provider, which means it survives a house move, a flood, or the drawer being tidied by someone else.",
      "The one thing it is not is organised. Receipts sit interleaved with newsletters, shipping notifications, marketing and everything else, which is why most people believe they do not have the record when in fact they do.",
      {
        "h": "The searches that surface almost everything"
      },
      "Rather than scrolling, run a series of targeted searches. In Gmail these operators work in the main search box; Outlook, Apple Mail and most other clients have close equivalents.",
      {
        "list": [
          "Search the obvious words first: receipt, invoice, order confirmation, your order, payment received, renewal, subscription.",
          "Search by sender domain when you know the merchant — in Gmail, from:amazon.com or from:apple.com pulls everything from one company at once.",
          "Search by amount. Most receipts contain the total as text, so searching for a specific figure often finds a transaction you can only half remember.",
          "Search for attachments — in Gmail, has:attachment invoice — because many business and service receipts arrive as a PDF rather than in the message body.",
          "Bound it by date when you are reconstructing a period: in Gmail, after:2026/01/01 before:2026/04/01 combined with any of the above.",
          "Search for the words that appear on renewals — \"your subscription will renew\", \"auto-renew\", \"payment method\" — to surface recurring charges specifically."
        ]
      },
      {
        "figure": {
          "type": "steps",
          "title": "One sitting, four passes",
          "data": [
            {
              "label": "Pass 1 — the obvious words",
              "note": "receipt, invoice, order confirmation, payment received. This alone finds most of it."
            },
            {
              "label": "Pass 2 — by merchant",
              "note": "Work down your card statement and search each recurring name by sender domain."
            },
            {
              "label": "Pass 3 — attachments",
              "note": "has:attachment plus invoice or receipt, for the PDFs the body-text searches miss."
            },
            {
              "label": "Pass 4 — the renewals",
              "note": "\"auto-renew\", \"will renew\", \"subscription\". This is the pass that finds charges you forgot you had."
            }
          ],
          "caption": "Label as you go rather than sorting afterwards — a message you have already read and not labelled is one you will not find again."
        }
      },
      {
        "h": "The merchants that never say \"receipt\""
      },
      "Keyword searching has a blind spot: plenty of companies never use the word. Confirmations arrive titled \"Thanks for your order\", \"Your booking is confirmed\", \"We’ve got your payment\", or simply the order number. Ride-hailing, food delivery and travel companies are particularly prone to this, and app-store purchases often arrive from a platform address rather than the developer you think you bought from.",
      "The fix is to work from the other direction for anything the keyword passes missed. Pull up two or three months of card statements, and for each merchant name you see, search your mail for that name specifically. Statements tell you the transaction happened; the inbox tells you what was in it.",
      {
        "h": "Label as you go, not afterwards"
      },
      "The single biggest mistake in an inbox cleanup is doing all the searching first and all the filing later. Momentum dies, and a message you have already read but not marked is one you will scroll straight past next time.",
      "Create one label — Receipts is fine — and apply it as each search result appears. If you want more structure, a small number of sub-labels by year is far more sustainable than a taxonomy by category. You are building an index, not a library.",
      "Then set up a rule or filter so future receipts label themselves. Most mail clients can match on sender or subject and apply a label automatically. Every receipt you catch with a rule is one you never have to search for again.",
      {
        "h": "Body text vs attachments"
      },
      "Two formats behave differently and it matters for retrieval. A receipt written into the body of the message is fully searchable — every line item, the total, the tax. A receipt attached as a PDF often is not, depending on your provider, which means an invoice search may miss it entirely even though it is sitting right there.",
      "This is why the attachment pass is worth running separately. For anything important that arrives as an attachment, it is worth putting the merchant and amount into the message itself — forwarding it to yourself with a descriptive subject line is a crude but effective way to make an unsearchable PDF findable.",
      {
        "h": "Reconstructing one specific period"
      },
      "The searches above are for building a general archive. There is a second, more urgent version of this task: you need every receipt from a particular window, because of an expense claim, an insurance loss, a warranty dispute or a return that has gone wrong.",
      "For that, invert the approach. Start from the card statement covering the period rather than from your inbox, because the statement is the authoritative list of what actually happened. Work down it merchant by merchant, searching your mail for each name and a date bound. Anything you cannot find in email, you know to chase from the merchant directly — most will re-send a copy from an order history if you ask.",
      "Doing it in that direction gives you something searching alone does not: certainty about what is missing. An inbox search tells you what you found. A statement tells you what you should have found.",
      {
        "h": "What to do with what you find"
      },
      "A labelled inbox is a real improvement on nothing, but it is still an inbox: subject to provider outages, account lockouts, and the fact that everything lives with one company. For the receipts that matter — warranties, anything with tax consequences, large purchases — pull a durable copy out into storage you control.",
      "The rest can happily stay where it is. The point of the exercise is not to migrate your entire mail history. It is to know what you have, make it findable, and stop rebuilding from scratch every time you need a proof of purchase.",
      {
        "h": "The recurring-charge dividend"
      },
      "One reliable side effect of doing this properly: you will find subscriptions you had forgotten. The renewal pass is the one that does it. Free trials that converted, an annual plan that quietly re-billed, a service you cancelled on the website but which kept charging through an app store.",
      "People routinely turn up several of these, and each one is money recovered for an afternoon of searching. If you do nothing else from this article, run the renewal search.",
      {
        "h": "The trade-off worth being aware of"
      },
      "Anything that reads your mail to find receipts — including your own mail provider’s built-in features — is by definition processing your correspondence. That is a real trade-off, and it is worth making deliberately rather than by default.",
      "The questions worth asking of any tool you point at an inbox: what does it read, what does it store, how long does it keep it, and can you revoke access and have the data deleted. Access granted to a mail account is broad by nature, and it is easy to grant and easy to forget.",
      "It is also worth periodically reviewing which applications currently have access to your mail account. Most providers list this in security settings, and most people find something there they authorised years ago and no longer use. Revoking stale access costs nothing and closes a door you forgot was open.",
      "GetGuac can pull receipts straight out of your email and file them automatically, which turns this from an afternoon of searching into something that keeps itself current."
    ]
  },
  {
    "slug": "digital-vs-paper-receipts",
    "title": "Digital vs paper receipts: what to keep and how",
    "category": "Receipts",
    "excerpt": "Thermal paper fades within months. Here is what to digitise, what holds up as a record, and where to put it.",
    "calc": null,
    "updated": "2026-07-30",
    "body": [
      "There is a specific and very common failure that costs people real money: they do everything right, keep the receipt for the expensive thing, file it carefully, and then discover years later that the paper is blank. Not lost. Blank.",
      "Understanding why that happens — and what to do instead — is most of what you need to know about keeping receipts in a form that will still be a record when you need one.",
      {
        "h": "Thermal paper is not an archive"
      },
      "Most register receipts are printed on thermal paper, which carries no ink. The paper is coated with a heat-sensitive layer, and the printer darkens it selectively. That is why receipts print silently and fast, and why they cost almost nothing.",
      "It is also why they fade. The same coating that responds to a print head responds to heat, sunlight, humidity and friction. A receipt left in a car, a sunny windowsill or a warm pocket can become unreadable in weeks. Even filed carefully in a drawer, thermal print degrades over months to years — and the timeline is far shorter than the warranty and tax windows the important receipts need to survive.",
      "You can usually tell what you are holding: thermal paper is smooth and slightly shiny, and scratching it with a fingernail or coin leaves a dark mark. If it does, that receipt has an expiry date whether you like it or not.",
      {
        "figure": {
          "type": "bars",
          "title": "How long the paper lasts vs how long you need it",
          "data": [
            {
              "label": "Thermal receipt in a hot car or sunlight",
              "value": 2,
              "display": "weeks to months"
            },
            {
              "label": "Thermal receipt filed in a cool dark drawer",
              "value": 24,
              "display": "months to a few years"
            },
            {
              "label": "A warranty you may need to claim on",
              "value": 36,
              "display": "up to 3 years"
            },
            {
              "label": "A receipt supporting a tax return",
              "value": 84,
              "display": "3 to 7 years"
            }
          ],
          "caption": "The gap between the bottom two bars and the top two is the whole problem. The receipts that need to last longest are printed on the medium that lasts least."
        }
      },
      {
        "h": "Does a photo actually count?"
      },
      "This is the question that stops people digitising, and the general answer is reassuring. The IRS has long accepted electronic copies of records, provided the copy is legible, complete and an accurate reproduction of the original — and it is worth reading current IRS guidance on recordkeeping, or asking a tax professional, if you are relying on this for anything material. Retailers and manufacturers vary more, but a clear photo showing the store, date, items and total is accepted for most warranty and return purposes.",
      "What gets rejected is a copy that is unreadable, cropped, or missing the parts that make it a receipt. That gives you a practical standard for every scan you take.",
      {
        "list": [
          "The whole receipt in frame, including the top with the store name and the bottom with the total and payment method.",
          "Flat and square on, not at an angle — perspective distortion is what makes line items unreadable later.",
          "Even light, no shadow across the print and no flash glare on the glossy coating.",
          "Legible at the level of individual line items, not just the total, since that is where the detail lives.",
          "Captured while the print is still crisp, which in practice means on the day you get it."
        ]
      },
      {
        "h": "The habit is the hard part"
      },
      "Everyone agrees digitising is sensible; almost nobody does it consistently, because it is framed as a task. Photographing a stack of receipts at the end of the month is genuinely tedious, and worse, by then the pile has become intimidating enough to skip entirely.",
      "The version that works is capture at the moment of transaction. Photograph the receipt while you are still standing at the counter or sitting in the car. It takes a few seconds, there is exactly one receipt to deal with, the print is at its most legible, and you still remember what the purchase was for. There is no pile, because a pile never forms.",
      "For anything that arrives by email, the work is already done — see our guide to finding receipts in your inbox. Those are already digital, already dated, and already searchable.",
      {
        "h": "Where to put them"
      },
      "A folder of undifferentiated photos on your phone is better than a fading drawer, but not by as much as you would hope, because it is not searchable. Six months later you are scrolling a camera roll looking for a small white rectangle among the holiday pictures.",
      "What makes a digital archive useful is being able to find one specific receipt without knowing when it happened. That means the store, date and amount need to be attached to the image as text — either because something read them off the receipt, or because you typed them in. The storage matters less than the index.",
      {
        "h": "Naming, if you are filing them yourself"
      },
      "If you are keeping receipts as loose files rather than in something that indexes them for you, the file name is doing all the work. A convention that holds up is date, then merchant, then amount — 2026-07-14-hardware-store-284.jpg — because it sorts chronologically on its own and tells you what the file is without opening it.",
      "The date first is the part that matters. Any other order produces a folder you have to search rather than scan. It is a small discipline that decides whether the archive is usable in three years or merely present.",
      "Wherever you put them, make sure it is backed up and not solely on the device in your pocket. A phone lost with a year of unsynced receipts on it is a worse outcome than the drawer.",
      {
        "h": "What still deserves paper"
      },
      "Digitising is the default, but a handful of documents are worth keeping physically as well: vehicle titles and major purchase agreements, anything with a wet signature, warranty certificates that are separate documents rather than register receipts, and closing documents from a property purchase.",
      "These are not thermal prints, they do not fade the same way, and the situations where you need them tend to be the situations where an original is expected. Keep them physically, and scan them too — the digital copy is what you will actually use day to day.",
      {
        "h": "One copy is not a backup"
      },
      "A digital archive fails differently from a paper one. Paper degrades gradually and visibly; digital storage tends to work perfectly right up until it does not — a lost phone, a drive failure, an account you are locked out of, a subscription that lapsed and took the files with it.",
      "For anything genuinely irreplaceable, the standard advice is worth following: more than one copy, on more than one kind of storage, with at least one of them somewhere other than your house. For most people that is satisfied by a phone that syncs to a cloud account plus an occasional export to a drive — which is not a demanding standard, but it does require doing it once.",
      "The failure mode to avoid specifically is an archive that exists only inside one application. If you cannot get your receipts out in a form you could read without that product, you have a dependency rather than an archive. Check that an export exists before you rely on anything.",
      {
        "h": "A note on handling"
      },
      "Thermal receipt paper has historically been coated with chemicals including BPA or its substitutes, and the coating can transfer onto skin from handling. Guidance on this varies by jurisdiction and continues to develop. Whatever your view of the risk, it is one more small argument for the same conclusion this article keeps reaching: photograph it, deal with the digital copy, and do not hoard the paper.",
      {
        "h": "The short version"
      },
      "Assume every thermal receipt will be blank before you need it. Capture the ones that matter on the day you get them, in a form that is legible end to end. Store them somewhere searchable and backed up. Keep paper only for the small set of documents where an original genuinely counts.",
      "GetGuac scans a receipt from your phone camera and reads the store, date, items and total off it, so the digital copy is searchable rather than just stored."
    ]
  },
  {
    "slug": "how-to-read-a-grocery-receipt",
    "title": "How to read a grocery receipt properly",
    "category": "Shopping",
    "excerpt": "Tax codes, unit prices and promo lines — your receipt says considerably more than the total.",
    "calc": "savings-goal",
    "updated": "2026-07-30",
    "body": [
      "Most people read a grocery receipt exactly once, at the bottom, to see how bad it was. Everything above that number is where the useful information lives — including, fairly often, an error in your favour that nobody is going to point out.",
      "A supermarket receipt has a consistent structure once you know what you are looking at.",
      {
        "h": "The anatomy of a receipt"
      },
      "From top to bottom, almost every grocery receipt follows the same order: store identification and address, the date and time, a transaction or terminal identifier, the line items, the subtotal, discounts, tax, the total, and finally the payment method and the last few digits of the card.",
      "The store identification and the date matter more than they look. They are what make the receipt usable for a return, a warranty, a price adjustment or an expense record. A photo that crops off the header is a photo of a list of groceries, not a receipt.",
      {
        "h": "Line items and the codes beside them"
      },
      "Each line is typically the item description, sometimes a product code, and the price. Descriptions are often brutally abbreviated to fit the paper width, which is why a receipt from three weeks ago can be genuinely cryptic.",
      "Next to the price you will usually find a single letter or symbol. This is the tax code, and it tells you how that item was treated at the till. The letters are not standardised across chains — one store’s T is another’s 1 — but the concept is universal, and most receipts print a legend at the bottom explaining them. It is worth finding that legend once for the shop you use most.",
      "The reason to care: in many US states unprepared food is exempt from sales tax or taxed at a reduced rate, while prepared food is not. That means the hot deli item and the bag of rice on the same receipt can be treated differently — and it is exactly where miscategorisation happens.",
      {
        "h": "Weighted items"
      },
      "Anything sold by weight prints differently: you will see the weight, the price per pound or kilogram, and then the extended price. Produce, meat, cheese and deli items all work this way.",
      "These lines are worth a glance because they are where genuine errors cluster. A mis-keyed product code — expensive item rung as a cheaper one or the reverse — is invisible in the total but obvious on the line. So is a weight that does not match what you actually took home.",
      {
        "figure": {
          "type": "bars",
          "title": "The number that tells the truth is the unit price",
          "data": [
            {
              "label": "32 oz jar at $4.00",
              "value": 12.5,
              "display": "12.5¢ per oz"
            },
            {
              "label": "48 oz jar at $5.40",
              "value": 11.25,
              "display": "11.25¢ per oz"
            }
          ],
          "caption": "The bigger package wins here — but only by a little, and only if you use it before it spoils. The headline price is not a reliable guide to which is cheaper."
        }
      },
      {
        "h": "Promotions and what actually came off"
      },
      "Discounts appear in several forms and they are not interchangeable. An instant markdown reduces the line price directly. A loyalty or member price shows the full price and then a separate savings line. A multi-buy offer may only apply once you have taken the qualifying quantity — and if you took two when the deal needed three, the receipt will quietly show full price.",
      "Most receipts print a total savings figure near the bottom. Treat that number sceptically. It is calculated against the store’s own reference price, which is not necessarily what you would have paid elsewhere, and it is designed to be reassuring.",
      "The check worth doing: if you deliberately bought something because it was on offer, find the discount line for it. Promotions fail to apply more often than people assume — an expired shelf tag, a loyalty account not scanned, a variant that did not qualify.",
      {
        "h": "The 30-second spot check"
      },
      "You do not need to audit every shop. For a large receipt, or any time the total feels wrong, three checks catch nearly everything.",
      {
        "list": [
          "Scan the line prices for anything that looks obviously out of place — a single item that costs more than the rest of the basket combined is usually a keying error.",
          "Confirm that every promotion you shopped for actually has a matching discount line.",
          "Sanity-check the tax: multiply the taxable subtotal by your local combined rate. At roughly 8%, a $40 taxable subtotal should produce about $3.20 of tax. If it shows twice that, either the rate is wrong or exempt items are being taxed."
        ]
      },
      "If something is off, the customer service desk will almost always correct it on the spot with the receipt in hand — which is the practical reason to check before you have left the car park.",
      {
        "h": "Voids, overrides and returns on the same receipt"
      },
      "Occasionally you will see a line with a negative amount, or a void or override marker. These are legitimate — a cashier correcting a double scan, applying a manual price, or processing a return in the same transaction.",
      "They are also worth reading, because a void that did not fully reverse leaves you paying for something twice. If a correction was made while you were at the till, confirm it appears on the printed receipt before you walk away.",
      {
        "h": "The bottom of the receipt is not decoration"
      },
      "Below the total there is usually a block most people never read, and it carries some of the most practical information on the page: the store’s return policy in summary, the transaction and register identifiers you would be asked for in a dispute, your loyalty balance or points earned, and often a survey invitation.",
      "The transaction identifiers are the part worth knowing about. If you need to query a charge weeks later, that string is what lets the retailer find your specific transaction quickly rather than searching by card and date. It is also what a customer service agent will ask for first.",
      "The printed return policy is a snapshot of the policy on the day you bought — which occasionally matters if a policy changes afterwards, and which is a reason to keep the receipt rather than just a photo of the item lines.",
      {
        "h": "What the receipt tells you over time"
      },
      "A single receipt is a transaction record. A run of them is something considerably more useful: the actual price history of the things you buy regularly.",
      "This is how you catch shrinkflation, where the price holds steady while the package quietly gets smaller. The headline price gives no signal at all; the unit price does, but only if you have something to compare it against. It is also how you find out what your real grocery baseline is, which is the only honest starting point for a grocery budget.",
      {
        "h": "Comparing two stores honestly"
      },
      "People form strong opinions about which supermarket is cheaper on very little evidence — usually a memory of one basket, or a general impression from headline prices. Receipts let you settle it properly, but only if you compare the right thing.",
      "Comparing two totals is nearly meaningless, because the baskets differ. What works is picking a handful of items you buy every week regardless of where you shop — the same milk, the same bread, the same staples — and comparing unit price for those specific lines across a few receipts from each store.",
      "That comparison is usually less dramatic than people expect, and the differences often sit in categories rather than across the whole shop: one store better on fresh produce, another on packaged goods. Which is a more useful conclusion than a blanket judgement, because it tells you what to buy where instead of just where to go.",
      "GetGuac scans grocery receipts and itemises them, so the line-item detail — including what you paid per unit last time — is there without you keeping the paper.",
      "None of this requires becoming a person who audits their shopping. It requires reading above the total occasionally, and knowing what the codes mean when you do."
    ]
  },
  {
    "slug": "return-windows-what-to-check",
    "title": "Return windows: what to check before you buy",
    "category": "Shopping",
    "excerpt": "The clock starts at purchase, not when you open the box — and gift season quietly breaks that assumption.",
    "calc": null,
    "updated": "2026-07-30",
    "body": [
      "A return policy is one of the few pieces of consumer protection that is genuinely generous, widely available, and routinely wasted. Not because people are refused, but because they turn up after the window closed — often without ever having checked what the window was.",
      "The fix is not to memorise every retailer’s policy. It is to know which variables matter and to check them at the point where checking is still useful: before you buy.",
      {
        "h": "The clock starts at purchase"
      },
      "The single most important thing to internalise is that return windows almost always run from the transaction date, not from delivery, not from when you opened the box, and certainly not from when you got round to trying the thing.",
      "This is what turns gift buying into a trap. A purchase made in early November for a December holiday can be outside a 30-day window before the recipient has unwrapped it. The same applies to anything you buy ahead — the tool for a project that slipped, the clothes for a season that has not started, the appliance waiting on a free weekend.",
      "Many retailers do extend windows for the holiday period specifically because of this, often treating purchases from some point in autumn as if they were bought in late December. That is a real and useful concession, but it is a policy that varies by retailer and by year. It is worth checking rather than assuming.",
      {
        "h": "Windows vary far more by category than by store"
      },
      "People tend to think of a retailer as having \"a\" return policy. In practice most large retailers have a general window and then a list of exceptions, and the exceptions are where the short windows live.",
      {
        "list": [
          "Electronics, and especially phones and computers, frequently carry a much shorter window than the store default — sometimes two weeks against a general month or more.",
          "Opened media, software and anything with an activation code is often non-returnable once opened, or exchange-only for an identical item.",
          "Perishables, and items with a hygiene dimension such as cosmetics, earrings and underwear, are commonly final sale.",
          "Large appliances and furniture may carry restocking fees, delivery charges that are not refunded, or a requirement that the item be in original packaging.",
          "Clearance, final-sale and open-box items are frequently excluded entirely, which is part of what makes the price low.",
          "Membership warehouse clubs sit at the other extreme, with unusually generous windows on most categories and a shorter one on electronics."
        ]
      },
      "Because these vary by retailer and change over time, the durable skill is knowing that category exceptions exist and looking for them on anything expensive — not memorising a specific number that will be out of date.",
      {
        "figure": {
          "type": "steps",
          "title": "Four things to check before an expensive purchase",
          "data": [
            {
              "label": "What is the window for this category?",
              "note": "Not the store default — electronics and opened items are routinely shorter."
            },
            {
              "label": "When does the clock start?",
              "note": "Almost always the purchase date. If it is a gift, ask whether a holiday extension applies."
            },
            {
              "label": "What proof will they want?",
              "note": "Receipt, order number, or a card lookup. A gift needs a gift receipt."
            },
            {
              "label": "Is there a price-adjustment window?",
              "note": "Usually shorter than the return window, and separate from it."
            }
          ],
          "caption": "Four questions, about a minute, and only worth doing on purchases where the answer would cost you real money."
        }
      },
      {
        "h": "What counts as proof"
      },
      "The original receipt is the cleanest path: it establishes the date, the price and the store in one document. Most large retailers can also look up a purchase from the card you paid with or an online account order history, which is a genuine safety net — but it is a courtesy that depends on their systems, not a right you can rely on.",
      "Without any proof, you are usually in the territory of store credit at the current selling price, which on a discounted item can be considerably less than you paid. That gap is the concrete cost of a lost receipt.",
      "Gifts need their own treatment. A gift receipt proves the purchase without disclosing the price, and it is the difference between a straightforward exchange and an awkward conversation. Ask for one at the till — nearly every retailer offers them and almost nobody thinks to request one.",
      {
        "h": "Price adjustments are a different clock"
      },
      "A price adjustment — getting the difference back when something you bought goes on sale shortly afterwards — is a separate policy from returns, with its own and usually shorter window.",
      "It is also the one nobody uses, because it requires you to notice. No retailer emails to say your recent purchase got cheaper. The habit that captures it: when a sale event starts, spend a minute looking back at anything significant you bought in the preceding few weeks. Most of the time there is nothing. Occasionally there is a refund sitting there for the asking.",
      {
        "h": "Online orders follow their own rules"
      },
      "Buying online adds variables that do not exist in a shop. The window may run from delivery rather than purchase, which is more generous — but it may not, and the two are worth distinguishing before you assume.",
      "Return shipping is the bigger issue. Free returns are common but not universal, and where they are not, the cost of sending something back can be a meaningful fraction of a low-value item — enough that returning it is not worth doing, which some sellers are relying on. Check before you buy anything you are genuinely unsure about.",
      "Marketplace listings are the case that catches people most often. On many large sites, a substantial share of items are sold by third parties whose return policies differ from the platform’s own, even though the buying experience looks identical. The seller name on the listing is the thing to check, and the policy shown is the seller’s, not the site’s.",
      {
        "h": "Restocking fees and condition rules"
      },
      "Some categories carry a restocking fee, typically a percentage of the price, on opened items. Others require original packaging and all accessories, which is a good argument for not immediately recycling the box on anything you are unsure about.",
      "Condition requirements are usually the practical obstacle rather than the deadline. Keeping the packaging intact for the first couple of weeks on a significant purchase costs you some cupboard space and preserves every option you have.",
      {
        "h": "Build the habit, not the encyclopedia"
      },
      "You do not need to become an expert on retail policy. Three habits capture nearly all the value.",
      "Ask about the window at the point of purchase for anything expensive, and ask specifically whether the category has its own rule. Keep the receipt somewhere you will actually find it, for at least as long as that window. And for gifts and anything you are buying ahead, note the deadline somewhere that will remind you — the window will expire while the item is still in its box, and nothing will prompt you.",
      {
        "h": "When the retailer says no"
      },
      "A closed return window is not necessarily the end of it, and it is worth knowing what remains.",
      "If the item is defective rather than unwanted, the manufacturer’s warranty is a separate route with its own, usually much longer, clock — and it is claimed from the manufacturer, not the shop. People routinely give up at the retailer without ever trying this, which is the single most commonly missed option.",
      "If a product has been recalled, the manufacturer is typically obliged to offer a remedy regardless of how long ago you bought it. Recalls are published, but almost nobody sees them, so it is worth searching for the product and the word recall before writing off something that failed early.",
      "And if a merchant simply will not honour something you are genuinely owed — goods that never arrived, a service not delivered, a charge you did not authorise — a card chargeback exists as a backstop, with its own filing deadline. It is a last resort rather than an opening move, and it is not a remedy for changing your mind after a window closed.",
      "GetGuac stores your receipts and flags open return windows, so the deadline surfaces before it passes rather than after.",
      "The refunds and exchanges you are entitled to are not hard to claim. They are just easy to miss, and they are missed at the point of buying, not at the point of returning."
    ]
  },
  {
    "slug": "receipts-at-tax-time",
    "title": "Which receipts actually matter at tax time",
    "category": "Taxes",
    "excerpt": "Most personal receipts have no tax value at all. A specific few do — and the difference is worth knowing.",
    "calc": null,
    "updated": "2026-07-30",
    "body": [
      "A lot of receipt-keeping advice is written as though every scrap of paper is a potential tax deduction. For most people filing a straightforward personal return, that is simply not true, and treating it as true produces a drawer full of documents that will never be looked at.",
      "The useful question is narrower: which receipts could actually change a number on a return? This article is general education rather than tax advice — rules change and depend heavily on your circumstances, so treat it as orientation and check current IRS guidance or a tax professional for anything that matters.",
      {
        "h": "Why most personal receipts do not matter"
      },
      "The reason is the standard deduction. Taxpayers can either take a flat standard deduction or itemise their deductible expenses, and only the larger of the two is worth taking. Since the standard deduction was substantially increased, the large majority of filers take it — which means their individual deductible expenses never appear on the return at all.",
      "If you take the standard deduction, keeping receipts for charitable donations or medical bills does nothing for your tax position. They may be worth keeping for other reasons, but not that one.",
      "So the first question is not \"which receipts should I keep\" but \"am I itemising, or could I plausibly be?\" For most people the answer settles the matter quickly.",
      {
        "h": "If you are self-employed, the rules are completely different"
      },
      "Business expenses are not itemised deductions. They are subtracted in working out business profit, and they apply whether or not you take the standard deduction on the personal side.",
      "This is the single biggest fork in the road. A freelancer, contractor, gig worker or small business owner has a genuine and ongoing reason to keep receipts that a salaried employee taking the standard deduction usually does not. If you have any self-employment income at all, treat every business purchase as a receipt worth keeping by default.",
      {
        "figure": {
          "type": "steps",
          "title": "Which fork are you on?",
          "data": [
            {
              "label": "Standard deduction, no self-employment income",
              "note": "Most filers. Personal receipts have little tax value — keep them for warranties and returns instead."
            },
            {
              "label": "Itemising deductions",
              "note": "Now the supporting receipts matter: qualifying medical costs, charitable gifts, state and local taxes, mortgage interest."
            },
            {
              "label": "Any self-employment income",
              "note": "Business expense receipts matter regardless of which deduction you take on the personal side. Keep them all."
            }
          ],
          "caption": "The fork decides almost everything. Working out which side you are on takes a minute and saves keeping documents that will never be used."
        }
      },
      {
        "h": "The categories worth keeping"
      },
      "Assuming you are itemising, self-employed, or both, these are the receipts with genuine potential relevance.",
      {
        "list": [
          "Business expenses of every kind if you are self-employed — supplies, equipment, software, professional services, business travel and meals, and a share of home office costs where you qualify.",
          "Charitable contributions, where written acknowledgement is expected above certain amounts and the rules differ for non-cash gifts.",
          "Medical and dental expenses, which are only deductible above a percentage-of-income threshold — meaning they matter in years with unusually high costs and rarely otherwise.",
          "State and local taxes paid, including in some cases sales tax on large purchases, subject to an overall cap.",
          "Mortgage interest and points, which generally arrive as a year-end statement rather than as receipts.",
          "Capital improvements to a property, which are not deducted annually but may adjust your basis when you sell.",
          "Education costs and student loan interest, where the relevant credits and deductions have their own eligibility rules.",
          "Childcare and dependent care costs, where a credit may apply."
        ]
      },
      "Note how few of these are the kind of receipt that comes out of a supermarket till. The tax-relevant pile is much smaller and much more specific than \"everything\".",
      {
        "h": "Why itemising can matter in one year and not the next"
      },
      "The standard-versus-itemised choice is made fresh every year, and some deductible expenses are at least partly within your control as to timing. That leads to a planning idea usually described as bunching: concentrating discretionary deductible spending into one year so that the itemised total clears the standard deduction, then taking the standard deduction in the following year.",
      "Charitable giving is the common example, since the timing of a gift is often flexible in a way that a medical bill is not. Two years of ordinary giving may fall below the threshold in both years and produce no benefit at all; the same total given across a single year may clear it once.",
      "Whether this is worth doing depends entirely on your numbers and your circumstances, and it is exactly the kind of question worth putting to a tax professional rather than deciding from an article. The reason it appears here is narrower: it means a year in which you might itemise is not always predictable in advance, which is an argument for keeping the qualifying receipts as you go rather than deciding in December that they would have been useful.",
      {
        "h": "What \"adequate records\" actually means"
      },
      "A receipt is only useful if it establishes what was bought, from whom, when, and for how much. A credit card statement on its own generally does not meet that bar — it shows a merchant and an amount, but not what was purchased, which is exactly the point in dispute if anyone asks.",
      "For business expenses, the purpose matters too. A restaurant receipt with no indication of who was there and why is materially weaker than the same receipt with a note on it. Writing the purpose on the receipt at the time takes seconds and is the difference between a record and a piece of paper.",
      "Electronic copies are generally acceptable provided they are legible, complete and accurate reproductions — which, given that thermal receipts fade within months, makes digitising the practical default rather than a nicety.",
      {
        "h": "Mileage and vehicle use"
      },
      "Vehicle expenses have their own substantiation rules and are a common weak point. What is generally expected is a contemporaneous log: the date, the destination, the business purpose and the distance, recorded at or near the time of the trip rather than reconstructed from memory at year end.",
      "A pile of fuel receipts is not a mileage log, and does not substitute for one. If you drive for work, the log is the record that matters, and keeping it as you go is far easier than rebuilding a year of trips in April.",
      {
        "h": "How long to keep them"
      },
      "The general rule is that the IRS can examine a return for three years after filing, extending to six years where income is substantially under-reported, with no limit at all on unfiled or fraudulent returns. Records supporting property basis should be kept until you dispose of the asset, plus the applicable period after that.",
      "The practical translation: three years minimum for anything supporting a filed return, seven if you would rather not think about it again, and effectively indefinitely for property improvement records.",
      {
        "h": "The system that actually works"
      },
      "Separate the two piles at the moment the receipt arrives, because that is the only moment you reliably know what it was for. If you are self-employed, decide business or personal on the spot. If you might itemise, decide whether this falls in one of the categories above.",
      "Then capture the tax-relevant pile digitally, with the purpose noted, on the day. Everything else follows the ordinary rules — keep it until the return window and warranty have passed, then let it go.",
      "GetGuac scans and files receipts with the store, date and total read off them, which makes the annual reconstruction considerably shorter than a shoebox does.",
      "The goal is not to keep more. It is to keep the right small subset in a form that will still be legible and findable in three years — and to stop carrying the rest around.",
      {
        "h": "The question people are actually worried about"
      },
      "Most of the anxiety around receipt-keeping is really about being asked to justify something years later, and it is worth separating that fear from the practical reality.",
      "The realistic version is not dramatic. It is usually a request for documentation supporting a specific figure — and the difference between a straightforward reply and a genuine problem is simply whether you can produce a legible record of what was bought, when, from whom, and for how much.",
      "Which is the same standard the rest of this article describes, and the reason the advice is consistent: keep the narrow set that could matter, note the purpose while you still know it, and store it somewhere it will still be readable. Done as you go it is a few seconds per receipt. Done retrospectively under a deadline it is the worst weekend of the year."
    ]
  }
]

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null
}
