// /start — paid-ad landing page. Point Facebook/Google ad traffic here rather
// than at the App Store: the store round-trip (click -> store -> install ->
// open -> sign up) converted nobody, and GetGuac is a full web app so signing
// up here IS the product.
//
// noindex: this is an ad destination, not a page we want ranking or competing
// with the real homepage in search. `follow` so any links out still count.
import StartClient from './StartClient'

export const metadata = {
  title: 'Get GetGuac free — money’s wingman',
  description:
    'Free forever. No card, no trial. GetGuac reads the receipts already in your inbox and shows you what you actually spend.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/start' },
}

export default function Page() {
  return <StartClient />
}
