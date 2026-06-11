// Public /contact page — simple ways to reach us. Uses a mailto so it needs no
// backend; kept intentionally minimal and honest for a small team.
import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import { Mail, MessageCircle, LifeBuoy, ShieldCheck } from 'lucide-react'

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
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <Mail size={12} /> We read every message
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 mt-4 leading-tight">
          Get in touch
        </h1>
        <p className="text-lg text-gray-600 mt-3 max-w-xl mx-auto">
          A real, small team is behind GetGuac. Whatever you need, reach out — we’d love to hear from you.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid sm:grid-cols-3 gap-4">
          {CHANNELS.map((c) => (
            <a key={c.title} href={c.href} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition block">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <c.icon size={22} />
              </div>
              <h3 className="font-bold text-gray-900 mt-4">{c.title}</h3>
              <p className="text-sm text-gray-600 mt-1.5 leading-snug">{c.body}</p>
              <span className="inline-block text-sm font-bold text-emerald-700 mt-3 break-all">{c.cta}</span>
            </a>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-600">Looking for answers first?</p>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <Link href="/faq" className="btn-secondary">Read the FAQ</Link>
            <Link href="/security" className="btn-secondary">Security &amp; privacy</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
