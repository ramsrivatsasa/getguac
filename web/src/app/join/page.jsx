// /join — paid-social landing page for the Facebook/Instagram ads.
//
// Shaped like the design mockup: hero → item-level comparison → 4 steps →
// benefit cards → what it catches → data-safety band → FAQ, then the proof
// sections (demo account, comparison tables, goal rails, Guac-AI) stacked at
// the bottom near the footer, then the closing CTA.
//
// Route name is deliberately NOT /fb or /facebook: a first-party path with
// those tokens is the kind of thing content blockers match on, and losing the
// landing page to an ad blocker would be indistinguishable from a bad ad.
//
// noindex: an ad destination, not a page we want ranking against the real
// homepage. `follow` so links out still count.
import MarketingShell from '../../components/MarketingShell'
// JoinClient.jsx is untouched on disk — swap this import back to revert.
import JoinDemoClient from '../join-demo/JoinDemoClient'

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

// NAV + FOOTER added 2026-07-31 on request, from the design mockup.
//
// ⚠️ THIS REVERSES A DELIBERATE DECISION, and the reason it was made is worth
// keeping: /join is an ad destination, so every nav link is an exit before the
// ask. The hero CTA, the sticky bar and the closing CTA are what pay for the
// clicks. If join→signup conversion drops after this ships, the nav is the
// first thing to test removing again — MarketingShell comes off in one line.
//
// ads={false} is NOT cosmetic. MarketingShell mounts AdSense by default, and
// this is the one page on the site where we are PAYING for every visitor:
// loading Google's ad network here would put competitors' ads on a page we
// bought traffic for. (It also keeps the surface AdSense is judging unchanged
// while the "low value content" re-application is outstanding.)
//
// hideSearch: the mockup's nav is logo → links → auth. The header search box
// is a third thing to look at on a page with exactly one job.
export default function Page() {
  return (
    <MarketingShell ads={false} hideSearch>
      <JoinDemoClient />
    </MarketingShell>
  )
}
