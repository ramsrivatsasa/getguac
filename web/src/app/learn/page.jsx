import {
  CreditCard, FileText, Home, Landmark, PiggyBank, Receipt, ShoppingCart, TrendingUp, Users,
} from 'lucide-react'
import AdSlot from '../../components/AdSlot'
import MarketingShell from '../../components/MarketingShell'
import ResourceSearch from '../../components/ResourceSearch'
import { ARTICLES } from '../../lib/articles'
import { GUIDES, TOOLS, GOALS, CALCULATOR_COUNT, EXTERNAL_GUIDES } from '../../lib/static-pages'

// The hub the nav calls "Learn", at /learn since 2026-08-09. Reorganised against
// two references Ram sent: rocketmoney.com/learn and ynab.com/help-center.
//
// WHAT WAS WRONG: everything was on one page at full size. All 28 articles
// rendered as one flat 28-card grid, under 21 full-size goal cards, under six
// tool cards and four guide cards. Roughly 60 equally-weighted cards in a single
// column of scroll, with nothing to tell a visitor where to start. Ram's words:
// "every thing is combnied in one page" / "organize properly".
//
// THE SHAPE NOW, read -> learn -> use -> proof:
//   1. breadcrumb, hero, search, ONE featured article        (Rocket Money)
//   2. Start here - three numbered links, not three cards
//   3. Browse by topic - nine icon cards, EACH CARRYING ITS
//      OWN TOP THREE ARTICLE LINKS                           (YNAB help centre)
//   4. tools, then our guides, then the external .gov guides
//   5. goal stories as a dense link list
//   6. closing action row, then the sign-up CTA              (YNAB help centre)
//
// The second pass took the YNAB idea that a topic card should contain its own
// article links. That earned its keep twice: the nine cards had all pointed at
// the same /articles page, and it let three separate 3-card rows (Start here /
// Using GetGuac / Recently updated, 1168px of near-identical cards) be deleted
// outright. Same corpus, more specific links, much less scroll.
//
// WHY DROPPING THE 28-CARD GRID IS SAFE. The old comment here warned that
// removing the browser would orphan the articles, and that was true when it was
// written. It is not now: /articles is a real index, it is in the nav under
// Learn, and this page links to it from four places. Every article stays one
// click away. The 21 goal pages are different - /learn#goals really is their
// only index, so all 21 are still listed here, just as a dense link list rather
// than 21 shadowed cards.
//
// The nav links to /learn#tools, /learn#guides and /learn#goals.
// THOSE THREE IDS ARE LOAD-BEARING - see lib/gg-nav-def.js. Renaming one breaks
// a menu item on all 35 pages.

// Photography per card, taken from the mockup. These are the marketing photo
// sets already in public/home — no new assets, and every one is a real file.
const TOOL_ART = {
  '/resources/calculators.html': {
    img: '/home/campaign-story/family-payoff-v2.webp',
    alt: 'A family planning a money goal',
    pill: 'Planning',
    heading: 'Calculators for real goals',
    body: 'Retirement, college, mortgage, emergency fund and debt payoff — plain inputs, honest math.',
    cta: `Explore ${CALCULATOR_COUNT} calculators`,
  },
  '/resources/bills-calendar.html': {
    img: '/home/campaign-story/subscription-renter-v2.webp',
    alt: 'A shopper reviewing upcoming bills',
    pill: 'Calendar',
    heading: 'Meet the bill before it lands',
    body: 'Recurring charges and renewals placed on the days they are expected.',
    cta: 'Open the bills calendar',
  },
  '/resources/marketplace.html': {
    img: '/home/campaign-story/shop-aisle-v2.webp',
    alt: 'A family comparing prices while shopping',
    pill: 'Shopping',
    heading: 'Compare before checkout',
    body: 'Current store prices for planned purchases, open to everyone.',
    cta: 'Explore Marketplace',
  },
  '/resources/coupons.html': {
    img: '/home/campaign-story/price-drop-senior-v2.webp',
    alt: 'A couple finding a useful coupon',
    pill: 'Savings',
    heading: 'Find the code before paying',
    body: 'Current coupons and store offers gathered where they are easy to check.',
    cta: 'Browse coupons',
  },
  '/resources/worth-it.html': {
    img: '/home/story-people/family-tablet.webp',
    alt: 'A family deciding whether a purchase was worth it',
    pill: 'Reflection',
    heading: 'Was it worth the money?',
    body: 'A two-second rating that helps the next purchase carry forward what worked.',
    cta: 'Try Worth-It',
  },
  '/resources/security.html': {
    img: '/home/story-people/family-tablet-hero-v3.webp',
    alt: 'A household using private GetGuac controls',
    pill: 'Privacy',
    heading: 'Your data stays your decision',
    body: 'Understand the database rules, encryption and deletion controls behind GetGuac.',
    cta: 'See how protection works',
  },
}

