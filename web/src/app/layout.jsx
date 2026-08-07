import './globals.css'
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Roboto_Mono, Caveat } from 'next/font/google'
import { Providers } from './providers'

// New marketing design typefaces. Exposed as CSS variables so the redesigned
// landing page can opt in (var(--font-bricolage) for display headings,
// var(--font-jakarta) for body) without changing the app-wide default font.
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jakarta', display: 'swap' })
// Roboto Mono = the mockup's number/date typeface. Wired as Tailwind `font-mono`
// (see tailwind.config.js) so every `.gg-num` figure across the app matches.
// 🔑 preload:false — measured on /join, 2026-08-06. next/font preloads every
// family declared in this layout, so the ad landing page was downloading Roboto
// Mono (32 kB) and Caveat (50 kB) at top priority while rendering NEITHER. On a
// throttled mobile connection those 82 kB competed with the render-blocking CSS
// that gates first paint (FCP was 4.15s against a ~3s abandon threshold).
// preload:false keeps both usable — the browser fetches them when an element
// actually asks for that family — it only stops the unconditional preload.
const robotoMono = Roboto_Mono({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-roboto-mono', display: 'swap', preload: false })
// Caveat = the mockup's handwritten annotation face, used ONLY for the two
// pointer callouts flanking the hero phone on /join.
// ⚠️ This is a FOURTH family on a site whose typography lock is Bricolage +
// Jakarta. It earns the exception the same way Roboto Mono did — it is a
// specific element of the design mockup, not a general-purpose face. 🔒 Do not
// reach for it for headings, body copy, or anything on a signed-in page: one
// decorative script face used twice reads as art direction, the same face used
// six times reads as a template. One weight only, so the payload is ~10 kB.
// ⚠️ The callouts this was added for lived in JoinClient.jsx, which the demo_3
// port (JoinV3Client) replaced — so as of 2026-08-06 Caveat renders nowhere on
// the live /join, yet it was still the single largest font downloaded there.
// Kept declared because JoinClient.jsx is still on disk and one import swap in
// page.jsx reverts to it. See the preload:false note above.
const caveat = Caveat({ subsets: ['latin'], weight: ['600'], variable: '--font-caveat', display: 'swap', preload: false })
import UpdatePrompt from '../components/UpdatePrompt'
import PosthogProvider from '../components/PosthogProvider'
import VisitBeacon from '../components/VisitBeacon'
import { Analytics } from '@vercel/analytics/react'

// Google AdSense publisher id. Public (it ships in page source), so it's fine
// to default in code; override per-env with NEXT_PUBLIC_ADSENSE_CLIENT.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-5959691671441705'

// Google Search Console site verification. Paste the token from the "HTML tag"
// method (Search Console → Add property → getguac.app → HTML tag) into the
// NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION env var in Vercel — just the content
// value, not the whole <meta> tag — and redeploy. No code change needed.
//
// Why this matters more than it looks: with no Search Console property we
// cannot tell "never indexed" from "indexed but ranking on page 8", and those
// two need opposite fixes. /articles has taken 0 pageviews in 14 days and
// right now that number is undiagnosable.
const SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || ''

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
  // Rendered only once the env var is set, so an unset token never ships an
  // empty <meta name="google-site-verification" content=""> — which Search
  // Console reads as a failed verification rather than an absent one.
  ...(SITE_VERIFICATION ? { verification: { google: SITE_VERIFICATION } } : {}),
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
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable} ${robotoMono.variable} ${caveat.variable}`}>
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
        {/* Daily visitor counts. Vercel Analytics needs no key and no
            third-party signup — switch it on in the Vercel dashboard
            (Project -> Analytics) and daily visitors/pageviews appear there.
            Added because the site had NO working analytics at all: PostHog is
            wired but NEXT_PUBLIC_POSTHOG_KEY was never set, so there was no
            way to tell whether ad traffic was arriving. */}
        <Analytics />
        {/* First-party visitor counter — the one that needs no dashboard
            toggle and no third-party account, because the numbers live in our
            own database (migration_083). Posts nothing but the pathname; the
            visitor hash is derived server-side and the salt rotates daily.
            Silently does nothing until migration_083 is applied. */}
        <VisitBeacon />
        {/* NO Meta Pixel here. It is mounted ONLY by /join and /start — the two
            ad landing pages that actually need it — because the privacy policy
            promises no advertising trackers inside the signed-in app, and a
            root-layout mount put one on every receipts page. Ad measurement
            only ever needed the landing pages, so scoping it costs nothing.
            See components/MetaPixel.jsx. */}
        {/* The AdSense loader is NOT here any more. It moved to AdSlot (and the
            /games layout, for the arcade's interstitials) so Google's script and
            its doubleclick.net cookies stop loading on pages that show no ads —
            notably every signed-in receipts page. No page under (dashboard)
            renders an AdSlot, so no revenue moved. See AdSenseScript.jsx. */}
      </body>
    </html>
  )
}
