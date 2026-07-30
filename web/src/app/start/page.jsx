// /start — paid-ad landing page. Point Facebook/Google ad traffic here rather
// than at the App Store: the store round-trip (click -> store -> install ->
// open -> sign up) converted nobody, and GetGuac is a full web app so signing
// up here IS the product.
//
// noindex: this is an ad destination, not a page we want ranking or competing
// with the real homepage in search. `follow` so any links out still count.
import StartClient from './StartClient'

// Same treatment as /join — see the note there. noindex means the title does no
// search work, `absolute` escapes the `%s · GetGuac` template, and openGraph is
// re-declared in full so og:image survives the override.
const SHARE_TITLE = 'Spend Less. Save More. GetGuac.'
const SHARE_DESC =
  'Free forever. No card, no trial. GetGuac reads the receipts already in your inbox and shows you what you actually spend.'

export const metadata = {
  title: { absolute: SHARE_TITLE },
  description: SHARE_DESC,
  robots: { index: false, follow: true },
  alternates: { canonical: '/start' },
  openGraph: {
    type: 'website',
    siteName: 'GetGuac',
    url: '/start',
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
  return <StartClient />
}
