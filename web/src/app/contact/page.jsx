import MarketingHero from '../../components/MarketingHero'
// Public /contact page — simple ways to reach us. Uses a mailto so it needs no
// backend; kept intentionally minimal and honest for a small team.
import Link from '../../components/SiteLink'
import MarketingShell from '../../components/MarketingShell'
import { Mail, MessageCircle, LifeBuoy, ShieldCheck } from 'lucide-react'
import TrustLine from '../../components/TrustLine'

export const metadata = {
  title: 'Contact GetGuac',
  description:
    'Get in touch with the GetGuac team — support, feedback, privacy, and press. We read every message.',
  alternates: { canonical: '/contact' },
}

const CHANNELS = [
  { icon: LifeBuoy, title: 'Support & help', body: 'Stuck on something or found a bug? We want to hear about it.', cta: 'support@getguac.app', href: 'mailto:support@getguac.app' },
  { icon: MessageCircle, title: 'Feedback & ideas', body: 'Tell us what would make GetGuac more useful for you.', cta: 'hello@getguac.app', href: 'mailto:hello@getguac.app' },
  { icon: ShieldCheck, title: 'Privacy & security', body: 'Questions about your data, or a security concern to report.', cta: 'privacy@getguac.app', href: 'mailto:privacy@getguac.app' },
]

export default function ContactPage() {
  return (
    <MarketingShell subtitle="contact">
      <MarketingHero eyebrow="Contact GetGuac" title="Get in touch." accent="" description="Support, feedback or a privacy question: choose the right contact below to reach our team." imageSrc="/home/story-people/capture-blonde-produce-v1-768.webp" imageAlt="A shopper keeping a purchase record on her phone" primaryHref="mailto:support@getguac.app" primaryLabel="Email support" secondaryHref="/faq" secondaryLabel="Read common questions" />

      <section className="mx-auto max-w-6xl py-8 sm:py-10">
        <div className="grid gap-5 md:grid-cols-3">
          {CHANNELS.map((c) => (
            <a key={c.title} href={c.href} className="group grid min-h-[220px] min-w-0 grid-rows-[auto_auto_1fr_auto] rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <c.icon size={22} />
              </div>
              <h2 className="mt-4 text-xl font-black text-slate-950">{c.title}</h2>
              <p className="mt-2 max-w-sm text-base leading-7 text-slate-600">{c.body}</p>
              <span className="mt-5 inline-flex min-h-11 min-w-0 items-center break-words text-base font-bold text-emerald-700 group-hover:underline">{c.cta}</span>
            </a>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-slate-50 px-5 py-4 text-center sm:flex-row sm:text-left">
          <p className="text-gray-600">Looking for answers first?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/faq" className="btn-secondary">Read the FAQ</Link>
            <Link href="/security" className="btn-secondary">Security &amp; privacy</Link>
          </div>
        </div>
      </section>
      <TrustLine className="pb-14" />
    </MarketingShell>
  )
}
