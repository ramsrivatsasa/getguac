// Server shell for /faq. The page itself renders in FaqClient (search +
// accordion need state); everything that must exist in the HTML for crawlers —
// the metadata and the FAQPage JSON-LD — is still produced here on the server,
// from the same faq-data module the client renders.
import MarketingShell from '../../components/MarketingShell'
import FaqClient from './FaqClient'
import { ALL_FAQS } from './faq-data'

export const metadata = {
  title: 'GetGuac FAQ | Questions & Clear Answers',
  description: 'Clear answers about GetGuac, receipt scanning, Guac-AI, privacy, pricing, returns, subscriptions, shopping, and how GetGuac compares.',
  alternates: { canonical: '/faq' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: ALL_FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.body.replace(/[#*_>\n]/g, ' ').replace(/\s+/g, ' ').trim() },
  })),
}

export default function FaqPage() {
  return (
    <MarketingShell subtitle="frequently asked">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <FaqClient />
    </MarketingShell>
  )
}
