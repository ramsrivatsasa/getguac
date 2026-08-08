import MarketingShell from '../../components/MarketingShell'
import WhyGetGuacClient from './WhyGetGuacClient'

// The differentiation page. /features lists what GetGuac does; this argues why
// it is a different KIND of product from the money apps people already tried.
//
// This page is the old /join landing page (src/app/join_Backup/JoinClient.jsx)
// with the hero's signup stack removed. That page carried all the evidence —
// the bank-line-vs-basket panel, the competitor matrix, the spreadsheet table,
// the demo account, the FAQ — but it sat behind a paid-ad CTA where organic
// visitors never saw it. The argument belongs on the page that makes the
// argument, so it was moved here rather than rewritten.
//
// 🔒 CLAIM NOTES CARRIED OVER FROM THE JOIN PAGE — they are the record of which
// cells were actually checked:
//   - no bank account linking exists (no Plaid, no balances, no net worth), so
//     "no bank login" is a fact, not positioning
//   - receipts are parsed to line items by parse-receipt-engine.js
//   - duplicate detection, return windows and the recurring-charge detector
//     (3+ similar charges at a similar interval) are real, shipped surfaces
//   - the competitor matrix names Credit Karma, NOT Mint: Intuit shut Mint down
//     in 2024 and migrated its users to Credit Karma. 🔒 Do not put Mint back.
// Nothing here claims budgets, savings-account tracking or net worth. Those do
// not exist, and this is the page most likely to tempt someone into adding them.

const SHARE_TITLE = 'Why GetGuac is different — the receipt, not the bank feed'
const SHARE_DESC =
  'Most money apps read your bank feed and show you a merchant and a total. GetGuac reads the receipt and shows you the items. No bank login required.'

// Unlike the join page this one is INDEXED — it is the organic answer to
// "how is this different from <the app I already tried>", which is the query
// the comparison table below actually serves.
export const metadata = {
  title: SHARE_TITLE,
  description: SHARE_DESC,
  alternates: { canonical: '/why-getguac' },
  openGraph: {
    type: 'website',
    siteName: 'GetGuac',
    url: '/why-getguac',
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
  return (
    <MarketingShell subtitle="why-getguac">
      <WhyGetGuacClient />
    </MarketingShell>
  )
}
