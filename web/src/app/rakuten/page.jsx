// /rakuten — standalone, shareable Deals & Coupons page powered by the
// Rakuten Advertising Coupon API.
//
// PUBLIC (not behind the auth middleware) and intentionally NOT linked from
// any navigation/menu — a direct-URL-only page so the link can be shared.
//
// Server wrapper: MarketingShell needs cookies(), so the fetch/render logic
// lives in the client component RakutenDeals.jsx.

import MarketingShell from '../../components/MarketingShell'
import RakutenDeals from './RakutenDeals'

export const metadata = {
  title: 'Deals & Coupons — GetGuac',
  description: 'Live offers and coupon codes from your favourite stores, powered by Rakuten Advertising.',
}

export default function RakutenDealsPage() {
  return (
    <MarketingShell subtitle="deals & coupons">
      <RakutenDeals />
    </MarketingShell>
  )
}
