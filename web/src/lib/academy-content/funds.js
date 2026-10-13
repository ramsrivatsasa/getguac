// Academy-native lessons: Funds and portfolios (7). Education only — no fund
// names or tickers; GetGuac does not recommend investments.

const Q = (q, options, answer, why) => ({ q, options, answer, why })
const U = '2026-10-01'
const NOTE = 'Education only — GetGuac does not recommend specific funds or investments.'

export const FUND_LESSONS = [
  {
    slug: 'what-is-an-etf', title: 'What an ETF is', category: 'Investing', readMins: 5, updated: U,
    excerpt: 'An exchange-traded fund holds a basket of investments and trades on an exchange like a single share.',
    body: [
      'An exchange-traded fund (ETF) is a fund that holds a basket of investments — stocks, bonds or both — and whose shares trade on an exchange throughout the day, like a single company’s stock.',
      { h: 'What you own' },
      'Buying one ETF share gives you a small slice of everything the fund holds. Many ETFs track an index, so their holdings follow a published list rather than a manager’s picks.',
      { h: 'Why people use them' },
      { list: ['Diversification in a single purchase.', 'Often low annual costs, especially for index-tracking ETFs.', 'Trading during market hours at a visible price.', 'Holdings are usually published frequently.'] },
      { h: 'What to check' },
      'Read the fund’s stated objective, expense ratio, what index or strategy it follows, how many holdings it has and the bid-ask spread. Two ETFs with similar names can hold very different things.',
      { h: 'Risks' },
      'An ETF is only as diversified as its holdings. A narrow ETF focused on one sector or theme can be as volatile as a few individual stocks. ' + NOTE,
    ],
    extras: {
      objectives: ['Explain what an ETF holds', 'List what to check before buying one', 'Recognise narrow versus broad ETFs'],
      ideas: [
        { t: 'A basket in one share', d: 'Many holdings, one trade.' },
        { t: 'Names can mislead', d: 'Read the holdings, not the title.' },
        { t: 'Costs compound too', d: 'The expense ratio is charged yearly.' },
      ],
      plan: [
        { t: 'Read the objective', d: 'What it tries to do.' },
        { t: 'Check cost and spread', d: 'Expense ratio and bid-ask.' },
        { t: 'Look at holdings', d: 'Number and concentration.' },
        { t: 'Compare with your goals', d: 'Broad or narrow.' },
      ],
      example: {
        title: 'What one share holds', intro: 'Made-up ETF with net assets of $1,000,000,000 split across 500 companies, and 20,000,000 shares.',
        head: ['Item', 'Value'],
        rows: [['Value per ETF share', '$50'], ['Number of holdings', '500'], ['Annual cost at 0.10% on $5,000', '$5']],
        takeaway: '$1,000,000,000 ÷ 20,000,000 = $50 per share; each share owns a slice of all 500 companies.',
      },
      mistakes: ['Buying on the name alone', 'Assuming every ETF is diversified', 'Ignoring trading spreads'],
      exercise: 'Find any broad ETF’s fact sheet and note its expense ratio and number of holdings.',
      apply: [{ href: '/academy/etfs-vs-mutual-funds', label: 'Lesson: ETFs vs. mutual funds', d: 'How they differ.' }],
    },
    check: {
      questions: [
        Q('An ETF share gives you…', ['One company', 'A slice of the fund’s whole basket', 'A loan', 'A guarantee'], 1, 'Many holdings in one share.'),
        Q('ETFs trade…', ['Once a year', 'On an exchange during market hours', 'Only by phone', 'Never'], 1, 'Like a single share.'),
        Q('A narrow theme ETF can be…', ['Risk-free', 'As volatile as a few stocks', 'Guaranteed', 'Tax-free'], 1, 'Diversification depends on holdings.'),
      ],
      puzzle: { q: 'You invest $12,000 in an ETF with a 0.25% expense ratio. What is the yearly cost?', answer: '$30', steps: '$12,000 × 0.0025 = $30.' },
    },
  },
  {
    slug: 'etfs-vs-mutual-funds', title: 'Index funds, mutual funds and ETFs compared', category: 'Investing', readMins: 6, updated: U,
    excerpt: '“Index fund” describes the strategy; “mutual fund” and “ETF” describe how the fund is packaged and traded.',
    body: [
      'These terms overlap, which causes confusion. “Index” describes what a fund does — track an index. “Mutual fund” and “ETF” describe the wrapper — how you buy and sell it. An index fund can be either a mutual fund or an ETF.',
      { h: 'How they trade' },
      { list: ['Mutual funds are bought and sold once a day at the net asset value (NAV) calculated after the market closes.', 'ETFs trade throughout the day at market prices, with a bid-ask spread.'] },
      { h: 'Minimums and automation' },
      'Some mutual funds have minimum initial investments but make automatic monthly purchases in exact dollar amounts easy. ETFs can be bought from one share, and many brokers now allow fractional shares.',
      { h: 'Costs and taxes' },
      'Index versions of both are often low-cost; actively managed versions usually cost more. In taxable accounts, ETFs are often more tax-efficient because of how shares are created and redeemed, though this varies by fund.',
      { h: 'Which to use' },
      'For long-term investing, the strategy and cost matter more than the wrapper. Choose what your account offers and what makes regular investing easy. ' + NOTE,
    ],
    extras: {
      objectives: ['Separate strategy (index) from wrapper (mutual fund or ETF)', 'Compare how each trades', 'Know the cost and tax differences'],
      ideas: [
        { t: 'Strategy versus wrapper', d: 'Index describes what; ETF or mutual fund describes how.' },
        { t: 'Once a day versus all day', d: 'NAV versus market price.' },
        { t: 'Cost matters most', d: 'More than the wrapper for long-term investors.' },
      ],
      plan: [
        { t: 'Check what your account offers', d: 'Workplace plans often offer mutual funds.' },
        { t: 'Compare expense ratios', d: 'Index versions are often cheaper.' },
        { t: 'Consider automation', d: 'Exact-dollar monthly purchases.' },
        { t: 'Think about taxes', d: 'In taxable accounts.' },
      ],
      example: {
        title: 'Side by side', intro: 'Typical features; individual funds differ.',
        head: ['Feature', 'Index mutual fund', 'Index ETF', 'Active mutual fund'],
        rows: [['Strategy', 'Track an index', 'Track an index', 'Manager picks'], ['When it trades', 'Once a day at NAV', 'All day', 'Once a day at NAV'], ['Typical cost', 'Low', 'Low', 'Higher'], ['Minimum', 'Sometimes', 'One share or fractional', 'Sometimes']],
        takeaway: 'An index mutual fund and an index ETF can hold the same things — the wrapper is the difference.',
      },
      mistakes: ['Thinking “index” and “ETF” mean the same thing', 'Trading ETFs frequently because you can', 'Ignoring expense ratios'],
      exercise: 'In your retirement plan, find whether each fund is index or active and note its expense ratio.',
      apply: [{ href: '/academy/index-funds', label: 'Lesson: index funds', d: 'Why low-cost index investing is popular.' }],
    },
    check: {
      questions: [
        Q('“Index fund” describes…', ['How it trades', 'Its strategy of tracking an index', 'Its tax status', 'Its broker'], 1, 'It can be a mutual fund or ETF.'),
        Q('Mutual funds trade…', ['All day', 'Once a day at NAV', 'Weekly', 'Never'], 1, 'After the market closes.'),
        Q('Often more tax-efficient in taxable accounts…', ['ETFs', 'Active mutual funds', 'Savings accounts', 'Cash'], 0, 'Due to how ETF shares are created and redeemed; varies by fund.'),
      ],
      puzzle: { q: 'Active fund costs 0.85%, index fund 0.05%. On $25,000, what is the yearly cost difference?', answer: '$200', steps: '0.85% − 0.05% = 0.80%. $25,000 × 0.008 = $200.' },
    },
  },
  {
    slug: 'sp-500-explained', title: 'The S&P 500, explained', category: 'Investing', readMins: 5, updated: U,
    excerpt: 'About 500 large US companies, weighted by size. Widely used as a benchmark — and not the whole market.',
    body: [
      'The S&P 500 is an index of about 500 large US companies, chosen by a committee using published rules on size, profitability and trading. It is widely used as a benchmark for the US stock market.',
      { h: 'How it is weighted' },
      'Companies are weighted by float-adjusted market capitalisation, so the largest companies have the most influence. A handful of very large companies can make up a substantial share of the index.',
      { h: 'What it does not include' },
      { list: ['Small and many mid-sized US companies.', 'Companies outside the US.', 'Bonds and cash.'] },
      { h: 'Why it matters to you' },
      'Many index funds track it, and many active funds are compared against it. When people say “the market”, they often mean the S&P 500.',
      { h: 'Concentration' },
      'Because of cap weighting, an S&P 500 fund can be more concentrated in its biggest holdings than “500 companies” suggests. Check a fund’s top-10 holdings to see how much they make up. ' + NOTE,
    ],
    extras: {
      objectives: ['Describe what the S&P 500 contains', 'Explain cap weighting and concentration', 'Know what the index leaves out'],
      ideas: [
        { t: 'A benchmark, not the whole market', d: 'Large US companies only.' },
        { t: 'Weighted by size', d: 'The biggest companies lead.' },
        { t: 'Check the top 10', d: 'Concentration hides in “500”.' },
      ],
      plan: [
        { t: 'Learn the index rules', d: 'Large US companies, committee chosen.' },
        { t: 'Check top holdings', d: 'Of any S&P 500 fund.' },
        { t: 'Note what is missing', d: 'Small caps, international, bonds.' },
        { t: 'Decide if you need more', d: 'For diversification.' },
      ],
      example: {
        title: 'How weighting concentrates', intro: 'Made-up mini-index of 5 companies, weighted by market cap.',
        head: ['Company', 'Market cap', 'Weight'],
        rows: [['A', '$400 billion', '40%'], ['B', '$300 billion', '30%'], ['C', '$150 billion', '15%'], ['D', '$100 billion', '10%'], ['E', '$50 billion', '5%'], ['Total', '$1 trillion', '100%']],
        takeaway: 'Two of five companies make up 70% of this index — the same effect, at larger scale, appears in real cap-weighted indexes.',
      },
      mistakes: ['Assuming the S&P 500 is the entire market', 'Ignoring concentration', 'Holding several funds that track the same index'],
      exercise: 'Look up an S&P 500 fund’s top 10 holdings and add up their weights.',
      apply: [{ href: '/academy/total-market-funds', label: 'Lesson: total market funds', d: 'Adding mid and small companies.' }],
    },
    check: {
      questions: [
        Q('The S&P 500 tracks…', ['All US companies', 'About 500 large US companies', 'Global bonds', 'Small companies'], 1, 'Large US companies chosen by rules.'),
        Q('It is weighted by…', ['Alphabetical order', 'Float-adjusted market cap', 'Age', 'Dividends'], 1, 'Bigger companies have more influence.'),
        Q('Which is not in the S&P 500?', ['Large US companies', 'International companies', 'Profitable US firms', 'Tech firms'], 1, 'It is US-only.'),
      ],
      puzzle: { q: 'In a cap-weighted index worth $2 trillion, one company is worth $140 billion. What is its weight?', answer: '7%', steps: '$140 billion ÷ $2,000 billion = 0.07.' },
    },
  },
  {
    slug: 'total-market-funds', title: 'Total market funds', category: 'Investing', readMins: 4, updated: U,
    excerpt: 'A total-market fund adds mid and small companies to the large ones — thousands of holdings in one fund.',
    body: [
      'A total US stock market fund aims to hold nearly every publicly traded US company — large, mid and small — weighted by size. It typically holds thousands of companies.',
      { h: 'How it differs from an S&P 500 fund' },
      'Because large companies dominate by size, a total-market fund and an S&P 500 fund often move similarly. The total-market fund adds exposure to mid and small companies, which make up a smaller but meaningful share.',
      { h: 'Why some investors prefer it' },
      { list: ['One fund covers the whole US market.', 'No need to decide between large, mid and small funds.', 'Index versions are often low-cost.'] },
      { h: 'What it still leaves out' },
      'A total US fund does not include international companies or bonds. Those are usually added with separate funds if wanted. ' + NOTE,
    ],
    extras: {
      objectives: ['Explain what a total-market fund holds', 'Compare it with an S&P 500 fund', 'Know what else a portfolio might need'],
      ideas: [
        { t: 'Thousands of companies, one fund', d: 'Large, mid and small.' },
        { t: 'Similar but not identical', d: 'To an S&P 500 fund.' },
        { t: 'US only', d: 'International and bonds are separate.' },
      ],
      plan: [
        { t: 'Compare holdings counts', d: 'Total market vs S&P 500.' },
        { t: 'Check small-company share', d: 'In the fund’s fact sheet.' },
        { t: 'Avoid doubling up', d: 'Both funds overlap heavily.' },
        { t: 'Decide on international and bonds', d: 'Separately.' },
      ],
      example: {
        title: 'Overlap between two funds', intro: 'Illustrative: large companies are 80% of a total-market fund by weight.',
        head: ['Fund', 'Large companies', 'Mid and small'],
        rows: [['S&P 500 fund', 'About 100%', '0%'], ['Total market fund', '80%', '20%']],
        takeaway: 'Holding both mostly duplicates the large companies; one is usually enough for US stocks.',
      },
      mistakes: ['Holding both and calling it diversification', 'Thinking total US means global', 'Ignoring costs'],
      exercise: 'If you hold two US stock funds, check how much their top holdings overlap.',
      apply: [{ href: '/academy/international-diversification', label: 'Lesson: international diversification', d: 'Beyond the US.' }],
    },
    check: {
      questions: [
        Q('A total US market fund holds…', ['Only 500 companies', 'Nearly all US public companies', 'Only bonds', 'Only small companies'], 1, 'Large, mid and small.'),
        Q('Why do total market and S&P 500 funds move similarly?', ['They hold the same bonds', 'Large companies dominate both by weight', 'Coincidence', 'They do not'], 1, 'Cap weighting.'),
        Q('A total US market fund includes international companies…', ['Yes', 'No', 'Sometimes on Fridays', 'Only in Europe'], 1, 'It is US-only.'),
      ],
      puzzle: { q: 'You hold $6,000 in a total-market fund where mid and small companies are 20%. How much is in mid and small companies?', answer: '$1,200', steps: '$6,000 × 0.2 = $1,200.' },
    },
  },
  {
    slug: 'international-diversification', title: 'International diversification', category: 'Investing', readMins: 5, updated: U,
    excerpt: 'Companies outside the US make up a large part of the world’s stock market. Owning some spreads country risk.',
    body: [
      'A portfolio of only US companies depends on one economy, one currency and one set of policies. International funds add companies from developed and emerging markets.',
      { h: 'Why add it' },
      { list: ['Different economies grow at different times.', 'Leadership between US and international markets has changed over decades.', 'It reduces dependence on any single country.'] },
      { h: 'Extra risks' },
      'International investing adds currency risk — returns change when exchange rates move — and, in some markets, political and regulatory risk. Emerging markets can be more volatile.',
      { h: 'How much' },
      'There is no single correct share. Some investors match each region’s share of global market value; others hold less. A total world fund holds both US and international companies in one fund.',
      { h: 'Check what you already own' },
      'Large US companies earn money abroad, and some target-date funds already include international stocks. Look before you add. ' + NOTE,
    ],
    extras: {
      objectives: ['Explain why investors add international stocks', 'Name currency and political risks', 'Check existing international exposure'],
      ideas: [
        { t: 'One country is a concentration', d: 'Even a large one.' },
        { t: 'Currency cuts both ways', d: 'Exchange rates add and subtract.' },
        { t: 'You may already own some', d: 'Target-date funds often include it.' },
      ],
      plan: [
        { t: 'Check current holdings', d: 'US vs international share.' },
        { t: 'Decide a target share', d: 'Write it down.' },
        { t: 'Choose broad over narrow', d: 'Regions, not single countries.' },
        { t: 'Rebalance to target', d: 'Yearly.' },
      ],
      example: {
        title: 'Checking your split', intro: 'Illustrative $20,000 portfolio.',
        head: ['Holding', 'Amount', 'US', 'International'],
        rows: [['US total market fund', '$12,000', '$12,000', '$0'], ['Target-date fund (40% international)', '$8,000', '$4,800', '$3,200'], ['Total', '$20,000', '$16,800', '$3,200']],
        takeaway: '$3,200 ÷ $20,000 = 16% international — more than none, though the target-date fund was the only source.',
      },
      mistakes: ['Assuming US-only is fully diversified', 'Betting on a single foreign country', 'Forgetting international stocks inside other funds'],
      exercise: 'Estimate the international share of your investments using each fund’s fact sheet.',
      apply: [{ href: '/academy/three-fund-portfolio', label: 'Lesson: the three-fund portfolio', d: 'Putting it together.' }],
    },
    check: {
      questions: [
        Q('International stocks add which extra risk?', ['Currency risk', 'No risk', 'Only tax risk', 'Interest-free risk'], 0, 'Exchange rates affect returns.'),
        Q('A total world fund holds…', ['Only US', 'US and international', 'Only bonds', 'Only Europe'], 1, 'Both in one fund.'),
        Q('Before adding international funds you should…', ['Check what you already own', 'Sell everything', 'Pick one country', 'Ignore it'], 0, 'Target-date funds may already include it.'),
      ],
      puzzle: { q: 'Portfolio $30,000: $21,000 US, $9,000 international. What share is international?', answer: '30%', steps: '$9,000 ÷ $30,000 = 0.3.' },
    },
  },
  {
    slug: 'sector-and-thematic-etfs', title: 'Sector and thematic funds', category: 'Investing', readMins: 4, updated: U,
    excerpt: 'Funds built around one industry or trend concentrate risk. Popular themes can already be priced in.',
    body: [
      'Sector funds hold companies in one industry, such as healthcare or energy. Thematic funds target a trend, such as a technology or demographic shift. Both are narrower than broad index funds.',
      { h: 'Why they are tempting' },
      'Themes come with exciting stories, and recent strong performance is easy to see. But by the time a theme is popular, high expectations may already be reflected in prices.',
      { h: 'The risks' },
      { list: ['Concentration: one industry’s bad year hits the whole fund.', 'Overlap: many themes hold the same large companies you may already own.', 'Costs: niche funds often charge more than broad index funds.', 'Closures: small thematic funds sometimes close.'] },
      { h: 'If you use them' },
      'Some investors keep a small, deliberate slice for interests they understand, with the core in broad funds. Decide that slice in advance and rebalance to it. ' + NOTE,
    ],
    extras: {
      objectives: ['Tell sector and thematic funds from broad funds', 'Name their main risks', 'Limit them to a deliberate slice if used'],
      ideas: [
        { t: 'Stories sell funds', d: 'Popularity can mean high prices.' },
        { t: 'Narrow means volatile', d: 'One industry, one fate.' },
        { t: 'Core and satellite', d: 'Broad core, small optional slice.' },
      ],
      plan: [
        { t: 'Check overlap', d: 'With funds you already hold.' },
        { t: 'Compare costs', d: 'Niche funds often cost more.' },
        { t: 'Set a maximum slice', d: 'In writing.' },
        { t: 'Rebalance', d: 'Trim if it grows past the slice.' },
      ],
      example: {
        title: 'A capped satellite slice', intro: 'Illustrative rule: themes capped at 5% of a $40,000 portfolio.',
        head: ['Situation', 'Theme value', 'Share', 'Action'],
        rows: [['Start', '$2,000', '5%', 'None'], ['Theme doubles, rest flat', '$4,000', 'about 9.5%', 'Trim back toward 5%'], ['Theme halves, rest flat', '$1,000', 'about 2.6%', 'Top up only if planned']],
        takeaway: 'After doubling: $4,000 ÷ $42,000 ≈ 9.5%. The rule decides, not the excitement.',
      },
      mistakes: ['Buying after a theme has already soared', 'Holding several overlapping theme funds', 'Letting a satellite become the core'],
      exercise: 'If you hold a sector or theme fund, calculate what share of your portfolio it is today.',
      apply: [{ href: '/academy/herd-behavior-fomo', label: 'Lesson: herd behaviour and FOMO', d: 'Why themes feel urgent.' }],
    },
    check: {
      questions: [
        Q('A sector fund holds…', ['Every company', 'Companies in one industry', 'Only bonds', 'Cash'], 1, 'Narrow by design.'),
        Q('A main risk of thematic funds is…', ['Too much diversification', 'Concentration and high expectations', 'Guaranteed losses', 'No risk'], 1, 'Popular themes can be priced in.'),
        Q('A “core and satellite” approach keeps themes…', ['As the core', 'As a small deliberate slice', 'Banned', 'At 50%'], 1, 'Broad funds form the core.'),
      ],
      puzzle: { q: 'A theme fund is $3,000 of a $50,000 portfolio. Your cap is 5%. How much should you trim?', answer: '$500', steps: 'Cap = $50,000 × 0.05 = $2,500. $3,000 − $2,500 = $500.' },
    },
  },
  {
    slug: 'three-fund-portfolio', title: 'The three-fund portfolio and rebalancing', category: 'Investing', readMins: 6, updated: U,
    excerpt: 'US stocks, international stocks and bonds — a simple mix — plus a rule for keeping it on target.',
    body: [
      'A three-fund portfolio is a simple, widely discussed approach: a total US stock fund, a total international stock fund and a total bond fund. Together they cover thousands of stocks and bonds.',
      { h: 'Choosing the mix' },
      'The split between stocks and bonds is the biggest decision. More stocks means more growth potential and bigger swings; more bonds means steadier value and lower expected growth. Your timeline and comfort with losses decide it.',
      { h: 'Rebalancing' },
      'Over time, the parts drift as they grow at different rates. Rebalancing moves the mix back to target — selling some of what grew and buying what lagged.',
      { h: 'Two common rules' },
      { list: ['Calendar: rebalance once a year on a set date.', 'Threshold: rebalance when any part drifts more than a set amount, such as 5 percentage points.'] },
      { h: 'Rebalance tax-wisely' },
      'Inside retirement accounts, rebalancing does not usually trigger tax. In taxable accounts, directing new contributions to the lagging part can rebalance without selling. ' + NOTE,
    ],
    extras: {
      objectives: ['Describe the three-fund portfolio', 'Choose a stock and bond split based on timeline', 'Rebalance with a calendar or threshold rule'],
      ideas: [
        { t: 'Simple can be enough', d: 'Three broad funds cover a lot.' },
        { t: 'The stock/bond split matters most', d: 'More than which fund.' },
        { t: 'Rebalancing is buy low, sell high by rule', d: 'Without predicting anything.' },
      ],
      plan: [
        { t: 'Write your target mix', d: 'For example 60/20/20.' },
        { t: 'Pick a rebalancing rule', d: 'Calendar or threshold.' },
        { t: 'Use new money first', d: 'Buy what lags.' },
        { t: 'Review the mix as goals change', d: 'Not with headlines.' },
      ],
      example: {
        title: 'Rebalancing after a strong year for US stocks', intro: 'Illustrative target 60% US / 20% international / 20% bonds.',
        head: ['Fund', 'Target', 'After drift', 'Move to rebalance'],
        rows: [['US stocks', '$60,000 (60%)', '$70,000 (63.6%)', 'Sell $4,000'], ['International', '$20,000 (20%)', '$20,000 (18.2%)', 'Buy $2,000'], ['Bonds', '$20,000 (20%)', '$20,000 (18.2%)', 'Buy $2,000'], ['Total', '$100,000', '$110,000', '']],
        takeaway: 'Targets on $110,000 are $66,000 / $22,000 / $22,000 — the moves restore them.',
      },
      mistakes: ['Never rebalancing', 'Rebalancing constantly', 'Changing the mix after every headline'],
      exercise: 'Write your target mix and the date you will check it each year.',
      apply: [{ href: '/calculators#invest-growth', label: 'Investment growth calculator', d: 'Illustrate long-term contributions.' }],
    },
    check: {
      questions: [
        Q('The three funds are…', ['Three single stocks', 'US stocks, international stocks and bonds', 'Cash, gold, crypto', 'Three savings accounts'], 1, 'Broad coverage with three funds.'),
        Q('Rebalancing means…', ['Buying more of what rose', 'Returning the mix to its target', 'Selling everything', 'Changing goals'], 1, 'Sell some of what grew, buy what lagged.'),
        Q('In a taxable account, a tax-friendly way to rebalance is…', ['Sell often', 'Direct new contributions to the lagging part', 'Never invest', 'Withdraw cash'], 1, 'Avoids selling.'),
      ],
      puzzle: { q: 'Target 70% stocks / 30% bonds. You have $77,000 stocks and $23,000 bonds. How much should move to bonds?', answer: '$7,000', steps: 'Total $100,000. Target bonds $30,000. $30,000 − $23,000 = $7,000.' },
    },
  },
]