const GUIDE_ART = {
  '/resources/guides/budget.html': {
    img: '/home/campaign-story/understand-couple-v2.webp',
    alt: 'A couple building a simple spending plan',
    pill: 'Budget',
    heading: 'A budget that starts with what you bought',
    body: 'Build a plan from real purchase patterns instead of imaginary perfect months.',
  },
  '/resources/guides/emergency-fund.html': {
    img: '/home/campaign-story/playground-payoff-v2.webp',
    alt: 'A family enjoying the security of an emergency fund',
    pill: 'Saving',
    heading: 'An emergency fund for real life',
    body: 'Choose a first milestone that protects the household without feeling impossible.',
  },
  '/resources/guides/refund-rights.html': {
    img: '/home/campaign-story/protect-return-v2.webp',
    alt: 'A shopper acting before a return deadline',
    pill: 'Refunds',
    heading: 'How to get the refund you are owed',
    body: 'Keep the receipt, know the deadline and follow the money until it lands.',
  },
  '/resources/guides/subscriptions.html': {
    img: '/home/story-people/guide-subscription-hispanic-couple-v1.webp',
    alt: 'A couple reviewing subscriptions together',
    pill: 'Subscriptions',
    heading: 'The audit that pays for itself',
    body: 'Find forgotten services, price increases and charges life moved past.',
  },
}

/* ---------------------------------------------------------------------------
 * Curation. Slugs, not indexes, so reordering lib/articles.js cannot silently
 * change which article is featured. byslug() throws on a typo rather than
 * rendering a card that links to a 404 — a dead link on the hub is worse than a
 * failed build, and this is the exact class of mistake a rename introduces.
 * ------------------------------------------------------------------------- */

// The one article that gets the hero slot. Chosen because it is the only one
// that explains what the product does for the reader's money, which is the job
// the reference page gives its featured card.
const FEATURED_SLUG = 'how-getguac-helps-you-save'

// Foundations. Someone who has never budgeted needs these three before any of
// the investing or tax pieces make sense.
const START_HERE = ['fifty-thirty-twenty', 'emergency-fund-size', 'credit-score']

// One line per real category, in the order a reader is likely to need them.
// Counts are computed from ARTICLES, never typed — a hand-written count is a
// claim that goes stale the next time an article is added.
//
// The icon is the YNAB help-centre cue: nine identical text cards are a wall, and
// an icon makes the grid scannable rather than readable.
const TOPICS = [
  { name: 'Saving', icon: PiggyBank, desc: 'Build the cushion first, then grow it.' },
  { name: 'Shopping', icon: ShoppingCart, desc: 'Spend the same money and keep more of it.' },
  { name: 'Receipts', icon: Receipt, desc: 'What to keep, what to bin, and for how long.' },
  { name: 'Debt', icon: CreditCard, desc: 'Payoff order, credit scores and what interest costs.' },
  { name: 'Taxes', icon: FileText, desc: 'The deductions and records people leave behind.' },
  { name: 'Investing', icon: TrendingUp, desc: 'The boring approach that usually wins.' },
  { name: 'Retirement', icon: Landmark, desc: 'Employer matches and which account to use.' },
  { name: 'Home', icon: Home, desc: 'Renting, buying and the maths behind both.' },
  { name: 'Family', icon: Users, desc: 'Saving for education without locking yourself in.' },
]

