import MarketingShell from '../../components/MarketingShell'
import ResourceSearch from '../../components/ResourceSearch'
import ResourcesBrowser from '../../components/ResourcesBrowser'
import { ARTICLES } from '../../lib/articles'
import { GUIDES, TOOLS, GOALS, CALCULATOR_COUNT } from '../../lib/static-pages'

// Rebuilt to the design in demo/openai_new_homepage/resources/index.html, the
// same one public/resources/index.html already renders. The two pages are both
// called "resources" and a visitor arriving from the nav could land on either;
// until now one was a photographic magazine layout and the other was six
// hundred lines of 11px text cards, which read as two different products.
//
// What is NOT from that mockup, and why:
//   - the goal-stories section. /resources#goals is a nav destination and the
//     21 goal pages have no other index; dropping it to match the mockup would
//     re-orphan them, which is the bug this hub was built to fix.
//   - the articles browser, same reason for the ~40 articles.
//   - "Explore 14 calculators". There are 16. See CALCULATOR_COUNT.

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

// 🔴 ASCII ONLY, FLAT SELECTORS, NO COMMENTS INSIDE THIS STRING.
// React escapes >, &, ' and " in <style> text differently on the server than in
// the browser, which is a text-content hydration mismatch AND invalid CSS on the
// server pass. This has shipped broken to production twice. Explanations belong
// out here, above the tag.
//
// The values are lifted from public/resources/resource.css so the React hub and
// the static resource pages render the same card, not a near-miss of it.
const RES_CSS = `
.rs-hero { padding: 56px 0 38px; background: radial-gradient(circle at 85% 10%, #e9f8dc 0 13%, transparent 34%), linear-gradient(180deg,#fff,#f7fbf4); }
.rs-wrap { width: min(1180px, calc(100% - 36px)); margin: auto; }
.rs-hero-grid { display: grid; grid-template-columns: .95fr 1.05fr; align-items: center; gap: 54px; }
.rs-eyebrow { color: #138a48; font-size: 11px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
.rs-hero h1 { margin: 9px 0 15px; font-size: clamp(40px,5vw,68px); line-height: .98; font-weight: 800; letter-spacing: -.055em; }
.rs-lede { max-width: 650px; color: #405449; font-size: 17px; }
.rs-hero-image { position: relative; overflow: hidden; border-radius: 30px; box-shadow: 0 18px 40px -30px rgba(10,35,20,.45); aspect-ratio: 16/10; }
.rs-hero-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rs-scrim { position: absolute; inset: auto 0 0; height: 45%; background: linear-gradient(transparent, rgba(11,40,23,.62)); }
.rs-hero-note { position: absolute; z-index: 2; left: 22px; right: 22px; bottom: 20px; color: #fff; }
.rs-hero-note .rs-eyebrow { color: #dcf3c6; }
.rs-hero-note strong { display: block; font-size: 25px; font-weight: 800; }
.rs-section { padding: 46px 0; }
.rs-section.rs-soft { background: #fbf9f2; }
.rs-head { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 22px; }
.rs-head h2 { margin: 5px 0 0; font-size: clamp(30px,3.5vw,46px); line-height: 1; font-weight: 800; letter-spacing: -.045em; }
.rs-head p { max-width: 560px; color: #65736a; margin: 0; }
.rs-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
.rs-cards-4 { grid-template-columns: repeat(4,1fr); }
.rs-card { overflow: hidden; border: 1px solid #dce7de; border-radius: 24px; background: #fff; box-shadow: 0 18px 40px -30px rgba(10,35,20,.45); transition: .2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
.rs-card:hover { transform: translateY(-4px); box-shadow: 0 24px 45px -30px rgba(10,35,20,.55); }
.rs-card img { width: 100%; height: 185px; object-fit: cover; display: block; }
.rs-copy { padding: 20px; display: flex; flex-direction: column; flex: 1; }
.rs-copy h3 { margin: 6px 0 8px; font-size: 23px; line-height: 1.08; font-weight: 800; letter-spacing: -.03em; }
.rs-copy p { min-height: 47px; margin: 0; color: #65736a; font-size: 13px; }
.rs-link { margin-top: auto; padding-top: 13px; color: #138a48; font-weight: 800; font-size: 13px; }
.rs-pill { display: inline-flex; align-self: flex-start; padding: 5px 9px; border-radius: 999px; background: #eef8e9; color: #138a48; font-size: 9px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.rs-stories { display: grid; grid-template-columns: repeat(3,1fr); gap: 17px; }
.rs-story { padding: 22px; border: 1px solid #dce7de; border-radius: 22px; background: #fff; box-shadow: 0 18px 40px -30px rgba(10,35,20,.45); text-decoration: none; color: inherit; transition: .2s; }
.rs-story:hover { transform: translateY(-4px); border-color: #b9dcc2; }
.rs-story span { color: #138a48; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
.rs-story h3 { margin: 8px 0 0; font-size: 21px; line-height: 1.1; font-weight: 800; letter-spacing: -.02em; }
.rs-cta { margin: 45px auto; padding: 38px; border-radius: 28px; background: linear-gradient(125deg,#0d4528,#46a92b); color: #fff; text-align: center; }
.rs-cta h2 { margin: 0 0 8px; font-size: 38px; line-height: 1; font-weight: 800; }
.rs-cta p { margin: 0 auto 18px; max-width: 620px; color: #e9f8e3; }
.rs-cta a { display: inline-flex; align-items: center; padding: 12px 19px; border-radius: 999px; background: #fff; color: #153d27; font-weight: 800; text-decoration: none; }
@media (max-width: 1080px) {
  .rs-cards-4 { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 820px) {
  .rs-hero-grid { grid-template-columns: 1fr; }
  .rs-hero { padding-top: 35px; }
  .rs-cards { grid-template-columns: repeat(2,1fr); }
  .rs-stories { grid-template-columns: 1fr; }
}
@media (max-width: 540px) {
  .rs-wrap { width: min(100% - 24px, 1180px); }
  .rs-cards { grid-template-columns: 1fr; }
  .rs-cards-4 { grid-template-columns: 1fr; }
  .rs-hero h1 { font-size: 42px; }
  .rs-head { display: block; }
  .rs-card img { height: 210px; }
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

// Only the card fields — never `body`. This page is a server component, so the
// full corpus stays on the server and just this index crosses to the browser.
const ARTICLE_INDEX = ARTICLES.map(({ slug, title, excerpt, category }) => ({ slug, title, excerpt, category }))

export const metadata = {
  title: 'Resources that make the next decision easier',
  description:
    'Free GetGuac money tools, calendars, calculators and practical shopping guides — built around the moments when people actually need them.',
  alternates: { canonical: '/resources' },
}

export default function ResourcesPage() {
  return (
    <MarketingShell subtitle="resources" hideSearch>
      <style>{RES_CSS}</style>

      <section className="rs-hero">
        <div className="rs-wrap rs-hero-grid">
          <div>
            <span className="rs-eyebrow">Tools for real shopping life</span>
            <h1>Make the next money decision feel lighter.</h1>
            <p className="rs-lede">
              Free calculators, calendars, deal tools and practical guides — built around the
              moments when people actually need them.
            </p>
            <ResourceSearch />
          </div>
          <figure className="rs-hero-image" style={{ margin: 0 }}>
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
            <figcaption className="rs-hero-note">
              {/* The mockup renders this eyebrow in the same green it uses on
                  white, which on a dark photo is unreadable. Lightened here —
                  the only change to the design, and it is a legibility fix. */}
              <span className="rs-eyebrow">Less homework. More real life.</span>
              <strong>Useful before, during and after checkout.</strong>
            </figcaption>
          </figure>
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

      {/* GOAL STORIES. All 21 are linked from the homepage — as cards in a
          22-card carousel, which put reduce-waste.html fourteen clicks deep.
          Listed flat here so every one is a single click from the hub, and
          because /resources#goals is a nav destination. */}
      <section className="rs-section" id="goals" data-search-group style={{ scrollMarginTop: 80 }}>
        <div className="rs-wrap">
          <header className="rs-head">
            <div>
              <span className="rs-eyebrow">Goal stories</span>
              <h2>See it working, one goal at a time.</h2>
            </div>
            <p>{GOALS.length} short stories showing what changes when a receipt stops being clutter.</p>
          </header>
          <div className="rs-stories">
            {GOALS.map((g) => (
              <a className="rs-story" key={g.href} href={g.href} data-search={`${g.blurb} ${g.title}`}>
                <span>{g.blurb}</span>
                <h3>{g.title}</h3>
              </a>
            ))}
          </div>
        </div>
      </section>

      <ResourcesBrowser articles={ARTICLE_INDEX} />

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
