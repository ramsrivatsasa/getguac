// Sitemap for the public marketing surface + every money article. Dashboard/
// auth/api routes are excluded (private), and the thin auto-generated tool pages
// (/coupons, /marketplace) are deliberately left out — they're noindexed.
//
// The arcade (/games and all ~36 game pages) is ALSO left out. It used to be
// half of everything we submitted, which made a site with 20 long-form money
// articles look overwhelmingly thin and kept earning AdSense "Low value
// content" rejections. The arcade is noindexed in app/games/layout.jsx; a
// sitemap entry for a noindexed URL only sends a contradictory signal.
// Re-add `...GAMES.map(...)` below once AdSense approves.
import { ARTICLES } from '../lib/articles'

const SITE_URL = 'https://getguac.app'

const FEATURE_GUIDES = [
  '/goals/inbox.html',
  '/goals/read.html',
  '/goals/categories.html',
  '/goals/organize.html',
  '/goals/reports.html',
  '/resources/worth-it.html',
  '/goals/guacmoney.html',
  '/resources/guides/subscriptions.html',
  '/goals/bills.html',
  '/goals/wizard.html',
  '/goals/recover.html',
  '/goals/stash.html',
  '/goals/steals.html',
  '/goals/marketplace.html',
  '/goals/prepare.html',
  '/goals/miles.html',
  '/goals/arcade.html',
  '/goals/security.html',
]

// Real content under public/resources that was indexable but had never been
// submitted: the tools hub, four calculators/tools and three long-form guides.
// scripts/seo-audit.mjs flagged all nine as NOT-IN-SITEMAP — they set no robots
// meta, so Google was free to index them but had to find them by crawling.
//
// NOTE the .html here. The bare /coupons and /marketplace ROUTES stay out on
// purpose (they are noindexed, see the header comment); these are the static
// content pages of the same name, which are not.
const RESOURCE_PAGES = [
  '/resources/index.html',
  '/resources/calculators.html',
  '/resources/bills-calendar.html',
  '/resources/marketplace.html',
  '/resources/coupons.html',
  '/resources/security.html',
  '/resources/guides/budget.html',
  '/resources/guides/emergency-fund.html',
  '/resources/guides/refund-rights.html',
]

export default function sitemap() {
  const lastModified = '2026-06-30'
  const routes = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/get-started', priority: 0.9, changeFrequency: 'monthly', lastModified: '2026-08-10' },
    { path: '/tour', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/articles', priority: 0.9, changeFrequency: 'weekly' },
    // /plan is the 9 calculators in components/PlanCalculators.jsx (savings-goal,
    // invest-growth, retirement, college, healthcare, credit-card, dti,
    // emergency, rent-buy). It is indexable -- unlike /coupons and /marketplace
    // it sets no `robots` -- and it had simply never been listed here, so our
    // single strongest "useful free tools" asset had never been submitted to
    // Google at all. Priority matches /articles: these are the two things on the
    // site worth ranking for.
    { path: '/calculators', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/learn', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/security', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/how-email-works', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/download', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    // E-E-A-T: every article bylines "By the GetGuac team" and links here, and
    // the Article JSON-LD uses it as author.url. A trust page that search
    // engines can't discover does the job only half way.
    { path: '/editorial-policy', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
  ]
  const pages = routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: r.lastModified || lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
  const articles = ARTICLES.map((a) => ({
    url: `${SITE_URL}/articles/${a.slug}`,
    lastModified: a.updated || lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))
  const featureGuides = FEATURE_GUIDES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: '2026-08-10',
    changeFrequency: 'monthly',
    priority: 0.6,
  }))
  const resourcePages = RESOURCE_PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: '2026-08-11',
    changeFrequency: 'monthly',
    priority: 0.6,
  }))
  return [...pages, ...featureGuides, ...resourcePages, ...articles]
}