// How many article links sit inside each topic card. YNAB nests 2-4; three keeps
// the nine cards the same height without truncating the small categories.
const LINKS_PER_TOPIC = 3

const bySlug = (slug) => {
  const found = ARTICLES.find((a) => a.slug === slug)
  if (!found) throw new Error(`/learn references a missing article slug: ${slug}`)
  return found
}

const COUNT_BY_TOPIC = ARTICLES.reduce((acc, a) => {
  acc[a.category] = (acc[a.category] || 0) + 1
  return acc
}, {})

// Every topic in TOPICS must be a category that exists, or the grid advertises a
// section with nothing behind it.
for (const t of TOPICS) {
  if (!COUNT_BY_TOPIC[t.name]) throw new Error(`/learn lists a topic with no articles: ${t.name}`)
}

const featured = bySlug(FEATURED_SLUG)
const startHere = START_HERE.map(bySlug)

// Articles grouped under their own topic, newest first so a card's three links
// are its freshest. This replaced three separate 3-card rows further down the
// page (Start here / Using GetGuac / Recently updated), which were 1168px of
// near-identical cards and told a visitor nothing about where to look. The links
// now sit inside the topic they belong to, which is what the YNAB help centre
// does and what makes the grid worth having.
const BY_TOPIC = ARTICLES.reduce((acc, a) => {
  (acc[a.category] = acc[a.category] || []).push(a)
  return acc
}, {})
for (const list of Object.values(BY_TOPIC)) {
  list.sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
}

