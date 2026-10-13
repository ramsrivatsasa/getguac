// Served at /money-bootcamp/sitemap.xml. Kept separate from app/sitemap.js so
// the Bootcamp ships without editing an existing file; submit it in Search
// Console (or list it in robots.js) so crawlers find it.
import { bootcampTests, bootcampExams } from '../../lib/bootcamp'

const SITE_URL = 'https://getguac.app'

export default function sitemap() {
  return [
    { url: `${SITE_URL}/money-bootcamp`, lastModified: '2026-10-12', changeFrequency: 'monthly', priority: 0.7 },
    ...bootcampExams().map((e) => ({ url: `${SITE_URL}/money-bootcamp/exam/${e.slug}`, lastModified: '2026-10-12', changeFrequency: 'monthly', priority: 0.6 })),
    ...bootcampTests().map((t) => ({ url: `${SITE_URL}/money-bootcamp/${t.slug}`, lastModified: '2026-10-12', changeFrequency: 'monthly', priority: 0.5 })),
  ]
}
