// /join — paid-social landing page for the Facebook/Instagram ads.
//
// Shaped like Origin's ad landing page above the fold, then continues into the
// homepage's own content (goal cards, features, brain, steps, privacy, CTA) and
// publishes the demo-account credentials so a stranger can look before signing
// up. /start is the stripped one-screen variant — keep both and A/B them.
//
// Route name is deliberately NOT /fb or /facebook: a first-party path with
// those tokens is the kind of thing content blockers match on, and losing the
// landing page to an ad blocker would be indistinguishable from a bad ad.
//
// noindex: an ad destination, not a page we want ranking against the real
// homepage. `follow` so links out still count.
import JoinClient from './JoinClient'

// Tagline instead of a keyword title: this page is noindex, so the title does no
// search work — its only jobs are the browser tab and the share card.
// `absolute` bypasses the root layout's `%s · GetGuac` template, which would
// otherwise render "…GetGuac. · GetGuac". openGraph/twitter are re-declared in
// FULL (images included) because a child's nested object REPLACES the parent's
// rather than merging into it — declaring only `title` would drop og:image and
// leave the ad landing page with an imageless share card.
const SHARE_TITLE = 'Spend Less. Save More. GetGuac.'
const SHARE_DESC =
  'Free forever, no card. GetGuac reads the receipts already in your inbox, scores every purchase and finds the fees eating your money. Try the demo account first.'

export const metadata = {
  title: { absolute: SHARE_TITLE },
  description: SHARE_DESC,
  robots: { index: false, follow: true },
  alternates: { canonical: '/join' },
  openGraph: {
    type: 'website',
    siteName: 'GetGuac',
    url: '/join',
    title: SHARE_TITLE,
    description: SHARE_DESC,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'GetGuac — spend less, save more' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHARE_TITLE,
    description: SHARE_DESC,
    images: ['/og.png'],
  },
}

export default function Page() {
  return <JoinClient />
}
