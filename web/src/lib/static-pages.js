// Single source of truth for the static marketing pages that live in public/
// rather than in the Next.js app: four how-to guides, six resource tools, and
// the 21 goal stories.
//
// WHY THIS FILE EXISTS: all 31 pages were live and rendering correctly, and
// nine of them were reachable from NOWHERE except /sitemap.html — which carries
// robots=noindex, so it passes discovery neither to visitors nor to search
// engines. The React /resources hub and the static /resources/index.html are
// two different pages, and neither linked to the other or to any of these.
//
// The 21 goal stories had the opposite problem: linked from the homepage, but
// as cards in a 22-card carousel, so reduce-waste.html sat fourteen clicks deep.
//
// Listing them here means /resources can render them all, and a NEW guide
// becomes discoverable by adding one entry — the same property that already
// makes ARTICLES work.
//
// 🔑 Paths deliberately keep their .html extension: these are real files in
// public/, not Next routes. Dropping it produces a 404.
//
// Titles and blurbs are the pages' own rendered <h1> and eyebrow, read from a
// browser rather than grepped — these pages build their content client-side, so
// the strings are not in the served HTML.

// How many calculators /calculators actually ships. Lives here, in a plain
// module, because the pages that QUOTE the number are server components and
// PlanCalculators.jsx (where the array is) is a client component — importing it
// just to count an array would ship the whole 16-calculator hub into every
// bundle that mentions it. PlanCalculators asserts this matches CALCS.length, so
// the two cannot drift silently.
//
// The design mockup for /resources says "Explore 14 calculators". There are 16.
export const CALCULATOR_COUNT = 16

export const GUIDES = [
  { href: '/resources/guides/budget.html', title: 'A budget grounded in real life', blurb: 'Start from what the household actually buys, not a hopeful spreadsheet.' },
  { href: '/resources/guides/emergency-fund.html', title: 'Build an emergency fund for real life', blurb: 'Pick a milestone you believe in, then let small automatic deposits do the work.' },
  { href: '/resources/guides/refund-rights.html', title: 'Get the refund you are owed', blurb: 'Act before the return window becomes a wall.' },
  { href: '/resources/guides/subscriptions.html', title: 'Audit the subscriptions life moved past', blurb: 'An hour of review that pays for itself, then keeps paying.' },
]

// Order matters and is the design's, not alphabetical: plan → anticipate → shop
// → save → reflect → protect, which is the order the six cards appear in on
// public/resources/index.html. The React hub renders from this list, so a
// different order here meant the two /resources pages dealt the same six cards
// in two different sequences.
export const TOOLS = [
  { href: '/resources/calculators.html', title: 'Calculators', blurb: 'Turn a big goal into a next step you can actually take.' },
  { href: '/resources/bills-calendar.html', title: 'Bills calendar', blurb: 'Meet the bill before it lands instead of after it posts.' },
  { href: '/resources/marketplace.html', title: 'Marketplace', blurb: 'Compare the product, not the promotion.' },
  { href: '/resources/coupons.html', title: 'Coupons', blurb: 'Find the code before you pay, not after.' },
  { href: '/resources/worth-it.html', title: 'Worth-It', blurb: 'A two-second check on whether a purchase earned its place.' },
  { href: '/resources/security.html', title: 'Security', blurb: 'Keep household purchase data inside the household.' },
]

