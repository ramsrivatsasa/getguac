// Static sitemap for the public marketing surface. Dashboard/auth/api routes
// are intentionally excluded (private or non-indexable).
const SITE_URL = 'https://getguac.app'

export default function sitemap() {
  const routes = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/tour', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
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
  const lastModified = '2026-06-11'
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
