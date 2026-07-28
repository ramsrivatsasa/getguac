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

export const metadata = {
  title: 'Get GetGuac free — your money’s wingman',
  description:
    'Free forever, no card. GetGuac reads the receipts already in your inbox, scores every purchase and finds the fees eating your money. Try the demo account first.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/join' },
}

export default function Page() {
  return <JoinClient />
}