export const GOALS = [
  { href: '/goals/organize.html', title: 'Leave checkout with less to remember.', blurb: 'Organize every purchase' },
  { href: '/goals/read.html', title: 'Turn one photo into searchable memory.', blurb: 'Guac-AI reads the fine print' },
  { href: '/goals/understand.html', title: 'End the “where did it go?” conversation.', blurb: 'Understand where it went' },
  { href: '/goals/categories.html', title: 'Let spending sort itself.', blurb: 'Rules and Guac-AI organize it' },
  { href: '/goals/duplicates.html', title: 'Remove duplicate receipts automatically.', blurb: 'Duplicate receipts removed' },
  { href: '/goals/reports.html', title: 'See the whole month, not one total.', blurb: 'Dashboard and reports' },
  { href: '/goals/recover.html', title: 'Bring money owed to you back home.', blurb: 'Recover money still yours' },
  { href: '/goals/reduce-waste.html', title: 'Stop paying for what life moved past.', blurb: 'Reduce quiet waste' },
  { href: '/goals/wizard.html', title: 'Catch the fees your bank hopes you miss.', blurb: 'Calm money protection' },
  { href: '/goals/bills.html', title: 'Meet next month before it arrives.', blurb: 'One calendar ahead' },
  { href: '/goals/prepare.html', title: 'Shop together, even when you’re apart.', blurb: 'Prepare the next trip' },
  { href: '/goals/stash.html', title: 'Remember what is already at home.', blurb: 'A living product library' },
  { href: '/goals/steals.html', title: 'Know when the better price is real.', blurb: 'Live price hunting' },
  { href: '/goals/emergency.html', title: 'Fund the cushion from money already yours.', blurb: 'Start it with money you already had' },
  { href: '/goals/tax-records.html', title: 'Arrive at tax time already organized.', blurb: 'Records that build themselves' },
  { href: '/goals/grocery.html', title: 'Know the grocery bill before the aisle does.', blurb: 'A food budget that survives the shop' },
  { href: '/goals/marketplace.html', title: 'Check one more price before checkout.', blurb: 'Deals open to everyone' },
  { href: '/goals/learn.html', title: 'Spend less on regret. More on real life.', blurb: 'Learn from every trip' },
  { href: '/goals/inbox.html', title: 'Shop online without crowding your real inbox.', blurb: 'A shopping inbox of your own' },
  { href: '/goals/miles.html', title: 'Make every eligible mile count.', blurb: 'A tax-ready mileage habit' },
  { href: '/goals/guacmoney.html', title: 'See every small win add up.', blurb: 'A scoreboard for money kept' },
  { href: '/goals/arcade.html', title: 'Take a break that still counts.', blurb: 'Money does not have to be homework' },
  { href: '/goals/security.html', title: 'Keep the household story private.', blurb: 'Security you can audit' },
  { href: '/goals/data.html', title: 'Leave with everything—or delete it.', blurb: 'Your data, your call' },
]

// Trusted, non-commercial outbound guides. No affiliate links, ever — the value
// is that these are .gov sources, and one referral link would spend that.
//
// Moved here from components/ResourcesBrowser.jsx on 2026-08-09. That component
// was a Tailwind island on an otherwise .rs-* styled page: max-w-5xl against the
// page's 1180px band, its own type scale and its own card treatment, so the
// section visibly read as a different site. The data belongs with GUIDES/TOOLS/
// GOALS and the rendering belongs to the page.
export const EXTERNAL_GUIDES = [
  { title: 'Build a budget that sticks', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/budgeting/', desc: 'A simple, proven way to plan where your money goes each month.' },
  { title: 'Start an emergency fund', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/', desc: 'How much to set aside, and how to get there without feeling it.' },
  { title: 'Saving & investing for retirement', source: 'investor.gov (SEC)', url: 'https://www.investor.gov/financial-tools-calculators', desc: 'Compound-interest calculators and the basics of long-term saving.' },
  { title: 'Your refund & return rights', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/articles/disputing-credit-card-charges', desc: 'What you are owed when something is wrong — and how to dispute it.' },
  { title: 'Spot & cancel sneaky subscriptions', source: 'consumer.ftc.gov', url: 'https://consumer.ftc.gov/', desc: 'Find recurring charges you forgot about and shut them down.' },
  { title: 'Understand credit, interest & fees', source: 'consumerfinance.gov', url: 'https://www.consumerfinance.gov/consumer-tools/', desc: 'How interest and fees quietly add up — and how to dodge them.' },
]