// 🔴 ASCII ONLY, FLAT SELECTORS, NO COMMENTS INSIDE THIS STRING.
// React escapes >, &, ' and " in <style> text differently on the server than in
// the browser, which is a text-content hydration mismatch AND invalid CSS on the
// server pass. This has shipped broken to production twice. Explanations belong
// out here, above the tag.
//
// The values are lifted from public/resources/resource.css so the React hub and
// the static resource pages render the same card, not a near-miss of it.
const RES_CSS = `
.rs-hero { padding: 40px 0 38px; background: radial-gradient(circle at 85% 10%, #e9f8dc 0 13%, transparent 34%), linear-gradient(180deg,#fff,#f7fbf4); }
.rs-wrap { width: min(1180px, calc(100% - 36px)); margin: auto; }
.rs-crumb { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; color: #7c8a80; font-size: 12px; font-weight: 600; }
.rs-crumb a { color: #7c8a80; text-decoration: none; }
.rs-crumb a:hover { color: #138a48; }
.rs-hero-grid { display: grid; grid-template-columns: .95fr 1.05fr; align-items: center; gap: 54px; }
.rs-eyebrow { color: #138a48; font-size: 11px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
.rs-hero h1 { margin: 9px 0 15px; font-size: clamp(40px,5vw,68px); line-height: .98; font-weight: 800; letter-spacing: -.05em; }
.rs-lede { max-width: 650px; color: #405449; font-size: 17px; }
.rs-feat { position: relative; display: block; overflow: hidden; border-radius: 30px; box-shadow: 0 18px 40px -30px rgba(10,35,20,.45); text-decoration: none; color: inherit; transition: .2s; }
.rs-feat:hover { transform: translateY(-4px); box-shadow: 0 26px 50px -30px rgba(10,35,20,.55); }
.rs-feat-img { position: relative; aspect-ratio: 16/10; }
.rs-feat-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rs-scrim { position: absolute; inset: auto 0 0; height: 58%; background: linear-gradient(transparent, rgba(11,40,23,.55) 42%, rgba(9,32,18,.86)); }
.rs-feat-copy { position: absolute; z-index: 2; left: 26px; right: 26px; bottom: 22px; color: #fff; }
.rs-feat-copy h2 { margin: 8px 0 6px; font-size: clamp(22px,2.3vw,30px); line-height: 1.1; font-weight: 800; }
.rs-feat-copy p { margin: 0 0 10px; color: #dbe9df; font-size: 14px; line-height: 1.5; }
.rs-feat-copy .rs-eyebrow { color: #cbea9d; }
.rs-feat-more { color: #fff; font-weight: 800; font-size: 13px; }
.rs-section { padding: 40px 0; }
.rs-section.rs-soft { background: #fbf9f2; }
.rs-head { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 22px; }
.rs-head h2 { margin: 5px 0 0; font-size: clamp(26px,2.8vw,38px); line-height: 1.05; font-weight: 800; }
.rs-head p { max-width: 560px; color: #65736a; margin: 0; }
.rs-more { flex-shrink: 0; color: #138a48; font-weight: 800; font-size: 13px; text-decoration: none; white-space: nowrap; }
.rs-more:hover { text-decoration: underline; }
.rs-topics { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.rs-topic { display: flex; flex-direction: column; padding: 20px; border: 1px solid #dce7de; border-radius: 20px; background: #fff; transition: .18s; }
.rs-topic:hover { border-color: #b9dcc2; box-shadow: 0 18px 34px -28px rgba(10,35,20,.45); }
.rs-topic-top { display: flex; align-items: center; gap: 11px; }
.rs-topic-ico { display: inline-grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; border-radius: 11px; background: #eef8e9; color: #138a48; }
.rs-topic h3 { margin: 0; flex: 1; font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
.rs-topic-n { flex-shrink: 0; color: #8b998f; font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.rs-topic p { margin: 9px 0 0; color: #65736a; font-size: 13px; line-height: 1.45; }
.rs-topic-links { display: flex; flex-direction: column; margin: 12px 0 0; padding: 12px 0 0; border-top: 1px solid #eef2ee; }
.rs-topic-link { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; color: #2f4437; font-size: 13.5px; font-weight: 600; line-height: 1.35; text-decoration: none; }
.rs-topic-link:hover { color: #138a48; }
.rs-topic-link i { flex-shrink: 0; font-style: normal; color: #b3c3b8; }
.rs-topic-all { margin-top: auto; padding-top: 11px; color: #138a48; font-size: 12.5px; font-weight: 800; text-decoration: none; }
.rs-topic-all:hover { text-decoration: underline; }
.rs-start { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
.rs-start-item { display: flex; align-items: flex-start; gap: 13px; padding: 17px 19px; border: 1px solid #dce7de; border-radius: 18px; background: #fff; text-decoration: none; color: inherit; transition: .18s; }
.rs-start-item:hover { border-color: #b9dcc2; transform: translateY(-3px); }
.rs-start-n { display: inline-grid; place-items: center; flex-shrink: 0; width: 26px; height: 26px; border-radius: 999px; background: #12341f; color: #fff; font-size: 12px; font-weight: 800; }
.rs-start-body b { display: block; font-size: 15px; font-weight: 800; letter-spacing: -.02em; line-height: 1.25; }
.rs-start-ex { display: block; margin-top: 4px; color: #6d7c72; font-size: 12.5px; line-height: 1.45; }
.rs-ext { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.rs-ext-item { display: flex; flex-direction: column; padding: 19px 20px; border: 1px solid #dce7de; border-radius: 20px; background: #fff; text-decoration: none; color: inherit; transition: .18s; }
.rs-ext-item:hover { border-color: #b9dcc2; transform: translateY(-3px); box-shadow: 0 18px 34px -28px rgba(10,35,20,.45); }
.rs-ext-item b { font-size: 16.5px; font-weight: 800; letter-spacing: -.02em; line-height: 1.22; }
.rs-ext-desc { margin: 7px 0 0; color: #65736a; font-size: 13px; line-height: 1.45; }
.rs-ext-src { margin-top: auto; padding-top: 13px; color: #138a48; font-size: 12px; font-weight: 800; }
.rs-end { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; padding: 4px 0 0; }
.rs-end a { display: inline-flex; align-items: center; padding: 12px 20px; border-radius: 999px; font-weight: 800; font-size: 14px; text-decoration: none; }
.rs-end .rs-end-1 { background: #12341f; color: #fff; }
.rs-end .rs-end-1:hover { background: #1b4a2c; }
.rs-end .rs-end-2 { border: 1px solid #cddcd1; color: #21402c; background: #fff; }
.rs-end .rs-end-2:hover { border-color: #9dc6a9; }
.rs-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
.rs-cards-4 { grid-template-columns: repeat(4,1fr); }
.rs-card { overflow: hidden; border: 1px solid #dce7de; border-radius: 24px; background: #fff; box-shadow: 0 18px 40px -30px rgba(10,35,20,.45); transition: .2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
.rs-card:hover { transform: translateY(-4px); box-shadow: 0 24px 45px -30px rgba(10,35,20,.55); }
.rs-card img { width: 100%; height: 140px; object-fit: cover; display: block; }
.rs-copy { padding: 17px 18px; display: flex; flex-direction: column; flex: 1; }
.rs-copy h3 { margin: 6px 0 7px; font-size: 19px; line-height: 1.1; font-weight: 800; letter-spacing: -.03em; }
.rs-copy p { margin: 0; color: #65736a; font-size: 13px; line-height: 1.45; }
.rs-link { margin-top: auto; padding-top: 13px; color: #138a48; font-weight: 800; font-size: 13px; }
.rs-pill { display: inline-flex; align-self: flex-start; padding: 5px 9px; border-radius: 999px; background: #eef8e9; color: #138a48; font-size: 9px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.rs-goals { display: grid; grid-template-columns: repeat(3,1fr); gap: 0 34px; }
.rs-goal { display: flex; align-items: baseline; gap: 10px; padding: 11px 2px; border-bottom: 1px solid #e9efe9; text-decoration: none; color: inherit; }
.rs-goal:hover { color: #138a48; }
.rs-goal b { font-size: 14.5px; font-weight: 700; letter-spacing: -.01em; }
.rs-goal span { flex-shrink: 0; color: #a3b0a7; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.rs-cta { margin: 40px auto; padding: 38px; border-radius: 28px; background: linear-gradient(125deg,#0d4528,#46a92b); color: #fff; text-align: center; }
.rs-cta h2 { margin: 0 0 8px; font-size: 38px; line-height: 1; font-weight: 800; }
.rs-cta p { margin: 0 auto 18px; max-width: 620px; color: #e9f8e3; }
.rs-cta a { display: inline-flex; align-items: center; padding: 12px 19px; border-radius: 999px; background: #fff; color: #153d27; font-weight: 800; text-decoration: none; }
@media (max-width: 1080px) {
  .rs-cards-4 { grid-template-columns: repeat(2,1fr); }
  .rs-goals { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 820px) {
  .rs-ext { grid-template-columns: repeat(2,1fr); }
  .rs-hero-grid { grid-template-columns: 1fr; gap: 30px; }
  .rs-hero { padding-top: 26px; }
  .rs-cards { grid-template-columns: repeat(2,1fr); }
  .rs-topics { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 540px) {
  .rs-ext { grid-template-columns: 1fr; }
  .rs-start { grid-template-columns: 1fr; }
  .rs-wrap { width: min(100% - 24px, 1180px); }
  .rs-cards { grid-template-columns: 1fr; }
  .rs-cards-4 { grid-template-columns: 1fr; }
  .rs-topics { grid-template-columns: 1fr; }
  .rs-goals { grid-template-columns: 1fr; }
  .rs-hero h1 { font-size: 40px; }
  .rs-head { display: block; }
  .rs-more { display: inline-block; margin-top: 10px; }
  .rs-card img { height: 200px; }
}
`

