// Public /faq page — answers the highest-intent "is it free / safe / how is it
// different" questions, with FAQPage JSON-LD for rich results. Server-rendered;
// the accordion uses native <details> so it needs no client JS.
import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import { HelpCircle } from 'lucide-react'

export const metadata = {
  title: 'FAQ: Is It Free, Safe & How It Works',
  description:
    'Answers about GetGuac: is it free, is it safe, how scanning works, and how it’s different from Mint, Rocket Money, and points apps. Get the facts.',
  alternates: { canonical: '/faq' },
}

const FAQS = [
  { q: 'Is GetGuac really free?', a: 'Yes. There’s no subscription, no paywall, and no hidden fees. GetGuac helps you see and save your own money rather than charging you to do it.' },
  { q: 'Is GetGuac safe and secure?', a: 'GetGuac uses bank-level encryption and never requires your bank login. Row-level security protects every record, and your receipts and spending data stay yours.' },
  { q: 'How does the receipt scanning work?', a: 'Snap a photo of a receipt or forward an email receipt, and Guac-AI reads every line item — pulling the merchant, date, and amounts and auto-categorizing the spending. No typing, no spreadsheets.' },
  { q: 'Does GetGuac sell my data?', a: 'No. GetGuac does not sell your data or your shopping habits to brands or anyone else. Our whole job is helping you, not advertisers.' },
  { q: 'Is GetGuac a cashback or points app?', a: 'No. Instead of dangling rewards to get you to spend more, GetGuac shows you where your real money goes and helps you keep more of it.' },
  { q: 'How is GetGuac different from Mint or Rocket Money?', a: 'Those tools revolve around linking your bank accounts. GetGuac works straight from your receipts, so you get item-level detail — exactly what you bought, not just a transaction total — without handing over a bank login.' },
  { q: 'How is GetGuac different from a points app?', a: 'Points apps profit from your shopping data and pay you a little back. GetGuac uses your receipts to help you understand and cut your own spending, and never sells what you buy.' },
  { q: 'Is there a mobile app?', a: 'Yes — GetGuac is available on Android and iOS, with a full web app too. Scan on your phone, review the details anywhere.' },
  { q: 'What kinds of receipts can GetGuac read?', a: 'Photographed paper receipts, email receipts from online orders, and PDFs. Crumpled, faded, or long grocery receipts are all fair game.' },
  { q: 'Can GetGuac track returns and refunds?', a: 'Yes. GetGuac flags items you can still return and reminds you before return and price-drop deadlines pass, so you never lose money to a window that quietly closed.' },
  { q: 'What are “bank bites”?', a: 'Bank bites are the recurring subscriptions and fees quietly repeating on your statements each month. GetGuac surfaces them so you can decide what to keep and what to cancel.' },
  { q: 'What are GuacScore and GuacWizard?', a: 'Your GuacScore is a 0–100 read on how healthy your spending looks at a glance. GuacWizard turns that into plain-language guidance — where you’re overpaying and how to save — no finance degree required.' },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function FaqPage() {
  return (
    <MarketingShell subtitle="frequently asked">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <HelpCircle size={12} /> Questions, answered
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-tight">
          Frequently asked questions
        </h1>
        <p className="text-lg text-gray-600 mt-3">
          Free, private, and built to save you money — here’s the honest detail.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm open:shadow-md transition-shadow">
              <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 list-none">
                {f.q}
                <span className="ml-4 text-emerald-600 transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
              </summary>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-600">Still curious?</p>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="btn-primary">Get Started Free</Link>
            <Link href="/contact" className="btn-secondary">Contact us</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
