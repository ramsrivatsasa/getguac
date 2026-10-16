// Allow crawling of the public marketing site; keep private app surfaces out.
const SITE_URL = 'https://getguac.app'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Auth pages must be crawlable for their noindex metadata to be read.
        // Authentication, rather than robots.txt, protects member records.
        disallow: ['/api/', '/embed', '/_dev/'],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/money-bootcamp/sitemap.xml`],
    host: SITE_URL,
  }
}