// Plain <a>, not next/link: TOOLS and GUIDES are real .html files in public/,
// not routes. next/link would attempt a client navigation to a route that does
// not exist and fall back to a hard load anyway.
function ArtCard({ href, art, cta }) {
  return (
    <a className="rs-card" href={href} data-search={`${art.pill} ${art.heading} ${art.body}`}>
      <img src={art.img} alt={art.alt} width={760} height={475} loading="lazy" decoding="async" />
      <div className="rs-copy">
        <span className="rs-pill">{art.pill}</span>
        <h3>{art.heading}</h3>
        <p>{art.body}</p>
        <span className="rs-link">{art.cta || cta} →</span>
      </div>
    </a>
  )
}

// `cols` exists for the guides row. There are exactly four guides, and in the
// three-across grid the fourth dropped onto a row of its own, leaving two empty
// columns and about 430px of dead height in the middle of the page. Four
// columns fills the row and the section ends where the cards do.
function CardSection({ id, soft, eyebrow, heading, sub, items, art, cta, cols }) {
  return (
    <section className={soft ? 'rs-section rs-soft' : 'rs-section'} id={id} data-search-group style={{ scrollMarginTop: 80 }}>
      <div className="rs-wrap">
        <header className="rs-head">
          <div>
            <span className="rs-eyebrow">{eyebrow}</span>
            <h2>{heading}</h2>
          </div>
          <p>{sub}</p>
        </header>
        <div className={cols === 4 ? 'rs-cards rs-cards-4' : 'rs-cards'}>
          {items.map((i) => art[i.href] ? <ArtCard key={i.href} href={i.href} art={art[i.href]} cta={cta} /> : null)}
        </div>
      </div>
    </section>
  )
}

