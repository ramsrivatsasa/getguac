// Allow crawling of the public marketing site; keep private app surfaces out.
const SITE_URL = 'https://getguac.app'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/login', '/register', '/reset-password', '/embed', '/_dev/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
