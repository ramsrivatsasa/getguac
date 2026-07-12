import './globals.css'
import Script from 'next/script'
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Roboto_Mono } from 'next/font/google'
import { Providers } from './providers'

// New marketing design typefaces. Exposed as CSS variables so the redesigned
// landing page can opt in (var(--font-bricolage) for display headings,
// var(--font-jakarta) for body) without changing the app-wide default font.
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jakarta', display: 'swap' })
// Roboto Mono = the mockup's number/date typeface. Wired as Tailwind `font-mono`
// (see tailwind.config.js) so every `.gg-num` figure across the app matches.
const robotoMono = Roboto_Mono({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-roboto-mono', display: 'swap' })
import UpdatePrompt from '../components/UpdatePrompt'
import PosthogProvider from '../components/PosthogProvider'

// Google AdSense publisher id. Public (it ships in page source), so it's fine
// to default in code; override per-env with NEXT_PUBLIC_ADSENSE_CLIENT.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5959691671441705'

const SITE_URL = 'https://getguac.app'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GetGuac: Free Receipt Scanner & Spending Tracker',
    template: '%s · GetGuac',
  },
  description:
    'Scan receipts, see where your money goes, catch hidden fees, and never miss a refund. GetGuac is a free AI receipt scanner and spending tracker — no cashback gimmicks.',
  applicationName: 'GetGuac',
  keywords: [
    'receipt scanner app', 'free receipt scanner', 'spending tracker', 'expense tracker',
    'receipt tracker', 'AI receipt scanner', 'find hidden subscriptions', 'cancel subscriptions app',
    'return tracker', 'refund tracker', 'price drop refund', 'see where my money goes',
    'Mint alternative', 'Rocket Money alternative', 'track spending without bank login',
  ],
  authors: [{ name: 'GetGuac' }],
  creator: 'GetGuac',
  publisher: 'GetGuac',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'GetGuac',
    url: SITE_URL,
    title: 'GetGuac: Free Receipt Scanner & Spending Tracker',
    description:
      'Scan receipts, see where your money goes, catch hidden fees, and never miss a refund. Free — no cashback gimmicks.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'GetGuac — take control of your money' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetGuac: Free Receipt Scanner & Spending Tracker',
    description: 'Scan receipts, see where your money goes, catch hidden fees, and never miss a refund. Free.',
    images: ['/og.png'],
  },
  manifest: '/site.webmanifest',
  // AdSense site-ownership verification (the "Meta tag" method in AdSense →
  // Sites). Renders <meta name="google-adsense-account" content="ca-pub-..."/>
  // into <head> on every page so Google can confirm ownership without relying
  // on the JS-injected adsbygoogle loader.
  other: { 'google-adsense-account': ADSENSE_CLIENT },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export const viewport = {
  themeColor: '#166534',
}

// Site-wide structured data: who we are, what the app is, and the search box.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'GetGuac',
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description: 'A free AI receipt scanner and spending tracker that helps you see and save your own money.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'GetGuac',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'GetGuac',
      operatingSystem: 'Web, Android, iOS',
      applicationCategory: 'FinanceApplication',
      description:
        'Scan receipts and bank statements, see where your money goes, catch hidden fees, track returns and refunds, and find better prices. Free.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable} ${robotoMono.variable}`}>
      <body>
        {/* Site-wide JSON-LD structured data for rich results. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* PostHog wraps the tree so its useEffect-based pageview tracker
            can read pathname/search on every route change. No-ops cleanly
            if NEXT_PUBLIC_POSTHOG_KEY is unset. */}
        <PosthogProvider>
          <Providers>{children}</Providers>
        </PosthogProvider>
        {/* Floating banner that detects a Vercel redeploy and
            prompts the user to reload — so a stale tab doesn't
            keep running on yesterday's bundle. Renders at the
            root layout so every route gets it. */}
        <UpdatePrompt />
        {/* Google AdSense loader — only emitted when a publisher id is set.
            Powers <AdSlot/> and the arcade's fullscreen ad breaks (adBreak in
            arcadeKit.jsx). data-ad-frequency-hint = minimum gap Google keeps
            between fullscreen interstitials. afterInteractive so it never
            blocks first paint. */}
        {ADSENSE_CLIENT && (
          <Script
            id="adsbygoogle-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            data-ad-frequency-hint="120s"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  )
}