// ArticleCard/ArticleRow used to live here and rendered the three 3-card rows.
// Both are gone: the article links moved inside the topic cards, so there was no
// second place rendering an article card and nothing left calling them.

export const metadata = {
  title: 'Learn — money guides, articles and calculators',
  description:
    'The GetGuac learning centre: practical articles on saving, shopping, receipts, debt and taxes, plus free calculators, a bills calendar and step-by-step guides.',
  alternates: { canonical: '/learn' },
}

export default function LearnPage() {
  return (
    <MarketingShell subtitle="learn" hideSearch>
      <style>{RES_CSS}</style>

      <section className="rs-hero">
        <div className="rs-wrap">
          {/* Breadcrumb, as on the reference page. Plain text for the current
              page rather than a link to itself. */}
          <nav className="rs-crumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Learn</span>
          </nav>
        </div>
        <div className="rs-wrap rs-hero-grid">
          <div>
            <span className="rs-eyebrow">Learning centre</span>
            <h1>Learn</h1>
            <p className="rs-lede">
              Practical money articles, free calculators and short guides — organised so you can
              find the one thing you need instead of reading everything.
            </p>
            <ResourceSearch />
          </div>

          {/* FEATURED. One article, given the hero slot the way the reference
              does it. The photo is an existing marketing asset, not a per-article
              image: the articles have no art of their own and inventing a
              thumbnail per piece would mean 28 new files. */}
          <a className="rs-feat" href={`/articles/${featured.slug}`} data-search={`${featured.category} ${featured.title} ${featured.excerpt}`}>
            <div className="rs-feat-img">
              <img
                src="/home/story-people/openai-hero-giggling-family-baby-v2.webp"
                alt="A family using GetGuac together"
                width={1180} height={738} fetchPriority="high" decoding="async"
              />
              {/* A real element, not a ::after with content:''. Single quotes
                  inside a React <style> are escaped differently on the server than
                  in the browser — a hydration mismatch AND invalid CSS server-side.
                  Nothing in RES_CSS may contain a quote, > or &. */}
              <span className="rs-scrim" aria-hidden="true" />
              <div className="rs-feat-copy">
                <span className="rs-eyebrow">
                  Start here{Number.isFinite(featured.readMins) ? ` · ${featured.readMins} min read` : ''}
                </span>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
                <span className="rs-feat-more">Read more →</span>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* START HERE. One compact strip, not a row of three big cards. It answers
          "where do I begin" in about 120px instead of 393px. */}
      <section className="rs-section rs-soft" id="start-here" data-search-group style={{ scrollMarginTop: 80 }}>
        <div className="rs-wrap">
          <header className="rs-head">
            <div>
              <span className="rs-eyebrow">Start here</span>
              <h2>New to this? Read these three, in order.</h2>
            </div>
          </header>
          <div className="rs-start">
            {startHere.map((a, i) => (
              <a className="rs-start-item" key={a.slug} href={`/articles/${a.slug}`} data-search={`${a.category} ${a.title} ${a.excerpt}`}>
                {/* Every element carries a class. A bare `.rs-start-item span`
                    rule is (0,1,1) and beat `.rs-start-n` at (0,1,0), which
                    repainted the badge digit grey on dark green and turned its
                    inline-grid centering into display:block — the numbers
                    rendered as empty circles. Same specificity trap as the
                    resource.css one in gg-nav-def.js. */}
                <span className="rs-start-n" aria-hidden="true">{i + 1}</span>
                <span className="rs-start-body">
                  <b>{a.title}</b>
                  <span className="rs-start-ex">{a.excerpt}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* BROWSE BY TOPIC — the spine of the page.
          Each card now carries its own top three articles, which is the YNAB
          help-centre pattern and the thing that made this grid worth keeping. It
          replaced nine cards that all linked to the same /articles page, plus the
          three separate 3-card rows that used to sit underneath. Same corpus,
          about a third of the height, and every link is specific.
          "All N in <topic>" points at /articles because there are no
          per-category pages yet; adding ?topic= filtering there is the next step
          and would make these nine links land on a filtered view. */}
      <section className="rs-section" id="topics" data-search-group style={{ scrollMarginTop: 80 }}>
        <div className="rs-wrap">
          <header className="rs-head">
            <div>
              <span className="rs-eyebrow">Browse by topic</span>
              <h2>Pick the thing you are dealing with.</h2>
            </div>
            <a className="rs-more" href="/articles">All {ARTICLES.length} articles →</a>
          </header>
          <div className="rs-topics">
            {TOPICS.map((t) => {
              const Icon = t.icon
              const list = BY_TOPIC[t.name] || []
              const shown = list.slice(0, LINKS_PER_TOPIC)
              const rest = list.length - shown.length
              return (
                <div className="rs-topic" key={t.name} data-search={`${t.name} ${t.desc}`}>
                  <span className="rs-topic-top">
                    <span className="rs-topic-ico" aria-hidden="true"><Icon size={17} /></span>
                    <h3>{t.name}</h3>
                    <span className="rs-topic-n">{COUNT_BY_TOPIC[t.name]} article{COUNT_BY_TOPIC[t.name] === 1 ? '' : 's'}</span>
                  </span>
                  <p>{t.desc}</p>
                  <span className="rs-topic-links">
                    {shown.map((a) => (
                      <a className="rs-topic-link" key={a.slug} href={`/articles/${a.slug}`} data-search={`${a.category} ${a.title} ${a.excerpt}`}>
                        <i aria-hidden="true">→</i>{a.title}
                      </a>
                    ))}
                  </span>
                  {/* Only shown when there is actually more to see, so the card
                      never promises a longer list than the topic has. */}
                  {rest > 0 ? (
                    <a className="rs-topic-all" href="/articles">{rest} more in {t.name} →</a>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <CardSection
        id="tools"
        eyebrow="GetGuac tools"
        heading="See what is coming. Keep more of what is yours."
        sub="Each tool connects a money question to a clear next step — not another spreadsheet to maintain."
        items={TOOLS}
        art={TOOL_ART}
      />

      <CardSection
        id="guides"
        soft
        eyebrow="Practical guides"
        heading="Small lessons. Real-life wins."
        sub="Short, useful explanations designed for the moment you need to act."
        items={GUIDES}
        art={GUIDE_ART}
        cta="Read the guide"
        cols={4}
      />

      {/* The trusted external .gov guides, directly under our own guides because
          they are the same kind of thing. They used to be two sections apart with
          the 21 goal stories wedged between, so the page said "guides", changed
          subject, then said "guides" again.
          These are rendered HERE, in .rs-* classes. They came from
          components/ResourcesBrowser.jsx, which was a Tailwind island on this
          page — max-w-5xl against the page's 1180px band, its own type scale, its
          own card treatment — so the section visibly read as a different site.
          That component had no other consumer and is gone; the data now lives
          with GUIDES/TOOLS/GOALS in lib/static-pages.js. */}
      <section className="rs-section" id="external-guides" data-search-group style={{ scrollMarginTop: 80 }}>
        <div className="rs-wrap">
          <header className="rs-head">
            <div>
              <span className="rs-eyebrow">Trusted sources</span>
              <h2>Money guides worth reading elsewhere.</h2>
            </div>
            <p>Non-commercial .gov guidance. No affiliate links, ever — being a source you can trust is the whole point.</p>
          </header>
          <div className="rs-ext">
            {EXTERNAL_GUIDES.map((g) => (
              <a
                className="rs-ext-item"
                key={g.title}
                href={g.url}
                target="_blank"
                rel="noreferrer"
                data-search={`${g.title} ${g.desc} ${g.source}`}
              >
                <b>{g.title}</b>
                <span className="rs-ext-desc">{g.desc}</span>
                <span className="rs-ext-src">{g.source} ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* The ad unit ResourcesBrowser used to own. Kept, and kept inside the
          page's content band so it has a real width to measure — the old one
          rendered 0x0, which is why AdSense logged "No slot size for
          availableWidth=0" and the unit could never fill. */}
      <div className="rs-wrap" style={{ paddingBottom: 8 }}>
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM || '9142744455'} minHeight={90} />
      </div>

      {/* GOAL STORIES. All 21 are still here, because /learn#goals is a nav
          destination AND their only index — the homepage links them from inside a
          22-card carousel, which put reduce-waste.html fourteen clicks deep.
          What changed is the weight: 21 full-size shadowed cards were the single
          biggest block on the page, so they are a dense link list now. Same 21
          links, one click each, about a fifth of the height. */}
      <section className="rs-section rs-soft" id="goals" data-search-group style={{ scrollMarginTop: 80 }}>
        <div className="rs-wrap">
          <header className="rs-head">
            <div>
              <span className="rs-eyebrow">Goal stories</span>
              <h2>See it working, one goal at a time.</h2>
            </div>
            <p>{GOALS.length} short stories showing what changes when a receipt stops being clutter.</p>
          </header>
          <div className="rs-goals">
            {GOALS.map((g) => (
              <a className="rs-goal" key={g.href} href={g.href} data-search={`${g.blurb} ${g.title}`}>
                <b>{g.title}</b>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Closing action row, the way the YNAB help centre ends: the two things
          someone still looking has left to do. Sits above the sign-up CTA so a
          reader who wants more reading is not funnelled straight at the pricing
          decision. */}
      <section className="rs-section" data-search-group>
        <div className="rs-wrap rs-end">
          <a className="rs-end-1" href="/articles">Browse all {ARTICLES.length} articles</a>
          <a className="rs-end-2" href="/faq">Read the FAQ</a>
        </div>
      </section>

      <div className="rs-wrap">
        <section className="rs-cta">
          <h2>Start with one receipt.</h2>
          <p>See your purchases clearly, keep more of your money and make the next shopping trip a little smarter.</p>
          <a href="/join?try=receipt">Try 1 receipt</a>
        </section>
      </div>
    </MarketingShell>
  )
}
