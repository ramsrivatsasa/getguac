// Sitemap for the public marketing surface + every money article. Dashboard/
// auth/api routes are excluded (private), and the thin auto-generated tool pages
// (/coupons, /marketplace) are deliberately left out — they're noindexed.
import { ARTICLES } from '../lib/articles'
import { GAMES } from '../components/games/gamesList'

const SITE_URL = 'https://getguac.app'

export default function sitemap() {
  const lastModified = '2026-06-30'
  const routes = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/tour', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/articles', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/resources', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/games', priority: 0.7, changeFrequency: 'weekly' },
    // every arcade game page — the catalog is the single source of truth
    ...GAMES.map((g) => ({ path: g.href, priority: 0.6, changeFrequency: 'monthly' })),
    { path: '/faq', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/security', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/how-email-works', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/download', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
  ]
  const pages = routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
  const articles = ARTICLES.map((a) => ({
    url: `${SITE_URL}/articles/${a.slug}`,
    lastModified: a.updated || lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))
  return [...pages, ...articles]
}
